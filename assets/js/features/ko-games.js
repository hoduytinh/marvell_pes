// Marvell PES Club - features/ko-games.js
// Per-game scores of a knock-out series (Bo3/Bo5, max 5 games).
// The series result stays in s.results[key] = {hg, ag} (games won); the individual games are stored
// next to it as s.results[key].games = [{h, a, p}] (p = 'h'/'a': penalty winner of a drawn game).
// Career/Elo (features/career.js) rate every game on its own when the games add up to the series.
// Editing the series score by hand drops the games (the mode commit rewrites the result).

var KG_PREFIXES = ['cup-', 'knockout-', 'knockoutB-', 'swiss-playoff-', 'de-'];
var KG_MAX = 5;

function kgL(vi, en){ return (typeof crL === 'function') ? crL(vi, en) : vi; }
function kgIsKoKey(key){ return !!key && KG_PREFIXES.some(function(p){ return key.indexOf(p) === 0; }); }

function kgValidGames(res){
  if(!res || !Array.isArray(res.games)) return null;
  return typeof careerGamesOf === 'function' ? careerGamesOf(res) : null;
}

function kgSeries(games){
  var h = 0, a = 0;
  games.forEach(function(g){
    if(g.h > g.a || (g.h === g.a && g.p === 'h')) h++;
    else if(g.a > g.h || (g.h === g.a && g.p === 'a')) a++;
  });
  return { h: h, a: a };
}

function kgTeams(s, key){
  try {
    var m = collectSeasonMatches(s).filter(function(x){ return x.key === key; })[0];
    if(m) return [String(s.teams[m.home] || ''), String(s.teams[m.away] || '')];
  } catch(e){}
  return null;
}

function kgGamesText(games, names){
  return games.map(function(g, i){
    var pen = g.h === g.a && g.p ? ' (pen: ' + escapeHtml(names ? names[g.p === 'h' ? 0 : 1] : (g.p === 'h' ? '←' : '→')) + ')' : '';
    return '<span class="kg-g">G' + (i + 1) + ' <b>' + g.h + '-' + g.a + '</b>' + pen + '</span>';
  }).join('<span class="kg-sep">·</span>');
}

// Adds the per-game line (and the edit button for admins) under every knock-out match of the list views.
function kgDecorate(){
  var s = typeof activeSeason === 'function' ? activeSeason() : null;
  if(!s || !s.results) return;
  var admin = typeof canEditScores === 'function' && canEditScores(), teamsCache = null;
  document.querySelectorAll('main [data-key]').forEach(function(el){
    var key = el.getAttribute('data-key');
    if(!kgIsKoKey(key)) return;
    var res = s.results[key], games = kgValidGames(res);
    var inp = el.querySelector('input.scoreH'), canEdit = admin && !!inp && !inp.disabled;
    var sig = (games ? JSON.stringify(games) : '') + '|' + (canEdit ? 1 : 0);
    var line = el.querySelector(':scope > .ko-games-line');
    if(el.getAttribute('data-kg-sig') === sig && (line || (!games && !canEdit))) return;
    el.setAttribute('data-kg-sig', sig);
    if(!games && !canEdit){ if(line) line.remove(); return; }
    if(!line){
      line = document.createElement('div');
      line.className = 'ko-games-line';
      el.appendChild(line);
    }
    var names = games ? kgTeams(s, key) : null, auto = !!games && games.some(function(g){ return g.auto; });
    line.innerHTML = (games ? '<span class="kg-list' + (auto ? ' kg-auto' : '') + '">' + kgGamesText(games, names) +
        (auto ? ' <small class="muted" title="' + escapeHtml(kgL('Chưa có tỉ số từng trận: mỗi trận thắng tính 1-0, không tính vào tỉ lệ ghi bàn / sạch lưới', 'No per-game scores: each game won counts as 1-0, excluded from scoring / clean-sheet rates')) + '">(' + kgL('tự điền', 'auto') + ')</small>' : '') + '</span>' : '') +
      (canEdit ? '<button type="button" class="ghost small kg-edit" data-kg-key="' + escapeHtml(key) + '" title="' + escapeHtml(kgL('Nhập tỉ số từng trận (tối đa 5)', 'Enter per-game scores (max 5)')) + '">🎮 ' +
        (games && !auto ? kgL('Sửa tỉ số từng trận', 'Edit game scores') : kgL('Tỉ số từng trận', 'Game scores')) + '</button>' : '');
  });
}

var kgTimer = null;
function kgSchedule(){ clearTimeout(kgTimer); kgTimer = setTimeout(kgDecorate, 120); }
(function(){
  function start(){
    kgDecorate();
    new MutationObserver(function(muts){
      for(var i = 0; i < muts.length; i++){
        var t = muts[i].target;
        if(t && t.closest && t.closest('.ko-games-line')) continue;
        kgSchedule();
        return;
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// ---------------- Dialog ----------------
var kgCur = null;

function kgDialog(){
  var dlg = document.getElementById('koGamesDialog');
  if(dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.id = 'koGamesDialog';
  dlg.className = 'kg-dialog';
  document.body.appendChild(dlg);
  dlg.addEventListener('input', kgPreview);
  dlg.addEventListener('change', kgPreview);
  dlg.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-kg-act]');
    if(!b) return;
    var act = b.getAttribute('data-kg-act');
    if(act === 'cancel') dlg.close();
    else if(act === 'clear') kgClear();
    else if(act === 'save') kgSave();
  });
  return dlg;
}

function kgReadRows(){
  var dlg = kgDialog(), rows = [], bad = false;
  dlg.querySelectorAll('.kg-row').forEach(function(r){
    var h = r.querySelector('.kg-h').value.trim(), a = r.querySelector('.kg-a').value.trim(), p = r.querySelector('.kg-p');
    if(h === '' && a === '') return;
    if(h === '' || a === '' || !isFinite(h) || !isFinite(a) || +h < 0 || +a < 0){ bad = true; return; }
    var g = { h: Math.floor(+h), a: Math.floor(+a) };
    if(g.h === g.a && (p.value === 'h' || p.value === 'a')) g.p = p.value;
    rows.push(g);
  });
  return { games: rows, bad: bad };
}

function kgPreview(){
  var dlg = kgDialog();
  dlg.querySelectorAll('.kg-row').forEach(function(r){
    var h = r.querySelector('.kg-h').value.trim(), a = r.querySelector('.kg-a').value.trim(), p = r.querySelector('.kg-p');
    var draw = h !== '' && a !== '' && +h === +a;
    p.disabled = !draw;
    if(!draw) p.value = '';
  });
  var rd = kgReadRows(), sr = kgSeries(rd.games), out = dlg.querySelector('.kg-series');
  out.innerHTML = rd.bad ? '<span class="kg-warn">' + kgL('Có trận chưa nhập đủ 2 tỉ số.', 'A game is missing a score.') + '</span>'
    : kgL('Tỉ số loạt: ', 'Series: ') + '<span class="no-i18n">' + escapeHtml(kgCur.names[0]) + '</span> <b>' + sr.h + ' – ' + sr.a + '</b> <span class="no-i18n">' + escapeHtml(kgCur.names[1]) + '</span>' +
      (rd.games.length && sr.h === sr.a ? ' <span class="kg-warn">' + kgL('(chưa có đội thắng — trận hòa cần chọn đội thắng luân lưu)', '(no winner yet — pick the penalty winner of drawn games)') + '</span>' : '');
}

function kgOpen(key){
  var s = activeSeason();
  if(!s) return;
  if(!canEditScores()){ if(!authSession()) openAdminLogin(); else toast(kgL('Không có quyền nhập tỉ số', 'No permission to enter scores')); return; }
  var names = kgTeams(s, key);
  if(!names) return;
  kgCur = { key: key, names: names };
  var games = kgValidGames(s.results[key]) || [], dlg = kgDialog(), e = escapeHtml;
  // Auto-filled 1-0 games are placeholders: start from empty rows so that saving never turns them into "real" scores.
  var auto = games.some(function(g){ return g.auto; });
  if(auto) games = [];
  var rows = '';
  for(var i = 0; i < KG_MAX; i++){
    var g = games[i] || {};
    rows += '<div class="kg-row"><span class="kg-n">' + kgL('Trận ', 'Game ') + (i + 1) + '</span>' +
      '<input type="number" min="0" class="kg-h" value="' + (g.h != null ? g.h : '') + '">' +
      '<span>–</span><input type="number" min="0" class="kg-a" value="' + (g.a != null ? g.a : '') + '">' +
      '<select class="kg-p" data-no-search title="' + e(kgL('Thắng luân lưu (trận hòa)', 'Penalty winner (drawn game)')) + '">' +
      '<option value="">' + kgL('Pen: —', 'Pen: —') + '</option><option value="h"' + (g.p === 'h' ? ' selected' : '') + '>' + e(names[0]) + '</option>' +
      '<option value="a"' + (g.p === 'a' ? ' selected' : '') + '>' + e(names[1]) + '</option></select></div>';
  }
  dlg.innerHTML = '<div class="kg-wrap"><div class="kg-head"><strong>🎮 ' + kgL('Tỉ số từng trận', 'Per-game scores') + '</strong>' +
    '<div class="kg-teams no-i18n">' + e(names[0]) + ' <span class="muted">vs</span> ' + e(names[1]) + '</div></div>' +
    '<div class="muted kg-help">' + kgL('Tối đa 5 trận. Tỉ số loạt (số trận thắng) sẽ được cập nhật tự động. Mỗi trận được tính riêng vào Elo / đối đầu / sự nghiệp.',
      'Up to 5 games. The series score (games won) is updated automatically. Each game counts separately for Elo / head-to-head / career.') +
    (auto ? '<br>' + kgL('Loạt này đang dùng tỉ số 1-0 tự điền (không tính vào tỉ lệ ghi bàn). Nhập tỉ số thật để thay thế.', 'This series uses auto-filled 1-0 games (excluded from scoring rates). Enter the real scores to replace them.') : '') + '</div>' +
    '<div class="kg-rows">' + rows + '</div><div class="kg-series"></div>' +
    '<div class="kg-actions"><button type="button" class="ghost" data-kg-act="cancel">' + kgL('Hủy', 'Cancel') + '</button>' +
    (games.length ? '<button type="button" class="danger" data-kg-act="clear">' + kgL('Xóa tỉ số từng trận', 'Clear game scores') + '</button>' : '') +
    '<button type="button" class="primary" data-kg-act="save">' + kgL('Lưu', 'Save') + '</button></div></div>';
  kgPreview();
  if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
}

function kgClear(){
  var s = activeSeason(), r = s && s.results[kgCur.key];
  if(r) delete r.games;
  saveAll();
  kgDialog().close();
  kgRefreshLine(kgCur.key);
}

function kgRefreshLine(key){
  document.querySelectorAll('main [data-key]').forEach(function(el){ if(el.getAttribute('data-key') === key) el.removeAttribute('data-kg-sig'); });
  kgDecorate();
}

// Writes the series score through the mode's own input handlers so that bracket progression is updated.
function kgCommitSeries(key, hg, ag){
  var s = activeSeason();
  function ok(){ var r = s.results[key]; return !!r && +r.hg === hg && +r.ag === ag && r.hg !== '' && r.ag !== ''; }
  if(ok()) return true;
  var el = Array.prototype.filter.call(document.querySelectorAll('main [data-key]'), function(x){ return x.getAttribute('data-key') === key && x.querySelector('input.scoreH'); })[0];
  if(!el) return false;
  var h = el.querySelector('input.scoreH'), a = el.querySelector('input.scoreA');
  if(!h || !a || h.disabled) return false;
  h.value = hg; a.value = ag;
  a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  if(ok()) return true;
  a.dispatchEvent(new Event('change', { bubbles: true }));
  if(ok()) return true;
  a.dispatchEvent(new FocusEvent('blur'));
  return ok();
}

function kgSave(){
  var rd = kgReadRows(), key = kgCur.key;
  if(rd.bad){ alert(kgL('Có trận chưa nhập đủ tỉ số hai đội.', 'A game is missing one of the two scores.')); return; }
  if(!rd.games.length){ kgClear(); return; }
  var sr = kgSeries(rd.games);
  if(sr.h === sr.a){ alert(kgL('Loạt đấu loại trực tiếp phải có đội thắng (chọn đội thắng luân lưu cho trận hòa).', 'A knock-out series needs a winner (pick the penalty winner of drawn games).')); return; }
  if(!kgCommitSeries(key, sr.h, sr.a)){ alert(kgL('Không cập nhật được tỉ số loạt đấu.', 'Could not update the series score.')); return; }
  var s = activeSeason();
  s.results[key].games = rd.games;
  saveAll();
  kgDialog().close();
  if(typeof toast === 'function') toast(kgL('Đã lưu tỉ số từng trận', 'Game scores saved'));
  kgRefreshLine(key);
}

document.addEventListener('click', function(e){
  var b = e.target && e.target.closest && e.target.closest('.kg-edit');
  if(!b) return;
  e.preventDefault();
  e.stopPropagation();
  kgOpen(b.getAttribute('data-kg-key'));
}, true);
