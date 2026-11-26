// Marvell PES Club - features/result-submit.js (shared global scope, load order set in index.html)
// Player result submissions (role 'player', see core/auth.js). A player sends the score of a match
// that has no result yet ONCE: it is stored in Firebase RTDB (the rules forbid overwriting a slot)
// and only becomes a real result when an admin/mod approves it (committed through amCommit).
// "Cho gửi lại" bumps season.subRej[key], which points the match at a fresh (empty) slot.
// Firebase layout: submissions/<system>/<seasonId>/<matchKey>~<n> = { hg, ag, by, ts }

var RS_FB = 'https://pes-chat-box-default-rtdb.asia-southeast1.firebasedatabase.app';
var RS_SUBS = {};   // last fetched tree { sid: { slot: sub } }
var RS_STATE = '';  // '' = not loaded yet, 'ok', 'denied' (Firebase rules missing), 'err'
var rsLastFetch = 0, rsLastUser = null, rsSig = '', rsCur = null;

function rsL(vi, en){ return typeof crL === 'function' ? crL(vi, en) : vi; }
function rsFbKey(v){ return String(v).replace(/[.#$\[\]\/]/g, '_'); }
function rsBase(){ return RS_FB + '/submissions/' + rsFbKey(PES_SYSTEM_ID); }
function rsSlot(s, key){ return rsFbKey(key) + '~' + (+((s && s.subRej) || {})[key] || 0); }
function rsActive(){ return !!authSession() && (isAdminUser() || isSupporter() || isPlayer()); }
function rsScoreOk(v){ return typeof v === 'number' && v >= 0 && v <= 99 && Math.floor(v) === v; }
function rsHasResult(s, key){
  var r = s && s.results && s.results[key];
  return !!(r && (r.bye || (r.hg != null && r.ag != null && r.hg !== '' && r.ag !== '')));
}
function rsOpenSeason(s){ return !!s && !pesIsSpecialSeason(s) && !seasonLocked(s) && !s.forceEnded; }
// Pending (not approved / reopened yet) submission of a match, or null.
function rsPending(sid, key){
  var s = state.seasons && state.seasons[sid];
  if(!s || rsHasResult(s, key)) return null;
  var sub = (RS_SUBS[rsFbKey(sid)] || {})[rsSlot(s, key)];
  return sub && rsScoreOk(sub.hg) && rsScoreOk(sub.ag) ? sub : null;
}
function rsCanSend(sid, key){
  var s = state.seasons && state.seasons[sid];
  return isPlayer() && RS_STATE === 'ok' && rsOpenSeason(s) && !rsHasResult(s, key) && !rsPending(sid, key);
}
function rsCanReview(sid){ var s = state.seasons[sid]; return isAdminUser() && !!s && !seasonLocked(s); }
function rsWhen(ts){
  var d = new Date(+ts);
  if(isNaN(d.getTime())) return '';
  function p(n){ return (n < 10 ? '0' : '') + n; }
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function rsMatch(s, key){
  try { return collectSeasonMatches(s).filter(function(m){ return m.key === key && m.rest == null; })[0] || null; }
  catch(e){ return null; }
}
function rsTeams(s, m){
  var t = s.teams || [];
  return [t[m.home] || ('#' + (m.home + 1)), t[m.away] || ('#' + (m.away + 1))];
}

// ---------- Firebase ----------
function rsFetch(){
  if(!rsActive()) return Promise.resolve(false);
  rsLastFetch = Date.now();
  return fetch(rsBase() + '.json', { cache: 'no-store' }).then(function(r){
    if(r.status === 401 || r.status === 403){ RS_STATE = 'denied'; RS_SUBS = {}; return; }
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json().then(function(d){ RS_STATE = 'ok'; RS_SUBS = d && typeof d === 'object' ? d : {}; });
  }).catch(function(e){
    console.warn('Result submissions: fetch failed', e);
    if(RS_STATE !== 'ok') RS_STATE = 'err';
  }).then(function(){
    var sig = RS_STATE + JSON.stringify(RS_SUBS);
    if(sig !== rsSig){ rsSig = sig; rsRefreshUi(); }
    return RS_STATE === 'ok';
  });
}

function rsSend(sid, key, hg, ag){
  var s = state.seasons[sid], a = authSession();
  var url = rsBase() + '/' + encodeURIComponent(rsFbKey(sid)) + '/' + encodeURIComponent(rsSlot(s, key)) + '.json';
  var denied = rsL('Không gửi được: trận này đã có người gửi, hoặc Firebase chưa bật quyền "submissions".',
    'Not sent: someone already submitted this match, or Firebase "submissions" rules are missing.');
  return fetch(url, { cache: 'no-store' }).then(function(r){
    if(r.status === 401 || r.status === 403) throw new Error(denied);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function(cur){
    if(cur) throw new Error(rsL('Trận này đã có người gửi kết quả.', 'This match already has a submitted result.'));
    return fetch(url, { method: 'PUT', body: JSON.stringify({ hg: hg, ag: ag, by: a.u, ts: { '.sv': 'timestamp' } }) });
  }).then(function(r){
    if(r.status === 401 || r.status === 403) throw new Error(denied);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return rsFetch();
  });
}

// ---------- Review (admin / mod) ----------
function rsApprove(sid, key){
  var sub = rsPending(sid, key);
  if(!sub || !rsCanReview(sid)) return;
  var ok = amCommit(sid, key, sub.hg, sub.ag);
  toast(ok ? rsL('✅ Đã duyệt & lưu kết quả', '✅ Approved & saved') : rsL('⚠️ Không lưu được, bấm ↗ để nhập trong giải', '⚠️ Not saved, use ↗ to enter it in the season'));
  rsRefreshUi();
}

function rsReject(sid, key){
  var s = state.seasons[sid], sub = rsPending(sid, key);
  if(!sub || !rsCanReview(sid)) return;
  if(!confirm(rsL('Bỏ kết quả ' + sub.hg + '-' + sub.ag + ' do ' + sub.by + ' gửi và cho phép gửi lại trận này?',
    'Discard the ' + sub.hg + '-' + sub.ag + ' result sent by ' + sub.by + ' and let this match be submitted again?'))) return;
  if(!s.subRej || typeof s.subRej !== 'object') s.subRej = {};
  s.subRej[key] = (+s.subRej[key] || 0) + 1;
  saveAll();
  toast(rsL('🔁 Đã mở lại, có thể gửi lại kết quả', '🔁 Reopened for a new submission'));
  rsRefreshUi();
}

// ---------- HTML ----------
function rsSendBtn(sid, key, short){
  return '<button type="button" class="ghost rs-send" data-rs-send data-rs-sid="' + escapeHtml(sid) + '" data-rs-key="' + escapeHtml(key) + '" title="' +
    escapeHtml(rsL('Gửi kết quả để admin/mod duyệt (chỉ 1 lần)', 'Submit the result for approval (once)')) + '">📨 ' +
    (short ? rsL('Gửi', 'Send') : rsL('Gửi kết quả', 'Submit result')) + '</button>';
}
function rsReviewBtns(sid, key){
  if(!rsCanReview(sid)) return '';
  var d = ' data-rs-sid="' + escapeHtml(sid) + '" data-rs-key="' + escapeHtml(key) + '"';
  return '<button type="button" class="ghost rs-ok" data-rs-ok' + d + '>✅ ' + rsL('Duyệt', 'Approve') + '</button>' +
    '<button type="button" class="ghost rs-rej" data-rs-rej' + d + ' title="' + escapeHtml(rsL('Bỏ kết quả này, cho gửi lại', 'Discard, allow a new submission')) + '">🔁 ' + rsL('Cho gửi lại', 'Reopen') + '</button>';
}
function rsBadge(sub){
  return '<span class="rs-badge">📨 ' + rsL('Chờ duyệt', 'Awaiting approval') + ' <b class="no-i18n">' + sub.hg + '-' + sub.ag + '</b></span>' +
    '<span class="rs-by muted no-i18n">' + escapeHtml(String(sub.by || '?')) + (sub.ts ? ' · ' + rsWhen(sub.ts) : '') + '</span>';
}
function rsLineHtml(sid, key, sub){ return '<div class="rs-line">' + rsBadge(sub) + rsReviewBtns(sid, key) + '</div>'; }

// Hook for admin-fixtures.js amSeasonHtml rows: { cls, lock, hg, ag, acts, line }.
function rsAmRow(sid, s, m){
  if(!rsActive()) return null;
  var pl = isPlayer(), sub = m.res ? null : rsPending(sid, m.key), x = { cls: pl ? 'am-p' : '', lock: pl };
  if(sub){
    x.cls += ' am-subm';
    if(pl){ x.hg = sub.hg; x.ag = sub.ag; }
    x.line = rsLineHtml(sid, m.key, sub);
  } else if(pl && rsCanSend(sid, m.key)) x.acts = rsSendBtn(sid, m.key, true);
  return x;
}

// Top of the "📝 Nhập kết quả" tab: status + pending submissions of every open season.
function rsPanelHtml(){
  if(!rsActive()) return '';
  var pl = isPlayer(), me = (authSession() || {}).u, note = '';
  if(RS_STATE === '') note = '⏳ ' + rsL('Đang tải kết quả đã gửi…', 'Loading submitted results…');
  else if(RS_STATE === 'denied') note = '⚠️ ' + (pl ? rsL('Chức năng gửi kết quả chưa được bật, hãy báo admin.', 'Result submission is not enabled yet, contact an admin.')
    : rsL('Firebase chưa cho phép "submissions": thêm luật trong Firebase console để player gửi được kết quả.', 'Firebase does not allow "submissions" yet: add the rules in the Firebase console.'));
  else if(RS_STATE === 'err') note = '⚠️ ' + rsL('Không tải được kết quả đã gửi (mạng?).', 'Cannot load submitted results (network?).');
  var items = [];
  (typeof amSeasonIds === 'function' ? amSeasonIds() : []).forEach(function(sid){
    var s = state.seasons[sid], subs = RS_SUBS[rsFbKey(sid)];
    if(!subs) return;
    var ms;
    try { ms = collectSeasonMatches(s); } catch(e){ return; }
    ms.forEach(function(m){
      var sub = m.res ? null : rsPending(sid, m.key);
      if(!sub || (pl && sub.by !== me)) return;
      var t = rsTeams(s, m);
      items.push({ ts: +sub.ts || 0, html: '<div class="rs-item">' +
        '<span class="rs-where"><b class="no-i18n">' + escapeHtml(s.name || sid) + '</b> · ' + escapeHtml(String(m.stage)) + '</span>' +
        '<span class="rs-match"><span class="no-i18n">' + escapeHtml(t[0]) + '</span> <b class="no-i18n">' + sub.hg + '-' + sub.ag + '</b> <span class="no-i18n">' + escapeHtml(t[1]) + '</span></span>' +
        '<span class="rs-by muted no-i18n">' + escapeHtml(String(sub.by || '?')) + (sub.ts ? ' · ' + rsWhen(sub.ts) : '') + '</span>' +
        '<span class="rs-acts">' + rsReviewBtns(sid, m.key) +
        '<button type="button" class="am-open" data-rs-goto data-rs-sid="' + escapeHtml(sid) + '" data-rs-key="' + escapeHtml(m.key) + '" title="' + escapeHtml(rsL('Mở trận này trong giải', 'Open this match in its season')) + '">↗</button></span></div>' });
    });
  });
  items.sort(function(a, b){ return a.ts - b.ts; });
  var head = pl ? rsL('📨 Bạn đã gửi, đang chờ duyệt', '📨 Your submissions awaiting approval') : rsL('📨 Chờ duyệt', '📨 Awaiting approval');
  var html = '<div class="rs-panel">';
  if(pl) html += '<div class="rs-help muted">' + rsL('Bấm <b>📨 Gửi</b> ở trận chưa có kết quả. Mỗi trận chỉ gửi được 1 lần và không sửa được; kết quả chỉ được lưu khi admin/mod duyệt.',
    'Press <b>📨 Send</b> on a match without a result. Each match can be submitted once and cannot be edited; it is saved only after an admin/mod approves it.') + '</div>';
  if(note) html += '<div class="rs-note">' + note + '</div>';
  if(items.length || !pl) html += '<div class="rs-head">' + head + ' <span class="rs-count">' + items.length + '</span></div>' +
    (items.length ? '<div class="rs-items">' + items.map(function(i){ return i.html; }).join('') + '</div>' : '<div class="muted rs-empty">' + rsL('Không có kết quả nào chờ duyệt.', 'Nothing to approve.') + '</div>');
  return html + '</div>';
}

// Badge / send button under the matches of the season views.
function rsDecorate(){
  if(typeof state === 'undefined' || !state || !state.seasons) return;
  var sid = state.current, s = state.seasons[sid], on = !!s && rsActive(), known = null;
  document.querySelectorAll('main.container:not(.stats-page) [data-key]').forEach(function(el){
    var key = el.getAttribute('data-key'), html = '';
    if(on && el.querySelector('input.scoreH')){
      var sub = rsPending(sid, key);
      if(sub) html = rsLineHtml(sid, key, sub);
      else if(rsCanSend(sid, key)){
        if(!known){ known = {}; try { collectSeasonMatches(s).forEach(function(m){ if(m.rest == null) known[m.key] = 1; }); } catch(e){} }
        if(known[key]) html = '<div class="rs-line">' + rsSendBtn(sid, key, false) + '</div>';
      }
    }
    var line = el.querySelector(':scope > .rs-line');
    if((el.getAttribute('data-rs-sig') || '') === html && !!line === !!html) return;
    if(line) line.remove();
    if(html){ el.insertAdjacentHTML('beforeend', html); el.setAttribute('data-rs-sig', html); }
    else el.removeAttribute('data-rs-sig');
  });
}
var rsTimer = null;
function rsSchedule(){ clearTimeout(rsTimer); rsTimer = setTimeout(rsDecorate, 150); }

function rsRefreshUi(){
  if(document.body.classList.contains('page-stats') && typeof statsTab !== 'undefined' && statsTab === 'admin' && typeof renderStatsPage === 'function'){
    var ae = document.activeElement;
    if(!(ae && ae.tagName === 'INPUT' && ae.closest && ae.closest('#statsPage .am-row'))){ // never disturb typing
      var y = window.scrollY;
      renderStatsPage();
      window.scrollTo(0, y);
    }
  }
  rsSchedule();
}

// ---------- Submit dialog (player) ----------
function rsDialog(){
  var dlg = document.getElementById('rsDialog');
  if(dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.id = 'rsDialog';
  dlg.className = 'kg-dialog rs-dialog';
  document.body.appendChild(dlg);
  dlg.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-rs-act]');
    if(!b) return;
    if(b.getAttribute('data-rs-act') === 'cancel') dlg.close();
    else rsDialogSend();
  });
  dlg.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && e.target && e.target.tagName === 'INPUT'){ e.preventDefault(); rsDialogSend(); }
  });
  return dlg;
}

function rsOpenDialog(sid, key){
  var s = state.seasons[sid], m = s && rsMatch(s, key);
  if(!m || !rsCanSend(sid, key)){
    toast(RS_STATE !== 'ok' ? rsL('Chưa gửi được kết quả lúc này', 'Cannot submit right now') : rsL('Trận này không còn gửi được kết quả', 'This match can no longer be submitted'));
    rsRefreshUi();
    return;
  }
  var t = rsTeams(s, m), dlg = rsDialog();
  rsCur = { sid: sid, key: key, names: t };
  dlg.innerHTML = '<div class="kg-wrap"><div class="kg-head"><strong>📨 ' + rsL('Gửi kết quả', 'Submit result') + '</strong>' +
    '<div class="muted"><span class="no-i18n">' + escapeHtml(s.name || sid) + '</span> · ' + escapeHtml(String(m.stage)) + '</div></div>' +
    '<div class="rs-score"><span class="rs-t rs-th no-i18n">' + escapeHtml(t[0]) + '</span>' +
    '<input type="number" min="0" max="99" inputmode="numeric" class="rs-h">' +
    '<span class="am-dash">-</span>' +
    '<input type="number" min="0" max="99" inputmode="numeric" class="rs-a">' +
    '<span class="rs-t no-i18n">' + escapeHtml(t[1]) + '</span></div>' +
    '<div class="rs-warn">⚠️ ' + rsL('Mỗi trận chỉ gửi được 1 lần và KHÔNG sửa được. Kết quả chỉ được lưu khi admin/mod duyệt.',
      'Each match can be submitted ONCE and cannot be edited. The result is saved only after an admin/mod approves it.') + '</div>' +
    '<div class="kg-warn rs-err"></div>' +
    '<div class="kg-actions"><button type="button" class="ghost" data-rs-act="cancel">' + rsL('Hủy', 'Cancel') + '</button>' +
    '<button type="button" class="primary" data-rs-act="send">📨 ' + rsL('Gửi', 'Send') + '</button></div></div>';
  if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
  var h = dlg.querySelector('.rs-h');
  try { h.focus(); } catch(e){}
}

function rsDialogSend(){
  var dlg = rsDialog(), err = dlg.querySelector('.rs-err'), btn = dlg.querySelector('[data-rs-act="send"]');
  if(!rsCur || !btn || btn.disabled) return;
  var hv = dlg.querySelector('.rs-h').value.trim(), av = dlg.querySelector('.rs-a').value.trim();
  var hg = +hv, ag = +av;
  if(hv === '' || av === '' || !rsScoreOk(hg) || !rsScoreOk(ag)){
    err.textContent = rsL('Nhập đủ tỉ số 2 đội (số nguyên 0-99).', 'Enter both scores (whole numbers 0-99).');
    return;
  }
  var cur = rsCur;
  if(!confirm(rsL('Gửi kết quả ' + cur.names[0] + ' ' + hg + '-' + ag + ' ' + cur.names[1] + '?\nSau khi gửi sẽ KHÔNG sửa được.',
    'Submit ' + cur.names[0] + ' ' + hg + '-' + ag + ' ' + cur.names[1] + '?\nIt cannot be edited afterwards.'))) return;
  btn.disabled = true;
  err.textContent = '';
  rsSend(cur.sid, cur.key, hg, ag).then(function(){
    dlg.close();
    toast(rsL('📨 Đã gửi, chờ admin/mod duyệt', '📨 Sent, awaiting approval'));
  }).catch(function(e){
    err.textContent = String(e.message || e);
    rsFetch();
  }).then(function(){ btn.disabled = false; });
}

// ---------- Wiring ----------
document.addEventListener('click', function(e){
  var t = e.target, b = t && t.closest && t.closest('[data-rs-send],[data-rs-ok],[data-rs-rej],[data-rs-goto]');
  if(!b){
    if(t && t.closest && t.closest('#btnAdminFixtures,[data-sp-tab="admin"]') && Date.now() - rsLastFetch > 10000) rsFetch();
    return;
  }
  e.preventDefault();
  e.stopPropagation(); // capture phase: keep row click handlers of the season views out of it
  var sid = b.getAttribute('data-rs-sid'), key = b.getAttribute('data-rs-key');
  if(b.hasAttribute('data-rs-send')) rsOpenDialog(sid, key);
  else if(b.hasAttribute('data-rs-ok')) rsApprove(sid, key);
  else if(b.hasAttribute('data-rs-rej')) rsReject(sid, key);
  else if(typeof amGoto === 'function') amGoto(sid, key);
}, true);

document.addEventListener('visibilitychange', function(){
  if(!document.hidden && rsActive() && Date.now() - rsLastFetch > 20000) rsFetch();
});

(function(){
  function tick(){
    var a = authSession(), u = a && rsActive() ? a.u + '|' + a.role : null;
    if(u !== rsLastUser){
      rsLastUser = u;
      RS_SUBS = {}; RS_STATE = ''; rsSig = '';
      if(u) rsFetch(); else rsRefreshUi();
      return;
    }
    if(u && !document.hidden && Date.now() - rsLastFetch > 60000) rsFetch();
  }
  function start(){
    tick();
    setInterval(tick, 5000);
    new MutationObserver(function(muts){
      for(var i = 0; i < muts.length; i++){
        var t = muts[i].target;
        if(t && t.closest && (t.closest('.rs-line') || t.closest('.ko-games-line') || t.closest('#statsPage'))) continue;
        rsSchedule();
        return;
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
