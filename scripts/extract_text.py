# PDF 10권에서 페이지별 텍스트 추출 → data/text/<book_id>.json
import json, os, re, sys
import fitz  # PyMuPDF

SRC = r"C:\Users\yoonj\OneDrive\Desktop\2026_BEE&BE\양봉자료"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "text")
os.makedirs(OUT, exist_ok=True)

def hangul_ratio(s):
    if not s: return 0.0
    h = len(re.findall(r"[가-힣]", s))
    return h / max(len(s), 1)

report = []
for fname in sorted(os.listdir(SRC)):
    if not fname.lower().endswith(".pdf"): continue
    book_id = os.path.splitext(fname)[0]
    doc = fitz.open(os.path.join(SRC, fname))
    pages, ok = [], 0
    for i, page in enumerate(doc):
        t = page.get_text("text").strip()
        # 한글이 거의 없으면 깨진 인코딩/스캔본으로 간주
        good = len(t) >= 30 and hangul_ratio(t) > 0.1
        if good: ok += 1
        pages.append(t if good else "")
    with open(os.path.join(OUT, book_id + ".json"), "w", encoding="utf-8") as f:
        json.dump({"file": fname, "pages": pages}, f, ensure_ascii=False)
    first = next((p for p in pages[:6] if p), "")[:80].replace("\n", " ")
    report.append((fname, len(doc), ok, first))
    doc.close()

for fname, n, ok, first in report:
    print(f"{fname} | {n}p | text-ok {ok}p ({ok*100//n}%) | {first!r}")
