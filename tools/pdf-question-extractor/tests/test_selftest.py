import json
import tempfile
import unittest
from pathlib import Path

from sat_extract.core import (
    detect_boundaries, normalize_prompt, deduplicate_questions,
    validate_question, coverage_report, parse_json_response,
)


class ExtractorTests(unittest.TestCase):
    def test_boundary_detection(self):
        words = [
            (20, 20, 35, 35, "1."), (45, 20, 250, 35, "Solve x + 2 = 5"),
            (20, 180, 35, 195, "2."), (45, 180, 250, 195, "What is y?"),
        ]
        regions = detect_boundaries(words, (0, 0, 300, 300))
        self.assertEqual(2, len(regions))
        self.assertEqual("1", regions[0]["sourceQuestion"])

    def test_validation_and_assets(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "q.png"; p.write_bytes(b"png")
            q = sample_question(); q["assetIds"] = ["q.png"]
            q["assets"] = [{"id":"q.png","type":"question-crop","src":"assets/q.png","alt":"question","width":1,"height":1,"sourcePage":1}]
            self.assertEqual([], validate_question(q, Path(d)))
            p.unlink()
            self.assertTrue(any("does not exist" in x for x in validate_question(q, Path(d))))

    def test_duplicates_and_coverage(self):
        a = sample_question(); b = sample_question(); b["id"] = "q2"; b["prompt"] += " "
        unique, duplicates = deduplicate_questions([a, b], threshold=.95)
        self.assertEqual((1, 1), (len(unique), len(duplicates)))
        report = coverage_report(unique)
        self.assertEqual(1, report["totalQuestions"])
        self.assertEqual(100.0, report["domains"]["Algebra"]["percentage"])

    def test_json_fence(self):
        self.assertEqual({"questions": []}, parse_json_response("```json\n{\"questions\":[]}\n```"))

    def test_synthetic_pdf_render_and_crop(self):
        import fitz
        from sat_extract.pdfio import extract_pages, page_payload
        with tempfile.TemporaryDirectory() as d:
            pdf = Path(d) / "synthetic.pdf"
            doc = fitz.open(); page = doc.new_page(width=300, height=300)
            page.insert_text((20, 30), "1. Solve x + 2 = 5")
            page.insert_text((20, 180), "2. What is y?")
            doc.save(pdf); doc.close()
            loaded, pages = extract_pages(pdf, Path(d), dpi=144)
            try:
                payload = page_payload(pages[0], Path(d))
                self.assertEqual(2, len(payload))
                self.assertTrue((Path(d) / payload[0]["assets"][0]["id"]).is_file())
            finally:
                loaded.close()


def sample_question():
    return {"id":"q1","domain":"Algebra","skill":"Linear equations","difficulty":1,
      "prompt":"Solve x + 2 = 5.","type":"student-produced-response","choices":[],"answer":"3",
      "explanation":"Subtract 2.","calculatorTip":"Not needed.","sourceType":"extracted",
      "sourcePage":1,"sourceQuestion":"1","assetIds":[],"needsReview":False,"sourceNotes":"","assets":[]}


if __name__ == "__main__": unittest.main()
