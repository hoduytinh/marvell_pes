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

// ---- Year + title: the season name is "<year> - <title>" (s.year is the record year). ----
// Older seasons without s.year take the 4-digit year at the start of their name.
function seasonYearOf(s){
  if(!s) return '';
  var y = String(s.year == null ? '' : s.year).trim();
  if(/^\d{4}$/.test(y)) return y;
  var m = /^\s*(\d{4})(?!\d)/.exec(s.name || '');
  return m ? m[1] : '';
}
function seasonTitleOf(s){
  var full = String((s && s.name) || '').trim(), n = full, y = seasonYearOf(s);
  if(y && n.indexOf(y) === 0) n = n.slice(y.length).replace(/^\s*[-–—:|·]?\s*/, '');
  return n.trim() || full;
}
function seasonComposeName(year, title){
  year = String(year == null ? '' : year).trim();
  title = String(title == null ? '' : title).trim();
  return year && title ? year + ' - ' + title : (title || year);
}
// Sets s.year + s.name; returns false when the input is invalid (nothing changed).
function seasonSetYearTitle(s, year, title){
  year = String(year == null ? '' : year).trim();
  title = String(title == null ? '' : title).trim();
  if(year && !/^\d{4}$/.test(year)){ alert(smL('Năm phải gồm 4 chữ số (VD: 2026).', 'The year must have 4 digits (e.g. 2026).')); return false; }
  if(!title && !year){ alert(smL('Nhập tên giải.', 'Enter the tournament name.')); return false; }
  if(year) s.year = year; else delete s.year;
  s.name = seasonComposeName(year, title);
  return true;
}

function smDialog(html, onClick){
  var dlg = document.createElement('dialog');
  dlg.className = 'lg-dialog sm-dialog';
  dlg.innerHTML = html;
  dlg.addEventListener('click', function(e){
    if(e.target.closest('[data-close]')){ dlg.close(); return; }
    onClick(e, dlg);
  });
  dlg.addEventListener('close', function(){ if(dlg.parentNode) dlg.parentNode.removeChild(dlg); });
  document.body.appendChild(dlg);
  if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
  return dlg;
}

// Header "Đổi tên": year + title inputs.
function seasonRenameDialog(s){
  if(!s) return;
  var E = function(v){ return escapeHtml(String(v == null ? '' : v)); };
  var dlg = smDialog('<h4>' + E(smL('Đổi tên mùa', 'Rename season')) + '</h4>' +
    '<div class="sm-yt"><label>' + E(smL('Năm', 'Year')) + '<input id="smRenYear" type="number" min="1990" max="2100" step="1" value="' + E(seasonYearOf(s)) + '"></label>' +
    '<label>' + E(smL('Tên giải', 'Title')) + '<input id="smRenTitle" type="text" class="no-i18n" value="' + E(seasonTitleOf(s)) + '"></label></div>' +
    '<div class="muted sm-yt-prev" id="smRenPrev"></div>' +
    '<div class="lg-dialog-foot"><button type="button" data-close>' + E(smL('Hủy', 'Cancel')) + '</button> <button type="button" class="primary" data-save>' + E(smL('Lưu', 'Save')) + '</button></div>',
    function(e, d){
      if(!e.target.closest('[data-save]')) return;
      if(!seasonSetYearTitle(s, d.querySelector('#smRenYear').value, d.querySelector('#smRenTitle').value)) return;
      d.close();
      saveAll();
      refreshSeasonUI();
    });
  var prev = function(){ dlg.querySelector('#smRenPrev').textContent = '→ ' + seasonComposeName(dlg.querySelector('#smRenYear').value, dlg.querySelector('#smRenTitle').value); };
  dlg.addEventListener('input', prev);
  prev();
}

// ---- Stats scope: admins turn seasons on/off (s.statsOff) for every cross-season stat. ----
function seasonStatsIds(){
  var seasons = state.seasons || {}, seen = {}, ids = [];
  (state.seasonOrder || []).concat(Object.keys(seasons)).forEach(function(id){
    var s = seasons[id];
    if(s && !seen[id] && s.mode !== 'legend' && s.mode !== 'ranking'){ seen[id] = 1; ids.push(id); }
  });
  return ids;
}
function seasonStatsCount(){
  var ids = seasonStatsIds();
  return { on: ids.filter(function(id){ return !state.seasons[id].statsOff; }).length, all: ids.length };
}
function seasonScopeDialog(){
  if(typeof isAdminUser !== 'function' || !isAdminUser()){ alert(smL('Chỉ admin được chọn mùa tính thống kê.', 'Only admins can choose the counted seasons.')); return; }
  var E = function(v){ return escapeHtml(String(v == null ? '' : v)); };
  var rows = seasonStatsIds().map(function(id){
    var s = state.seasons[id];
    return '<label class="sm-scope-row"><input type="checkbox" data-sid="' + E(id) + '"' + (s.statsOff ? '' : ' checked') + '>' +
      '<span class="no-i18n">' + E(s.name || id) + '</span><small class="muted">' + E(s.mode || 'league') + (s.locked ? ' · 🔒' : '') + '</small></label>';
  }).join('');
  var dlg = smDialog('<h4>📊 ' + E(smL('Mùa giải tính thống kê', 'Seasons counted in stats')) + '</h4>' +
    '<p class="muted sm-scope-note">' + E(smL('Bỏ tick = mùa bị loại khỏi Dashboard: thẻ, Elo, đối đầu, kỷ lục, danh hiệu và Hall of Legend (auto).', 'Unticked seasons are left out of the Dashboard: cards, Elo, head-to-head, records, trophies and the auto Hall of Legend.')) + '</p>' +
    '<div class="sm-scope-tools"><button type="button" data-all>' + E(smL('Chọn tất cả', 'Select all')) + '</button><button type="button" data-none>' + E(smL('Bỏ chọn', 'Select none')) + '</button></div>' +
    '<div class="lg-pick-list sm-scope-list">' + rows + '</div>' +
    '<div class="lg-dialog-foot"><button type="button" data-close>' + E(smL('Hủy', 'Cancel')) + '</button> <button type="button" class="primary" data-save>' + E(smL('Lưu', 'Save')) + '</button></div>',
    function(e, d){
      var all = e.target.closest('[data-all]'), none = e.target.closest('[data-none]');
      if(all || none){
        d.querySelectorAll('.sm-scope-row').forEach(function(r){ if(!r.classList.contains('ls-hidden')) r.querySelector('input').checked = !!all; });
        return;
      }
      if(!e.target.closest('[data-save]')) return;
      var changed = 0;
      d.querySelectorAll('input[data-sid]').forEach(function(cb){
        var s = state.seasons[cb.getAttribute('data-sid')];
        if(!s || !cb.checked === !!s.statsOff) return;
        if(cb.checked) delete s.statsOff; else s.statsOff = true;
        changed++;
      });
      d.close();
      if(!changed) return;
      saveAll();
      if(typeof refreshSeasonUI === 'function') refreshSeasonUI();
      var sp = document.getElementById('statsPage');
      if(sp && !sp.hidden && typeof renderStatsPage === 'function') renderStatsPage();
      if(typeof toast === 'function'){ var c = seasonStatsCount(); toast(smL('Đang tính thống kê trên ', 'Stats now use ') + c.on + '/' + c.all + smL(' mùa', ' seasons')); }
    });
  if(typeof addListSearch === 'function') addListSearch(dlg.querySelector('.sm-scope-list'), '.sm-scope-row', function(el){ return el.textContent; });
}

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
      if(s.statsOff) b.push('<span class="sm-badge sm-off" title="' + escapeHtml(smL('Admin đã tắt mùa này khỏi thống kê toàn hệ thống', 'An admin turned this season off for all cross-season stats')) + '">📊 ' + smL('Không tính thống kê', 'Not in stats') + '</span>');
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
