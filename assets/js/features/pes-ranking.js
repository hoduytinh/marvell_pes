// Marvell PES Club - features/pes-ranking.js
// Automatic PES Ranking (Dashboard tab 'pesrank'). Not Elo: it rewards how far a player finished in each
// official, finished season and is meant for balancing team picks (high-ranked / title holders get nerfed).
// - Per season: 1st place gets max, last place gets min. Podium is weighted (prFrac): 2nd / 3rd get a fixed
//   share of the range (PR_PODIUM), 4th..last a convex curve from PR_REST down to 0, so the top 3 stand apart.
//   Defaults: league 20 -> 3, every other mode 10 -> 3; per season s.rankPts = {max, min} (Cài đặt giải).
//   Players with the same finish (same knock-out round, or out before the knock-out stage with the same
//   record) share the average of the places they cover. Doubles: both players get the pair's points.
// - Per year: total(Y) = points of the seasons of year Y (x1) + PR_CARRY x total(Y-1).
// Seasons: careerSeasonIds (admin "counted seasons"), playoff seasons excluded, year = seasonYearOf.
// The old manual Ranking season (mode 'ranking') is the admin-only tab "PES Ranking (cũ)".
// Admin list state.pesRankOff = [lower-case names] (players who left the club): they are hidden from a year's
// table unless they played a season of that year (points are still computed, so carry stays correct).
// Other features can use pesRankPoints(name[, year]) / pesRankTable([year]).

var PR_CARRY = 0.5, PR_MIN = 3, PR_YEAR = null;
// Share of (max - min) on top of min for place p of n: 1st 100%, 2nd 80%, 3rd 65%, 4th 55% then curve to 0 (last).
var PR_PODIUM = [1, 0.8, 0.65], PR_REST = 0.55, PR_CURVE = 1.5;
function prFrac(p, n){
  if(n <= 1 || p <= 1) return 1;
  if(p >= n) return 0;
  if(p <= PR_PODIUM.length) return PR_PODIUM[p - 1];
  var k = PR_PODIUM.length + 1;
  return PR_REST * Math.pow((n - p) / (n - k), PR_CURVE);
}

function prDefaults(s){ return { max: s && s.mode === 'league' ? 20 : 10, min: PR_MIN }; }
function prNum(v){ return v === '' || v == null || !isFinite(+v) ? null : +v; }
function prRange(s){
  var d = prDefaults(s), c = (s && s.rankPts) || {};
  var max = prNum(c.max), min = prNum(c.min);
  if(max == null) max = d.max;
  if(min == null) min = d.min;
  return { max: Math.max(max, min), min: Math.min(max, min), custom: !!(s && s.rankPts) };
}
// Settings dialog: stores s.rankPts only when it differs from the mode default.
function prSetRange(s, max, min){
  var d = prDefaults(s);
  max = prNum(max); min = prNum(min);
  if(max == null) max = d.max;
  if(min == null) min = d.min;
  max = Math.max(0, max); min = Math.max(0, min);
  if(min > max){ var t = max; max = min; min = t; }
  if(max === d.max && min === d.min) delete s.rankPts;
  else s.rankPts = { max: max, min: min };
}
function prRound(v){ return Math.round(v * 100) / 100; }

// W=3/D=1 record inside the season: orders players knocked out before the knock-out stage.
function prSeasonRecord(s){
  var rec = {};
  try {
    collectSeasonMatches(s).forEach(function(m){
      if(!m.res || m.rest != null || m.res.hg === '' || m.res.ag === '' || m.res.hg == null || m.res.ag == null) return;
      var hg = +m.res.hg, ag = +m.res.ag;
      if(!isFinite(hg) || !isFinite(ag)) return;
      [[m.home, hg, ag], [m.away, ag, hg]].forEach(function(x){
        var r = rec[x[0]] || (rec[x[0]] = { Pts: 0, GD: 0, GF: 0 });
        r.Pts += x[1] > x[2] ? 3 : (x[1] === x[2] ? 1 : 0);
        r.GD += x[1] - x[2];
        r.GF += x[1];
      });
    });
  } catch(e){}
  return rec;
}

// Table modes have an exact position (f.pos); knock-out modes a depth level (f.lv, careerSeasonFinishes).
function prLevel(f){ return f.lv != null ? f.lv : 0; }
function prCmp(a, b){
  if(a.f.pos != null && b.f.pos != null) return a.f.pos - b.f.pos;
  var d = prLevel(b.f) - prLevel(a.f);
  if(d || prLevel(a.f) > 0) return d;
  return (b.r.Pts - a.r.Pts) || (b.r.GD - a.r.GD) || (b.r.GF - a.r.GF);
}

// Finished season -> { n, max, min, rows: [{idx, team, names, pos, posTo, pts, medal, place}] } (best first), else null.
function prSeasonPoints(s){
  var fin;
  try { fin = careerSeasonFinishes(s); } catch(e){ fin = null; }
  if(!fin) return null;
  var rg = prRange(s), rec = prSeasonRecord(s), dbl = crIsDoubles(s), zero = { Pts: 0, GD: 0, GF: 0 };
  var bye = s.mode === 'chess-swiss' && s.chessSwiss ? s.chessSwiss.byeIndex : -1;
  var list = Object.keys(fin).map(Number).filter(function(i){
    var t = careerName(s.teams[i]);
    return t && !/^bye$/i.test(t) && i !== bye;
  }).map(function(i){
    var team = careerName(s.teams[i]);
    return { idx: i, team: team, names: dbl ? (crPairOf(s, i) || []).map(careerName).filter(Boolean) : [team],
      f: fin[i], r: rec[i] || zero, medal: fin[i].medal || null, place: fin[i].place };
  });
  list.sort(function(a, b){ return prCmp(a, b) || a.team.toLowerCase().localeCompare(b.team.toLowerCase()); });
  var n = list.length, span = rg.max - rg.min;
  for(var i = 0; i < n;){
    var j = i, sum = 0, p;
    while(j + 1 < n && prCmp(list[i], list[j + 1]) === 0) j++;
    for(p = i; p <= j; p++) sum += rg.min + span * prFrac(p + 1, n);
    for(p = i; p <= j; p++){ list[p].pos = i + 1; list[p].posTo = j + 1; list[p].pts = prRound(sum / (j - i + 1)); }
    i = j + 1;
  }
  list.forEach(function(r){ delete r.f; delete r.r; });
  return { n: n, max: rg.max, min: rg.min, custom: rg.custom, rows: list };
}

// { years: [{year, rows, seasons, done}] oldest first, byYear, latest }. Cached like careerData.
var prCache = { ver: -1, st: null, seasons: null, data: null };
function prData(st){
  st = st || state;
  if(typeof crHook === 'function') crHook();
  if(prCache.data && prCache.ver === crVer && prCache.st === st && prCache.seasons === st.seasons) return prCache.data;
  var seasons = [], seen = {};
  careerSeasonIds(st).forEach(function(sid){
    var s = st.seasons[sid];
    if(!s || crIsPlayoff(s)) return;
    var y = typeof seasonYearOf === 'function' ? seasonYearOf(s) : '';
    if(!y) return;
    seen[y] = 1;
    seasons.push({ sid: sid, s: s, year: y, title: typeof seasonTitleOf === 'function' ? seasonTitleOf(s) : (s.name || ''), sp: prSeasonPoints(s) });
  });
  var ys = Object.keys(seen).map(Number).sort(function(a, b){ return a - b; });
  var years = [], byYear = {}, prev = {};
  for(var y = ys[0]; ys.length && y <= ys[ys.length - 1]; y++){
    var Y = String(y), rows = {};
    var list = seasons.filter(function(x){ return x.year === Y; });
    Object.keys(prev).forEach(function(k){
      rows[k] = { name: prev[k].name, carry: prRound(prev[k].total * PR_CARRY), cur: 0, items: [] };
    });
    list.forEach(function(x){
      if(!x.sp) return;
      x.sp.rows.forEach(function(r){
        r.names.forEach(function(nm){
          var k = nm.toLowerCase(), e = rows[k] || (rows[k] = { name: nm, carry: 0, cur: 0, items: [] });
          e.name = nm;
          e.cur += r.pts;
          e.items.push({ sid: x.sid, title: x.title, pos: r.pos, posTo: r.posTo, n: x.sp.n, pts: r.pts, medal: r.medal, place: r.place });
        });
      });
    });
    var arr = Object.keys(rows).map(function(k){
      var e = rows[k];
      e.key = k; e.cur = prRound(e.cur); e.total = prRound(e.carry + e.cur);
      return e;
    }).filter(function(e){ return e.total > 0; })
      .sort(function(a, b){ return b.total - a.total || b.cur - a.cur || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
    var played = {};
    list.forEach(function(x){ prSeasonNames(x.s).forEach(function(nm){ played[nm.toLowerCase()] = 1; }); });
    byYear[Y] = { year: Y, rows: arr, seasons: list, played: played, done: list.filter(function(x){ return x.sp; }).length };
    years.push(byYear[Y]);
    prev = {};
    arr.forEach(function(e){ prev[e.key] = e; });
  }
  var data = { years: years, byYear: byYear, latest: years.length ? years[years.length - 1].year : null };
  prCache = { ver: crVer, st: st, seasons: st.seasons, data: data };
  return data;
}

// Player names of a season (finished or not); doubles = both players of every pair.
function prSeasonNames(s){
  var dbl = crIsDoubles(s), out = [];
  (s.teams || []).forEach(function(t, i){
    var nm = careerName(t);
    if(!nm || /^bye$/i.test(nm)) return;
    if(dbl) (crPairOf(s, i) || []).forEach(function(p){ p = careerName(p); if(p) out.push(p); });
    else out.push(nm);
  });
  return out;
}

// Admin "active players" list: state.pesRankOff holds the unticked (left the club) names.
function prOffSet(){
  var m = {};
  (state.pesRankOff || []).forEach(function(k){ m[String(k).toLowerCase()] = 1; });
  return m;
}
// Rows shown for a year: unticked players only when they played a season of that year.
function prVisibleRows(Y){
  var off = prOffSet();
  return Y.rows.filter(function(r){ return !off[r.key] || Y.played[r.key]; });
}

// Public helpers: total points of a player / the whole table (default: latest year).
function pesRankTable(year){
  var d = prData(state), Y = d.byYear[year || d.latest];
  return Y ? prVisibleRows(Y) : [];
}
function pesRankPoints(name, year){
  var k = careerName(name).toLowerCase();
  var e = pesRankTable(year).filter(function(r){ return r.key === k; })[0];
  return e ? e.total : 0;
}

// ---------------- Dashboard tab ----------------
var PR_MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };
function prPosText(pos, posTo){ return posTo > pos ? pos + '–' + posTo : String(pos); }

function prRenderHtml(only){
  var d = prData(state);
  if(!d.latest) return '<div class="lg-empty">' + lgE(crL('Chưa có giải nào có năm để tính PES Ranking.', 'No season with a year to build the PES Ranking yet.')) + '</div>';
  if(!PR_YEAR || !d.byYear[PR_YEAR]) PR_YEAR = d.latest;
  var Y = d.byYear[PR_YEAR], prevY = String(+PR_YEAR - 1), set = only ? careerMasterSet(state) : null, off = prOffSet();
  var rows = prVisibleRows(Y).filter(function(r){ return !set || set[r.key]; });
  var top = rows.length ? rows[0].total : 0;
  var html = '<p class="muted lg-auto-note">' + lgE(crL(
    'Tự động từ các giải chính thức đã kết thúc. Mỗi giải: hạng nhất nhận điểm tối đa (mặc định league 20, giải khác 10), hạng bét nhận tối thiểu (mặc định 3). Top 3 được tách biệt: hạng 2 nhận 80%, hạng 3 nhận 65%, hạng 4 nhận 55% khoảng điểm, các hạng sau giảm dần về tối thiểu; cùng độ tiến sâu (VD: cùng thua tứ kết) thì chia đều. Tổng năm = điểm các giải trong năm × 1 + tổng năm trước × ' + PR_CARRY + '. Khác Elo: dùng để cân bằng khi chọn đội.',
    'Built automatically from finished official seasons. Each season: 1st place gets the max (default league 20, other formats 10), last place the min (default 3). The top 3 stand apart: 2nd gets 80%, 3rd 65%, 4th 55% of the range, later places go down to the min; players who went out at the same stage share the points. Year total = points of that year\'s seasons × 1 + previous year total × ' + PR_CARRY + '. Not Elo: meant to balance team picks.')) + '</p>';
  var ys = d.years.filter(function(y){ return y.seasons.length; }).reverse();
  if(ys.length > 1) html += '<div class="view-tabs pr-years">' + ys.map(function(y){
    return '<button type="button" class="view-tab' + (y.year === PR_YEAR ? ' active' : '') + '" data-pr-year="' + lgE(y.year) + '">' + lgE(y.year) + '</button>';
  }).join('') + '</div>';
  html += lgKpis([
    { icon: '📅', v: lgE(PR_YEAR), l: crL('Năm', 'Year') },
    { icon: '🏅', v: Y.done + ' <small>/ ' + Y.seasons.length + '</small>', l: crL('Giải đã tính điểm', 'Seasons scored') },
    { icon: '👥', v: rows.length, l: crL('Tuyển thủ', 'Players') },
    { icon: '⭐', v: rows.length ? lgNum(top) : '—', l: crL('Điểm cao nhất', 'Top points') }
  ]);
  var table = rows.map(function(r, i){
    var chips = r.items.map(function(it){
      return '<span class="pr-chip" title="' + lgE(it.title + ' · ' + crL('Hạng ', 'Place ') + prPosText(it.pos, it.posTo) + '/' + it.n + (it.place ? ' · ' + it.place : '')) + '">' +
        (it.medal ? PR_MEDAL[it.medal] + ' ' : '') + '<span class="no-i18n">' + lgE(it.title) + '</span> <b>+' + lgNum(it.pts) + '</b></span>';
    }).join('');
    return '<tr' + (i < 3 ? ' class="lg-top' + (i + 1) + '"' : '') + '><td><span class="lg-rk">' + (i + 1) + '</span></td>' +
      '<td class="lg-l lg-n">' + lgName(r.name) + (off[r.key] && isAdminUser() ? ' <small class="muted" title="' + lgE(crL('Không còn trong danh sách tính rank – chỉ hiện ở năm có tham gia giải', 'Not in the ranked list – only shown in years with a season played')) + '">💤</small>' : '') + '</td><td class="pr-total">' + lgBar(r.total, top, lgNum(r.total)) + '</td>' +
      '<td>' + (r.cur ? lgNum(r.cur) : '<span class="lg-zero">0</span>') + '</td>' +
      '<td class="muted">' + (r.carry ? lgNum(r.carry) : '<span class="lg-zero">0</span>') + '</td>' +
      '<td class="lg-l pr-chips">' + (chips || '<span class="muted">—</span>') + '</td></tr>';
  }).join('');
  html += '<section class="lg-card"><div class="lg-head"><h3>🏆 PES Ranking <span class="lg-year-badge sm">' + lgE(PR_YEAR) + '</span></h3>' +
    '<small>' + lgE(crL('Tổng = điểm ' + PR_YEAR + ' + ' + PR_CARRY + ' × tổng ' + prevY, 'Total = ' + PR_YEAR + ' points + ' + PR_CARRY + ' × ' + prevY + ' total')) + '</small></div>' +
    (rows.length ? lgPodium(rows, function(r){ return lgNum(r.total) + ' <small>' + lgE(crL('điểm', 'pts')) + '</small>'; }) +
      '<div class="cr-table-wrap"><table class="lg-table pr-table"><thead><tr><th>#</th><th class="lg-l">' + lgE(crL('Tuyển thủ', 'Player')) + '</th>' +
      '<th>' + lgE(crL('Tổng', 'Total')) + '</th><th>' + lgE(crL('Điểm ', 'Points ') + PR_YEAR) + '</th>' +
      '<th title="' + lgE(crL('Tổng năm trước × ', 'Previous year total × ') + PR_CARRY) + '">' + lgE(crL('Từ ', 'From ') + prevY + ' (×' + PR_CARRY + ')') + '</th>' +
      '<th class="lg-l">' + lgE(crL('Giải trong năm', 'Seasons this year')) + '</th></tr></thead><tbody>' + table + '</tbody></table></div>'
      : '<div class="lg-empty">' + lgE(crL('Chưa có điểm.', 'No points yet.')) + '</div>') + '</section>';
  html += '<section class="lg-card"><div class="lg-head"><h3>📋 ' + lgE(crL('Điểm từng giải', 'Points per season')) + ' <span class="lg-year-badge sm">' + lgE(PR_YEAR) + '</span></h3>' +
    (isAdminUser() ? '<small>' + lgE(crL('Điểm tối đa / tối thiểu chỉnh trong ⚙️ Cài đặt giải của từng giải.', 'Max / min points are set in each season\'s ⚙️ settings.')) + '</small>' : '') + '</div>' +
    (Y.seasons.length ? '<div class="lg-years">' + Y.seasons.map(prSeasonHtml).join('') + '</div>' : '<div class="lg-empty sm">—</div>') + '</section>';
  return '<div class="lg-wrap pr-wrap">' + html + '</div>';
}

function prSeasonHtml(x){
  var sp = x.sp, rg = sp || prRange(x.s);
  var meta = crModeLabel(x.s.mode || 'league') + ' · ' + lgNum(rg.max) + ' → ' + lgNum(rg.min) + crL(' điểm', ' pts') + (rg.custom ? ' ✎' : '');
  var champ = sp ? sp.rows.filter(function(r){ return r.pos === 1; }).map(function(r){ return '<span class="lg-chip no-i18n">🥇 ' + lgE(r.names.join(' & ') || r.team) + '</span>'; }).join('') : '';
  var head = '<summary class="lg-year-head"><b>' + crSeasonLink(x.sid, x.title) + '</b><span class="lg-year-meta">' + lgE(meta) + (sp ? ' · ' + sp.n + crL(' người', ' players') : '') + '</span>' +
    '<span class="lg-year-champs">' + (sp ? champ : '<span class="muted">⏳ ' + lgE(crL('Chưa kết thúc – chưa tính điểm', 'Not finished – no points yet')) + '</span>') + '</span><span class="lg-chev">▾</span></summary>';
  if(!sp) return '<details class="lg-year">' + head + '</details>';
  var dbl = crIsDoubles(x.s);
  var body = sp.rows.map(function(r){
    return '<tr><td><span class="lg-rk">' + prPosText(r.pos, r.posTo) + '</span></td><td class="lg-l lg-n">' +
      (dbl ? '<span class="no-i18n">' + lgE(r.team) + '</span> <small class="muted">(' + r.names.map(lgName).join(', ') + ')</small>' : lgName(r.team)) + '</td>' +
      '<td class="muted">' + (r.medal ? PR_MEDAL[r.medal] + ' ' : '') + lgE(r.place || '') + '</td><td class="lg-total">+' + lgNum(r.pts) + '</td></tr>';
  }).join('');
  return '<details class="lg-year">' + head + '<div class="lg-year-body"><div class="cr-table-wrap"><table class="lg-table"><thead><tr><th>#</th><th class="lg-l">' +
    lgE(crL('Tuyển thủ', 'Player')) + '</th><th>' + lgE(crL('Thành tích', 'Finish')) + '</th><th>' + lgE(crL('Điểm', 'Points')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div></div></details>';
}

document.addEventListener('click', function(e){
  var b = e.target && e.target.closest && e.target.closest('[data-pr-year]');
  if(!b) return;
  e.preventDefault();
  PR_YEAR = b.getAttribute('data-pr-year');
  renderStatsPage();
});

// Every player that ever had PES Ranking points: [{key, name, total (latest year they appear)}].
function prAllPlayers(){
  var m = {};
  prData(state).years.forEach(function(y){ y.rows.forEach(function(r){ m[r.key] = { key: r.key, name: r.name, total: r.total, year: y.year }; }); });
  return Object.keys(m).map(function(k){ return m[k]; }).sort(function(a, b){ return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
}
function prPlayersCount(){
  var off = prOffSet(), all = prAllPlayers();
  return { on: all.filter(function(p){ return !off[p.key]; }).length, all: all.length };
}

// Admin dialog (Dashboard > PES Ranking > "👥 Người tính rank").
function prPlayersDialog(){
  if(!isAdminUser() || typeof smDialog !== 'function') return;
  var off = prOffSet();
  var rows = prAllPlayers().map(function(p){
    return '<label class="sm-scope-row"><input type="checkbox" data-pk="' + lgE(p.key) + '"' + (off[p.key] ? '' : ' checked') + '>' +
      '<span class="no-i18n">' + lgE(p.name) + '</span><small class="muted">' + lgNum(p.total) + crL(' điểm · ', ' pts · ') + lgE(p.year) + '</small></label>';
  }).join('');
  var dlg = smDialog('<h4>👥 ' + lgE(crL('Người tính PES Ranking', 'Players in the PES Ranking')) + '</h4>' +
    '<p class="muted sm-scope-note">' + lgE(crL('Bỏ tick = người đã nghỉ CLB: bị loại khỏi bảng rank của những năm họ không tham gia giải nào; năm có tham gia vẫn hiện tên.', 'Unticked = left the club: removed from the ranking of years without any season played; years they played still show them.')) + '</p>' +
    '<div class="sm-scope-tools"><button type="button" data-all>' + lgE(crL('Chọn tất cả', 'Select all')) + '</button><button type="button" data-none>' + lgE(crL('Bỏ chọn', 'Select none')) + '</button></div>' +
    '<div class="lg-pick-list sm-scope-list">' + (rows || '<div class="lg-empty sm">—</div>') + '</div>' +
    '<div class="lg-dialog-foot"><button type="button" data-close>' + lgE(crL('Hủy', 'Cancel')) + '</button> <button type="button" class="primary" data-save>' + lgE(crL('Lưu', 'Save')) + '</button></div>',
    function(e, d){
      var all = e.target.closest('[data-all]'), none = e.target.closest('[data-none]');
      if(all || none){
        d.querySelectorAll('.sm-scope-row').forEach(function(r){ if(!r.classList.contains('ls-hidden')) r.querySelector('input').checked = !!all; });
        return;
      }
      if(!e.target.closest('[data-save]')) return;
      var list = [];
      d.querySelectorAll('input[data-pk]').forEach(function(cb){ if(!cb.checked) list.push(cb.getAttribute('data-pk')); });
      // Keep unticked names that have no points right now (e.g. their seasons are turned off).
      var known = {};
      d.querySelectorAll('input[data-pk]').forEach(function(cb){ known[cb.getAttribute('data-pk')] = 1; });
      (state.pesRankOff || []).forEach(function(k){ k = String(k).toLowerCase(); if(!known[k]) list.push(k); });
      list.sort();
      d.close();
      if(list.join('\n') === (state.pesRankOff || []).slice().sort().join('\n')) return;
      if(list.length) state.pesRankOff = list; else delete state.pesRankOff;
      saveAll();
      renderStatsPage();
      if(typeof toast === 'function'){ var c = prPlayersCount(); toast(crL('PES Ranking tính ', 'PES Ranking counts ') + c.on + '/' + c.all + crL(' người', ' players')); }
    });
  if(typeof addListSearch === 'function') addListSearch(dlg.querySelector('.sm-scope-list'), '.sm-scope-row', function(el){ return el.textContent; });
}
