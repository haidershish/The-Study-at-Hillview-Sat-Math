import base64, json, time
from pathlib import Path
import requests
from .core import DOMAINS, parse_json_response, validate_question

SCHEMA="""Return ONLY {\"questions\":[...]}. Each question requires id, domain (one of %s), skill, difficulty integer 1-3, prompt, type (multiple-choice or student-produced-response), choices [{id,text}], answer, explanation, calculatorTip, optional calculatorStrategy, sourceType=extracted, sourcePage, sourceQuestion, assetIds, needsReview boolean, sourceNotes, assets. Preserve supplied asset metadata. Mark needsReview for uncertainty. Never invent image observations.""" % (", ".join(DOMAINS))

class LMStudioClient:
 def __init__(self,url,model,vision_model=None,temperature=.1,retries=3,timeout=180): self.url=url; self.model=model; self.vision_model=vision_model; self.temperature=temperature; self.retries=retries; self.timeout=timeout
 def complete(self, candidates, asset_dir):
  has_fig=any(any(a["type"]=="figure" for a in c["assets"]) for c in candidates); model=self.vision_model if has_fig and self.vision_model else self.model
  content=[{"type":"text","text":SCHEMA+"\nCandidates:\n"+json.dumps(candidates,ensure_ascii=False)}]
  if has_fig and self.vision_model:
   for c in candidates:
    for a in c["assets"]:
     if a["type"]=="figure":
      data=base64.b64encode((Path(asset_dir)/a["id"]).read_bytes()).decode(); content.append({"type":"image_url","image_url":{"url":"data:image/png;base64,"+data}})
  note="" if not has_fig or self.vision_model else " Figures exist but no vision model was configured; text model did NOT inspect images."
  for attempt in range(self.retries+1):
   try:
    body={"model":model,"temperature":self.temperature,"messages":[{"role":"system","content":"You extract Digital SAT math questions."},{"role":"user","content":content}],"response_format":{"type":"json_object"}}
    r=requests.post(self.url,json=body,timeout=self.timeout); r.raise_for_status(); obj=parse_json_response(r.json()["choices"][0]["message"]["content"]); qs=obj.get("questions",[])
    errors=[]
    for q in qs:
     if note: q["needsReview"]=True; q["sourceNotes"]=(q.get("sourceNotes","")+note).strip()
     errors.extend(validate_question(q,asset_dir))
    if errors: raise ValueError("validation: "+"; ".join(errors[:20]))
    return qs
   except Exception:
    if attempt>=self.retries: raise
    time.sleep(2**attempt)
