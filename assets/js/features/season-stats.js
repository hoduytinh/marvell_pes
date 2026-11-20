// Marvell PES Club - features/season-stats.js
// "Stats" tab of every season format (not legend / ranking), rendered into #seasonStatsBoard:
// key numbers, leaders & streaks, full team table (sortable), home / away split, scorelines,
// goals per match, per-round breakdown, record matches, upsets, Elo movers, crosstable and form guide.
// Data = the season's rated entries (season-news.js snData / career.js). Knock-out series without
// per-game scores count their series score as goals; series with game scores are split per game.

var ssMemo = { key: null, html: '' }, ssSort = { col: 'rank', dir: 1 };

function ssPct(n, d){ return d ? Math.round(n * 100 / d) + '%' : '—'; }
function ssNum(v, dec){ return v == null || !isFinite(v) ? '—' : (+v).toFixed(dec == null ? 2 : dec); }
function ssRunMax(arr, ok){ var m = 0, c = 0; arr.forEach(function(x){ if(ok(x)){ c++; if(c > m) m = c; } else c = 0; }); return m; }
function ssRL(r){ return r === 'W' ? crL('T', 'W') : r === 'L' ? crL('B', 'L') : crL('H', 'D'); }
function ssChips(seq){ return '<span class="sn-form">' + seq.map(function(r){ return '<i class="' + r + '">' + ssRL(r) + '</i>'; }).join('') + '</span>'; }

function ssCompute(s){
  var D = snData(s), W3 = D.W3, byName = {}, roundOf = {};
  D.list.forEach(function(m){ roundOf[m.key] = m.round || m.stage; });
  var S = D.teams.map(function(t){
    var r = { t: t, idx: t.idx, name: t.name, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, CS: 0, FTS: 0, BTTS: 0,
      H: { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 }, A: { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 },
      seq: [], gf: [], ga: [], elo0: null, eloD: 0, maxGF: 0 };
    byName[t.name] = r;
    return r;
  });

  // Played entries (oldest first)
  var M = [];
  D.ent.forEach(function(m){
    var h = byName[m.home], a = byName[m.away];
    if(!h || !a || !isFinite(m.hg) || !isFinite(m.ag)) return;
    var key = String(m.key || '').replace(/#\d+$/, '');
    var x = { h: h, a: a, hg: +m.hg, ag: +m.ag, stage: m.stage || '', round: roundOf[key] || m.stage || '',
      ko: !!(m.ko || m.koGame), pen: m.pen || null, eloH: m.eloH, eloA: m.eloA, eloD: isFinite(m.eloD) ? m.eloD : 0 };
    M.push(x);
    [[h, x.hg, x.ag, 'H', x.eloH, x.eloD], [a, x.ag, x.hg, 'A', x.eloA, -x.eloD]].forEach(function(y){
      var r = y[0], gf = y[1], ga = y[2], res = careerResult(gf, ga), side = r[y[3]];
      r.P++; r[res]++; r.GF += gf; r.GA += ga;
      if(!ga) r.CS++;
      if(!gf) r.FTS++;
      if(gf && ga) r.BTTS++;
      side.P++; side[res]++; side.GF += gf; side.GA += ga;
      r.seq.push(res); r.gf.push(gf); r.ga.push(ga);
      if(gf > r.maxGF) r.maxGF = gf;
      if(r.elo0 == null && isFinite(y[4])) r.elo0 = y[4];
      r.eloD += y[5];
    });
  });

  S.forEach(function(r){
    r.GD = r.GF - r.GA;
    r.Pts = r.W * W3 + r.D;
    r.H.Pts = r.H.W * W3 + r.H.D; r.A.Pts = r.A.W * W3 + r.A.D;
    r.wp = r.P ? r.W / r.P : null;
    r.ppg = r.P ? r.Pts / r.P : null;
    r.gfpg = r.P ? r.GF / r.P : null;
    r.gapg = r.P ? r.GA / r.P : null;
    r.bttsP = r.P ? r.BTTS / r.P : null;
    if(r.elo0 == null) r.elo0 = r.t.elo;
    r.elo1 = r.elo0 + r.eloD;
    r.runW = ssRunMax(r.seq, function(x){ return x === 'W'; });
    r.runU = ssRunMax(r.seq, function(x){ return x !== 'L'; });
    r.runL = ssRunMax(r.seq, function(x){ return x === 'L'; });
    r.runNW = ssRunMax(r.seq, function(x){ return x !== 'W'; });
    r.runSc = ssRunMax(r.gf, function(x){ return x > 0; });
    r.runCS = ssRunMax(r.ga, function(x){ return x === 0; });
    var last = r.seq[r.seq.length - 1], cur = 0;
    for(var i = r.seq.length - 1; i >= 0 && r.seq[i] === last; i--) cur++;
    r.cur = last ? { r: last, n: cur } : null;
    r.last5 = r.seq.slice(-5);
    r.f5 = r.last5.reduce(function(a, x){ return a + (x === 'W' ? W3 : x === 'D' ? 1 : 0); }, 0);
  });

  // Default order: table formats follow the standings, the others points / GD / GF.
  var order = {};
  if(D.table && D.table.length) D.table.forEach(function(b, i){ order[b.t.idx] = i; });
  var ranked = S.slice().sort(function(a, b){
    var oa = order[a.idx], ob = order[b.idx];
    if(oa != null || ob != null) return (oa == null ? 1e9 : oa) - (ob == null ? 1e9 : ob);
    return b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || b.W - a.W || a.name.localeCompare(b.name);
  });
  ranked.forEach(function(r, i){ r.rank = i + 1; });

  var fin = null;
  try { fin = careerSeasonFinishes(s); } catch(e){ fin = null; }
  if(fin) S.forEach(function(r){ r.fin = fin[r.idx] || null; });

  // Totals
  var T = { n: M.length, G: 0, hG: 0, aG: 0, hW: 0, dr: 0, aW: 0, btts: 0, o25: 0, nil: 0, cs: 0, five: 0, pen: 0, koN: 0, koG: 0, eloX: 0,
    scores: {}, hist: [0, 0, 0, 0, 0, 0, 0, 0] };
  M.forEach(function(x){
    var g = x.hg + x.ag;
    T.G += g; T.hG += x.hg; T.aG += x.ag;
    if(x.hg > x.ag) T.hW++; else if(x.hg < x.ag) T.aW++; else T.dr++;
    if(x.hg && x.ag) T.btts++;
    if(g > 2) T.o25++;
    if(!g) T.nil++;
    if(!x.hg) T.cs++;
    if(!x.ag) T.cs++;
    if(g >= 5) T.five++;
    if(x.pen) T.pen++;
    if(x.ko){ T.koN++; T.koG += g; }
    T.eloX += Math.abs(x.eloD);
    var sc = Math.max(x.hg, x.ag) + '-' + Math.min(x.hg, x.ag);
    T.scores[sc] = (T.scores[sc] || 0) + 1;
    T.hist[Math.min(7, g)]++;
  });
  T.ties = D.played.filter(function(m){ return m.ko; }).length;

  // Rounds (in play order)
  var rounds = [], rMap = {};
  M.forEach(function(x){
    var r = rMap[x.round];
    if(!r){ r = rMap[x.round] = { label: x.round, n: 0, G: 0, hW: 0, dr: 0, aW: 0, best: null }; rounds.push(r); }
    r.n++; r.G += x.hg + x.ag;
    if(x.hg > x.ag) r.hW++; else if(x.hg < x.ag) r.aW++; else r.dr++;
    var mg = Math.abs(x.hg - x.ag), bg = r.best ? Math.abs(r.best.hg - r.best.ag) : -1;
    if(mg > bg || (mg === bg && x.hg + x.ag > r.best.hg + r.best.ag)) r.best = x;
  });

  // Upsets: winner's pre-match Elo win chance
  var upsets = [];
  M.forEach(function(x){
    if(x.hg === x.ag || !isFinite(x.eloH) || !isFinite(x.eloA)) return;
    var hw = x.hg > x.ag, p = snWinP(hw ? x.eloH : x.eloA, hw ? x.eloA : x.eloH);
    if(p < 0.45) upsets.push({ x: x, p: p });
  });
  upsets.sort(function(a, b){ return a.p - b.p; });

  return { D: D, s: s, S: S, ranked: ranked, M: M, T: T, rounds: rounds, upsets: upsets, W3: W3, fin: fin };
}

// ---------------- HTML pieces ----------------
function ssName(R, r){ return R.D.dbl ? '<b class="no-i18n">' + snE(r.name) + '</b>' : crTeam(r.name); }
function ssSec(icon, title, body, sub){
  return '<section class="ss-sec"><h3>' + icon + ' ' + title + (sub ? ' <small>' + sub + '</small>' : '') + '</h3>' + body + '</section>';
}
function ssKpi(label, value, sub, cls){
  return '<div class="ov-stat' + (cls ? ' ' + cls : '') + '"><div class="ov-label">' + label + '</div><div class="ov-value">' + value + '</div>' +
    (sub ? '<div class="ov-sub">' + sub + '</div>' : '') + '</div>';
}
function ssSplit(a, b, c){
  var t = a + b + c || 1;
  return '<div class="ss-split"><i class="h" style="width:' + (a * 100 / t).toFixed(1) + '%"></i><i class="d" style="width:' + (b * 100 / t).toFixed(1) +
    '%"></i><i class="a" style="width:' + (c * 100 / t).toFixed(1) + '%"></i></div>';
}
function ssMatch(R, x, extra){
  var hw = x.hg > x.ag || (x.hg === x.ag && x.pen === 'h'), aw = x.ag > x.hg || (x.hg === x.ag && x.pen === 'a');
  return '<div class="ss-match"><span class="ss-st">' + snE(x.stage) + '</span><span class="ss-h no-i18n' + (hw ? ' win' : '') + '">' + snE(x.h.name) + '</span>' +
    '<b class="ss-sc">' + x.hg + ' - ' + x.ag + (x.pen ? ' <small>(' + crL('pen', 'pens') + ')</small>' : '') + '</b>' +
    '<span class="ss-a no-i18n' + (aw ? ' win' : '') + '">' + snE(x.a.name) + '</span><span class="ss-x">' + (extra || '') + '</span></div>';
}
function ssMatchList(R, list, extraFn){
  if(!list.length) return '<div class="muted small">' + crL('Chưa có dữ liệu', 'No data yet') + '</div>';
  return list.map(function(x){ return ssMatch(R, x.x || x, extraFn ? extraFn(x) : ''); }).join('');
}

function ssKpis(R){
  var T = R.T, D = R.D, n = T.n, h = '';
  var tot = D.total || D.played.length, pct = tot ? Math.round(D.played.length * 100 / tot) : 0;
  h += ssKpi(crL('Tiến độ', 'Progress'), D.played.length + ' / ' + tot + ' <small class="muted">(' + pct + '%)</small>',
    '<div class="ov-bar"><i style="width:' + pct + '%"></i></div>');
  h += ssKpi(crL('Số đội', 'Teams'), D.teams.length, D.dbl ? crL('Đánh đôi', 'Doubles') : '');
  h += ssKpi(crL('Tổng bàn thắng', 'Total goals'), T.G, n ? crL('TB ', 'Avg ') + ssNum(T.G / n) + crL(' bàn/trận', ' per match') : '');
  if(n !== D.played.length) h += ssKpi(crL('Số ván đã đá', 'Games played'), n, crL('Knock-out tính từng ván', 'Knock-out split into games'));
  h += ssKpi(crL('Nhà thắng · Hòa · Khách thắng', 'Home W · Draw · Away W'), T.hW + ' · ' + T.dr + ' · ' + T.aW,
    ssSplit(T.hW, T.dr, T.aW) + '<span class="ss-mini">' + ssPct(T.hW, n) + ' · ' + ssPct(T.dr, n) + ' · ' + ssPct(T.aW, n) + '</span>', 'ov-wide');
  h += ssKpi(crL('Bàn sân nhà · sân khách', 'Home · away goals'), T.hG + ' · ' + T.aG, n ? ssNum(T.hG / n) + ' · ' + ssNum(T.aG / n) + crL(' /trận', ' per match') : '');
  h += ssKpi(crL('Cả hai đội ghi bàn', 'Both teams scored'), T.btts, ssPct(T.btts, n) + crL(' số trận', ' of matches'));
  h += ssKpi(crL('Trên 2.5 bàn', 'Over 2.5 goals'), T.o25, ssPct(T.o25, n) + crL(' số trận', ' of matches'));
  h += ssKpi(crL('Trận ≥ 5 bàn', 'Matches with 5+ goals'), T.five, ssPct(T.five, n));
  h += ssKpi(crL('Giữ sạch lưới', 'Clean sheets'), T.cs, n ? ssPct(T.cs, n * 2) + crL(' lượt đội', ' of team-matches') : '');
  h += ssKpi(crL('Hòa 0-0', 'Goalless draws'), T.nil, ssPct(T.nil, n));
  var top = Object.keys(T.scores).sort(function(a, b){ return T.scores[b] - T.scores[a]; })[0];
  if(top) h += ssKpi(crL('Tỉ số phổ biến nhất', 'Most common score'), top, T.scores[top] + crL(' lần', ' times') + ' · ' + ssPct(T.scores[top], n));
  if(T.ties) h += ssKpi(crL('Cặp knock-out', 'Knock-out ties'), T.ties, T.koN ? crL('TB ', 'Avg ') + ssNum(T.koG / T.koN) + crL(' bàn/ván', ' goals per game') : '');
  if(T.pen) h += ssKpi(crL('Phân định luân lưu', 'Decided on penalties'), T.pen);
  var eloAvg = D.teams.length ? D.teams.reduce(function(a, t){ return a + t.elo; }, 0) / D.teams.length : null;
  if(eloAvg != null) h += ssKpi(crL('Elo trung bình hiện tại', 'Current average Elo'), Math.round(eloAvg));
  if(T.eloX) h += ssKpi(crL('Tổng Elo luân chuyển', 'Elo exchanged'), Math.round(T.eloX), n ? crL('TB ', 'Avg ') + ssNum(T.eloX / n, 1) + crL('/trận', ' per match') : '');
  return ssSec('📊', crL('Số liệu tổng quan', 'Key numbers'), '<div class="ov-grid">' + h + '</div>');
}

function ssLead(rows, val, opt){
  opt = opt || {};
  var best = null, out = [];
  rows.forEach(function(r){
    if(opt.filter && !opt.filter(r)) return;
    var v = val(r);
    if(v == null || !isFinite(v)) return;
    if(best == null || (opt.min ? v < best - 1e-9 : v > best + 1e-9)){ best = v; out = [r]; }
    else if(Math.abs(v - best) < 1e-9) out.push(r);
  });
  if(best == null || (!opt.zero && !best)) return null;
  return { v: best, rows: out };
}
function ssLeaders(R){
  var S = R.S.filter(function(r){ return r.P; });
  if(!S.length) return '';
  var maxP = Math.max.apply(null, S.map(function(r){ return r.P; })), minP = Math.max(1, Math.ceil(maxP / 2));
  var enough = function(r){ return r.P >= minP; };
  var defs = [
    ['⚽', crL('Ghi nhiều bàn nhất', 'Most goals scored'), function(r){ return r.GF; }],
    ['🔥', crL('TB ghi bàn cao nhất', 'Best scoring rate'), function(r){ return r.gfpg; }, { filter: enough, fmt: function(v){ return ssNum(v) + crL('/trận', '/match'); } }],
    ['🧱', crL('Thủng lưới ít nhất', 'Fewest conceded'), function(r){ return r.GA; }, { min: 1, zero: 1, filter: enough }],
    ['🛡️', crL('TB thủng lưới thấp nhất', 'Best defensive rate'), function(r){ return r.gapg; }, { min: 1, zero: 1, filter: enough, fmt: function(v){ return ssNum(v) + crL('/trận', '/match'); } }],
    ['🥅', crL('Nhiều trận sạch lưới nhất', 'Most clean sheets'), function(r){ return r.CS; }],
    ['📉', crL('Thủng lưới nhiều nhất', 'Most goals conceded'), function(r){ return r.GA; }],
    ['➕', crL('Hiệu số tốt nhất', 'Best goal difference'), function(r){ return r.GD; }, { zero: 1, fmt: function(v){ return snSigned(v); } }],
    ['✅', crL('Thắng nhiều nhất', 'Most wins'), function(r){ return r.W; }],
    ['📈', crL('Tỉ lệ thắng cao nhất', 'Best win rate'), function(r){ return r.wp; }, { filter: enough, fmt: function(v){ return Math.round(v * 100) + '%'; } }],
    ['🤝', crL('Hòa nhiều nhất', 'Most draws'), function(r){ return r.D; }],
    ['❌', crL('Thua nhiều nhất', 'Most defeats'), function(r){ return r.L; }],
    ['😶', crL('Tịt ngòi nhiều nhất', 'Most blanks'), function(r){ return r.FTS; }],
    ['🔗', crL('Chuỗi thắng dài nhất', 'Longest winning run'), function(r){ return r.runW; }, { fmt: ssRunFmt }],
    ['🧗', crL('Chuỗi bất bại dài nhất', 'Longest unbeaten run'), function(r){ return r.runU; }, { fmt: ssRunFmt }],
    ['🎯', crL('Chuỗi trận có bàn dài nhất', 'Longest scoring run'), function(r){ return r.runSc; }, { fmt: ssRunFmt }],
    ['🔒', crL('Chuỗi sạch lưới dài nhất', 'Longest clean-sheet run'), function(r){ return r.runCS; }, { fmt: ssRunFmt }],
    ['💀', crL('Chuỗi thua dài nhất', 'Longest losing run'), function(r){ return r.runL; }, { fmt: ssRunFmt }],
    ['🥶', crL('Chuỗi không thắng dài nhất', 'Longest winless run'), function(r){ return r.runNW; }, { fmt: ssRunFmt }],
    ['⚡', crL('Phong độ 5 trận tốt nhất', 'Best last-5 form'), function(r){ return r.f5; }, { fmt: function(v){ return v + crL('đ', ' pts'); } }],
    ['🏠', crL('Thắng sân nhà nhiều nhất', 'Most home wins'), function(r){ return r.H.W; }],
    ['✈️', crL('Thắng sân khách nhiều nhất', 'Most away wins'), function(r){ return r.A.W; }],
    ['💥', crL('Nhiều bàn nhất trong 1 trận', 'Most goals in one match'), function(r){ return r.maxGF; }],
    ['🚀', crL('Tăng Elo nhiều nhất', 'Biggest Elo gain'), function(r){ return r.eloD; }, { fmt: function(v){ return snSigned(v); } }],
    ['🪂', crL('Giảm Elo nhiều nhất', 'Biggest Elo drop'), function(r){ return r.eloD; }, { min: 1, fmt: function(v){ return snSigned(v); } }]
  ];
  var cards = defs.map(function(d){
    var o = d[3] || {}, L = ssLead(S, d[2], o);
    if(!L) return '';
    if(d[0] === '🪂' && L.v >= 0) return '';
    if(d[0] === '🚀' && L.v <= 0) return '';
    var names = L.rows.slice(0, 2).map(function(r){ return ssName(R, r); }).join(', ') + (L.rows.length > 2 ? ' <span class="muted">+' + (L.rows.length - 2) + '</span>' : '');
    return '<div class="ss-lead"><div class="ss-lead-l">' + d[0] + ' ' + d[1] + '</div><div class="ss-lead-v"><b>' + (o.fmt ? o.fmt(L.v) : L.v) + '</b><span class="ss-lead-n">' + names + '</span></div></div>';
  }).join('');
  return ssSec('🏅', crL('Dẫn đầu các chỉ số', 'Stat leaders'), '<div class="ss-leaders">' + cards + '</div>',
    crL('Chỉ số theo tỉ lệ cần đá ≥ ' + minP + ' trận', 'Rate stats need ≥ ' + minP + ' matches'));
}
function ssRunFmt(v){ return v + crL(' trận', v === 1 ? ' match' : ' matches'); }

var SS_COLS = [
  { k: 'rank', vi: '#', en: '#' },
  { k: 'name', vi: 'Đội', en: 'Team', name: 1 },
  { k: 'P', vi: 'Tr', en: 'P', tv: 'Số trận', te: 'Played' },
  { k: 'W', vi: 'T', en: 'W', tv: 'Thắng', te: 'Won' },
  { k: 'D', vi: 'H', en: 'D', tv: 'Hòa', te: 'Drawn' },
  { k: 'L', vi: 'B', en: 'L', tv: 'Thua', te: 'Lost' },
  { k: 'GF', vi: 'BT', en: 'GF', tv: 'Bàn thắng', te: 'Goals for' },
  { k: 'GA', vi: 'BB', en: 'GA', tv: 'Bàn bại', te: 'Goals against' },
  { k: 'GD', vi: 'HS', en: 'GD', tv: 'Hiệu số', te: 'Goal difference', signed: 1 },
  { k: 'Pts', vi: 'Đ', en: 'Pts', tv: 'Điểm (mọi trận, kể cả knock-out)', te: 'Points (all matches incl. knock-out)' },
  { k: 'ppg', vi: 'Đ/Tr', en: 'PPG', tv: 'Điểm trung bình mỗi trận', te: 'Points per game', dec: 2 },
  { k: 'wp', vi: '%T', en: 'W%', tv: 'Tỉ lệ thắng', te: 'Win rate', pct: 1 },
  { k: 'gfpg', vi: 'BT/Tr', en: 'GF/G', tv: 'Bàn thắng mỗi trận', te: 'Goals for per game', dec: 2 },
  { k: 'gapg', vi: 'BB/Tr', en: 'GA/G', tv: 'Bàn bại mỗi trận', te: 'Goals against per game', dec: 2 },
  { k: 'CS', vi: 'SL', en: 'CS', tv: 'Trận giữ sạch lưới', te: 'Clean sheets' },
  { k: 'FTS', vi: 'TN', en: 'FTS', tv: 'Trận tịt ngòi', te: 'Failed to score' },
  { k: 'bttsP', vi: '2ĐGB', en: 'BTTS', tv: 'Tỉ lệ trận cả hai đội ghi bàn', te: 'Both teams scored rate', pct: 1 },
  { k: 'runW', vi: 'Chuỗi T', en: 'Best W run', tv: 'Chuỗi thắng dài nhất', te: 'Longest winning run' },
  { k: 'runU', vi: 'Bất bại', en: 'Unbeaten', tv: 'Chuỗi bất bại dài nhất', te: 'Longest unbeaten run' },
  { k: 'elo0', vi: 'Elo đầu', en: 'Elo start', tv: 'Elo trước trận đầu tiên của mùa', te: 'Elo before the first match of the season', dec: 0 },
  { k: 'elo1', vi: 'Elo cuối', en: 'Elo end', tv: 'Elo sau trận gần nhất của mùa', te: 'Elo after the latest match of the season', dec: 0 },
  { k: 'eloD', vi: '±Elo', en: '±Elo', tv: 'Elo thay đổi trong mùa', te: 'Elo change this season', elo: 1 },
  { k: 'form', vi: '5 trận gần nhất', en: 'Last 5', nosort: 1 }
];
function ssCell(R, c, r){
  var v = r[c.k];
  if(c.name) return '<td class="ss-name">' + ssName(R, r) + (r.fin && r.fin.medal ? ' ' + CR_MEDAL_ICON[r.fin.medal] : '') + '</td>';
  if(c.k === 'form') return '<td>' + ssChips(r.last5) + '</td>';
  if(v == null || !isFinite(v)) return '<td class="muted">—</td>';
  if(c.signed) return '<td>' + (v > 0 ? '+' : '') + v + '</td>';
  if(c.pct) return '<td>' + Math.round(v * 100) + '%</td>';
  if(c.elo){ var d = Math.round(v); return '<td class="' + (d > 0 ? 'cr-up' : d < 0 ? 'cr-down' : 'muted') + '">' + snSigned(v) + '</td>'; }
  if(c.dec != null) return '<td>' + ssNum(v, c.dec) + '</td>';
  return '<td>' + v + '</td>';
}
function ssTeamTable(R){
  var col = SS_COLS.filter(function(c){ return c.k === ssSort.col; })[0] || SS_COLS[0], dir = ssSort.dir;
  var rows = R.S.slice().sort(function(a, b){
    if(col.name) return dir * a.name.localeCompare(b.name);
    var x = a[col.k], y = b[col.k];
    x = x == null || !isFinite(x) ? -Infinity : x; y = y == null || !isFinite(y) ? -Infinity : y;
    return dir * (x - y) || a.rank - b.rank;
  });
  var head = SS_COLS.map(function(c){
    var t = c.tv ? ' title="' + snE(crL(c.tv, c.te)) + '"' : '';
    var arrow = c.k === col.k ? (dir > 0 ? ' ▲' : ' ▼') : '';
    return '<th' + (c.name ? ' class="ss-name' + (c.k === col.k ? ' sorted' : '') + '"' : (c.k === col.k ? ' class="sorted"' : '')) + t +
      (c.nosort ? '' : ' data-ss-sort="' + c.k + '"') + '>' + snE(crL(c.vi, c.en)) + arrow + '</th>';
  }).join('');
  var body = rows.map(function(r){ return '<tr>' + SS_COLS.map(function(c){ return ssCell(R, c, r); }).join('') + '</tr>'; }).join('');
  var legend = SS_COLS.filter(function(c){ return c.tv; }).map(function(c){ return '<b>' + snE(crL(c.vi, c.en)) + '</b> ' + snE(crL(c.tv, c.te)); }).join(' · ');
  return ssSec('📋', crL('Bảng thống kê chi tiết các đội', 'Detailed team table'),
    '<div class="ss-table-wrap"><table class="ss-table ss-teams"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<div class="ss-note">' + legend + '</div>', crL('Bấm tiêu đề cột để sắp xếp', 'Click a column header to sort'));
}

function ssHomeAway(R){
  var rows = R.ranked.filter(function(r){ return r.P; });
  if(!rows.length) return '';
  var sub = ['P', 'W', 'D', 'L', 'GF', 'GA', 'Pts'], lab = { P: ['Tr', 'P'], W: ['T', 'W'], D: ['H', 'D'], L: ['B', 'L'], GF: ['BT', 'GF'], GA: ['BB', 'GA'], Pts: ['Đ', 'Pts'] };
  var th = sub.map(function(k, i){ return '<th' + (i === 0 ? ' class="ss-grp"' : '') + '>' + crL(lab[k][0], lab[k][1]) + '</th>'; }).join('');
  var body = rows.map(function(r){
    var side = function(o){ return sub.map(function(k, i){ return '<td' + (i === 0 ? ' class="ss-grp"' : '') + (k === 'Pts' ? ' style="font-weight:700"' : '') + '>' + o[k] + '</td>'; }).join(''); };
    return '<tr><td>' + r.rank + '</td><td class="ss-name">' + ssName(R, r) + '</td>' + side(r.H) + side(r.A) + '</tr>';
  }).join('');
  var bestH = ssLead(rows, function(r){ return r.H.P ? r.H.Pts / r.H.P : null; }), bestA = ssLead(rows, function(r){ return r.A.P ? r.A.Pts / r.A.P : null; });
  var note = (bestH ? '🏠 ' + crL('Sân nhà tốt nhất: ', 'Best at home: ') + bestH.rows.map(function(r){ return ssName(R, r); }).join(', ') + ' (' + ssNum(bestH.v) + crL(' đ/trận', ' pts/game') + ')' : '') +
    (bestA ? ' · ✈️ ' + crL('Sân khách tốt nhất: ', 'Best away: ') + bestA.rows.map(function(r){ return ssName(R, r); }).join(', ') + ' (' + ssNum(bestA.v) + crL(' đ/trận', ' pts/game') + ')' : '');
  return ssSec('🏟️', crL('Sân nhà / Sân khách', 'Home / Away'),
    '<div class="ss-table-wrap"><table class="ss-table"><thead><tr><th rowspan="2">#</th><th rowspan="2" class="ss-name">' + crL('Đội', 'Team') + '</th>' +
    '<th colspan="7" class="ss-grp">🏠 ' + crL('Sân nhà', 'Home') + '</th><th colspan="7" class="ss-grp">✈️ ' + crL('Sân khách', 'Away') + '</th></tr><tr>' + th + th + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    (note ? '<div class="ss-note">' + note + '</div>' : ''));
}

function ssScores(R){
  var T = R.T, n = T.n;
  if(!n) return '';
  var keys = Object.keys(T.scores).sort(function(a, b){ return T.scores[b] - T.scores[a] || a.localeCompare(b); }).slice(0, 10);
  var mx = T.scores[keys[0]] || 1;
  var bars = keys.map(function(k){
    var c = T.scores[k];
    return '<div class="ss-bar-row"><b>' + k + '</b><div class="ss-bar"><i style="width:' + (c * 100 / mx).toFixed(1) + '%"></i></div><span>' + c + ' · ' + ssPct(c, n) + '</span></div>';
  }).join('');
  var hm = Math.max.apply(null, T.hist) || 1;
  var cols = T.hist.map(function(c, g){
    return '<div class="ss-col"><b>' + c + '</b><i style="height:' + Math.max(2, Math.round(c * 90 / hm)) + 'px"></i><span>' + (g === 7 ? '7+' : g) + '</span></div>';
  }).join('');
  return '<div class="ss-cols">' +
    ssSec('🔢', crL('Tỉ số hay gặp', 'Most common scorelines'), bars, crL('đội thắng ghi trước', 'winner first')) +
    ssSec('📶', crL('Số bàn mỗi trận', 'Goals per match'), '<div class="ss-hist">' + cols + '</div><div class="ss-note">' +
      crL('Trục ngang: tổng số bàn của trận · cột: số trận', 'X axis: total goals in the match · bars: number of matches') + '</div>') +
    '</div>';
}

function ssRounds(R){
  if(R.rounds.length < 2) return '';
  var mx = Math.max.apply(null, R.rounds.map(function(r){ return r.n ? r.G / r.n : 0; })) || 1;
  var body = R.rounds.map(function(r){
    var avg = r.n ? r.G / r.n : 0, b = r.best;
    return '<tr><td class="ss-name">' + snE(r.label) + '</td><td>' + r.n + '</td><td>' + r.G + '</td>' +
      '<td><div class="ss-avg"><span>' + ssNum(avg) + '</span><div class="ss-bar"><i style="width:' + (avg * 100 / mx).toFixed(1) + '%"></i></div></div></td>' +
      '<td>' + r.hW + ' · ' + r.dr + ' · ' + r.aW + '</td>' +
      '<td class="ss-name no-i18n">' + (b ? snE(b.h.name) + ' <b>' + b.hg + '-' + b.ag + '</b> ' + snE(b.a.name) : '—') + '</td></tr>';
  }).join('');
  var best = R.rounds.slice().sort(function(a, b){ return b.G / b.n - a.G / a.n; })[0];
  return ssSec('🗓️', crL('Thống kê theo vòng', 'Round by round'),
    '<div class="ss-table-wrap"><table class="ss-table ss-rounds"><thead><tr><th class="ss-name">' + crL('Vòng', 'Round') + '</th><th>' + crL('Trận', 'Matches') + '</th><th>' + crL('Bàn', 'Goals') + '</th>' +
    '<th>' + crL('TB bàn/trận', 'Goals/match') + '</th><th>' + crL('Nhà · Hòa · Khách', 'Home · Draw · Away') + '</th><th class="ss-name">' + crL('Kết quả đậm nhất', 'Biggest result') + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
    (best ? '<div class="ss-note">' + crL('Vòng mưa bàn thắng nhất: ', 'Highest scoring round: ') + '<b>' + snE(best.label) + '</b> (' + ssNum(best.G / best.n) + crL(' bàn/trận', ' goals/match') + ')</div>' : ''));
}

function ssRecords(R){
  var M = R.M;
  if(!M.length) return '';
  var big = M.filter(function(x){ return x.hg !== x.ag; }).sort(function(a, b){
    return Math.abs(b.hg - b.ag) - Math.abs(a.hg - a.ag) || Math.max(b.hg, b.ag) - Math.max(a.hg, a.ag);
  }).slice(0, 6);
  var high = M.slice().sort(function(a, b){ return (b.hg + b.ag) - (a.hg + a.ag) || Math.abs(a.hg - a.ag) - Math.abs(b.hg - b.ag); }).slice(0, 6);
  var draws = M.filter(function(x){ return x.hg === x.ag && x.hg > 0; }).sort(function(a, b){ return b.hg - a.hg; }).slice(0, 6);
  var elite = M.filter(function(x){ return isFinite(x.eloH) && isFinite(x.eloA); })
    .sort(function(a, b){ return (b.eloH + b.eloA) - (a.eloH + a.eloA); }).slice(0, 6);
  var swing = M.filter(function(x){ return Math.abs(x.eloD) >= 0.5; }).sort(function(a, b){ return Math.abs(b.eloD) - Math.abs(a.eloD); }).slice(0, 6);
  var goalsX = function(x){ return (x.hg + x.ag) + crL(' bàn', ' goals'); };
  var marginX = function(x){ return crL('cách ', 'by ') + Math.abs(x.hg - x.ag); };
  return '<div class="ss-cols">' +
    ssSec('💪', crL('Thắng đậm nhất', 'Biggest wins'), ssMatchList(R, big, marginX)) +
    ssSec('🎆', crL('Mưa bàn thắng', 'Highest scoring'), ssMatchList(R, high, goalsX)) +
    ssSec('😱', crL('Địa chấn (theo Elo)', 'Biggest upsets (Elo)'), ssMatchList(R, R.upsets.slice(0, 6), function(u){ return crL('cơ hội thắng ', 'win chance ') + snPct(u.p); })) +
    ssSec('👑', crL('Trận cầu đỉnh cao', 'Clash of the titans'), ssMatchList(R, elite, function(x){ return 'Elo ' + Math.round((x.eloH + x.eloA) / 2); }), crL('Elo TB 2 đội cao nhất', 'highest average Elo')) +
    ssSec('🎢', crL('Biến động Elo lớn nhất', 'Biggest Elo swings'), ssMatchList(R, swing, function(x){ return '±' + Math.round(Math.abs(x.eloD)); })) +
    (draws.length ? ssSec('🤝', crL('Hòa nhiều bàn nhất', 'Highest scoring draws'), ssMatchList(R, draws, goalsX)) : '') +
    '</div>';
}

function ssElo(R){
  var rows = R.S.filter(function(r){ return r.P; }).sort(function(a, b){ return b.eloD - a.eloD; });
  if(rows.length < 2) return '';
  var mx = Math.max.apply(null, rows.map(function(r){ return Math.abs(r.eloD); })) || 1;
  var body = rows.map(function(r){
    var d = r.eloD, w = (Math.abs(d) * 50 / mx).toFixed(1);
    return '<div class="ss-elo-row"><span class="ss-elo-n">' + ssName(R, r) + '</span><span class="ss-elo-v muted">' + Math.round(r.elo0) + ' → <b>' + Math.round(r.elo1) + '</b></span>' +
      '<div class="ss-elo-bar"><i class="' + (d >= 0 ? 'up' : 'down') + '" style="width:' + w + '%"></i></div><b class="' + (Math.round(d) > 0 ? 'cr-up' : Math.round(d) < 0 ? 'cr-down' : 'muted') + '">' + snSigned(d) + '</b></div>';
  }).join('');
  return ssSec('📈', crL('Biến động Elo trong mùa', 'Elo movement this season'), body, crL('Elo trước trận đầu → sau trận gần nhất', 'before first match → after latest match'));
}

function ssCross(R){
  var teams = R.ranked.filter(function(r){ return r.P; }), n = teams.length;
  if(n < 3 || n > 20) return '';
  var cell = {}, pairs = 0;
  R.M.forEach(function(x){
    [[x.h, x.a, x.hg, x.ag, x.pen === 'h' ? 1 : x.pen === 'a' ? -1 : 0], [x.a, x.h, x.ag, x.hg, x.pen === 'a' ? 1 : x.pen === 'h' ? -1 : 0]].forEach(function(y){
      var k = y[0].idx + '|' + y[1].idx, c = cell[k] || (cell[k] = { list: [], pts: 0, cnt: 0 });
      if(!c.cnt && y[0] === x.h) pairs++;
      c.list.push(y[2] + '-' + y[3]); c.cnt++; c.pts += y[2] > y[3] ? 1 : y[2] < y[3] ? -1 : 0;
    });
  });
  if(pairs < n * (n - 1) / 2 * 0.25) return '';
  var head = teams.map(function(r, i){ return '<th title="' + snE(r.name) + '" class="no-i18n">' + (i + 1) + '</th>'; }).join('');
  var body = teams.map(function(r, i){
    return '<tr><td class="ss-name"><span class="muted">' + (i + 1) + '.</span> ' + ssName(R, r) + '</td>' + teams.map(function(o){
      if(o === r) return '<td class="me">—</td>';
      var c = cell[r.idx + '|' + o.idx];
      if(!c) return '<td></td>';
      return '<td class="' + (c.pts > 0 ? 'w' : c.pts < 0 ? 'l' : 'd') + '" title="' + snE(r.name + ' vs ' + o.name) + '">' + c.list.join('<br>') + '</td>';
    }).join('') + '</tr>';
  }).join('');
  return ssSec('🧮', crL('Bảng đối đầu', 'Crosstable'),
    '<div class="ss-table-wrap"><table class="ss-table ss-x"><thead><tr><th class="ss-name">' + crL('Đội \\ Đối thủ', 'Team \\ Opponent') + '</th>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<div class="ss-note">' + crL('Tỉ số theo góc nhìn đội ở hàng · xanh = thắng nhiều hơn, đỏ = thua nhiều hơn', 'Scores from the row team’s view · green = more wins, red = more losses') + '</div>');
}

function ssForm(R){
  var rows = R.ranked.filter(function(r){ return r.P; });
  if(!rows.length) return '';
  var body = rows.map(function(r){
    var cur = r.cur ? ssRL(r.cur.r) + r.cur.n : '—';
    return '<tr><td>' + r.rank + '</td><td class="ss-name">' + ssName(R, r) + '</td><td class="ss-formcell">' + ssChips(r.seq) + '</td>' +
      '<td>' + ssNum(r.ppg) + '</td><td><span class="ss-cur ' + (r.cur ? r.cur.r : '') + '">' + cur + '</span></td></tr>';
  }).join('');
  return ssSec('🧾', crL('Phong độ cả mùa', 'Season form guide'),
    '<div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>#</th><th class="ss-name">' + crL('Đội', 'Team') + '</th><th class="ss-name">' + crL('Kết quả theo thứ tự', 'Results in order') +
    '</th><th>' + crL('Đ/Tr', 'PPG') + '</th><th>' + crL('Chuỗi hiện tại', 'Current run') + '</th></tr></thead><tbody>' + body + '</tbody></table></div>');
}

function ssBuildHtml(s){
  var R = ssCompute(s);
  if(!R.S.length) return '<div class="ss-sec ss-empty">' + crL('Mùa giải chưa có đội.', 'This season has no teams yet.') + '</div>';
  var html = ssKpis(R);
  if(!R.M.length) return html + '<div class="ss-sec ss-empty">' + crL('Chưa có trận nào được đá — thống kê sẽ hiện khi có kết quả.', 'No matches played yet — stats appear once results come in.') + '</div>';
  html += ssLeaders(R) + ssTeamTable(R) + ssHomeAway(R) + ssScores(R) + ssRounds(R) + ssRecords(R) + ssElo(R) + ssCross(R) + ssForm(R);
  return html;
}

// Rendered only while the Stats tab is visible (re-rendered by setView / saveAll).
function ssRenderBoard(s){
  var host = $('seasonStatsBoard');
  if(!host) return;
  if(!s || s.mode === 'legend' || s.mode === 'ranking'){ host.hidden = true; host.innerHTML = ''; ssMemo.key = null; return; }
  host.hidden = false;
  var main = document.querySelector('main.container');
  if(main && main.getAttribute('data-view') !== 'stats') return;
  var sig = [careerSeasonIdOf(s) || s.name || '', s.mode, (s.teams || []).join('|'), JSON.stringify(s.results || {}),
    s.locked ? 1 : 0, s.forceEnded ? 1 : 0, CR_EN ? 'en' : 'vi', ssSort.col, ssSort.dir, typeof crVer === 'number' ? crVer : 0].join('#');
  var key = String(snHash(sig));
  if(ssMemo.key === key && host.innerHTML) return;
  try {
    ssMemo = { key: key, html: ssBuildHtml(s) };
  } catch(e){
    console.warn('Season stats failed:', e);
    ssMemo = { key: null, html: '<div class="ss-sec ss-empty">' + crL('Không tính được thống kê.', 'Could not compute the stats.') + '</div>' };
  }
  host.innerHTML = ssMemo.html;
}

document.addEventListener('click', function(e){
  var th = e.target && e.target.closest ? e.target.closest('#seasonStatsBoard [data-ss-sort]') : null;
  if(!th) return;
  var k = th.getAttribute('data-ss-sort');
  if(ssSort.col === k) ssSort.dir = -ssSort.dir;
  else { ssSort.col = k; ssSort.dir = (k === 'rank' || k === 'name') ? 1 : -1; }
  ssRenderBoard(activeSeason());
});
