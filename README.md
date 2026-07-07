# 🐝 양봉 백과사전

양봉 자료 10권(약 2,300쪽)을 휴대폰·PC에서 검색해 찾아보는 웹앱.

- **검색**: 키워드나 문장(예: "봄벌 키우는 방법")으로 전체 본문 검색
- **백과 항목**: 주요 주제를 요약·달력·절차·비교표로 정리 (출처 표기)
- **원본 보기**: 검색 결과·항목에서 실제 PDF 페이지 이미지 열람
- 오프라인 지원(PWA), 서버·비용 없음

## 자료

농촌진흥청 등 공공누리 개방 자료 기반. `app/pages/`는 원본 PDF를 페이지별
WebP로 변환한 것.

## 로컬 실행

```
python -m http.server 8777 --directory app
```

## 데이터 재생성 (원본 PDF 필요)

```
python scripts/extract_text.py   # 페이지 텍스트 추출
python scripts/build_index.py    # 검색 데이터 생성
python scripts/render_pages.py   # 페이지 이미지 변환
```

## 백과 항목 추가

`app/entries.json`에 항목을 추가하면 검색에 바로 반영됩니다.
