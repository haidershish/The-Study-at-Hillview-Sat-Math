import hashlib, json, re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

DOMAINS=("Algebra","Advanced Math","Problem-Solving and Data Analysis","Geometry and Trigonometry")
REQUIRED=("id","domain","skill","difficulty","prompt","type","choices","answer","explanation","calculatorTip","sourceType","sourcePage","sourceQuestion","assetIds","needsReview","sourceNotes","assets")

def normalize_prompt(s): return re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()
def prompt_hash(s): return hashlib.sha256(normalize_prompt(s).encode()).hexdigest()

def detect_boundaries(words, page_rect):
    x0,y0,x1,y1=page_rect; starts=[]
    ordered=sorted(words,key=lambda z:(z[1],z[0]))
    for w in ordered:
        m=re.fullmatch(r"(?:question\s*)?(\d{1,3})[.)]?",str(w[4]).strip(),re.I)
        # A question number must be the leftmost token on its visual line.
        leftmost=not any(abs(float(v[1])-float(w[1]))<3 and float(v[0])<float(w[0])-1 for v in ordered)
        if m and leftmost and w[0] < x0+(x1-x0)*.35: starts.append((float(w[1]),m.group(1)))
    starts=sorted({(round(y,1),n) for y,n in starts})
    return [{"bbox":[x0,max(y0,y-8),x1,(starts[i+1][0]-4 if i+1<len(starts) else y1)],"sourceQuestion":n} for i,(y,n) in enumerate(starts)]

def parse_json_response(text):
    text=re.sub(r"^```(?:json)?\s*|\s*```$","",text.strip(),flags=re.I)
    a=text.find("{"); b=text.rfind("}")
    if a<0 or b<a: raise ValueError("response contains no JSON object")
    return json.loads(text[a:b+1])

def validate_question(q, asset_dir):
    errors=[f"missing {k}" for k in REQUIRED if k not in q]
    if errors:return errors
    if q["domain"] not in DOMAINS: errors.append("invalid domain")
    if q["difficulty"] not in (1,2,3): errors.append("difficulty must be 1-3")
    if q["type"] not in ("multiple-choice","student-produced-response"): errors.append("invalid type")
    if not str(q["answer"]).strip(): errors.append("answer is empty")
    if q["type"]=="multiple-choice":
        ids=[str(x.get("id","")) for x in q["choices"] if isinstance(x,dict)]
        if len(ids)<2: errors.append("multiple-choice requires choices")
        if str(q["answer"]) not in ids and not any(str(x.get("text"))==str(q["answer"]) for x in q["choices"]): errors.append("answer is not a choice")
    declared={a.get("id") for a in q["assets"] if isinstance(a,dict)}
    for aid in q["assetIds"]:
        if aid not in declared: errors.append(f"asset {aid} not declared")
        if not (Path(asset_dir)/aid).is_file(): errors.append(f"asset {aid} does not exist")
    cs=q.get("calculatorStrategy")
    if cs and (cs.get("provider") not in ("desmos","either") or not isinstance(cs.get("recommended"),bool)): errors.append("invalid calculatorStrategy")
    return errors

def deduplicate_questions(items,threshold=.94):
    unique=[]; dup=[]
    for q in items:
        n=normalize_prompt(q.get("prompt","")); match=next((u for u in unique if prompt_hash(u["prompt"])==prompt_hash(n) or SequenceMatcher(None,n,normalize_prompt(u["prompt"])).ratio()>=threshold),None)
        (dup if match else unique).append(dict(q, duplicateOf=match["id"]) if match else q)
    return unique,dup

def coverage_report(items):
    dc=Counter(q["domain"] for q in items); dif=Counter(str(q["difficulty"]) for q in items); pages=defaultdict(lambda:{"questions":0,"needsReview":0})
    for q in items: pages[str(q["sourcePage"])]["questions"]+=1; pages[str(q["sourcePage"])]["needsReview"]+=bool(q["needsReview"])
    total=len(items)
    return {"totalQuestions":total,"domains":{d:{"count":dc[d],"percentage":round(100*dc[d]/total,2) if total else 0} for d in DOMAINS},"difficulty":{str(i):dif[str(i)] for i in (1,2,3)},"perPage":dict(pages)}
