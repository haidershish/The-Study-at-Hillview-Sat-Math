# PDF Question Extractor

A self-contained local authoring CLI that renders a PDF with PyMuPDF, extracts positioned text, heuristically segments Digital SAT math questions, crops questions/figures, and asks an LM Studio OpenAI-compatible model for import-ready structured JSON.

## Install (Python 3.11)

```bash
cd "C:/Users/User/Documents/ChatGPT/DESMOS SAT CALCULATOR/tools/pdf-question-extractor"
python -m pip install -r requirements.txt
```

No Poppler is needed. Start LM Studio's local server and load a model.

## Usage

```text
usage: pdf-question-extractor [-h] [--output OUTPUT] [--api-url API_URL]
                              [--model MODEL] [--vision-model VISION_MODEL]
                              [--temperature TEMPERATURE]
                              [--page-batch-size {3,4,5}]
                              [--question-batch-size QUESTION_BATCH_SIZE]
                              [--dpi DPI] [--first-page FIRST_PAGE]
                              [--last-page LAST_PAGE] [--retries RETRIES]
                              [--timeout TIMEOUT] [--similarity SIMILARITY]
                              [--resume | --no-resume] [--keep-duplicates]
                              [--selftest]
                              [pdf]
```

Example:

```bash
python extract.py practice.pdf --model qwen2.5-14b-instruct --vision-model qwen2.5-vl-7b-instruct --page-batch-size 3
```

`--api-url` defaults to `http://localhost:1234/v1/chat/completions`; override it (for example with `http://192.168.100.93:1234/v1/chat/completions`) when needed. `--model` is the text model (default `local-model`). `--vision-model` must name a model that truly accepts images. A text-only model is **never represented as having inspected images**: when figures exist and no vision model is supplied, the model receives only text/metadata and output is forced into review with an explicit note. `--temperature` defaults to 0.1. Requests are bounded to the selected 3–5 pages and at most 10 questions.

### Flags

- `pdf`: input PDF; omitted only for `--selftest`.
- `--output`: output root (default: this tool's `output/`).
- `--api-url`, `--model`, `--vision-model`, `--temperature`: LM Studio settings.
- `--page-batch-size`: 3, 4, or 5 pages per checkpoint batch.
- `--question-batch-size`: 1–10 candidates per LLM request.
- `--dpi`: render/crop resolution; default 300.
- `--first-page`, `--last-page`: inclusive 1-based range.
- `--retries`: bounded retry count after malformed JSON, HTTP, or schema/asset validation failures; exponential backoff.
- `--timeout`: HTTP timeout in seconds.
- `--similarity`: normalized prompt similarity threshold for duplicates.
- `--resume` / `--no-resume`: use or ignore `checkpoint.json` (resume is default).
- `--keep-duplicates`: include flagged duplicates; otherwise skip them.
- `--selftest`: offline unit tests; no PDF/server required.

## Processing and outputs

Positioned words (`get_text("words")`) and layout/image blocks (`get_text("dict")`) drive segmentation. Number/spacing heuristics establish question regions. If no boundaries are found, a full-page uncertain candidate is sent to the LLM so it can perform assisted detection. Embedded images and vector drawing bounds are figure candidates. Every question gets a high-resolution complete crop; intersecting figures get separate crops.

After every successful page batch the resumable checkpoint and log are written. JSON is schema-checked, multiple-choice answers must match a choice, and every `assetId` must be declared and exist. Failed responses are re-requested. Prompt hashes and fuzzy similarity detect duplicates. Uncertain questions and duplicate flags feed the review queue.

The output tree is:

```text
output/
  Questions.generated.json
  Questions.review.json
  coverage-report.json
  extraction-log.json
  checkpoint.json
  assets/
  review-crops/
```

Coverage includes SAT domain counts/percentages, difficulty distribution, and per-page totals/review counts. The checkpoint contains completed pages and validated questions; use the same PDF/output to resume. Use `--no-resume` to restart (existing assets may be overwritten).

## Offline verification

```bash
python extract.py --selftest
python -m py_compile extract.py sat_extract/*.py tests/*.py
```

The self-test covers segmentation, fenced JSON parsing, validation/missing assets, deduplication, and coverage reporting without calling LM Studio.
