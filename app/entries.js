// 백과사전 항목 (2단계에서 계속 추가)
// 형식: {id, title, keywords, summary, html, sources:[{book, title, page}]}
const ENTRIES = [
{
  id: "spring-management",
  title: "봄벌 관리 (이른 봄철 봉군 깨우기)",
  keywords: ["봄벌", "봄철", "이른봄", "첫내검", "내검", "깨우기", "봄철관리", "춘계", "화분", "보온", "계상"],
  summary: "월동을 마친 벌을 깨워 유밀기(아까시 꿀)까지 세력을 키우는 과정. 핵심은 ① 첫 내검 시기 결정 ② 벌집 축소 ③ 대용 화분 급여 ④ 보온 ⑤ 물 공급 ⑥ 계상 올리기.",
  html: `
  <h3>지역별 첫 내검 시기</h3>
  <table class="tbl">
    <tr><th>지역</th><th>시기</th></tr>
    <tr><td>제주</td><td>1월 중순</td></tr>
    <tr><td>남해안(따뜻한 곳)</td><td>1월 하순</td></tr>
    <tr><td>남부</td><td>2월 상순~중순</td></tr>
    <tr><td>중부</td><td>2월 중순~3월 상순</td></tr>
  </table>
  <p class="note">전기 가온을 쓰면 약 1개월 앞당길