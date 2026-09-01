import argparse, sys, unittest
from pathlib import Path

def parser():
 p=argparse.ArgumentParser(prog="pdf-question-extractor",description="Extract Digital SAT math questions from PDF via LM Studio")
 p.add_argument("pdf",nargs="?",help="input PDF (not required with --selftest)"); p.add_argument("--output",default=str(Path(__file__).resolve().parents[1]/"output"))
 p.add_argument("--api-url",default="http://localhost:1234/v1/chat/completions"); p.add_argument("--model",default="local-model"); p.add_argument("--vision-model",help="separate vision-capable LM Studio model")
 p.add_argument("--temperature",type=float,default=.1); p.add_argument("--page-batch-size",type=int,choices=range(3,6),default=3); p.add_argument("--question-batch-size",type=int,default=10)
 p.add_argument("--dpi",type=int,default=300); p.add_argument("--first-page",type=int,default=1); p.add_argument("--last-page",type=int); p.add_argument("--retries",type=int,default=3); p.add_argument("--timeout",type=int,default=180); p.add_argument("--similarity",type=float,default=.94)
 p.add_argument("--resume",action=argparse.BooleanOptionalAction,default=True); p.add_argument("--keep-duplicates",action="store_true"); p.add_argument("--selftest",action="store_true")
 return p

def main(argv=None):
 args=parser().parse_args(argv)
 if args.selftest:
  suite=unittest.defaultTestLoader.discover(str(Path(__file__).resolve().parents[1]/"tests")); return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1
 if not args.pdf: parser().error("pdf is required unless --selftest is used")
 if not 1<=args.question_batch_size<=10: parser().error("--question-batch-size must be 1-10")
 from .pipeline import run
 print(run(args)); return 0
if __name__=="__main__": raise SystemExit(main())
