// Marvell PES Club - features/visitors.js
// Header pill "👁 N đang xem · M lượt truy cập" backed by the chat's Firebase Realtime DB (REST):
//   stats/<system>/visits        total visits (server-side increment). A visit = the page is viewed on a
//                                new day or after IDLE of no viewing (shared by all tabs of the browser),
//                                so a tab left open for days still counts once per day it is looked at.
//   stats/<system>/online/<id>   server timestamp of each open tab, refreshed every 30s
// Needs the "stats" rules in the Firebase console; without them the pill simply stays hidden.
(function(){
  var FB = 'https://pes-chat-box-default-rtdb.asia-southeast1.firebasedatabase.app';
  var BEAT = 30000, ALIVE = 90000, STALE = 10 * 60000, IDLE = 30 * 60000;
  var sys = String((typeof PES_SYSTEM_ID !== 'undefined' && PES_SYSTEM_ID) || 'default').replace(/[.#$\[\]\/]/g, '_');
  var base = FB + '/stats/' + encodeURIComponent(sys);
  var id, visits = null, online = null, offset = 0, dead = false;
  try { id = sessionStorage.getItem('pesVisitorId'); } catch(e){}
  if(!id || !/^[a-z0-9]{6,32}$/.test(id)){
    id = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 20);
    try { sessionStorage.setItem('pesVisitorId', id); } catch(e){}
  }
  var L = function(vi, en){ return typeof crL === 'function' ? crL(vi, en) : vi; };

  function req(path, method, body, keepalive){
    var opt = { method: method || 'GET', keepalive: !!keepalive };
    if(body !== undefined){ opt.body = JSON.stringify(body); opt.headers = { 'Content-Type': 'application/json' }; }
    return fetch(base + path + '.json', opt).then(function(r){
      if(r.status === 401 || r.status === 403){ dead = true; throw new Error('Firebase rules: stats/ not allowed'); }
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function pill(){
    var el = document.getElementById('visitorStats');
    if(el) return el;
    var anchor = document.getElementById('btnStatsPage');
    if(!anchor || !anchor.parentNode) return null;
    el = document.createElement('span');
    el.id = 'visitorStats';
    el.className = 'visitor-stats no-i18n';
    el.hidden = true;
    anchor.parentNode.insertBefore(el, anchor);
    return el;
  }
  function render(){
    var el = pill();
    if(!el) return;
    if(dead || (online == null && visits == null)){ el.hidden = true; return; }
    var fmt = function(n){ return Number(n || 0).toLocaleString('vi-VN'); };
    el.innerHTML = '<span class="vs-dot"></span>' + fmt(Math.max(1, online || 0)) + ' ' + L('đang xem', 'online') +
      ' · ' + fmt(visits) + ' ' + L('lượt truy cập', 'visits');
    el.title = L('Số người đang xem trang / tổng lượt truy cập', 'People viewing now / total visits');
    el.hidden = false;
  }

  function countOnline(){
    return req('/online', 'GET').then(function(map){
      var now = Date.now() + offset, n = 0, pruned = 0;
      Object.keys(map || {}).forEach(function(k){
        var t = +map[k];
        if(t > now - ALIVE) n++;
        else if(t < now - STALE && pruned < 5){ pruned++; req('/online/' + encodeURIComponent(k), 'DELETE').catch(function(){}); }
      });
      online = n;
    });
  }
  // Returns true when this view starts a new visit; records the activity either way.
  function newVisit(){
    if(document.hidden) return false;
    var key = 'pesVisitLast@' + sys, now = Date.now(), d = new Date(now);
    var day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), last = null;
    try { last = JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){}
    var isNew = !last || last.d !== day || !(now - last.t < IDLE);
    try { localStorage.setItem(key, JSON.stringify({ t: now, d: day })); } catch(e){ isNew = false; }
    return isNew;
  }
  function syncVisits(){
    if(dead) return;
    var p = newVisit() ? req('/visits', 'PUT', { '.sv': { 'increment': 1 } }) : req('/visits', 'GET');
    p.then(function(v){ visits = +v || 0; render(); }).catch(function(){ render(); });
  }

  function beat(){
    if(dead) return;
    syncVisits();
    req('/online/' + id, 'PUT', { '.sv': 'timestamp' })
      .then(function(ts){ if(isFinite(ts)) offset = ts - Date.now(); return countOnline(); })
      .then(render)
      .catch(function(e){ if(dead){ console.info('Visitor counter off:', e.message); render(); } });
  }

  function start(){
    beat();
    setInterval(beat, BEAT);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) beat(); });
    window.addEventListener('pagehide', function(){
      if(!dead) req('/online/' + id, 'DELETE', undefined, true).catch(function(){});
    });
  }

  if(typeof fetch !== 'function') return;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
