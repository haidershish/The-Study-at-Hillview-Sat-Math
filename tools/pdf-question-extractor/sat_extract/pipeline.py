import json, shutil
from datetime import datetime, timezone
from pathlib import Path
from .core import coverage_report, deduplicate_questions
from .pdfio import extract_pages, page_payload, crop
from .lmstudio import LMStudioClient

def dump(path,data): Path(path).write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
def load(path,default):
 try:return json.loads(Path(path).read_text(encoding="utf-8"))
 except (FileNotFoundError,json.JSONDecodeError):return default

def run(args):
 root=Path(args.output); assets=root/"assets"; review=root/"review-crops"; assets.mkdir(parents=True,exist_ok=True); review.mkdir(parents=True,exist_ok=True)
 cp_path=root/"checkpoint.json"; checkpoint=load(cp_path,{"pdf":str(Path(args.pdf).resolve()),"completedPages":[],"questions":[]}) if args.resume else {"pdf":str(Path(args.pdf).resolve()),"completedPages":[],"questions":[]}
 if checkpoint.get("pdf")!=str(Path(args.pdf).resolve()): raise ValueError("checkpoint belongs to a different PDF; use --no-resume or another output")
 log=load(root/"extraction-log.json",[]); done=set(checkpoint["completedPages"]); allq=checkpoint["questions"]
 client=LMStudioClient(args.api_url,args.model,args.vision_model,args.temperature,args.retries,args.timeout)
 doc,pages=extract_pages(args.pdf,root,args.dpi,args.first_page,args.last_page)
 try:
  pending=[p for p in pages if p["page"] not in done]
  for pos in range(0,len(pending),args.page_batch_size):
   batch=pending[pos:pos+args.page_batch_size]; candidates=[]
   for p in batch:
    if not p["regions"]: # LLM boundary fallback: whole-page candidate, explicitly uncertain
     bbox=list(p["pageObj"].rect); name=f"p{p['page']:04d}-unsegmented-question.png"; w,h=crop(p["pageObj"],p["matrix"],bbox,assets/name)
     p["regions"]=[{"bbox":bbox,"sourceQuestion":"unsegmented"}]
    candidates.extend(page_payload(p,assets))
   for qpos in range(0,len(candidates),min(10,args.question_batch_size)):
    chunk=candidates[qpos:qpos+min(10,args.question_batch_size)]; qs=client.complete(chunk,assets); allq.extend(qs)
   completed=[p["page"] for p in batch]; done.update(completed); checkpoint={"pdf":checkpoint["pdf"],"completedPages":sorted(done),"questions":allq,"updatedAt":datetime.now(timezone.utc).isoformat()}; dump(cp_path,checkpoint)
   log.append({"time":checkpoint["updatedAt"],"pages":completed,"candidates":len(candidates),"status":"success"}); dump(root/"extraction-log.json",log)
 finally: doc.close()
 unique,dups=deduplicate_questions(allq,args.similarity); [q.update(needsReview=True,sourceNotes=(q.get("sourceNotes","")+" Duplicate question flagged.").strip()) for q in dups]
 generated=unique+(dups if args.keep_duplicates else [])
 reviews=[q for q in generated if q.get("needsReview")]
 for q in reviews:
  for aid in q.get("assetIds",[]):
   src=assets/aid
   if src.exists() and "question" in aid: shutil.copy2(src,review/aid)
 dump(root/"Questions.generated.json",generated); dump(root/"Questions.review.json",reviews); dump(root/"coverage-report.json",coverage_report(generated))
 return {"questions":len(generated),"review":len(reviews),"duplicates":len(dups),"pages":len(done)}
