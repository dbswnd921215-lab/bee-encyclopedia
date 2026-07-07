import fitz, os
SRC = r"C:\Users\yoonj\OneDrive\Desktop\2026_BEE&BE\양봉자료"
DST = r"C:\Users\yoonj\AppData\Local\Temp\claude\C--Users-yoonj\a04e0573-2996-4550-962a-d254acd28144\scratchpad"
os.makedirs(DST, exist_ok=True)
for b in ["000000312317_01", "000000315983_01", "000000320884_01", "000000321549_01"]:
    doc = fitz.open(os.path.join(SRC, b + ".PDF"))
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.2, 1.2))
    pix.save(os.path.join(DST, b + "_cover.png"))
    doc.close()
print("ok")
