# PDF 목차(북마크)를 뽑아 app/data/toc.json 생성
# 항목을 누르면 원본 페이지 뷰어로 점프하는 "전체 목차" 데이터
import os, json, glob
import fitz

SRC = r"C:\Users\yoonj\OneDrive\Desktop\2026_BEE&BE\양봉자료"
HERE = os.path.dirname(__file__)
BOOKS = {b["id"]: b for b in json.load(
    open(os.path.join(HERE, "..", "app", "data", "books.json"), encoding="utf-8"))}

out = []
seen = set()
for f in sorted(glob.glob(os.path.join(SRC, "*.pdf")) + glob.glob(os.path.join(SRC, "*.PDF"))):
    book_id = os.path.splitext(os.path.basename(f))[0]
    meta = BOOKS.get(book_id)
    if not meta or book_id in seen:
        continue
    seen.add(book_id)
    d = fitz.open(f)
    toc = d.get_toc()
    d.close()
    sections = [{"level": lvl, "title": t.strip(), "page": max(1, pg)}
                for lvl, t, pg in toc if t.strip()]
    if len(sections) < 2:          # 표지뿐인 목차는 제외
        continue
    out.append({"id": book_id, "title": meta["title"],
                "searchable": meta["searchable"], "sections": sections})

dest = os.path.join(HERE, "..", "app", "data", "toc.json")
json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)} books, {sum(len(b['sections']) for b in out)} sections -> {dest}")
