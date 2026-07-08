// 방문한 자원을 캐시 → 오프라인에서도 열람/검색 가능
const CACHE = "bee-v3"; // 데이터 네트워크 우선 전환
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
const cachePut = (req, res) => {
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  return res;
};
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 항목/검색 데이터(JSON)와 앱 셸은 네트워크 우선 → 항상 최신, 오프라인 시 캐시 폴백
  const fresh = url.pathname.endsWith(".json") || url.pathname.endsWith(".js") ||
                url.pathname.endsWith(".css") || url.pathname.endsWith("/");
  if (fresh) {
    e.respondWith(fetch(e.request).then(res => cachePut(e.request, res))
      .catch(() => caches.match(e.request)));
    return;
  }
  // 페이지 이미지 등 무거운 정적 자원은 캐시 우선
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(res => cachePut(e.request, res)))
  );
});
