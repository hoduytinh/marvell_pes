// Marvell PES Club - features/season-meta.js
// Season meta data: kind (official / playoff), format (single / doubles), pairs of a doubles
// team and the lock flag (a locked season is finished and read-only, see core/auth.js isAdmin()).
// Older seasons without explicit values are detected from their name ("Playoff", "Dual", "Đôi").

function smL(vi, en){ return (typeof crL === 'function') ? crL(vi, en) : vi; }

function seasonKind(s){
  if(!s) return 'official';
  if(s.kind === 'official' || s.kind === 'playoff') return s.kind;
  return /play-?off/i.test(s.name || '') ? 'playoff' : 'official';
}

function seasonIsDoubles(s){
  if(!s || s.mode === 'legend' || s.mode === 'ranking') return false;
  if(s.format) return s.format === 'double';
  return /\bdual\b|đôi/i.test(s.name || '');
}

function smFold(x){ return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim(); }

// Known single player names: master list + teams of every singles season.
var smCandCache = { key: '', list: [] };
function smCandidates(){
  var st = (typeof state !== 'undefined' && state) || {}, seasons = st.seasons || {};
  var key = Object.keys(seasons).length + '|' + (st.teamMasterList || []).length + '|' + Object.keys(seasons).map(function(id){ return (seasons[id].teams || []).length; }).join(',');
  if(smCandCache.key === key && smCandCache.st === st) return smCandCache.list;
  var seen = {}, list = [];
  function add(n){ n = String(n == null ? '' : n).trim(); var k = n.toLowerCase(); if(n && !seen[k] && !/^(bye|team \d+)$/i.test(n)){ seen[k] = 1; list.push(n); } }
  (st.teamMasterList || []).forEach(add);
  Object.keys(seasons).forEach(function(id){
    var s = seasons[id];
    if(s && !seasonIsDoubles(s) && s.mode !== 'legend' && s.mode !== 'ranking') (s.teams || []).forEach(add);
  });
  smCandCache = { key: key, st: st, list: list };
  return list;
}

// Short token ("Tĩnh") -> full player name ("Tĩnh Tèo") when it is unambiguous.
function smResolvePlayer(tok){
  tok = String(tok || '').trim();
  if(!tok) return '';
  var cands = smCandidates(), low = tok.toLowerCase();
  var exact = cands.filter(function(c){ return c.toLowerCase() === low; });
  if(exact.length) return exact[0];
  var pre = cands.filter(function(c){ return c.toLowerCase().indexOf(low + ' ') === 0; });
  if(pre.length === 1) return pre[0];
  var word = cands.filter(function(c){ return (' ' + c.toLowerCase() + ' ').indexOf(' ' + low + ' ') !== -1; });
  if(word.length === 1) return word[0];
  var f = smFold(tok);
  if(f.length >= 2){
    var fold = cands.filter(function(c){ return smFold(c).indexOf(f) === 0; });
    if(fold.length === 1) return fold[0];
  }
  return tok;
}

// [player1, player2] of team `idx` of a doubles season, or null.
function seasonPair(s, idx){
  if(!s || !Array.isArray(s.teams)) return null;
  var p = Array.isArray(s.pairs) ? s.pairs[idx] : null;
  if(Array.isArray(p) && p.length === 2 && String(p[0] || '').trim() && String(p[1] || '').trim() && String(p[0]).trim() !== String(p[1]).trim())
    return [String(p[0]).trim(), String(p[1]).trim()];
  var name = String(s.teams[idx] == null ? '' : s.teams[idx]).trim();
  if(!name) return null;
  var toks = name.split(/\s+-\s+|\s*[\/&+,]\s*|\s+và\s+|\s+and\s+/i).filter(Boolean);
  if(toks.length !== 2){
    var sp = name.split(/\s+/);
    toks = sp.length === 2 ? sp : [];
  }
  if(toks.length !== 2) return null;
  var a = smResolvePlayer(toks[0]), b = smResolvePlayer(toks[1]);
  return (a && b && a.toLowerCase() !== b.toLowerCase()) ? [a, b] : null;
}

// Header badges + lock button label (called from render.js refreshSeasonUI).
function seasonMetaUI(s){
  s = s || (typeof activeSeason === 'function' ? activeSeason() : null);
  var locked = !!(s && s.locked);
  document.body.classList.toggle('season-locked', locked);
  var title = document.getElementById('seasonTitle');
  var box = document.getElementById('seasonMetaBadges');
  if(title && !box){
    box = document.createElement('span');
    box.id = 'seasonMetaBadges';
    box.className = 'season-badges';
    title.insertAdjacentElement('afterend', box);
  }
  if(box){
    var b = [];
    if(s && s.mode !== 'legend' && s.mode !== 'ranking'){
      if(locked) b.push('<span class="sm-badge sm-lock">🔒 ' + smL('Đã khóa', 'Locked') + '</span>');
      if(seasonKind(s) === 'playoff') b.push('<span class="sm-badge sm-playoff">' + smL('Playoff · không tính điểm', 'Playoff · no trophy pts') + '</span>');
      if(seasonIsDoubles(s)) b.push('<span class="sm-badge sm-double">👥 ' + smL('Đá đôi', 'Doubles') + '</span>');
    }
    box.innerHTML = b.join('');
    box.hidden = !b.length;
  }
  var btn = document.getElementById('btnLockSeason');
  if(btn){
    btn.textContent = locked ? smL('🔓 Mở khóa mùa', '🔓 Unlock season') : smL('🔒 Khóa mùa', '🔒 Lock season');
    btn.classList.add('no-i18n');
    btn.hidden = !s || s.mode === 'legend' || s.mode === 'ranking';
  }
}

document.addEventListener('click', function(e){
  if(!e.target || !e.target.closest || !e.target.closest('#btnLockSeason')) return;
  var s = typeof activeSeason === 'function' ? activeSeason() : null;
  if(!s || s.mode === 'legend' || s.mode === 'ranking') return;
  if(!ensureAdmin()) return;
  var det = e.target.closest('details');
  if(det) det.open = false;
  var msg = s.locked
    ? smL('Mở khóa mùa "' + (s.name || '') + '"? Mùa giải sẽ có thể chỉnh sửa lại.', 'Unlock "' + (s.name || '') + '"? The season becomes editable again.')
    : smL('Khóa mùa "' + (s.name || '') + '"? Mùa giải được xem là đã kết thúc và không thể chỉnh sửa cho tới khi mở khóa.', 'Lock "' + (s.name || '') + '"? The season is considered finished and cannot be edited until it is unlocked.');
  if(!confirm(msg)) return;
  if(s.locked) delete s.locked; else s.locked = true;
  saveAll();
  refreshSeasonUI();
  if(typeof toast === 'function') toast(s.locked ? smL('Đã khóa mùa giải', 'Season locked') : smL('Đã mở khóa mùa giải', 'Season unlocked'));
});
