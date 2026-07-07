# data/text/*.json → app/data/ 검색용 데이터 생성
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), "..")
TXT = os.path.join(ROOT, "data", "text")
OUT = os.path.join(ROOT, "app", "data")
os.makedirs(OUT, exist_ok=True)

BOOKS = [
    ("000000012743_01", "양봉 사이버농업기술교육", 2014),
    ("000000141277_01", "양봉 농업기술길잡이(개정4판)", 2013),
    ("000000310342_01", "기능성 양봉", 2020),
    ("000000312317_01", "양봉 정보 한눈에", 2020),
    ("000000314988_01", "양봉 현장 전문강사 워크숍 교재", 2022),
    ("000000315983_01", "새해농업인실용교육 축산·양봉·곤충", 2023),
    ("000000317739_01", "양봉생태과 현장연구·지도 자료집", 2023),
    ("000000320884_01", "표준 양봉 용어집", 2021),
    ("000000321549_01", "양봉 기술 이해와 실제", 2025),
    ("양봉-농업기술길잡이015_2020", "양봉 농업기술길잡이(2020 개정판)", 2020),
]

meta = []
for bid, title, year in BOOKS:
    with open(os.path.join(TXT, bid + ".json"), encoding="utf-8") as f:
        pages = json.load(f)["pages"]
    ok = sum(1 for p in pages if p)
    searchable = ok > 0
    if searchable:
        # 검색용: 공백 정리해 용량 축소
        compact = [re.sub(r"\s+", " ", p) for p in pages]
        with open(os.path.join(OUT, bid + ".json"), "w", encoding="utf-8") as f:
            json.dump(compact, f, ensure_ascii=False)
    meta.append({"id": bid, "title": title, "year": year,
                 "pages": len(pages), "searchable": searchable})

with open(os.path.join(OUT, "books.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=1)
for m in meta:
    print(m["id"], m["title"], m["pages"], "searchable" if m["searchable"] else "scan-only")
