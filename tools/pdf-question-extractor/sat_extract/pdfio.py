from pathlib import Path
import fitz
from .core import detect_boundaries

def extract_pages(pdf_path, output, dpi=300, first=1, last=None):
    doc=fitz.open(pdf_path); last=min(last or len(doc),len(doc)); pages=[]
    for pno in range(max(1,first),last+1):
        page=doc[pno-1]; scale=dpi/72; matrix=fitz.Matrix(scale,scale)
        words=page.get_text("words"); layout=page.get_text("dict")
        regions=detect_boundaries(words,tuple(page.rect))
        figures=[]
        for i,b in enumerate(layout.get("blocks",[]),1):
            if b.get("type")==1:
                figures.append({"bbox":list(b["bbox"]),"kind":"image","index":i})
        # Graphs/tables are often vector drawings rather than embedded images.
        drawings=page.get_drawings()
        if drawings:
            rect=fitz.Rect(drawings[0]["rect"])
            for drawing in drawings[1:]: rect.include_rect(drawing["rect"])
            if rect.width>20 and rect.height>20 and rect.get_area()<page.rect.get_area()*.8:
                figures.append({"bbox":list(rect),"kind":"vector-figure","index":len(figures)+1})
        pages.append({"page":pno,"pageObj":page,"matrix":matrix,"words":words,"regions":regions,"figures":figures})
    return doc,pages

def crop(page,matrix,bbox,path):
    Path(path).parent.mkdir(parents=True,exist_ok=True); pix=page.get_pixmap(matrix=matrix,clip=fitz.Rect(bbox),alpha=False); pix.save(str(path)); return pix.width,pix.height

def page_payload(page_data, assets_dir):
    p=page_data["page"]; result=[]
    for i,r in enumerate(page_data["regions"],1):
        qname=f"p{p:04d}-q{r['sourceQuestion']}-question.png"; w,h=crop(page_data["pageObj"],page_data["matrix"],r["bbox"],Path(assets_dir)/qname)
        text=" ".join(x[4] for x in page_data["words"] if x[1]>=r["bbox"][1] and x[1]<r["bbox"][3])
        assets=[{"id":qname,"type":"question-crop","src":f"assets/{qname}","alt":f"Question {r['sourceQuestion']} crop","width":w,"height":h,"sourcePage":p}]
        for j,f in enumerate(page_data["figures"],1):
            if f["bbox"][1]<r["bbox"][3] and f["bbox"][3]>r["bbox"][1]:
                name=f"p{p:04d}-q{r['sourceQuestion']}-figure-{j}.png"; fw,fh=crop(page_data["pageObj"],page_data["matrix"],f["bbox"],Path(assets_dir)/name)
                assets.append({"id":name,"type":"figure","src":f"assets/{name}","alt":"Extracted figure; describe during review","width":fw,"height":fh,"sourcePage":p})
        result.append({"sourcePage":p,"sourceQuestion":r["sourceQuestion"],"rawText":text,"bbox":r["bbox"],"assets":assets})
    return result
