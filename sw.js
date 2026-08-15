/* MYZOO 撿貨核對頁 — 離線快取
   由 發布到web.py 產生，不要手改。
   版本 4680e14c（內容雜湊，index.html 一變就換一組快取）

   🔴 2026-08-15 重寫過。前一版有兩個設計錯誤，害現場一直拿到舊版：
     ① 網路超過 3 秒就端快取出來 —— 倉庫訊號差時幾乎每次都超過，
        等於「有網路也在用舊版」，而且時好時壞最難查。
     ② 快取比對用 ignoreSearch:true —— 讓 `?v=xxx` 這種強制更新的網址
        全部對到同一份舊快取，cache busting 完全失效。
   現在：**頁面本身一律以網路為準**，只有真的連不上才用快取。 */
var CACHE = "myzoo-pick-4680e14c";
var ASSETS = ["./", "./index.html"];

self.addEventListener("install", function(e){
  // skipWaiting：新版裝好就立刻接手，不用等所有分頁關掉。
  // 沒有這行的話，使用者「重新整理」拿到的還是舊的那支 SW 在服務。
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== self.location.origin) return;

  // 頁面本身：網路優先，**沒有逾時搶跑**。只有真的失敗（離線）才用快取。
  // ⚠️ 不要「為了快」加逾時 —— 拿到舊版的代價遠大於多等兩秒。
  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){
      // 真的連不上才走這裡。ignoreSearch 只用在這個離線後備，
      // 這樣 `?v=xxx` 在有網路時才不會被舊快取攔截。
      return caches.match(req, { ignoreSearch: true }).then(function(hit){
        return hit || caches.match("./index.html");
      });
    })
  );
});
