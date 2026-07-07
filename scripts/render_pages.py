# 전체 페이지를 WebP 이미지로 변환 → app/pages/<book_id>/<page>.webp
# 중단돼도 재실행하면 이어서 함 (이미 있는 파일 스킵)
import io, os, sys
import fitz
from PIL import Image

SRC = r"C:\Users\yoonj\OneDrive\Desktop\2026_BEE&BE\양봉자료"
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "pages")
WIDTH = 1100  # 휴대폰 확대해도 읽히는 폭

for fname in sorted(os.listdir(SRC)):
    if not fname.lower().endswith(".pdf"): continue
    book_id = os.path.splitext(fname)[0]
    outdir = os.path.join(OUT, book_id)
    os.makedirs(outdir, exist_ok=True)
    doc = fitz.open(os.path.join(SRC, fname))
    for i, page in enumerate(doc):
        dest = os.path.join(outdir, f"{i+1}.webp")
        if os.path.exists(dest): continue
        zoom = WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img.save(dest, "WEBP", quality=55)
    doc.close()
    print(f"done {book_id} ({len(fitz.open(os.path.join(SRC, fname)))}p)", flush=True)
print("ALL DONE")
