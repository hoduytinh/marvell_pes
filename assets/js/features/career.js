// Marvell PES Club - features/career.js
// Cross-season data built on collectSeasonMatches (features/team-matches.js):
// chronological match history, Elo ratings, all-time records, team career,
// FIFA-style card, Teo commentary/taunt texts, head-to-head view and the Career / Elo / records dialogs.
// Teams are identified by their (trimmed) name across seasons.
// UI strings are bilingual via crL(vi, en); switching language reloads the page.

var CR_EN = (function(){ try { return localStorage.getItem('pesLang') !== 'vi'; } catch(e){ return true; } })();
function crL(vi, en){ return CR_EN ? en : vi; }

var CAREER_SKIP_MODES = { legend: 1, ranking: 1 };
var ELO_BASE = 1500, ELO_K = 32, ELO_KO_FACTOR = 1.25, ELO_SWEEP_FACTOR = 1.25, ELO_PROVISIONAL = 10;

// Header order lists the newest season first; history needs the oldest first.
function careerSeasonIds(st){
  st = st || state;
  var seasons = st.seasons || {}, seen = {}, ids = [];
  var order = (st.seasonOrder && st.seasonOrder.length) ? st.seasonOrder : Object.keys(seasons);
  order.forEach(function(id){ if(seasons[id] && !seen[id]){ seen[id] = 1; ids.push(id); } });
  Object.keys(seasons).forEach(function(id){ if(!seen[id]){ seen[id] = 1; ids.unshift(id); } });
  return ids.reverse().filter(function(id){ return !CAREER_SKIP_MODES[seasons[id].mode]; });
}

function careerName(n){ return String(n == null ? '' : n).trim(); }

// Career key matching `name` case-insensitively (falls back to the trimmed name).
function careerResolveName(cd, name){
  name = careerName(name);
  if(cd.elo[name]) return name;
  var k = name.toLowerCase();
  return Object.keys(cd.elo).filter(function(n){ return n.toLowerCase() === k; })[0] || name;
}

// Played matches of every season, oldest first.
function careerHistory(st){
  st = st || state;
  var out = [];
  careerSeasonIds(st).forEach(function(sid){
    var s = st.seasons[sid];
    if(!s || !Array.isArray(s.teams)) return;
    var list;
    try { list = collectSeasonMatches(s); } catch(e){ return; }
    list.forEach(function(m){
      if(!m.res || m.rest != null || !isFinite(m.res.hg) || !isFinite(m.res.ag)) return;
      var h = careerName(s.teams[m.home]), a = careerName(s.teams[m.away]);
      if(!h || !a || h === a || /^bye$/i.test(h) || /^bye$/i.test(a)) return;
      out.push({ sid: sid, season: s.name || '', mode: s.mode || 'league', stage: m.stage, ko: !!m.ko, key: m.key,
        home: h, away: a, hg: m.res.hg, ag: m.res.ag });
    });
  });
  return out;
}

// Knock-out results are Bo3/Bo5 series (games won, not goals): only a sweep earns a bonus.
function eloMarginFactor(m){
  if(m.ko) return Math.min(m.hg, m.ag) === 0 ? ELO_SWEEP_FACTOR : 1;
  var gd = Math.abs(m.hg - m.ag);
  return gd <= 1 ? 1 : (gd === 2 ? 1.5 : (11 + gd) / 8);
}

// Adds eloH/eloA (before the match) and eloD (home gain) to every history entry.
function computeElo(hist){
  var T = {};
  function get(n){ return T[n] || (T[n] = { name: n, elo: ELO_BASE, peak: ELO_BASE, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, timeline: [] }); }
  hist.forEach(function(m){
    var H = get(m.home), A = get(m.away);
    var exp = 1 / (1 + Math.pow(10, (A.elo - H.elo) / 400));
    var score = m.hg > m.ag ? 1 : (m.hg < m.ag ? 0 : 0.5);
    var d = ELO_K * (m.ko ? ELO_KO_FACTOR : 1) * eloMarginFactor(m) * (score - exp);
    m.eloH = H.elo; m.eloA = A.elo; m.eloD = d;
    H.elo += d; A.elo -= d;
    [[H, m.hg, m.ag], [A, m.ag, m.hg]].forEach(function(x){
      var t = x[0];
      t.P++; t.GF += x[1]; t.GA += x[2];
      if(x[1] > x[2]) t.W++; else if(x[1] < x[2]) t.L++; else t.D++;
      if(t.elo > t.peak) t.peak = t.elo;
      t.timeline.push(t.elo);
    });
  });
  return T;
}

// Legend-season medals: lower-cased name -> { name, list: [{year, event, medal}] }
function careerTrophies(st){
  var map = {};
  Object.keys(st.seasons || {}).forEach(function(sid){
    var s = st.seasons[sid];
    if(!s || s.mode !== 'legend' || !Array.isArray(s.timelines)) return;
    s.timelines.forEach(function(tl){
      ((tl && tl.events) || []).forEach(function(ev){
        if(!ev || !ev.medals) return;
        ['gold', 'silver', 'bronze'].forEach(function(md){
          (ev.medals[md] || []).forEach(function(t){
            var n = careerName(t), k = n.toLowerCase();
            if(!k) return;
            var e = map[k] || (map[k] = { name: n, list: [] });
            e.list.push({ year: tl.year || '', event: ev.name || ev.title || '', medal: md });
          });
        });
      });
    });
  });
  return map;
}

function careerData(st){
  st = st || state;
  var hist = careerHistory(st);
  return { st: st, hist: hist, elo: computeElo(hist), trophies: careerTrophies(st) };
}

function careerMasterSet(st){
  var l = (st && st.teamMasterList) || [];
  if(!l.length) return null;
  var set = {};
  l.forEach(function(n){ set[careerName(n).toLowerCase()] = 1; });
  return set;
}

function careerEloTable(cd, onlyMaster){
  var set = onlyMaster ? careerMasterSet(cd.st) : null;
  return Object.keys(cd.elo).map(function(k){ return cd.elo[k]; })
    .filter(function(t){ return !set || set[t.name.toLowerCase()]; })
    .sort(function(a, b){ return b.elo - a.elo || b.P - a.P; });
}

function medalCount(list){
  var c = { gold: 0, silver: 0, bronze: 0 };
  (list || []).forEach(function(t){ c[t.medal]++; });
  return c;
}
// Same weighting as the Hall of Legend ranking (calculateLegendStats).
function medalPoints(c){ return c.gold * 4 + c.silver * 2 + c.bronze; }

// Streak tracker: cur/best for win, unbeaten, lose, winless.
function streakAcc(){ return { cur: { win: 0, unbeaten: 0, lose: 0, winless: 0 }, best: { win: 0, unbeaten: 0, lose: 0, winless: 0 } }; }
function streakPush(acc, r){
  var c = acc.cur;
  c.win = r === 'W' ? c.win + 1 : 0;
  c.unbeaten = r !== 'L' ? c.unbeaten + 1 : 0;
  c.lose = r === 'L' ? c.lose + 1 : 0;
  c.winless = r !== 'W' ? c.winless + 1 : 0;
  Object.keys(c).forEach(function(k){ if(c[k] > acc.best[k]) acc.best[k] = c[k]; });
}

function careerResult(gf, ga){ return gf > ga ? 'W' : (gf < ga ? 'L' : 'D'); }

function teamCareer(cd, name){
  var list = [], bySeason = {}, sOrder = [], opp = {}, acc = streakAcc();
  cd.hist.forEach(function(m, i){
    if(m.home !== name && m.away !== name) return;
    var isHome = m.home === name, gf = isHome ? m.hg : m.ag, ga = isHome ? m.ag : m.hg;
    var x = { m: m, i: i, isHome: isHome, gf: gf, ga: ga, opp: isHome ? m.away : m.home, r: careerResult(gf, ga) };
    list.push(x);
    streakPush(acc, x.r);
    var pre = isHome ? m.eloH : m.eloA, post = pre + (isHome ? m.eloD : -m.eloD);
    var ss = bySeason[m.sid];
    if(!ss){ ss = bySeason[m.sid] = { sid: m.sid, name: m.season, mode: m.mode, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, eloStart: pre }; sOrder.push(m.sid); }
    ss.eloEnd = post;
    var oo = opp[x.opp] || (opp[x.opp] = { name: x.opp, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, lastWin: null });
    [ss, oo].forEach(function(t){ t.P++; t.GF += gf; t.GA += ga; t[x.r]++; });
    if(x.r === 'W') oo.lastWin = x;
  });
  var biggestWin = null, worstLoss = null, ko = { P: 0, W: 0 };
  list.forEach(function(x){
    if(x.m.ko){ ko.P++; if(x.r === 'W') ko.W++; }
    var d = x.gf - x.ga;
    if(d > 0 && (!biggestWin || d > biggestWin.gf - biggestWin.ga || (d === biggestWin.gf - biggestWin.ga && x.gf >= biggestWin.gf))) biggestWin = x;
    if(d < 0 && (!worstLoss || d < worstLoss.gf - worstLoss.ga || (d === worstLoss.gf - worstLoss.ga && x.ga >= worstLoss.ga))) worstLoss = x;
  });
  var tro = cd.trophies[name.toLowerCase()];
  var e = cd.elo[name] || null, rank = null, table = null;
  if(e){
    var set = careerMasterSet(cd.st);
    table = careerEloTable(cd, !!(set && set[name.toLowerCase()]));
    rank = table.indexOf(e) + 1;
  }
  return {
    name: name, list: list, elo: e, rank: rank, rankOf: table ? table.length : 0,
    seasons: sOrder.map(function(id){ return bySeason[id]; }).reverse(),
    opponents: Object.keys(opp).map(function(k){ return opp[k]; }).sort(function(a, b){ return b.P - a.P || b.W - a.W; }),
    trophies: tro ? tro.list : [], streaks: acc, biggestWin: biggestWin, worstLoss: worstLoss, ko: ko
  };
}

// ---------------- Records ----------------
function careerRecords(cd, onlyMaster){
  var set = onlyMaster ? careerMasterSet(cd.st) : null;
  var ok = function(n){ return !set || !!set[n.toLowerCase()]; };
  var teams = careerEloTable(cd, onlyMaster);
  var streaks = {}, pairs = {};
  cd.hist.forEach(function(m){
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(function(x){
      streakPush(streaks[x[0]] || (streaks[x[0]] = streakAcc()), careerResult(x[1], x[2]));
    });
    var a = m.home < m.away ? m.home : m.away, b = a === m.home ? m.away : m.home, k = a + '\u0000' + b;
    var p = pairs[k] || (pairs[k] = { a: a, b: b, P: 0, W: 0, D: 0, L: 0 });
    var ga = a === m.home ? m.hg : m.ag, gb = a === m.home ? m.ag : m.hg;
    p.P++; p[careerResult(ga, gb)]++;
  });
  function topTeams(fn, filter, fmt, n){
    return teams.filter(filter || function(){ return true; })
      .map(function(t){ return { t: t, v: fn(t) }; })
      .filter(function(x){ return x.v > 0; })
      .sort(function(a, b){ return b.v - a.v || b.t.P - a.t.P; })
      .slice(0, n || 3).map(function(x){ return { team: x.t.name, value: fmt ? fmt(x.v, x.t) : String(x.v) }; });
  }
  var minP = 20, M = crL(' trận', ' matches');
  var matches = cd.hist.filter(function(m){ return ok(m.home) && ok(m.away); });
  function topMatches(fn){
    return matches.slice().sort(function(a, b){ return fn(b) - fn(a) || (b.hg + b.ag) - (a.hg + a.ag); }).slice(0, 3)
      .map(function(m){ return { match: m, value: m.hg + ' – ' + m.ag }; });
  }
  var tro = Object.keys(cd.trophies).map(function(k){ return cd.trophies[k]; }).filter(function(t){ return ok(t.name); })
    .map(function(t){ var c = medalCount(t.list); return { name: t.name, c: c, score: medalPoints(c) }; })
    .filter(function(x){ return x.score > 0; })
    .sort(function(a, b){ return b.score - a.score || b.c.gold - a.c.gold || b.c.silver - a.c.silver || b.c.bronze - a.c.bronze; }).slice(0, 3)
    .map(function(x){ return { team: x.name, value: '🥇' + x.c.gold + ' 🥈' + x.c.silver + ' 🥉' + x.c.bronze + ' · ' + x.score + crL('đ', ' pts') }; });
  var streakTop = function(kind){
    return teams.map(function(t){ return { team: t.name, v: streaks[t.name] ? streaks[t.name].best[kind] : 0 }; })
      .filter(function(x){ return x.v > 0; }).sort(function(a, b){ return b.v - a.v; }).slice(0, 3)
      .map(function(x){ return { team: x.team, value: x.v + M }; });
  };
  var rivalry = Object.keys(pairs).map(function(k){ return pairs[k]; })
    .filter(function(p){ return ok(p.a) && ok(p.b); })
    .sort(function(a, b){ return b.P - a.P; }).slice(0, 3)
    .map(function(p){ return { pair: [p.a, p.b], value: p.P + M, sub: p.W + ' – ' + p.D + ' – ' + p.L }; });

  return [
    { icon: '🏆', title: crL('Nhiều danh hiệu nhất', 'Most trophies'), items: tro },
    { icon: '📈', title: crL('Elo cao nhất mọi thời đại', 'Highest Elo of all time'), items: topTeams(function(t){ return Math.round(t.peak); }) },
    { icon: '🔥', title: crL('Chuỗi thắng dài nhất', 'Longest winning streak'), items: streakTop('win') },
    { icon: '🛡️', title: crL('Chuỗi bất bại dài nhất', 'Longest unbeaten run'), items: streakTop('unbeaten') },
    { icon: '💥', title: crL('Trận thắng đậm nhất', 'Biggest wins'), items: topMatches(function(m){ return Math.abs(m.hg - m.ag); }) },
    { icon: '🎆', title: crL('Trận nhiều bàn nhất', 'Highest-scoring matches'), items: topMatches(function(m){ return m.hg + m.ag; }) },
    { icon: '🎯', title: crL('Tỉ lệ thắng cao nhất (≥ ', 'Best win rate (≥ ') + minP + M + ')', items: topTeams(function(t){ return t.W / t.P; }, function(t){ return t.P >= minP; }, function(v){ return Math.round(v * 100) + '%'; }) },
    { icon: '⚽', title: crL('Nhiều bàn thắng nhất', 'Most goals scored'), items: topTeams(function(t){ return t.GF; }, null, function(v, t){ return v + ' (' + (v / t.P).toFixed(2) + crL('/trận', '/match') + ')'; }) },
    { icon: '🧱', title: crL('Hàng thủ tốt nhất (≥ ', 'Best defence (≥ ') + minP + M + ')', items: topTeams(function(t){ return 10 - t.GA / t.P; }, function(t){ return t.P >= minP; }, function(v, t){ return (t.GA / t.P).toFixed(2) + crL(' bàn thua/trận', ' conceded/match'); }) },
    { icon: '🎮', title: crL('Nhiều trận nhất', 'Most matches played'), items: topTeams(function(t){ return t.P; }, null, function(v){ return v + M; }) },
    { icon: '⚔️', title: crL('Cặp đấu kinh điển', 'Classic rivalries'), items: rivalry },
    { icon: '😬', title: crL('Chuỗi thua dài nhất', 'Longest losing streak'), items: streakTop('lose') }
  ];
}

// ---------------- FIFA card ----------------
var FIFA_STATS = [
  { k: 'att', label: crL('TẤN CÔNG', 'ATTACK'), pos: 'ST' },
  { k: 'def', label: crL('PHÒNG NGỰ', 'DEFENCE'), pos: 'CB' },
  { k: 'frm', label: crL('PHONG ĐỘ', 'FORM'), pos: 'CAM' },
  { k: 'clu', label: crL('BẢN LĨNH', 'CLUTCH'), pos: 'CF' },
  { k: 'exp', label: crL('KINH NGHIỆM', 'EXPERIENCE'), pos: 'CDM' },
  { k: 'tro', label: crL('DANH HIỆU', 'TROPHIES'), pos: 'LW' }
];

function careerFifaCard(cd, name){
  var set = careerMasterSet(cd.st);
  var pool = careerEloTable(cd, !!(set && set[name.toLowerCase()])).filter(function(t){ return t.P >= 8 || t.name === name; });
  var recent = {}, ko = {};
  cd.hist.forEach(function(m){
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(function(x){
      var r = careerResult(x[1], x[2]);
      (recent[x[0]] || (recent[x[0]] = [])).push(r === 'W' ? 3 : (r === 'D' ? 1 : 0));
      if(m.ko){ var k = ko[x[0]] || (ko[x[0]] = { P: 0, W: 0 }); k.P++; if(r === 'W') k.W++; }
    });
  });
  function metric(t, key){
    if(!t.P) return 0;
    if(key === 'att') return t.GF / t.P;
    if(key === 'def') return -t.GA / t.P;
    if(key === 'frm') return (recent[t.name] || []).slice(-10).reduce(function(a, b){ return a + b; }, 0);
    if(key === 'clu'){ var k = ko[t.name] || { P: 0, W: 0 }; return (k.W + 1) / (k.P + 2); }
    if(key === 'exp') return t.P;
    if(key === 'tro'){ var tr = cd.trophies[t.name.toLowerCase()], c = medalCount(tr ? tr.list : []); return medalPoints(c); }
    if(key === 'elo') return t.elo;
    return 0;
  }
  function rating(key, t){
    var v = metric(t, key), below = 0, eq = 0;
    pool.forEach(function(p){ var pv = metric(p, key); if(pv < v) below++; else if(pv === v) eq++; });
    var pct = pool.length ? (below + eq / 2) / pool.length : 0.5;
    return Math.round(45 + 54 * pct);
  }
  var me = cd.elo[name];
  if(!me) return null;
  var stats = FIFA_STATS.map(function(s){ return { k: s.k, label: s.label, pos: s.pos, v: rating(s.k, me) }; });
  var avg = stats.reduce(function(a, s){ return a + s.v; }, 0) / stats.length;
  var ovr = Math.round(0.4 * rating('elo', me) + 0.6 * avg);
  var best = stats.slice(0, 4).sort(function(a, b){ return b.v - a.v; })[0];
  var tier = ovr >= 88 ? 'icon' : ovr >= 80 ? 'gold' : ovr >= 70 ? 'silver' : 'bronze';
  var tr = cd.trophies[name.toLowerCase()];
  return { name: name, ovr: ovr, pos: best.pos, tier: tier, stats: stats, elo: Math.round(me.elo), P: me.P,
    medals: medalCount(tr ? tr.list : []), logo: careerTeamLogo(cd.st, name) };
}

function careerTeamLogo(st, name){
  var ids = careerSeasonIds(st).reverse();
  for(var i = 0; i < ids.length; i++){
    var s = st.seasons[ids[i]], idx = (s.teams || []).map(careerName).indexOf(name);
    if(idx !== -1 && s.teamLogos && s.teamLogos[idx]) return s.teamLogos[idx];
  }
  return typeof DEFAULT_TEAM_LOGO === 'string' ? DEFAULT_TEAM_LOGO : '';
}

function renderFifaCardHtml(card){
  if(!card) return '<div class="muted">' + crL('Chưa có dữ liệu trận đấu.', 'No match data yet.') + '</div>';
  var e = escapeHtml;
  return '<div class="fifa-card tier-' + card.tier + '">' +
    '<div class="fc-top"><div class="fc-ovr">' + card.ovr + '</div><div class="fc-pos">' + card.pos + '</div>' +
    (card.logo ? '<img class="fc-logo" src="' + e(card.logo) + '" alt="">' : '') + '</div>' +
    '<div class="fc-name no-i18n">' + e(card.name) + '</div>' +
    '<div class="fc-stats">' + card.stats.map(function(s){
      return '<div class="fc-stat"><b>' + s.v + '</b><span>' + s.label + '</span></div>';
    }).join('') + '</div>' +
    '<div class="fc-foot">Elo ' + card.elo + ' · ' + card.P + crL(' trận', ' matches') + ' · 🥇' + card.medals.gold + ' 🥈' + card.medals.silver + ' 🥉' + card.medals.bronze + '</div>' +
    '</div>';
}

// ---------------- Teo texts ----------------
function careerPick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function careerFill(tpl, v){ return tpl.replace(/\{(\w+)\}/g, function(_, k){ return v[k] != null ? v[k] : ''; }); }

// Streak state of `name` just before and just after history index i.
function careerStreakAt(cd, name, i){
  var acc = streakAcc(), before = null;
  for(var j = 0; j <= i; j++){
    var m = cd.hist[j];
    if(m.home !== name && m.away !== name) continue;
    if(j === i) before = JSON.parse(JSON.stringify(acc.cur));
    streakPush(acc, m.home === name ? careerResult(m.hg, m.ag) : careerResult(m.ag, m.hg));
  }
  return { before: before || acc.cur, after: acc.cur };
}

// Commentary for history entry i: { head, lines[] }
function careerCommentary(cd, i){
  var m = cd.hist[i];
  if(!m) return null;
  var draw = m.hg === m.ag, homeWin = m.hg > m.ag;
  var W = homeWin ? m.home : m.away, L = homeWin ? m.away : m.home;
  var v = { H: m.home, A: m.away, W: W, L: L, gd: Math.abs(m.hg - m.ag), tot: m.hg + m.ag,
    eW: Math.round(homeWin ? m.eloH : m.eloA), eL: Math.round(homeWin ? m.eloA : m.eloH) };
  v.d = v.eL - v.eW;
  var sW = careerStreakAt(cd, W, i), sL = careerStreakAt(cd, L, i), lines = [];
  function add(arr, extra){ if(extra) Object.keys(extra).forEach(function(k){ v[k] = extra[k]; }); lines.push(careerFill(careerPick(arr), v)); }
  if(!draw && v.d >= 100) add(crL(['😱 ĐỊA CHẤN! {W} (Elo {eW}) quật ngã {L} (Elo {eL})!', '🤯 Không ai tin nổi: {W} hạ {L} dù kém tới {d} điểm Elo!'],
    ['😱 SHOCKER! {W} (Elo {eW}) topple {L} (Elo {eL})!', '🤯 Unbelievable: {W} beat {L} despite being {d} Elo points behind!']));
  if(m.ko && !draw){
    if(Math.min(m.hg, m.ag) === 0) add(crL(['🧹 {W} thắng trắng {L} {s} ở {st}, không cho đối thủ một ván nào!', '💪 {W} đá bại {L} {s} gọn gàng ở {st}.'],
      ['🧹 {W} sweep {L} {s} in {st} without dropping a single game!', '💪 {W} dispatch {L} {s} cleanly in {st}.']), { s: Math.max(m.hg, m.ag) + '-0', st: m.stage });
    else add(crL(['😮‍💨 {W} vượt qua {L} {s} ở {st} sau ván quyết định!', '⚔️ Kéo tới ván cuối, {W} mới hạ được {L} {s} ở {st}.'],
      ['😮‍💨 {W} edge past {L} {s} in {st} after a decider!', '⚔️ It went the distance before {W} beat {L} {s} in {st}.']), { s: Math.max(m.hg, m.ag) + '-' + Math.min(m.hg, m.ag), st: m.stage });
  }
  if(!m.ko && !draw && v.gd >= 4) add(crL(['💥 Hủy diệt! {W} vùi dập {L} cách biệt {gd} bàn.', '🧹 {W} quét sạch {L} như dọn nhà ngày Tết.'],
    ['💥 Demolition! {W} crush {L} by {gd} goals.', '🧹 {W} wipe the floor with {L}.']));
  if(!m.ko && v.tot >= 7) add(crL(['🎆 Mưa bàn thắng: {tot} bàn trong một trận!', '🍿 {tot} bàn thắng — khán giả được bữa no nê!'],
    ['🎆 Goal fest: {tot} goals in one match!', '🍿 {tot} goals — the crowd got their money\'s worth!']));
  if(!draw && sW.after.win >= 3) add(crL(['🔥 {W} đã thắng {n} trận liên tiếp — ai cản nổi?', '🚀 {n} trận thắng liền mạch cho {W}!'],
    ['🔥 {W} have won {n} in a row — who can stop them?', '🚀 {n} straight wins for {W}!']), { n: sW.after.win });
  if(!draw && sW.before.winless >= 5) add(crL(['🌅 {W} cuối cùng cũng biết thắng sau {n} trận!'], ['🌅 {W} finally win again after {n} matches!']), { n: sW.before.winless });
  if(!draw && sL.before.unbeaten >= 5) add(crL(['🛑 {L} chấm dứt chuỗi {n} trận bất bại.'], ['🛑 {L} see their {n}-match unbeaten run come to an end.']), { n: sL.before.unbeaten });
  if(!draw && sL.after.lose >= 3) add(crL(['😬 {L} đã thua {n} trận liên tiếp. Tèo đề nghị nghỉ ngơi!', '🚑 {L} thua {n} trận liền, gọi xe cấp cứu chưa?'],
    ['😬 {L} have lost {n} in a row. Teo suggests a break!', '🚑 {n} straight defeats for {L} — call an ambulance?']), { n: sL.after.lose });
  if(!lines.length){
    if(draw) add(crL(['🤝 {H} và {A} bất phân thắng bại.', '😐 Hòa! Chia điểm đều nhau, không ai vui hẳn.'],
      ['🤝 {H} and {A} cannot be separated.', '😐 A draw! Points shared, nobody is really happy.']));
    else if(v.gd >= 2) add(crL(['👏 {W} thắng thuyết phục trước {L}.', '💪 {W} chơi áp đảo, {L} không có cửa.'],
      ['👏 A convincing win for {W} over {L}.', '💪 {W} dominate, {L} had no answer.']));
    else add(crL(['✅ {W} giành chiến thắng sát nút trước {L}.', '😅 {W} thắng nghẹt thở, {L} tiếc nuối.'],
      ['✅ {W} edge {L} in a tight one.', '😅 {W} win a nail-biter, {L} left ruing their chances.']));
  }
  return { head: '[' + m.season + ' · ' + m.stage + '] ' + m.home + ' ' + m.hg + ' – ' + m.ag + ' ' + m.away, lines: lines.slice(0, 2) };
}

function careerTaunts(cd, name, oppName){
  var tc = teamCareer(cd, name), out = [];
  var v = { n: name, o: oppName || '' };
  function say(vi, en, extra){
    if(extra) Object.keys(extra).forEach(function(k){ v[k] = extra[k]; });
    out.push(careerFill(crL(vi, en), v));
  }
  if(!tc.list.length){
    say('{n} còn chưa đá trận nào — ra sân đi rồi Tèo mới có cái để chọc! 😏', '{n} have not played a single match yet — get on the pitch and Teo will find something to tease! 😏');
    return out;
  }
  var P = tc.list.length, W = tc.list.filter(function(x){ return x.r === 'W'; }).length;
  var GA = tc.list.reduce(function(a, x){ return a + x.ga; }, 0);
  var c = medalCount(tc.trophies), cur = tc.streaks.cur;
  if(oppName){
    var o = tc.opponents.filter(function(x){ return x.name === oppName; })[0];
    if(!o) say('{n} và {o} chưa từng gặp nhau. Né nhau à? 🐔', '{n} and {o} have never met. Avoiding each other? 🐔');
    else {
      v.w = o.W; v.d = o.D; v.l = o.L; v.gf = o.GF; v.ga = o.GA;
      say('Đối đầu {n} vs {o}: {w} thắng – {d} hòa – {l} thua, bàn thắng {gf}–{ga}.', 'Head-to-head {n} vs {o}: {w} wins – {d} draws – {l} losses, goals {gf}–{ga}.');
      if(o.L > o.W) say('{o} đang "bắt nạt" {n} trong đối đầu ({w}–{l}). Phục thù đi chứ! 😤', '{o} are bullying {n} head-to-head ({w}–{l}). Time for revenge! 😤');
      else if(o.W > o.L) say('{n} đang làm "bố" {o} trong đối đầu ({w}–{l}). 😎', '{n} own {o} head-to-head ({w}–{l}). 😎');
      else say('{n} và {o} cân tài cân sức — trận tới sẽ phân định ai là trùm! ⚔️', '{n} and {o} are dead even — the next match decides who is boss! ⚔️');
      if(o.lastWin) say('Lần cuối {n} thắng {o}: {s} ({st}), {sc}. 🕰️', 'Last time {n} beat {o}: {s} ({st}), {sc}. 🕰️',
        { s: o.lastWin.m.season, st: o.lastWin.m.stage, sc: o.lastWin.gf + '–' + o.lastWin.ga });
      else say('{n} chưa từng thắng nổi {o}! 🙈', '{n} have never managed to beat {o}! 🙈');
    }
  }
  if(cur.lose >= 2) say('{n} đang thua {k} trận liên tiếp — có cần Tèo gọi xe cứu thương không? 🚑', '{n} have lost {k} in a row — should Teo call an ambulance? 🚑', { k: cur.lose });
  else if(cur.winless >= 4) say('{n} đã {k} trận chưa biết mùi chiến thắng. 🍋', '{n} have gone {k} matches without tasting victory. 🍋', { k: cur.winless });
  if(cur.win >= 3) say('{n} đang thắng {k} trận liền. Bay cao quá coi chừng té đau! 🪂', '{n} have won {k} straight. The higher you fly, the harder you fall! 🪂', { k: cur.win });
  var nem = tc.opponents.filter(function(x){ return x.L >= 3 && x.L > x.W && x.name !== oppName; }).sort(function(a, b){ return b.L - a.L; })[0];
  if(nem) say('{x} chính là "khắc tinh" của {n}: thua {xl} trận, chỉ thắng {xw}. 😈', '{x} are the nemesis of {n}: {xl} losses, only {xw} wins. 😈', { x: nem.name, xl: nem.L, xw: nem.W });
  tc.opponents.filter(function(x){ return x.P >= 3 && x.W === 0 && x.name !== oppName; }).slice(0, 2).forEach(function(x){
    say('{n} chưa từng thắng {x} sau {xp} lần gặp nhau. 🙈', '{n} have never beaten {x} in {xp} meetings. 🙈', { x: x.name, xp: x.P });
  });
  if(tc.worstLoss){
    var wl = tc.worstLoss;
    say('Ký ức kinh hoàng: {n} thua {x} {sc} ở {s} ({st}). 💀', 'Nightmare memory: {n} lost {sc} to {x} in {s} ({st}). 💀',
      { x: wl.opp, sc: wl.gf + '–' + wl.ga, s: wl.m.season, st: wl.m.stage });
  }
  if(tc.elo && tc.elo.peak - tc.elo.elo >= 60) say('{n} đã tụt {k} điểm Elo so với đỉnh cao {pk}. 📉', '{n} have dropped {k} Elo points from their peak of {pk}. 📉',
    { k: Math.round(tc.elo.peak - tc.elo.elo), pk: Math.round(tc.elo.peak) });
  if(P >= 15 && W / P < 0.35) say('Tỉ lệ thắng của {n} chỉ {k}% — tung đồng xu còn tốt hơn. 🪙', '{n} win only {k}% of their matches — a coin toss would do better. 🪙', { k: Math.round(W * 100 / P) });
  if(P >= 20 && GA / P >= 2.5) say('Hàng thủ {n} thủng trung bình {k} bàn/trận — lưới hay là lưới đánh cá? 🥅', 'The {n} defence leaks {k} goals per match — is that a goal net or a fishing net? 🥅', { k: (GA / P).toFixed(1) });
  if(tc.ko.P >= 4 && tc.ko.W / tc.ko.P < 0.4) say('{n} chỉ thắng {k} loạt đấu loại trực tiếp. Cứ trận quyết định là run tay? 🫣', '{n} have won only {k} knock-out ties. Shaky hands when it matters? 🫣', { k: tc.ko.W + '/' + tc.ko.P });
  if(P >= 20 && !c.gold) say('{k} trận mà chưa có nổi một chiếc cúp vàng. Tủ kính vẫn đang chờ, {n} ơi! 🏆❌', '{k} matches and still no gold trophy. The cabinet is still waiting, {n}! 🏆❌', { k: P });
  if(tc.rank === 1) say('{n} đang số 1 Elo. Ngai vàng nào cũng lung lay, cẩn thận nhé! 👑', '{n} are Elo number 1. Every throne wobbles — careful! 👑');
  if(!out.length) say('{n} khá ổn định... Tèo chưa tìm được gì để chọc. Lần sau nhé! 😇', '{n} look pretty solid... Teo found nothing to tease this time. 😇');
  return out;
}

// ---------------- Dialog rendering ----------------
function crTeam(name){
  return '<a href="#" class="cr-team no-i18n" data-career-team="' + escapeHtml(name) + '">' + escapeHtml(name) + '</a>';
}
function crPct(w, p){ return p ? Math.round(w * 100 / p) + '%' : '—'; }
var CR_COL = crL({ mode: 'Thể thức', P: 'Tr', WDL: 'T-H-B', G: 'BT-BB', win: 'Thắng' }, { mode: 'Format', P: 'P', WDL: 'W-D-L', G: 'GF-GA', win: 'Win %' });
function crSigned(v){ v = Math.round(v); return (v > 0 ? '+' : '') + v; }
function crModeLabel(mode){ try { return getModeDef({ mode: mode }).label; } catch(e){ return mode; } }

function careerSparkSvg(vals){
  if(vals.length < 2) return '';
  var w = 600, h = 80, all = vals.concat([ELO_BASE]);
  var min = Math.min.apply(null, all), max = Math.max.apply(null, all);
  if(max - min < 20){ max += 10; min -= 10; }
  var y = function(v){ return (h - 4 - (v - min) * (h - 8) / (max - min)).toFixed(1); };
  var pts = vals.map(function(v, i){ return (i * w / (vals.length - 1)).toFixed(1) + ',' + y(v); }).join(' ');
  return '<svg class="cr-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<line x1="0" x2="' + w + '" y1="' + y(ELO_BASE) + '" y2="' + y(ELO_BASE) + '" class="cr-spark-base"/>' +
    '<polyline points="' + pts + '" class="cr-spark-line"/></svg>' +
    '<div class="cr-spark-legend muted"><span>' + Math.round(min) + '</span><span>' + crL('Elo theo thời gian (vạch ngang = ', 'Elo over time (line = ') + ELO_BASE + ')</span><span>' + Math.round(max) + '</span></div>';
}

function crMatchRow(x){
  var m = x.m;
  return '<div class="team-match-row">' +
    '<span class="formBox ' + x.r + '">' + x.r + '</span>' +
    '<span class="tm-stage no-i18n" title="' + escapeHtml(m.season + ' · ' + m.stage) + '">' + escapeHtml(m.season) + '</span>' +
    '<span class="tm-team tm-home' + (x.isHome ? ' tm-self' : '') + '">' + escapeHtml(m.home) + '</span>' +
    '<span class="tm-score">' + m.hg + ' – ' + m.ag + '</span>' +
    '<span class="tm-team tm-away' + (x.isHome ? '' : ' tm-self') + '">' + escapeHtml(m.away) + '</span></div>';
}

function crSection(title, body){
  return '<details open class="cr-sec"><summary><strong>' + title + '</strong></summary>' + body + '</details>';
}

function renderCareerHtml(cd, name){
  var tc = teamCareer(cd, name);
  if(!tc.list.length) return '<div class="muted">' + crL('Chưa có trận đấu nào có kết quả.', 'No played matches yet.') + '</div>';
  var P = tc.list.length, cnt = { W: 0, D: 0, L: 0 }, GF = 0, GA = 0;
  tc.list.forEach(function(x){ cnt[x.r]++; GF += x.gf; GA += x.ga; });
  var c = medalCount(tc.trophies), e = tc.elo, cur = tc.streaks.cur;
  function pill(label, value, sub){
    return '<div class="cr-pill"><div class="cr-pill-label">' + label + '</div><div class="cr-pill-value">' + value + '</div>' + (sub ? '<div class="cr-pill-sub">' + sub + '</div>' : '') + '</div>';
  }
  var streak = cur.win ? cur.win + crL(' thắng', cur.win > 1 ? ' wins' : ' win')
    : cur.lose ? cur.lose + crL(' thua', cur.lose > 1 ? ' losses' : ' loss')
    : cur.unbeaten + crL(' bất bại', ' unbeaten');
  var html = '<div class="cr-hero">' + renderFifaCardHtml(careerFifaCard(cd, name)) + '<div class="cr-hero-main"><div class="cr-metrics">' +
    pill('Elo', Math.round(e.elo), tc.rank ? '#' + tc.rank + ' / ' + tc.rankOf + (P < ELO_PROVISIONAL ? crL(' · tạm tính', ' · provisional') : '') : '') +
    pill(crL('Đỉnh cao', 'Peak'), Math.round(e.peak)) +
    pill(crL('Số trận', 'Matches'), P, tc.seasons.length + crL(' mùa', tc.seasons.length > 1 ? ' seasons' : ' season')) +
    pill(crL('T – H – B', 'W – D – L'), cnt.W + ' – ' + cnt.D + ' – ' + cnt.L, crL('Thắng ', 'Win rate ') + crPct(cnt.W, P)) +
    pill(crL('Bàn thắng / thua', 'Goals for / against'), GF + ' / ' + GA, (GF / P).toFixed(2) + ' – ' + (GA / P).toFixed(2) + crL(' mỗi trận', ' per match')) +
    pill(crL('Danh hiệu', 'Trophies'), '🥇' + c.gold + ' 🥈' + c.silver + ' 🥉' + c.bronze, medalPoints(c) + crL(' điểm Huyền thoại', ' Hall of Legend pts')) +
    pill(crL('Loại trực tiếp', 'Knock-out'), tc.ko.W + ' / ' + tc.ko.P, crL('Thắng ' + crPct(tc.ko.W, tc.ko.P) + ' loạt đấu', 'Won ' + crPct(tc.ko.W, tc.ko.P) + ' of ties')) +
    pill(crL('Chuỗi hiện tại', 'Current streak'), streak) +
    '</div>' + careerSparkSvg([ELO_BASE].concat(e.timeline)) + '</div></div>';

  var last = tc.list.slice(-10).reverse();
  html += crSection(crL('Phong độ 10 trận gần nhất', 'Last 10 matches'), '<div class="team-match-list">' + last.map(crMatchRow).join('') + '</div>');

  var tro = tc.trophies.slice().sort(function(a, b){ return String(b.year).localeCompare(String(a.year)) || ({ gold: 0, silver: 1, bronze: 2 }[a.medal] - { gold: 0, silver: 1, bronze: 2 }[b.medal]); });
  html += crSection(crL('Danh hiệu', 'Trophies'), tro.length ? '<div class="cr-trophies">' + tro.map(function(t){
    return '<span class="cr-trophy medal-' + t.medal + '">' + ({ gold: '🥇', silver: '🥈', bronze: '🥉' }[t.medal]) + ' <span class="no-i18n">' + escapeHtml(t.event) + '</span> <small>' + escapeHtml(t.year) + '</small></span>';
  }).join('') + '</div>' : '<div class="muted">' + crL('Chưa có danh hiệu (lấy từ mục Huyền thoại).', 'No trophies yet (taken from the Legend seasons).') + '</div>');

  html += crSection(crL('Theo mùa giải', 'By season'), '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + crL('Mùa', 'Season') + '</th><th>' + CR_COL.mode + '</th><th>' + CR_COL.P + '</th><th>' + CR_COL.WDL + '</th><th>' + CR_COL.G + '</th><th>Elo ±</th></tr></thead><tbody>' +
    tc.seasons.map(function(s){
      var d = s.eloEnd - s.eloStart;
      return '<tr><td class="no-i18n">' + escapeHtml(s.name) + '</td><td>' + escapeHtml(crModeLabel(s.mode)) + '</td><td>' + s.P + '</td><td>' + s.W + '-' + s.D + '-' + s.L + '</td><td>' + s.GF + '-' + s.GA + '</td>' +
        '<td class="' + (d >= 0 ? 'cr-up' : 'cr-down') + '">' + crSigned(d) + '</td></tr>';
    }).join('') + '</tbody></table></div>');

  var byMode = {}, modes = [];
  tc.seasons.forEach(function(s){
    var t = byMode[s.mode];
    if(!t){ t = byMode[s.mode] = { mode: s.mode, S: 0, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 }; modes.push(s.mode); }
    t.S++;
    ['P', 'W', 'D', 'L', 'GF', 'GA'].forEach(function(k){ t[k] += s[k]; });
  });
  html += crSection(crL('Theo thể thức', 'By format'), '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + CR_COL.mode + '</th><th>' + crL('Số mùa', 'Seasons') + '</th><th>' + CR_COL.P + '</th><th>' + CR_COL.WDL + '</th><th>' + CR_COL.G + '</th><th>' + CR_COL.win + '</th></tr></thead><tbody>' +
    modes.map(function(k){
      var t = byMode[k];
      return '<tr><td>' + escapeHtml(crModeLabel(t.mode)) + '</td><td>' + t.S + '</td><td>' + t.P + '</td><td>' + t.W + '-' + t.D + '-' + t.L + '</td><td>' + t.GF + '-' + t.GA + '</td><td>' + crPct(t.W, t.P) + '</td></tr>';
    }).join('') + '</tbody></table></div>');

  var nem = tc.opponents.filter(function(o){ return o.L >= 2 && o.L > o.W; }).sort(function(a, b){ return b.L - a.L; })[0];
  var prey = tc.opponents.filter(function(o){ return o.W >= 2 && o.W > o.L; }).sort(function(a, b){ return b.W - a.W; })[0];
  html += crSection(crL('Đối thủ thường gặp', 'Most frequent opponents'),
    '<div class="cr-tags">' + (nem ? '<span class="cr-tag bad">😈 ' + crL('Khắc tinh', 'Nemesis') + ': ' + crTeam(nem.name) + ' (' + nem.W + '-' + nem.D + '-' + nem.L + ')</span>' : '') +
    (prey ? '<span class="cr-tag good">🎯 ' + crL('Con mồi', 'Favourite victim') + ': ' + crTeam(prey.name) + ' (' + prey.W + '-' + prey.D + '-' + prey.L + ')</span>' : '') + '</div>' +
    '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + crL('Đối thủ', 'Opponent') + '</th><th>' + CR_COL.P + '</th><th>' + CR_COL.WDL + '</th><th>' + CR_COL.G + '</th><th>' + CR_COL.win + '</th></tr></thead><tbody>' +
    tc.opponents.slice(0, 10).map(function(o){
      return '<tr><td>' + crTeam(o.name) + '</td><td>' + o.P + '</td><td>' + o.W + '-' + o.D + '-' + o.L + '</td><td>' + o.GF + '-' + o.GA + '</td><td>' + crPct(o.W, o.P) + '</td></tr>';
    }).join('') + '</tbody></table></div>');

  var b = tc.streaks.best, M = crL(' trận', ' matches');
  html += crSection(crL('Kỷ lục cá nhân', 'Personal records'), '<ul class="cr-list">' +
    '<li><span class="muted">' + crL('Chuỗi thắng dài nhất', 'Longest winning streak') + ':</span> ' + b.win + M + '</li>' +
    '<li><span class="muted">' + crL('Chuỗi bất bại dài nhất', 'Longest unbeaten run') + ':</span> ' + b.unbeaten + M + '</li>' +
    '<li><span class="muted">' + crL('Chuỗi thua dài nhất', 'Longest losing streak') + ':</span> ' + b.lose + M + '</li>' +
    crMatchLine(crL('Thắng đậm nhất', 'Biggest win'), tc.biggestWin) + crMatchLine(crL('Thua đậm nhất', 'Heaviest defeat'), tc.worstLoss) + '</ul>');
  return html;
}

function crMatchLine(label, x){
  if(!x) return '';
  return '<li><span class="muted">' + label + ':</span> <span class="no-i18n">' + escapeHtml(x.m.home + ' ' + x.m.hg + ' – ' + x.m.ag + ' ' + x.m.away) + '</span> <small class="muted no-i18n">(' + escapeHtml(x.m.season + ' · ' + x.m.stage) + ')</small></li>';
}

function openCareerDialog(name){
  name = careerName(name);
  if(!name) return;
  var cd = careerData(state);
  name = careerResolveName(cd, name);
  $('careerTitle').textContent = name;
  $('careerBody').innerHTML = renderCareerHtml(cd, name);
  var dlg = $('careerDialog');
  if(!dlg.open){ if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open'); }
  dlg.scrollTop = 0;
}

// FIFA card at the top of the team dialog (league.js openTeamDialog).
function renderTeamDialogCard(name){
  var box = $('teamFifaCard');
  if(!box) return;
  var cd = careerData(state), n = careerResolveName(cd, name), card = careerFifaCard(cd, n);
  box.innerHTML = card ? '<div class="fc-pick" role="button" tabindex="0" data-career-team="' + escapeHtml(n) + '" title="' + escapeHtml(crL('Xem toàn bộ sự nghiệp', 'View full career')) + '">' + renderFifaCardHtml(card) + '</div>' : '';
  box.hidden = !card;
}

// ---------------- Head-to-head ----------------
function renderH2HHtml(cd, a, b){
  a = careerResolveName(cd, a); b = careerResolveName(cd, b);
  var list = teamCareer(cd, a).list.filter(function(x){ return x.opp === b; });
  var P = list.length, cnt = { W: 0, D: 0, L: 0 }, GF = 0, GA = 0, ko = { P: 0, W: 0, L: 0 };
  var bigA = null, bigB = null, lastA = null, lastB = null;
  list.forEach(function(x){
    cnt[x.r]++; GF += x.gf; GA += x.ga;
    if(x.m.ko){ ko.P++; if(x.r === 'W') ko.W++; else if(x.r === 'L') ko.L++; }
    var d = x.gf - x.ga;
    if(d > 0){ lastA = x; if(!bigA || d > bigA.gf - bigA.ga) bigA = x; }
    if(d < 0){ lastB = x; if(!bigB || -d > bigB.ga - bigB.gf) bigB = x; }
  });
  var ea = cd.elo[a], eb = cd.elo[b], ca = careerFifaCard(cd, a), cb = careerFifaCard(cd, b);
  function side(name, card, e, cls){
    var logo = card ? card.logo : careerTeamLogo(cd.st, name);
    return '<div class="h2h-side ' + cls + '">' + (logo ? '<img class="h2h-logo" src="' + escapeHtml(logo) + '" alt="">' : '') +
      '<div class="h2h-name">' + crTeam(name) + '</div>' +
      '<div class="h2h-meta">' + (card ? '<span class="h2h-ovr tier-' + card.tier + '" title="' + crL('Chỉ số tổng', 'Overall rating') + '">' + card.ovr + '</span>' : '') +
      (e ? 'Elo ' + Math.round(e.elo) : crL('Chưa có trận', 'No matches')) + '</div></div>';
  }
  var html = '<div class="h2h-hero">' + side(a, ca, ea, 'a') +
    '<div class="h2h-score"><div class="h2h-big"><span class="a">' + cnt.W + '</span><span class="d">' + cnt.D + '</span><span class="b">' + cnt.L + '</span></div>' +
    '<div class="h2h-cap"><span>' + crL('Thắng', 'Wins') + '</span><span>' + crL('Hòa', 'Draws') + '</span><span>' + crL('Thắng', 'Wins') + '</span></div>' +
    '<div class="h2h-sub">' + P + crL(' trận đối đầu', P === 1 ? ' meeting' : ' meetings') + ' · ' + crL('Tỉ số ', 'Goals ') + GF + ' – ' + GA + '</div></div>' +
    side(b, cb, eb, 'b') + '</div>';
  if(P) html += '<div class="h2h-bar">' + [['a', cnt.W], ['d', cnt.D], ['b', cnt.L]].map(function(s){
    return s[1] ? '<span class="' + s[0] + '" style="width:' + (s[1] * 100 / P).toFixed(1) + '%">' + Math.round(s[1] * 100 / P) + '%</span>' : '';
  }).join('') + '</div>';
  else html += '<div class="muted h2h-empty">' + crL('Hai đội chưa từng gặp nhau.', 'These teams have never met.') + '</div>';

  function split(pa){
    pa = Math.max(0, Math.min(100, pa));
    return '<div class="h2h-split"><i class="a" style="width:' + pa.toFixed(1) + '%"></i><i class="b" style="width:' + (100 - pa).toFixed(1) + '%"></i></div>';
  }
  if(ea && eb){
    var pctA = Math.round(100 / (1 + Math.pow(10, (eb.elo - ea.elo) / 400)));
    html += '<div class="h2h-forecast"><div class="h2h-fc-title">🔮 ' + crL('Khả năng thắng trận tới (theo Elo)', 'Next match win chance (Elo)') + '</div>' +
      '<div class="h2h-fc"><b class="a">' + pctA + '%</b>' + split(pctA) + '<b class="b">' + (100 - pctA) + '%</b></div></div>';
  }

  var rows = [];
  function row(label, va, vb, fmt){
    var tot = va + vb, better = va === vb ? '' : (va > vb ? 'a' : 'b');
    fmt = fmt || String;
    rows.push('<div class="h2h-row"><span class="h2h-v a' + (better === 'a' ? ' best' : '') + '">' + fmt(va) + '</span>' +
      '<div class="h2h-mid"><div class="h2h-l">' + label + '</div>' + split(tot > 0 ? va * 100 / tot : 50) + '</div>' +
      '<span class="h2h-v b' + (better === 'b' ? ' best' : '') + '">' + fmt(vb) + '</span></div>');
  }
  var f2 = function(v){ return v.toFixed(2); }, rnd = function(v){ return String(Math.round(v)); };
  if(P){
    row(crL('Thắng đối đầu', 'Head-to-head wins'), cnt.W, cnt.L);
    row(crL('Bàn thắng đối đầu', 'Head-to-head goals'), GF, GA);
    row(crL('Bàn thắng / trận', 'Goals per match'), GF / P, GA / P, f2);
    if(ko.P) row(crL('Thắng loạt loại trực tiếp', 'Knock-out ties won'), ko.W, ko.L);
    if(bigA || bigB) row(crL('Cách biệt thắng lớn nhất', 'Biggest winning margin'), bigA ? bigA.gf - bigA.ga : 0, bigB ? bigB.ga - bigB.gf : 0, function(v){ return v ? '+' + v : '—'; });
  }
  if(ea && eb){
    row(crL('Elo hiện tại', 'Current Elo'), ea.elo, eb.elo, rnd);
    row(crL('Elo đỉnh cao', 'Peak Elo'), ea.peak, eb.peak, rnd);
    row(crL('Tỉ lệ thắng sự nghiệp', 'Career win rate'), ea.W * 100 / ea.P, eb.W * 100 / eb.P, function(v){ return Math.round(v) + '%'; });
    row(crL('Số trận sự nghiệp', 'Career matches'), ea.P, eb.P);
  }
  var ma = medalCount((cd.trophies[a.toLowerCase()] || {}).list), mb = medalCount((cd.trophies[b.toLowerCase()] || {}).list);
  row(crL('Điểm danh hiệu', 'Trophy points'), medalPoints(ma), medalPoints(mb));
  if(ca && cb) row(crL('Chỉ số tổng (thẻ)', 'Card overall'), ca.ovr, cb.ovr);
  html += crSection(crL('So sánh chỉ số', 'Stat comparison'), '<div class="h2h-legend"><span class="a no-i18n">' + escapeHtml(a) + '</span><span class="b no-i18n">' + escapeHtml(b) + '</span></div><div class="h2h-rows">' + rows.join('') + '</div>');

  if(!P) return html;

  var k = 1, lastR = list[P - 1].r;
  while(k < P && list[P - 1 - k].r === lastR) k++;
  var streakTxt = lastR === 'D' ? crL(k + ' trận hòa liên tiếp gần nhất', 'The last ' + k + ' meetings ended level')
    : careerFill(crL('{t} thắng {k} trận đối đầu gần nhất', '{t} won the last {k} meetings'), { t: escapeHtml(lastR === 'W' ? a : b), k: k });
  if(lastR !== 'D' && k === 1) streakTxt = careerFill(crL('{t} thắng trận đối đầu gần nhất', '{t} won the latest meeting'), { t: escapeHtml(lastR === 'W' ? a : b) });
  var na = '<span class="no-i18n">' + escapeHtml(a) + '</span>', nb = '<span class="no-i18n">' + escapeHtml(b) + '</span>';
  html += crSection(crL('Điểm nhấn', 'Highlights'), '<ul class="cr-list">' +
    '<li><span class="muted">' + crL('Phong độ đối đầu', 'Head-to-head form') + ':</span> <span class="no-i18n">' + streakTxt + '</span></li>' +
    crMatchLine(careerFill(crL('Lần gần nhất {t} thắng', 'Last win for {t}'), { t: na }), lastA) +
    crMatchLine(careerFill(crL('Lần gần nhất {t} thắng', 'Last win for {t}'), { t: nb }), lastB) +
    crMatchLine(careerFill(crL('{t} thắng đậm nhất', 'Biggest win for {t}'), { t: na }), bigA) +
    crMatchLine(careerFill(crL('{t} thắng đậm nhất', 'Biggest win for {t}'), { t: nb }), bigB) + '</ul>');

  var bySeason = {}, order = [];
  list.forEach(function(x){
    var s = bySeason[x.m.sid];
    if(!s){ s = bySeason[x.m.sid] = { name: x.m.season, mode: x.m.mode, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 }; order.push(x.m.sid); }
    s.P++; s[x.r]++; s.GF += x.gf; s.GA += x.ga;
  });
  html += crSection(crL('Theo mùa giải', 'By season'), '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + crL('Mùa', 'Season') + '</th><th>' + CR_COL.mode + '</th><th>' + CR_COL.P + '</th>' +
    '<th class="no-i18n">' + escapeHtml(a) + '</th><th>' + crL('Hòa', 'Draws') + '</th><th class="no-i18n">' + escapeHtml(b) + '</th><th>' + crL('Tỉ số', 'Goals') + '</th></tr></thead><tbody>' +
    order.reverse().map(function(id){
      var s = bySeason[id];
      return '<tr><td class="no-i18n">' + escapeHtml(s.name) + '</td><td>' + escapeHtml(crModeLabel(s.mode)) + '</td><td>' + s.P + '</td><td>' + s.W + '</td><td>' + s.D + '</td><td>' + s.L + '</td><td>' + s.GF + '-' + s.GA + '</td></tr>';
    }).join('') + '</tbody></table></div>');

  html += crSection(crL('Tất cả các trận đối đầu', 'All meetings') + ' (' + P + ')', '<div class="team-match-list">' + list.slice().reverse().map(crMatchRow).join('') + '</div>');
  return html;
}

// ---------------- Elo / records dialog ----------------
var hallTab = 'elo';
var HALL_TITLES = crL({ career: '🃏 Sự nghiệp · Thẻ cầu thủ', elo: '📈 Bảng xếp hạng Elo', records: '🏅 Kỷ lục toàn hệ thống' },
  { career: '🃏 Career · Player cards', elo: '📈 Elo rankings', records: '🏅 All-time records' });

function crSearchKey(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function renderCareerCardsHtml(cd, only){
  var cards = careerEloTable(cd, only).map(function(t){ return careerFifaCard(cd, t.name); }).filter(Boolean)
    .sort(function(a, b){ return b.ovr - a.ovr || b.elo - a.elo; });
  if(!cards.length) return '<div class="muted">' + crL('Chưa có dữ liệu.', 'No data yet.') + '</div>';
  return '<div class="fc-grid">' + cards.map(function(c, i){
    return '<div class="fc-pick" role="button" tabindex="0" data-career-team="' + escapeHtml(c.name) + '" data-search="' + escapeHtml(crSearchKey(c.name)) + '">' +
      '<span class="fc-rank">#' + (i + 1) + '</span>' + renderFifaCardHtml(c) + '</div>';
  }).join('') + '</div>' +
    '<div class="muted cr-note">' + crL('Xếp theo chỉ số tổng của thẻ. Bấm vào thẻ để xem toàn bộ sự nghiệp.', 'Sorted by overall rating (OVR). Click a card to see the full career.') + '</div>';
}

function applyHallSearch(){
  var q = crSearchKey($('hallSearch').value.trim());
  document.querySelectorAll('#hallBody .fc-pick').forEach(function(el){
    el.hidden = !!q && el.getAttribute('data-search').indexOf(q) === -1;
  });
}

function renderHallDialog(){
  var cd = careerData(state), only = $('hallMasterOnly').checked, html;
  $('hallTitle').textContent = HALL_TITLES[hallTab];
  $('hallDialog').classList.toggle('cr-wide', hallTab === 'career');
  $('hallSearch').hidden = hallTab !== 'career';
  document.querySelectorAll('#hallDialog [data-hall-tab]').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-hall-tab') === hallTab); });
  if(hallTab === 'career'){
    html = renderCareerCardsHtml(cd, only);
  } else if(hallTab === 'elo'){
    var rows = careerEloTable(cd, only);
    html = '<div class="cr-table-wrap"><table class="cr-table cr-elo"><thead><tr><th>#</th><th>' + crL('Đội', 'Team') + '</th><th>Elo</th><th title="' + crL('Thay đổi sau 10 trận gần nhất', 'Change over the last 10 matches') + '">' + crL('10 trận', 'Last 10') + '</th><th>' + crL('Đỉnh cao', 'Peak') + '</th><th>' + CR_COL.P + '</th><th>' + CR_COL.WDL + '</th><th>' + CR_COL.win + '</th></tr></thead><tbody>' +
      rows.map(function(t, i){
        var tl = t.timeline, back = tl.length > 10 ? tl[tl.length - 11] : ELO_BASE, d = t.elo - back;
        return '<tr' + (t.P < ELO_PROVISIONAL ? ' class="cr-prov" title="' + crL('Dưới ' + ELO_PROVISIONAL + ' trận: Elo tạm tính', 'Under ' + ELO_PROVISIONAL + ' matches: provisional Elo') + '"' : '') + '><td>' + (i + 1) + '</td><td>' + crTeam(t.name) + '</td>' +
          '<td><b>' + Math.round(t.elo) + '</b></td><td class="' + (d >= 0 ? 'cr-up' : 'cr-down') + '">' + crSigned(d) + '</td><td>' + Math.round(t.peak) + '</td>' +
          '<td>' + t.P + '</td><td>' + t.W + '-' + t.D + '-' + t.L + '</td><td>' + crPct(t.W, t.P) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="muted cr-note">' + crL(
        'Elo khởi điểm ' + ELO_BASE + ', K=' + ELO_K + '. Trận thường: nhân thêm theo cách biệt bàn thắng. Loại trực tiếp (Bo3/Bo5): tính 1 trận thắng/thua, ×' + ELO_KO_FACTOR + ', thắng trắng thêm ×' + ELO_SWEEP_FACTOR + '. Thứ tự theo thanh chọn mùa (cũ → mới). Hàng mờ: dưới ' + ELO_PROVISIONAL + ' trận.',
        'Elo starts at ' + ELO_BASE + ', K=' + ELO_K + '. Regular matches are scaled by the goal margin. Knock-out (Bo3/Bo5): counted as one win/loss, ×' + ELO_KO_FACTOR + ', a clean sweep adds ×' + ELO_SWEEP_FACTOR + '. Order follows the season bar (old → new). Faded rows: under ' + ELO_PROVISIONAL + ' matches.') + '</div>';
    if(!rows.length) html = '<div class="muted">' + crL('Chưa có dữ liệu.', 'No data yet.') + '</div>';
  } else {
    html = '<div class="rec-grid">' + careerRecords(cd, only).map(function(r){
      var items = r.items.length ? r.items.map(function(it, i){
        var who = it.team ? crTeam(it.team)
          : it.pair ? crTeam(it.pair[0]) + ' <span class="muted">vs</span> ' + crTeam(it.pair[1])
          : '<span class="no-i18n">' + escapeHtml(it.match.home) + ' – ' + escapeHtml(it.match.away) + '</span>';
        var sub = it.match ? '<div class="rec-sub no-i18n">' + escapeHtml(it.match.season + ' · ' + it.match.stage) + '</div>'
          : it.sub ? '<div class="rec-sub">' + escapeHtml(it.sub) + '</div>' : '';
        return '<li><span class="rec-rank">' + (i + 1) + '</span><div class="rec-who">' + who + sub + '</div><span class="rec-val">' + escapeHtml(it.value) + '</span></li>';
      }).join('') : '<li class="muted">—</li>';
      return '<div class="rec-card"><div class="rec-title">' + r.icon + ' ' + r.title + '</div><ol class="rec-list">' + items + '</ol></div>';
    }).join('') + '</div>';
  }
  $('hallBody').innerHTML = html;
  if(hallTab === 'career') applyHallSearch();
}

function openHallDialog(tab){
  hallTab = tab || 'elo';
  var cb = $('hallMasterOnly');
  if(!(state.teamMasterList || []).length){ cb.checked = false; cb.parentNode.style.display = 'none'; }
  renderHallDialog();
  var dlg = $('hallDialog');
  if(!dlg.open){ if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open'); }
}

document.addEventListener('click', function(e){
  var t = e.target;
  if(!t || !t.closest) return;
  var x = t.closest('.dlg-x');
  if(x){ e.preventDefault(); var dlg = x.closest('dialog'); if(dlg) dlg.close(); return; }
  var a = t.closest('[data-career-team]');
  if(a){ e.preventDefault(); openCareerDialog(a.getAttribute('data-career-team')); return; }
  if(t.closest('#btnTeamCareer')){ openCareerDialog($('teamDialog').getAttribute('data-team-name')); return; }
  if(t.closest('#btnCareerList')){ openHallDialog('career'); return; }
  if(t.closest('#btnElo')){ openHallDialog('elo'); return; }
  if(t.closest('#btnRecords')){ openHallDialog('records'); return; }
  var tab = t.closest('[data-hall-tab]');
  if(tab){ hallTab = tab.getAttribute('data-hall-tab'); renderHallDialog(); }
});

document.addEventListener('keydown', function(e){
  // The hall form has no submit button: Enter in the search box would submit (close) the dialog.
  if(e.key === 'Enter' && e.target && e.target.id === 'hallSearch'){ e.preventDefault(); return; }
  if((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('fc-pick')){
    e.preventDefault();
    openCareerDialog(e.target.getAttribute('data-career-team'));
  }
});

document.addEventListener('input', function(e){
  if(e.target && e.target.id === 'hallSearch') applyHallSearch();
});

document.addEventListener('change', function(e){
  if(e.target && e.target.id === 'hallMasterOnly') renderHallDialog();
});
