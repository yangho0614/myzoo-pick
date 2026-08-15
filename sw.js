/* MYZOO 撿貨核對頁 — 離線快取
   由 發布到web.py 產生，不要手改。
   版本 c365d28e（內容雜湊，index.html 一變就換一組快取） */
var CACHE = "myzoo-pick-c365d28e";
var ASSETS = ["./", "./index.html"];
var NET_TIMEOUT = 3000;

self.addEventListener("install", function(e){
  // 先裝好新版，但不搶著接管 —— 正在撿貨的人不該被中途換版
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

  e.respondWith(
    new Promise(function(resolve){
      var settled = false;
      function done(r){ if(!settled){ settled = true; resolve(r); } }

      // 逾時就先端快取出來，別讓現場盯著白畫面
      var timer = setTimeout(function(){
        caches.match(req, { ignoreSearch: true }).then(function(hit){
          if(hit) done(hit);
        });
      }, NET_TIMEOUT);

      fetch(req).then(function(res){
        clearTimeout(timer);
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        done(res);
      }).catch(function(){
        clearTimeout(timer);
        caches.match(req, { ignoreSearch: true }).then(function(hit){
          done(hit || caches.match("./index.html"));
        });
      });
    })
  );
});
