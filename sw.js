// 앱 화면은 새 버전을 먼저 받고, 배경 지우기 AI 파일은 한 번 받으면 기기에 보관해요.
const CACHE = "shelf-v4";          // 앱 화면
const AI_CACHE = "shelf-ai";       // 배경 지우기 AI (버전이 고정이라 바뀌지 않아요)
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./Galmuri9.woff2", "./Galmuri11-Bold.woff2"];
const AI_HOSTS = ["staticimgly.com", "cdn.jsdelivr.net"];

self.addEventListener("install", e => {
  // 파일 하나가 없어도 설치가 멈추지 않게 하나씩 담아요
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("shelf-v") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // 배경 지우기 AI: 기기에 있으면 바로 쓰고, 없을 때만 내려받아 보관해요
  if (AI_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(AI_CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === "opaque") c.put(e.request, r.clone()).catch(() => {});
      return r;
    }));
    return;
  }

  if (url.origin !== location.origin) return;
  // 앱 화면: 새 버전을 먼저 시도하고, 오프라인이면 저장된 화면을 써요
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
