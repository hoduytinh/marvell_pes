// Marvell PES Club - features/career.js
// Cross-season data built on collectSeasonMatches (features/team-matches.js):
// chronological match history, Elo ratings, all-time records, team career,
// FIFA-style card, match commentary (sentences from news-bank.js), head-to-head view and the Career / Elo / records dialogs.
// Teams are identified by their (trimmed) name across seasons.
// UI strings are bilingual via crL(vi, en); switching language reloads the page.

var CR_EN = (function(){ try { return localStorage.getItem('pesLang') !== 'vi'; } catch(e){ return true; } })();
function crL(vi, en){ return CR_EN ? en : vi; }

var CAREER_SKIP_MODES = { legend: 1, ranking: 1 };
var ELO_BASE = 1500, ELO_K = 32, ELO_KO_FACTOR = 1.25, ELO_SWEEP_FACTOR = 1.25, ELO_PROVISIONAL = 10;

// Header order lists the newest season first; history needs the oldest first.
// Seasons turned off by an admin (s.statsOff) are left out of every cross-season stat.
function careerSeasonIds(st){
  st = st || state;
  var seasons = st.seasons || {}, seen = {}, ids = [];
  var order = (st.seasonOrder && st.seasonOrder.length) ? st.seasonOrder : Object.keys(seasons);
  order.forEach(function(id){ if(seasons[id] && !seen[id]){ seen[id] = 1; ids.push(id); } });
  Object.keys(seasons).forEach(function(id){ if(!seen[id]){ seen[id] = 1; ids.unshift(id); } });
  return ids.reverse().filter(function(id){ return !CAREER_SKIP_MODES[seasons[id].mode] && !seasons[id].statsOff; });
}

function careerName(n){ return String(n == null ? '' : n).trim(); }

// Career key matching `name` case-insensitively (falls back to the trimmed name).
function careerResolveName(cd, name){
  name = careerName(name);
  if(cd.elo[name]) return name;
  var k = name.toLowerCase();
  return Object.keys(cd.elo).filter(function(n){ return n.toLowerCase() === k; })[0] || name;
}

function crExt(a, b){ var o = {}, k; for(k in a) o[k] = a[k]; for(k in b) o[k] = b[k]; return o; }
function crIsDoubles(s){ return typeof seasonIsDoubles === 'function' && seasonIsDoubles(s); }
function crIsPlayoff(s){ return typeof seasonKind === 'function' && seasonKind(s) === 'playoff'; }
function crPairOf(s, idx){ return typeof seasonPair === 'function' ? seasonPair(s, idx) : null; }

// Per-game scores of a knock-out series (features/ko-games.js), only when they add up to the series result.
function careerGamesOf(res){
  if(!res || !Array.isArray(res.games)) return null;
  var g = res.games.filter(function(x){ return x && x.h != null && x.a != null && x.h !== '' && x.a !== '' && isFinite(x.h) && isFinite(x.a); })
    .slice(0, 5).map(function(x){ return { h: +x.h, a: +x.a, p: (x.p === 'h' || x.p === 'a') ? x.p : null, auto: !!x.auto }; });
  if(!g.length) return null;
  var sh = 0, sa = 0;
  g.forEach(function(x){
    if(x.h > x.a || (x.h === x.a && x.p === 'h')) sh++;
    else if(x.a > x.h || (x.h === x.a && x.p === 'a')) sa++;
  });
  return (sh === +res.hg && sa === +res.ag) ? g : null;
}

// Played matches of every season, oldest first.
// all : every rated entry (singles + doubles). Knock-out series with per-game scores are split
//       into one entry per game (koGame); series without them stay a single entry (ko).
// hist: singles entries only (records, head-to-head, career). ties: singles knock-out series.
function careerTimeline(st){
  st = st || state;
  var all = [], ties = [];
  careerSeasonIds(st).forEach(function(sid){
    var s = st.seasons[sid];
    if(!s || !Array.isArray(s.teams)) return;
    var list, dbl = crIsDoubles(s);
    try { list = collectSeasonMatches(s); } catch(e){ return; }
    list.forEach(function(m){
      if(!m.res || m.rest != null || !isFinite(m.res.hg) || !isFinite(m.res.ag)) return;
      var h = careerName(s.teams[m.home]), a = careerName(s.teams[m.away]);
      if(!h || !a || h === a || /^bye$/i.test(h) || /^bye$/i.test(a)) return;
      var base = { sid: sid, season: s.name || '', mode: s.mode || 'league', po: crIsPlayoff(s), stage: m.stage, key: m.key, home: h, away: a };
      if(dbl){
        var ph = crPairOf(s, m.home), pa = crPairOf(s, m.away);
        if(!ph || !pa) return;
        base.dbl = true; base.ph = ph; base.pa = pa;
      } else if(m.ko) ties.push(crExt(base, { ko: true, hg: m.res.hg, ag: m.res.ag }));
      var games = m.ko ? careerGamesOf(m.res) : null;
      if(games) games.forEach(function(g, gi){
        all.push(crExt(base, { ko: false, koGame: true, est: g.auto, stage: m.stage + ' · G' + (gi + 1), key: m.key + '#' + (gi + 1), hg: g.h, ag: g.a, pen: g.p }));
      });
      else all.push(crExt(base, { ko: !!m.ko, est: !!m.ko, hg: m.res.hg, ag: m.res.ag }));
    });
  });
  return { all: all, ties: ties, hist: all.filter(function(m){ return !m.dbl; }) };
}
function careerHistory(st){ return careerTimeline(st).hist; }

// Knock-out results are Bo3/Bo5 series (games won, not goals): only a sweep earns a bonus.
function eloMarginFactor(m){
  if(m.ko) return Math.min(m.hg, m.ag) === 0 ? ELO_SWEEP_FACTOR : 1;
  var gd = Math.abs(m.hg - m.ag);
  return gd <= 1 ? 1 : (gd === 2 ? 1.5 : (11 + gd) / 8);
}

// Adds eloH/eloA (before the match) and eloD (home gain) to every history entry.
// Doubles: each side is rated as the average of its two players; both players gain/lose eloD.
function computeElo(hist){
  var T = {};
  // Pg/GFg/GAg: singles with a real scoreline (auto-filled 1-0 knock-out games excluded) -> goal rates.
  function get(n){ return T[n] || (T[n] = { name: n, elo: ELO_BASE, peak: ELO_BASE, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pg: 0, GFg: 0, GAg: 0, DP: 0, DW: 0, DD: 0, DL: 0, timeline: [] }); }
  function apply(t, d, gf, ga, dbl, est){
    t.elo += d;
    if(dbl){ t.DP++; if(gf > ga) t.DW++; else if(gf < ga) t.DL++; else t.DD++; }
    else {
      t.P++; t.GF += gf; t.GA += ga; if(gf > ga) t.W++; else if(gf < ga) t.L++; else t.D++;
      if(!est){ t.Pg++; t.GFg += gf; t.GAg += ga; }
    }
    if(t.elo > t.peak) t.peak = t.elo;
    t.timeline.push(t.elo);
  }
  hist.forEach(function(m){
    var score = m.hg > m.ag ? 1 : (m.hg < m.ag ? 0 : 0.5);
    var k = ELO_K * ((m.ko || m.koGame) ? ELO_KO_FACTOR : 1) * eloMarginFactor(m);
    if(m.dbl){
      var HP = m.ph.map(get), AP = m.pa.map(get);
      var eh = (HP[0].elo + HP[1].elo) / 2, ea = (AP[0].elo + AP[1].elo) / 2;
      var dd = k * (score - 1 / (1 + Math.pow(10, (ea - eh) / 400)));
      m.eloH = eh; m.eloA = ea; m.eloD = dd;
      HP.forEach(function(t){ apply(t, dd, m.hg, m.ag, true); });
      AP.forEach(function(t){ apply(t, -dd, m.ag, m.hg, true); });
      return;
    }
    var H = get(m.home), A = get(m.away);
    var d = k * (score - 1 / (1 + Math.pow(10, (A.elo - H.elo) / 400)));
    m.eloH = H.elo; m.eloA = A.elo; m.eloD = d;
    apply(H, d, m.hg, m.ag, false, m.est);
    apply(A, -d, m.ag, m.hg, false, m.est);
  });
  return T;
}

// ---------------- Finishes / trophy points ----------------
// Trophy points come from official (non-playoff), finished seasons: every participant scores,
// the further a team goes the more it scores. Medals: champion gold, runner-up silver, 3rd bronze.
var CR_PLACE = crL(
  { 1: 'Vô địch', 2: 'Á quân', 3: 'Hạng 3', 4: 'Hạng 4', sf: 'Bán kết', qf: 'Tứ kết', ko: 'Vòng loại trực tiếp', part: 'Tham dự', n: 'Hạng ' },
  { 1: 'Champion', 2: 'Runner-up', 3: '3rd place', 4: '4th place', sf: 'Semi-final', qf: 'Quarter-final', ko: 'Knock-out stage', part: 'Participant', n: 'Place ' });
var CR_MEDAL_ICON = { gold: '🥇', silver: '🥈', bronze: '🥉' };

function crWinner(m){ return (m && m.res && m.res.hg !== m.res.ag) ? (m.res.hg > m.res.ag ? m.home : m.away) : null; }
function crLoser(m){ var w = crWinner(m); return w == null ? null : (w === m.home ? m.away : m.home); }

// Single-elimination bracket -> { teamIdx: {pts, medal, place, lv} }, or null when the final is not decided.
// lv = how far the team went (higher = further), used by PES Ranking (features/pes-ranking.js).
function crKoFinishes(matches, prefix, br){
  var third = -1;
  ((br && br.stageNames) || []).forEach(function(n, i){ if(/tranh hạng 3|3rd/i.test(n || '')) third = i; });
  var ms = matches.filter(function(m){ return m.rest == null && m.key && m.key.indexOf(prefix) === 0; })
    .map(function(m){ return { r: parseInt(m.key.slice(prefix.length), 10), m: m }; })
    .filter(function(x){ return isFinite(x.r); });
  var main = ms.filter(function(x){ return x.r !== third; });
  if(!main.length) return null;
  var finalR = Math.max.apply(null, main.map(function(x){ return x.r; }));
  var fin = main.filter(function(x){ return x.r === finalR; })[0];
  if(crWinner(fin.m) == null) return null;
  var depth = {}, out = {};
  main.forEach(function(x){ [x.m.home, x.m.away].forEach(function(t){ depth[t] = Math.max(depth[t] == null ? -1 : depth[t], x.r); }); });
  Object.keys(depth).forEach(function(t){
    var dist = finalR - depth[t];
    out[t] = dist === 1 ? { pts: 4, medal: third >= 0 ? null : 'bronze', place: third >= 0 ? CR_PLACE.sf : CR_PLACE[3] }
      : dist === 2 ? { pts: 3, place: CR_PLACE.qf } : { pts: 2, place: CR_PLACE.ko };
    out[t].lv = 50 - dist;
  });
  out[crWinner(fin.m)] = { pts: 10, medal: 'gold', place: CR_PLACE[1], lv: 100 };
  out[crLoser(fin.m)] = { pts: 7, medal: 'silver', place: CR_PLACE[2], lv: 90 };
  var tm = third >= 0 ? ms.filter(function(x){ return x.r === third; })[0] : null;
  if(tm && crWinner(tm.m) != null){
    out[crWinner(tm.m)] = { pts: 5, medal: 'bronze', place: CR_PLACE[3], lv: 80 };
    out[crLoser(tm.m)] = { pts: 4, place: CR_PLACE[4], lv: 70 };
  }
  return out;
}

// Ordered team indices -> finishes by position.
function crTableFinishes(order){
  var out = {}, n = order.length;
  order.forEach(function(idx, i){
    var pos = i + 1;
    out[idx] = pos === 1 ? { pts: 10, medal: 'gold', place: CR_PLACE[1] }
      : pos === 2 ? { pts: 7, medal: 'silver', place: CR_PLACE[2] }
      : pos === 3 ? { pts: 5, medal: 'bronze', place: CR_PLACE[3] }
      : { pts: pos === 4 ? 4 : (pos <= Math.ceil(n / 2) ? 2 : 1), place: CR_PLACE.n + pos };
    out[idx].pos = pos;
  });
  return out;
}

function crDeFinishes(s, matches){
  var gf = matches.filter(function(m){ return m.key && m.key.indexOf('de-grand-final-') === 0 && crWinner(m) != null; });
  if(!gf.length) return null;
  var last = gf[gf.length - 1], out = {};
  var lbN = ((s.doubleElimination && s.doubleElimination.losersRounds) || []).length;
  matches.forEach(function(m){
    if(!m.key) return;
    var lo = crLoser(m);
    if(lo == null) return;
    var mm = /^de-losers-(\d+)-/.exec(m.key);
    if(mm){
      var dist = lbN - 1 - (+mm[1]);
      out[lo] = dist <= 0 ? { pts: 5, medal: 'bronze', place: CR_PLACE[3] } : dist === 1 ? { pts: 4, place: CR_PLACE[4] }
        : dist === 2 ? { pts: 3, place: CR_PLACE.qf } : { pts: 2, place: CR_PLACE.ko };
      out[lo].lv = 50 - Math.max(0, dist);
    } else if(m.key.indexOf('de-playoff-') === 0) out[lo] = { pts: 1, place: CR_PLACE.part, lv: 1 };
  });
  out[crWinner(last)] = { pts: 10, medal: 'gold', place: CR_PLACE[1], lv: 100 };
  out[crLoser(last)] = { pts: 7, medal: 'silver', place: CR_PLACE[2], lv: 90 };
  return out;
}

// { teamIdx: {pts, medal?, place} } of a finished season (locked, ended, or naturally complete), else null.
function careerSeasonFinishes(s){
  if(!s || !Array.isArray(s.teams) || CAREER_SKIP_MODES[s.mode]) return null;
  var ended = !!(s.locked || s.forceEnded), mode = s.mode || 'league', fin = null;
  var matches = collectSeasonMatches(s);
  if(mode === 'league'){
    var done = (s.rounds || []).every(function(ms, r){ return ms.every(function(m, mi){ var x = (s.results || {})[r + '-' + mi]; return x && x.hg !== '' && x.hg != null; }); });
    if(!done && !ended) return null;
    fin = crTableFinishes(computeStandingsFor(s, 'overall').map(function(r){ return r.idx; }));
  } else if(mode === 'chess-swiss'){
    var cs = s.chessSwiss;
    if(!cs) return null;
    var csDone = cs.rounds && cs.rounds.length >= cs.numRounds && chessSwissRoundComplete(s, cs.numRounds - 1);
    if(!csDone && !ended) return null;
    var rows = chessSwissStats(s, (cs.rounds || []).length).filter(function(r){ return !r.isBye; })
      .sort(function(a, b){ return b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || b.W - a.W || String(a.team).localeCompare(String(b.team)); });
    fin = crTableFinishes(rows.map(function(r){ return r.idx; }));
  } else if(mode === 'double-elimination'){
    fin = crDeFinishes(s, matches);
  } else {
    var pre = mode === 'cup' ? 'cup-' : mode === 'tournament' ? 'knockout-' : mode === 'swiss' ? 'swiss-playoff-' : null;
    var br = mode === 'cup' ? s.cup : mode === 'tournament' ? s.knockoutBracket : (s.swiss && s.swiss.playoffBracket);
    if(pre) fin = crKoFinishes(matches, pre, br);
  }
  if(!fin) return null;
  // Bronze only for seasons whose "3rd place" setting is ticked (Cài đặt giải); points stay the same.
  if(!s.has3rdPlace) Object.keys(fin).forEach(function(k){
    var f = fin[k];
    if(f.medal === 'bronze') fin[k] = { pts: f.pts, pos: f.pos, lv: f.lv, place: (f.place === CR_PLACE[3] && f.pts === 4) ? CR_PLACE.sf : f.place };
  });
  s.teams.forEach(function(_, i){ if(!fin[i]) fin[i] = { pts: 1, place: CR_PLACE.part }; });
  return fin;
}

// Hall of Legend photos by year: state.hallPhotos (state.js migrateState copies them once from the
// old manual Hall seasons).
function hallPhotoMap(st){
  st = st || state;
  if(!st.hallPhotos || typeof st.hallPhotos !== 'object') st.hallPhotos = {};
  return st.hallPhotos;
}

// Hall of Legend: finished official seasons grouped by record year (seasonYearOf). Medals come from
// the same career trophies data as the cards (careerData().medals). Same shape as a legend season.
function careerAutoLegend(st){
  st = st || state;
  var medals = careerData(st).medals, byYear = {};
  careerSeasonIds(st).forEach(function(sid){
    var s = st.seasons[sid];
    if(!s || !medals[sid]) return;
    var year = typeof seasonYearOf === 'function' ? seasonYearOf(s) : '';
    if(!year) return;
    var tl = byYear[year] || (byYear[year] = { year: year, events: [], pictures: [] });
    tl.events.push({ name: typeof seasonTitleOf === 'function' ? seasonTitleOf(s) : (s.name || ''), sid: sid, medals: medals[sid] });
  });
  var photos = hallPhotoMap(st);
  Object.keys(photos).forEach(function(y){
    if(!Array.isArray(photos[y])) return;
    if(byYear[y]) byYear[y].pictures = photos[y];
    else if(photos[y].length) byYear[y] = { year: y, events: [], pictures: photos[y] };
  });
  var timelines = Object.keys(byYear).sort().map(function(y){ return byYear[y]; });
  return { mode: 'legend', name: 'Hall of Legend', auto: true, timelines: timelines };
}

// lower-cased name -> { name, pts, list: [{sid, season, team, medal|null, place, pts, dbl}] } (oldest first)
// medalsOut (optional) is filled with sid -> {gold, silver, bronze: [names]} for the Hall of Legend.
function careerTrophies(st, medalsOut){
  var map = {};
  careerSeasonIds(st).forEach(function(sid){
    var s = st.seasons[sid];
    if(!s || crIsPlayoff(s)) return;
    var fin;
    try { fin = careerSeasonFinishes(s); } catch(e){ fin = null; }
    if(!fin) return;
    var dbl = crIsDoubles(s), md = { gold: [], silver: [], bronze: [] };
    if(medalsOut) medalsOut[sid] = md;
    Object.keys(fin).forEach(function(idx){
      var f = fin[idx], team = careerName(s.teams[idx]);
      if(!team || /^bye$/i.test(team)) return;
      if(s.mode === 'chess-swiss' && s.chessSwiss && +idx === s.chessSwiss.byeIndex) return;
      var names = dbl ? (crPairOf(s, +idx) || []) : [team];
      if(f.medal && md[f.medal]) names.forEach(function(n){ if(careerName(n)) md[f.medal].push(careerName(n)); });
      names.forEach(function(n){
        var k = careerName(n).toLowerCase();
        if(!k) return;
        var e = map[k] || (map[k] = { name: careerName(n), list: [], pts: 0 });
        e.list.push({ sid: sid, season: s.name || '', team: team, medal: f.medal || null, place: f.place, pts: f.pts, dbl: dbl });
        e.pts += f.pts;
      });
    });
  });
  return map;
}

// Cached: rebuilt after saveAll()/refreshAll() or when the state object changes.
var crCache = { ver: -1, st: null, seasons: null, cd: null }, crVer = 0, crHooked = false;
function careerInvalidate(){ crVer++; }
function crHook(){
  if(crHooked) return;
  crHooked = true;
  ['saveAll', 'refreshAll'].forEach(function(fn){
    var orig = window[fn];
    if(typeof orig === 'function') window[fn] = function(){ crVer++; return orig.apply(this, arguments); };
  });
}
function careerData(st){
  st = st || state;
  crHook();
  if(crCache.cd && crCache.ver === crVer && crCache.st === st && crCache.seasons === st.seasons) return crCache.cd;
  var tl = careerTimeline(st);
  var medals = {};
  var cd = { st: st, hist: tl.hist, ties: tl.ties, dbl: tl.all.filter(function(m){ return m.dbl; }), elo: computeElo(tl.all), trophies: careerTrophies(st, medals), medals: medals };
  crCache = { ver: crVer, st: st, seasons: st.seasons, cd: cd };
  return cd;
}

// Career data as of the end of `year`: only seasons whose record year (seasonYearOf) is <= year.
// Same shape as careerData (cd.st is a view of the state with the filtered seasons); cached per year.
var crYearCache = { ver: -1, st: null, seasons: null, map: {} };
function careerDataUntil(year, st){
  st = st || state;
  crHook();
  if(crYearCache.ver !== crVer || crYearCache.st !== st || crYearCache.seasons !== st.seasons) crYearCache = { ver: crVer, st: st, seasons: st.seasons, map: {} };
  var key = String(year);
  if(crYearCache.map[key]) return crYearCache.map[key];
  var all = st.seasons || {}, seasons = {};
  Object.keys(all).forEach(function(id){
    var y = typeof seasonYearOf === 'function' ? seasonYearOf(all[id]) : '';
    if(y && +y <= +year) seasons[id] = all[id];
  });
  var view = Object.create(st);
  view.seasons = seasons;
  var tl = careerTimeline(view), medals = {};
  var cd = { st: view, hist: tl.hist, ties: tl.ties, dbl: tl.all.filter(function(m){ return m.dbl; }), elo: computeElo(tl.all), trophies: careerTrophies(view, medals), medals: medals, asOf: String(year) };
  return (crYearCache.map[key] = cd);
}

// Opponent-adjusted attack / defence: goals scored above what the opponent usually concedes
// (and conceded below what the opponent usually scores), divided by P + CR_SHRINK_K so that
// players with few matches are pulled towards the average (0). Opponent averages are shrunk the same way.
// Auto-filled 1-0 knock-out games (est) are left out: their scoreline is not real.
var CR_SHRINK_K = 15;
function careerAttDef(cd){
  if(cd.ad) return cd.ad;
  var k = CR_SHRINK_K, base = {}, G = 0, N = 0, out = {};
  var hist = cd.hist.filter(function(m){ return !m.est; });
  hist.forEach(function(m){
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(function(x){
      var b = base[x[0]] || (base[x[0]] = { P: 0, GF: 0, GA: 0 });
      b.P++; b.GF += x[1]; b.GA += x[2];
    });
    G += m.hg + m.ag; N += 2;
  });
  var avg = N ? G / N : 0;
  function oppGF(n){ var b = base[n]; return (b.GF + k * avg) / (b.P + k); }
  function oppGA(n){ var b = base[n]; return (b.GA + k * avg) / (b.P + k); }
  hist.forEach(function(m){
    [[m.home, m.away, m.hg, m.ag], [m.away, m.home, m.ag, m.hg]].forEach(function(x){
      var o = out[x[0]] || (out[x[0]] = { P: 0, a: 0, d: 0 });
      o.P++; o.a += x[2] - oppGA(x[1]); o.d += oppGF(x[1]) - x[3];
    });
  });
  Object.keys(out).forEach(function(n){ var o = out[n]; o.att = o.a / (o.P + k); o.def = o.d / (o.P + k); });
  return (cd.ad = out);
}

// "sid|key" -> { h, a }: Elo change of the home / away side (per-game knock-out entries summed per series).
function careerEloDeltas(cd){
  if(cd.dmap) return cd.dmap;
  var map = {};
  cd.hist.concat(cd.dbl || []).forEach(function(m){
    if(!isFinite(m.eloD)) return;
    var k = m.sid + '|' + String(m.key).replace(/#\d+$/, '');
    var e = map[k] || (map[k] = { h: 0, a: 0 });
    e.h += m.eloD; e.a -= m.eloD;
  });
  return (cd.dmap = map);
}
function careerSeasonIdOf(s){
  var ss = (state && state.seasons) || {};
  return Object.keys(ss).filter(function(id){ return ss[id] === s; })[0] || null;
}
function careerEloDeltaOf(s, key){
  var sid = careerSeasonIdOf(s);
  return sid && key ? careerEloDeltas(careerData(state))[sid + '|' + key] || null : null;
}
function crEloBadge(d){
  var v = Math.round(d);
  return '<span class="elo-dl ' + (v > 0 ? 'up' : v < 0 ? 'down' : 'same') + '" title="Elo">' + (v > 0 ? '+' + v : v < 0 ? '\u2212' + (-v) : '\u00b10') + '</span>';
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
    .sort(function(a, b){ return b.elo - a.elo || (b.P + b.DP) - (a.P + a.DP); });
}

function medalCount(list){
  var c = { gold: 0, silver: 0, bronze: 0 };
  (list || []).forEach(function(t){ if(c[t.medal] != null) c[t.medal]++; });
  return c;
}
function careerTrophyPts(cd, name){ var t = cd.trophies[careerName(name).toLowerCase()]; return t ? t.pts : 0; }
function careerMedalList(cd, name){
  var t = cd.trophies[careerName(name).toLowerCase()], c = medalCount(t ? t.list : []), out = [];
  ['gold', 'silver', 'bronze'].forEach(function(m){ for(var i = 0; i < c[m]; i++) out.push(m); });
  return out;
}
function careerStarsHtml(medals){
  var tip = crL({ gold: 'Vô địch', silver: 'Á quân', bronze: 'Hạng 3' }, { gold: 'Champion', silver: 'Runner-up', bronze: '3rd place' });
  return (medals || []).map(function(m){ return '<span class="fc-star star-' + m + '" title="' + tip[m] + '">★</span>'; }).join('');
}

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
    if(!ss){ ss = bySeason[m.sid] = { sid: m.sid, name: m.season, mode: m.mode, po: m.po, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, eloStart: pre }; sOrder.push(m.sid); }
    ss.eloEnd = post;
    var oo = opp[x.opp] || (opp[x.opp] = { name: x.opp, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, lastWin: null });
    [ss, oo].forEach(function(t){ t.P++; t.GF += gf; t.GA += ga; t[x.r]++; });
    if(x.r === 'W') oo.lastWin = x;
  });
  var biggestWin = null, worstLoss = null, ko = { P: 0, W: 0 };
  (cd.ties || []).forEach(function(m){
    if(m.home !== name && m.away !== name) return;
    ko.P++;
    if((m.home === name ? m.hg - m.ag : m.ag - m.hg) > 0) ko.W++;
  });
  var dbl = {}, dOrder = [];
  (cd.dbl || []).forEach(function(m){
    var side = m.ph.indexOf(name) !== -1 ? 'h' : (m.pa.indexOf(name) !== -1 ? 'a' : null);
    if(!side) return;
    var pair = side === 'h' ? m.ph : m.pa, gf = side === 'h' ? m.hg : m.ag, ga = side === 'h' ? m.ag : m.hg;
    var e = dbl[m.sid];
    if(!e){ e = dbl[m.sid] = { sid: m.sid, name: m.season, mode: m.mode, po: m.po, team: side === 'h' ? m.home : m.away, partner: pair[0] === name ? pair[1] : pair[0], P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, elo: 0 }; dOrder.push(m.sid); }
    e.P++; e[careerResult(gf, ga)]++; e.GF += gf; e.GA += ga; e.elo += side === 'h' ? m.eloD : -m.eloD;
  });
  list.forEach(function(x){
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
    trophies: tro ? tro.list : [], trophyPts: tro ? tro.pts : 0, streaks: acc, biggestWin: biggestWin, worstLoss: worstLoss, ko: ko,
    doubles: dOrder.map(function(id){ return dbl[id]; }).reverse()
  };
}

// ---------------- Records ----------------
function careerRecords(cd, onlyMaster){
  var set = onlyMaster ? careerMasterSet(cd.st) : null;
  var ok = function(n){ return !set || !!set[n.toLowerCase()]; };
  var teams = careerEloTable(cd, onlyMaster), ad = careerAttDef(cd);
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
  var tro = Object.keys(cd.trophies).map(function(k){ return cd.trophies[k]; }).filter(function(t){ return ok(t.name) && t.pts > 0; })
    .map(function(t){ return { name: t.name, c: medalCount(t.list), score: t.pts }; })
    .sort(function(a, b){ return b.score - a.score || b.c.gold - a.c.gold || b.c.silver - a.c.silver || b.c.bronze - a.c.bronze; }).slice(0, 3)
    .map(function(x){ return { team: x.name, value: x.score + crL(' điểm', ' pts'), sub: '🥇' + x.c.gold + ' 🥈' + x.c.silver + ' 🥉' + x.c.bronze }; });
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
    { grp: 'top', icon: '🏆', title: crL('Nhiều danh hiệu nhất', 'Most trophies'), items: tro },
    { grp: 'top', icon: '📈', title: crL('Elo cao nhất mọi thời đại', 'Highest Elo of all time'), items: topTeams(function(t){ return Math.round(t.peak); }) },
    { grp: 'streak', icon: '🔥', title: crL('Chuỗi thắng dài nhất', 'Longest winning streak'), items: streakTop('win') },
    { grp: 'streak', icon: '🛡️', title: crL('Chuỗi bất bại dài nhất', 'Longest unbeaten run'), items: streakTop('unbeaten') },
    { grp: 'match', icon: '💥', title: crL('Trận thắng đậm nhất', 'Biggest wins'), items: topMatches(function(m){ return Math.abs(m.hg - m.ag); }) },
    { grp: 'match', icon: '🎆', title: crL('Trận nhiều bàn nhất', 'Highest-scoring matches'), items: topMatches(function(m){ return m.hg + m.ag; }) },
    { grp: 'top', icon: '🎯', title: crL('Tỉ lệ thắng cao nhất (≥ ', 'Best win rate (≥ ') + minP + M + ')', items: topTeams(function(t){ return t.W / t.P; }, function(t){ return t.P >= minP; }, function(v){ return Math.round(v * 100) + '%'; }) },
    { grp: 'goal', icon: '⚽', title: crL('Nhiều bàn thắng nhất (tổng)', 'Most goals scored (total)'), items: topTeams(function(t){ return t.GF; }, null, function(v, t){ return v + (t.Pg ? ' (' + (t.GFg / t.Pg).toFixed(2) + crL('/trận', '/match') + ')' : ''); }) },
    { grp: 'goal', icon: '🗡️', title: crL('Hàng công tốt nhất (≥ ', 'Best attack (≥ ') + minP + M + ')', items: topTeams(function(t){ return ad[t.name] ? 10 + ad[t.name].att : 0; }, function(t){ return t.Pg >= minP; }, function(v, t){ return (t.GFg / t.Pg).toFixed(2) + crL(' bàn/trận', ' goals/match'); })
      .map(function(it){ var x = ad[it.team]; it.sub = crL('Đã tính độ mạnh đối thủ: ', 'Opponent-adjusted: ') + (x.att >= 0 ? '+' : '') + x.att.toFixed(2); return it; }) },
    { grp: 'goal', icon: '🧱', title: crL('Hàng thủ tốt nhất (≥ ', 'Best defence (≥ ') + minP + M + ')', items: topTeams(function(t){ return ad[t.name] ? 10 + ad[t.name].def : 0; }, function(t){ return t.Pg >= minP; }, function(v, t){ return (t.GAg / t.Pg).toFixed(2) + crL(' bàn thua/trận', ' conceded/match'); })
      .map(function(it){ var x = ad[it.team]; it.sub = crL('Đã tính độ mạnh đối thủ: ', 'Opponent-adjusted: ') + (x.def >= 0 ? '+' : '') + x.def.toFixed(2); return it; }) },
    { grp: 'top', icon: '🎮', title: crL('Nhiều trận nhất', 'Most matches played'), items: topTeams(function(t){ return t.P; }, null, function(v){ return v + M; })
      .map(function(it){ var t = cd.elo[it.team]; if(t && t.DP) it.sub = crL('+ ', '+ ') + t.DP + crL(' trận đôi', ' doubles'); return it; }) },
    { grp: 'match', icon: '⚔️', title: crL('Cặp đấu kinh điển', 'Classic rivalries'), items: rivalry },
    { grp: 'streak', icon: '😬', title: crL('Chuỗi thua dài nhất', 'Longest losing streak'), items: streakTop('lose') }
  ].concat(careerFunRecords(cd, teams, pairs, matches, ok, topTeams, minP, M));
}

// Light-hearted records (flag fun: true), shown in their own group on the Records tab.
function careerFunRecords(cd, teams, pairs, matches, ok, topTeams, minP, M){
  var fun = {}, seasonsOf = {};
  function F(n){ return fun[n] || (fun[n] = { cs: 0, blank: 0, nil: 0, narrow: 0 }); }
  cd.hist.forEach(function(m){
    if(!m.po) [m.home, m.away].forEach(function(n){ (seasonsOf[n] || (seasonsOf[n] = {}))[m.sid] = 1; });
    if(m.ko || m.est) return; // series scores / auto-filled 1-0 games say nothing about the real scoreline
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(function(x){
      var f = F(x[0]);
      if(!x[2]) f.cs++;
      if(!x[1]) f.blank++;
      if(!x[1] && !x[2]) f.nil++;
      if(x[1] - x[2] === 1) f.narrow++;
    });
  });
  var goals = matches.filter(function(m){ return !m.ko && !m.est; });
  function f(key){ return function(t){ return fun[t.name] ? fun[t.name][key] : 0; }; }
  function cnt(v){ return v + M; }
  var upsets = matches.filter(function(m){ return m.hg !== m.ag && isFinite(m.eloH) && isFinite(m.eloA); })
    .map(function(m){ var hw = m.hg > m.ag; return { m: m, d: hw ? m.eloA - m.eloH : m.eloH - m.eloA, ew: hw ? m.eloH : m.eloA, el: hw ? m.eloA : m.eloH, w: hw ? m.home : m.away }; })
    .filter(function(x){ return x.d > 0; }).sort(function(a, b){ return b.d - a.d; }).slice(0, 3)
    .map(function(x){ return { match: x.m, value: x.m.hg + ' – ' + x.m.ag, note: careerFill(crL('{w} thắng dù kém {d} Elo ({ew} vs {el})', '{w} won despite being {d} Elo behind ({ew} vs {el})'),
      { w: x.w, d: Math.round(x.d), ew: Math.round(x.ew), el: Math.round(x.el) }) }; });
  var swings = matches.filter(function(m){ return isFinite(m.eloD); }).sort(function(a, b){ return Math.abs(b.eloD) - Math.abs(a.eloD); }).slice(0, 3)
    .map(function(m){ return { match: m, value: '±' + Math.round(Math.abs(m.eloD)) + ' Elo', note: m.hg + ' – ' + m.ag }; });
  var plist = Object.keys(pairs).map(function(k){ return pairs[k]; }).filter(function(p){ return ok(p.a) && ok(p.b); });
  var prey = [];
  plist.forEach(function(p){
    prey.push({ w: p.a, v: p.b, n: p.W, rec: p.W + ' – ' + p.D + ' – ' + p.L });
    prey.push({ w: p.b, v: p.a, n: p.L, rec: p.L + ' – ' + p.D + ' – ' + p.W });
  });
  prey = prey.filter(function(x){ return x.n >= 3; }).sort(function(a, b){ return b.n - a.n; }).slice(0, 3)
    .map(function(x){ return { pair: [x.w, x.v], value: x.n + crL(' thắng', ' wins'), sub: crL('T-H-B ', 'W-D-L ') + x.rec }; });
  var even = plist.filter(function(p){ return p.P >= 6; })
    .sort(function(a, b){ return Math.abs(a.W - a.L) - Math.abs(b.W - b.L) || b.P - a.P; }).slice(0, 3)
    .map(function(p){ return { pair: [p.a, p.b], value: p.P + M, sub: p.W + ' – ' + p.D + ' – ' + p.L }; });
  var silver = Object.keys(cd.trophies).map(function(k){ return cd.trophies[k]; }).filter(function(t){ return ok(t.name); })
    .map(function(t){ var c = medalCount(t.list); return { team: t.name, v: c.silver, g: c.gold }; })
    .filter(function(x){ return x.v > 0; }).sort(function(a, b){ return b.v - a.v || a.g - b.g; }).slice(0, 3)
    .map(function(x){ return { team: x.team, value: '🥈 × ' + x.v, sub: '🥇 × ' + x.g }; });
  var blunt = teams.filter(function(t){ return t.Pg >= minP; }).sort(function(a, b){ return a.GFg / a.Pg - b.GFg / b.Pg; }).slice(0, 3)
    .map(function(t){ return { team: t.name, value: (t.GFg / t.Pg).toFixed(2) + crL(' bàn/trận', ' goals/match') }; });
  var oneSide = goals.slice().sort(function(a, b){ return Math.max(b.hg, b.ag) - Math.max(a.hg, a.ag) || (a.hg + a.ag) - (b.hg + b.ag); }).slice(0, 3)
    .map(function(m){ return { match: m, value: m.hg + ' – ' + m.ag }; });
  var FUN = [
    { icon: '😱', title: crL('Địa chấn lớn nhất (Elo)', 'Biggest upsets (Elo)'), items: upsets },
    { icon: '🎢', title: crL('Trận "tàu lượn" Elo', 'Biggest Elo swing in one match'), items: swings },
    { icon: '🔫', title: crL('Máy chạy bàn (1 đội ghi nhiều nhất)', 'Goal machine (most by one side)'), items: oneSide },
    { icon: '🧤', title: crL('Người gác đền (sạch lưới)', 'Clean-sheet kings'), items: topTeams(f('cs'), null, cnt) },
    { icon: '🔇', title: crL('Tịt ngòi (không ghi bàn)', 'Firing blanks (no goals)'), items: topTeams(f('blank'), null, cnt) },
    { icon: '🤝', title: crL('Vua hòa', 'Draw specialists'), items: topTeams(function(t){ return t.D; }, null, cnt) },
    { icon: '😴', title: crL('Chuyên gia 0 – 0', 'Goalless-draw experts'), items: topTeams(f('nil'), null, cnt) },
    { icon: '😅', title: crL('Vua thắng sát nút (cách 1 bàn)', 'One-goal win masters'), items: topTeams(f('narrow'), null, cnt) },
    { icon: '🎯', title: crL('Con mồi quen thuộc', 'Favourite victims'), items: prey },
    { icon: '⚖️', title: crL('Kỳ phùng địch thủ (≥ 6 trận)', 'Evenly matched rivals (≥ 6 meetings)'), items: even },
    { icon: '🥅', title: crL('Cửa hàng mở 24/7 (≥ ', 'Open 24/7 defence (≥ ') + minP + M + ')', items: topTeams(function(t){ return t.GAg / t.Pg; }, function(t){ return t.Pg >= minP; }, function(v){ return v.toFixed(2) + crL(' bàn thua/trận', ' conceded/match'); }) },
    { icon: '🪵', title: crL('Chân gỗ (≥ ', 'Wooden boots (≥ ') + minP + M + ')', items: blunt },
    { icon: '📉', title: crL('Rơi tự do (tụt so với đỉnh Elo)', 'Free fall (drop from peak Elo)'), items: topTeams(function(t){ return Math.round(t.peak - t.elo); }, null, function(v){ return '−' + v + ' Elo'; }) },
    { icon: '🥈', title: crL('Vua về nhì', 'Eternal runner-up'), items: silver },
    { icon: '🗓️', title: crL('Lão làng (nhiều mùa nhất)', 'Veterans (most seasons)'), items: topTeams(function(t){ return Object.keys(seasonsOf[t.name] || {}).length; }, null, function(v){ return v + crL(' mùa', ' seasons'); }) }
  ];
  FUN.forEach(function(r){ r.fun = true; });
  return FUN;
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
    });
  });
  (cd.ties || []).forEach(function(m){
    [[m.home, m.hg, m.ag], [m.away, m.ag, m.hg]].forEach(function(x){
      var k = ko[x[0]] || (ko[x[0]] = { P: 0, W: 0 }); k.P++; if(x[1] > x[2]) k.W++;
    });
  });
  var ad = careerAttDef(cd);
  function metric(t, key){
    if(!t.P) return 0;
    if(key === 'att') return ad[t.name] ? ad[t.name].att : 0;
    if(key === 'def') return ad[t.name] ? ad[t.name].def : 0;
    if(key === 'frm') return (recent[t.name] || []).slice(-10).reduce(function(a, b){ return a + b; }, 0);
    if(key === 'clu'){ var k = ko[t.name] || { P: 0, W: 0 }; return (k.W + 2) / (k.P + 4); }
    if(key === 'exp') return t.P;
    if(key === 'tro') return careerTrophyPts(cd, t.name);
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
  return { name: name, ovr: ovr, pos: best.pos, tier: tier, stats: stats, elo: Math.round(me.elo), P: me.P, DP: me.DP || 0,
    medals: medalCount(tr ? tr.list : []), medalList: careerMedalList(cd, name), trophyPts: tr ? tr.pts : 0, logo: careerTeamLogo(cd.st, name) };
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
  if(!card.noLive && typeof ceLiveCardHtml === 'function'){ var live = ceLiveCardHtml(card); if(live) return live; } // admin-set design (card-profiles.js)
  var e = escapeHtml;
  return '<div class="fifa-card tier-' + card.tier + '">' +
    '<div class="fc-top"><div class="fc-id"><div class="fc-ovr">' + card.ovr + '</div><div class="fc-pos">' + card.pos + '</div>' +
    '<div class="fc-tier no-i18n">' + e(card.tierLabel ? String(card.tierLabel).trim().toUpperCase() : card.tier.toUpperCase()) + '</div></div>' +
    (card.logo ? '<img class="fc-logo" src="' + e(card.logo) + '" alt="">' : '') + '</div>' +
    '<div class="fc-name no-i18n">' + e(card.name) + '</div>' +
    '<div class="fc-stats">' + card.stats.map(function(s){
      var w = Math.max(4, Math.min(100, Math.round((s.v - 40) / 59 * 100)));
      return '<div class="fc-stat' + (s.v >= 90 ? ' hi' : '') + '"><b>' + s.v + '</b><span>' + s.label + '</span><i class="fc-bar"><i style="width:' + w + '%"></i></i></div>';
    }).join('') + '</div>' +
    '<div class="fc-foot">Elo ' + card.elo + ' · ' + card.P + crL(' trận', ' matches') + (card.DP ? ' <small>+' + card.DP + crL(' đôi', ' dbl') + '</small>' : '') +
    ((card.medalList || []).length ? '<div class="fc-stars">' + careerStarsHtml(card.medalList) + '</div>' : '') + '</div>' +
    '</div>';
}

// ---------------- Teo texts ----------------
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
  v.s = Math.max(m.hg, m.ag) + '-' + Math.min(m.hg, m.ag); v.st = m.stage;
  var sW = careerStreakAt(cd, W, i), sL = careerStreakAt(cd, L, i), lines = [], ids = [];
  // Each line may also quote the career facts of the player it is about (snPlayerCtx, news-bank.js).
  function add(id, extra){
    if(extra) Object.keys(extra).forEach(function(k){ v[k] = extra[k]; });
    var ctx = m.dbl ? null : snPlayerCtx(cd, v[SN_SUBJ[id] || 'W']), vv = v;
    if(ctx){ vv = {}; [ctx, v].forEach(function(o){ Object.keys(o).forEach(function(k){ vv[k] = o[k]; }); }); }
    var t = snLine(id, vv);
    if(t){ lines.push(t); ids.push(id); }
  }
  // Earlier meetings of the two teams and W's best Elo before this match.
  var met = 0, wBeat = 0, last = null, peak = ELO_BASE, wP = 0;
  for(var j = 0; j < i; j++){
    var h = cd.hist[j];
    if(h.dbl) continue;
    var wh = h.home === W, wa = h.away === W;
    if(wh || wa){
      wP++;
      var post = (wh ? h.eloH : h.eloA) + (wh ? h.eloD : -h.eloD);
      if(post > peak) peak = post;
      if(h.home === L || h.away === L){ met++; last = careerResult(wh ? h.hg : h.ag, wh ? h.ag : h.hg); if(last === 'W') wBeat++; }
    }
  }
  var swing = Math.abs(m.eloD || 0), postW = (homeWin ? m.eloH : m.eloA) + swing;
  if(!draw && v.d >= 100) add('r_shock');
  if(m.ko && !draw) add(Math.min(m.hg, m.ag) === 0 ? 'r_sweep' : 'r_decider');
  if(!m.ko && !draw && v.gd >= 4) add('r_demol');
  if(!m.ko && v.tot >= 7) add('r_fest');
  if(!m.ko && v.tot === 0) add('r_nil');
  if(!draw && !m.dbl){
    if(met >= 2 && !wBeat) add('r_firstWin', { n: met });
    else if(last === 'L') add('r_revenge');
  }
  if(!draw && sW.after.win >= 3) add('r_wstreak', { n: sW.after.win });
  if(!draw && sW.before.winless >= 5) add('r_winlessEnd', { n: sW.before.winless });
  if(!draw && sL.before.unbeaten >= 5) add('r_unbeatenEnd', { n: sL.before.unbeaten });
  if(!draw && sL.after.lose >= 3) add('r_lstreak', { n: sL.after.lose });
  if(!draw && !m.dbl && wP >= 10 && postW > peak) add('r_peak', { e: Math.round(postW) });
  if(!draw && swing >= 25) add('r_swing', { x: Math.round(swing) });
  if(!lines.length) add(draw ? 'r_draw' : v.gd >= 2 ? 'r_convincing' : 'r_narrow');
  return { head: '[' + m.season + ' · ' + m.stage + '] ' + m.home + ' ' + m.hg + ' – ' + m.ag + ' ' + m.away, lines: lines.slice(0, 2), ids: ids.slice(0, 2) };
}

// ---------------- Dialog rendering ----------------
function crTeam(name){
  return '<a href="#" class="cr-team no-i18n" data-career-team="' + escapeHtml(name) + '">' + escapeHtml(name) + '</a>';
}
// Season name -> link that opens that season (click handler below).
function crSeasonLink(sid, name){
  if(!sid || !state || !state.seasons || !state.seasons[sid]) return '<span class="no-i18n">' + escapeHtml(name) + '</span>';
  return '<a href="#" class="cr-season no-i18n" data-goto-season="' + escapeHtml(sid) + '" title="' + escapeHtml(crL('Mở giải này', 'Open this season')) + '">' + escapeHtml(name) + '</a>';
}
function crGotoSeason(sid){
  if(!state.seasons[sid]) return;
  [].forEach.call(document.querySelectorAll('dialog[open]'), function(d){ d.close(); });
  var teo = document.getElementById('teoPanel');
  if(teo) teo.classList.remove('open');
  closeStatsPage();
  var sel = $('seasonSel');
  if(sel) sel.value = sid;
  if(sel && sel.value === sid) sel.dispatchEvent(new Event('change'));
  else { state.current = sid; saveAll(); refreshAll(); }
  window.scrollTo(0, 0);
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
    '<span class="tm-stage no-i18n" title="' + escapeHtml(m.season + ' · ' + m.stage) + '">' + crSeasonLink(m.sid, m.season) + '</span>' +
    '<span class="tm-team tm-home' + (x.isHome ? ' tm-self' : '') + '">' + escapeHtml(m.home) + '</span>' +
    '<span class="tm-score">' + m.hg + ' – ' + m.ag + '</span>' +
    '<span class="tm-team tm-away' + (x.isHome ? '' : ' tm-self') + '">' + escapeHtml(m.away) + '</span>' +
    '<span class="tm-elo">' + (isFinite(m.eloD) ? crEloBadge(x.isHome ? m.eloD : -m.eloD) : '') + '</span></div>';
}

function crSection(title, body){
  return '<details open class="cr-sec"><summary><strong>' + title + '</strong></summary>' + body + '</details>';
}

function renderCareerHtml(cd, name){
  var tc = teamCareer(cd, name);
  if(!tc.list.length && !tc.doubles.length && !tc.trophies.length) return '<div class="muted">' + crL('Chưa có trận đấu nào có kết quả.', 'No played matches yet.') + '</div>';
  var P = tc.list.length, cnt = { W: 0, D: 0, L: 0 }, GF = 0, GA = 0, Pg = 0, GFg = 0, GAg = 0;
  tc.list.forEach(function(x){ cnt[x.r]++; GF += x.gf; GA += x.ga; if(!x.m.est){ Pg++; GFg += x.gf; GAg += x.ga; } });
  var e = tc.elo || { elo: ELO_BASE, peak: ELO_BASE, timeline: [] }, cur = tc.streaks.cur;
  function pill(label, value, sub){
    return '<div class="cr-pill"><div class="cr-pill-label">' + label + '</div><div class="cr-pill-value">' + value + '</div>' + (sub ? '<div class="cr-pill-sub">' + sub + '</div>' : '') + '</div>';
  }
  var streak = cur.win ? cur.win + crL(' thắng', cur.win > 1 ? ' wins' : ' win')
    : cur.lose ? cur.lose + crL(' thua', cur.lose > 1 ? ' losses' : ' loss')
    : cur.unbeaten + crL(' bất bại', ' unbeaten');
  var dP = 0, dW = 0, dD = 0, dL = 0;
  tc.doubles.forEach(function(d){ dP += d.P; dW += d.W; dD += d.D; dL += d.L; });
  // Playoff seasons are not counted as seasons, only noted.
  var nS = tc.seasons.filter(function(s){ return !s.po; }).length, nPo = tc.seasons.length - nS;
  var nDS = tc.doubles.filter(function(s){ return !s.po; }).length;
  var stars = careerStarsHtml(careerMedalList(cd, name)), card = careerFifaCard(cd, name);
  if(card && cd.asOf){ // rank on live card designs = rank at that time
    var only = !!(statsMasterOnly && (state.teamMasterList || []).length);
    card.rank = careerEloTable(cd, only).map(function(t){ return t.name; }).indexOf(name) + 1;
  }
  var html = '<div class="cr-hero">' + renderFifaCardHtml(card) + '<div class="cr-hero-main"><div class="cr-metrics">' +
    pill('Elo', Math.round(e.elo), tc.rank ? '#' + tc.rank + ' / ' + tc.rankOf + (P + dP < ELO_PROVISIONAL ? crL(' · tạm tính', ' · provisional') : '') : '') +
    pill(crL('Đỉnh cao', 'Peak'), Math.round(e.peak)) +
    pill(crL('Số trận', 'Matches'), P, nS + crL(' mùa', nS === 1 ? ' season' : ' seasons') + (nPo ? crL(' + ' + nPo + ' playoff', ' + ' + nPo + ' playoff') : '')) +
    (P ? pill(crL('T – H – B', 'W – D – L'), cnt.W + ' – ' + cnt.D + ' – ' + cnt.L, crL('Thắng ', 'Win rate ') + crPct(cnt.W, P)) +
      pill(crL('Bàn thắng / thua', 'Goals for / against'), GF + ' / ' + GA, Pg ? (GFg / Pg).toFixed(2) + ' – ' + (GAg / Pg).toFixed(2) + crL(' mỗi trận', ' per match') + (Pg < P ? '<br><small>' + crL('bỏ ' + (P - Pg) + ' ván KO 1-0 tự điền', (P - Pg) + ' auto 1-0 KO games excluded') + '</small>' : '') : '') : '') +
    pill(crL('Điểm danh hiệu', 'Trophy points'), tc.trophyPts, stars ? '<span class="fc-stars">' + stars + '</span>' : crL('Chưa có huy chương', 'No medals yet')) +
    (tc.ko.P ? pill(crL('Loại trực tiếp', 'Knock-out'), tc.ko.W + ' / ' + tc.ko.P, crL('Thắng ' + crPct(tc.ko.W, tc.ko.P) + ' loạt đấu', 'Won ' + crPct(tc.ko.W, tc.ko.P) + ' of ties')) : '') +
    (dP ? pill(crL('Đá đôi', 'Doubles'), dW + ' – ' + dD + ' – ' + dL, dP + crL(' trận · ', ' matches · ') + nDS + crL(' mùa', ' seasons')) : '') +
    (P ? pill(crL('Chuỗi hiện tại', 'Current streak'), streak) : '') +
    '</div>' + careerSparkSvg([ELO_BASE].concat(e.timeline)) + '</div></div>';

  if(P){
    var last = tc.list.slice(-10).reverse();
    html += crSection(crL('Phong độ 10 trận gần nhất', 'Last 10 matches'), '<div class="team-match-list">' + last.map(crMatchRow).join('') + '</div>');
  }

  var tro = tc.trophies.slice().reverse();
  html += crSection(crL('Danh hiệu & thành tích', 'Trophies & finishes') + ' · ' + tc.trophyPts + crL(' điểm', ' pts'), tro.length ? '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + crL('Mùa', 'Season') + '</th><th>' + crL('Thành tích', 'Finish') + '</th><th>' + crL('Điểm', 'Pts') + '</th></tr></thead><tbody>' + tro.map(function(t){
    return '<tr class="' + (t.medal ? 'medal-' + t.medal : '') + '"><td class="no-i18n">' + crSeasonLink(t.sid, t.season) + (t.dbl ? ' <small class="muted">(' + escapeHtml(t.team) + ')</small>' : '') + '</td>' +
      '<td>' + (t.medal ? CR_MEDAL_ICON[t.medal] + ' ' : '') + escapeHtml(t.place) + '</td><td><b>+' + t.pts + '</b></td></tr>';
  }).join('') + '</tbody></table></div>' : '<div class="muted">' + crL('Chưa có thành tích ở mùa chính thức đã kết thúc.', 'No finishes in completed official seasons yet.') + '</div>');

  if(tc.doubles.length) html += crSection(crL('Đá đôi', 'Doubles'), '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + crL('Mùa', 'Season') + '</th><th>' + crL('Đồng đội', 'Partner') + '</th><th>' + CR_COL.P + '</th><th>' + CR_COL.WDL + '</th><th>' + CR_COL.G + '</th><th>Elo ±</th></tr></thead><tbody>' +
    tc.doubles.map(function(d){
      return '<tr><td class="no-i18n">' + crSeasonLink(d.sid, d.name) + '</td><td>' + crTeam(d.partner) + '</td><td>' + d.P + '</td><td>' + d.W + '-' + d.D + '-' + d.L + '</td><td>' + d.GF + '-' + d.GA + '</td>' +
        '<td class="' + (d.elo >= 0 ? 'cr-up' : 'cr-down') + '">' + crSigned(d.elo) + '</td></tr>';
    }).join('') + '</tbody></table></div>');

  if(!P) return html;

  html += crSection(crL('Theo mùa giải', 'By season'), '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>' + crL('Mùa', 'Season') + '</th><th>' + CR_COL.mode + '</th><th>' + CR_COL.P + '</th><th>' + CR_COL.WDL + '</th><th>' + CR_COL.G + '</th><th>Elo ±</th></tr></thead><tbody>' +
    tc.seasons.map(function(s){
      var d = s.eloEnd - s.eloStart;
      return '<tr><td class="no-i18n">' + crSeasonLink(s.sid, s.name) + '</td><td>' + escapeHtml(crModeLabel(s.mode)) + '</td><td>' + s.P + '</td><td>' + s.W + '-' + s.D + '-' + s.L + '</td><td>' + s.GF + '-' + s.GA + '</td>' +
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
  return '<li><span class="muted">' + label + ':</span> <span class="no-i18n">' + escapeHtml(x.m.home + ' ' + x.m.hg + ' – ' + x.m.ag + ' ' + x.m.away) + '</span> <small class="muted no-i18n">(' + crSeasonLink(x.m.sid, x.m.season) + ' · ' + escapeHtml(x.m.stage) + ')</small></li>';
}

// year: show the career as of the end of that year (Hall of Legend year cards).
function openCareerDialog(name, year){
  name = careerName(name);
  if(!name) return;
  openStatsPage('career', careerResolveName(year ? careerDataUntil(year) : careerData(state), name), year);
}

// "Career path" popup: the player's card as of the end of every year they played / won something.
function openCareerPath(name){
  if(!name || typeof smDialog !== 'function') return;
  var cd = careerData(state), tc = teamCareer(cd, name), seen = {}, years = [];
  tc.seasons.concat(tc.doubles, tc.trophies).forEach(function(x){
    var s = x && state.seasons[x.sid], y = s ? String(seasonYearOf(s) || '') : '';
    if(y && !seen[y]){ seen[y] = 1; years.push(y); }
  });
  years.sort(function(a, b){ return a - b; });
  var only = !!(statsMasterOnly && (state.teamMasterList || []).length), prev = null;
  var items = years.map(function(y){
    var ycd = careerDataUntil(y), n = careerResolveName(ycd, name), card = careerFifaCard(ycd, n);
    if(!card) return '';
    card.rank = careerEloTable(ycd, only).map(function(t){ return t.name; }).indexOf(n) + 1;
    var d = prev == null ? null : card.ovr - prev;
    prev = card.ovr;
    var med = { gold: 0, silver: 0, bronze: 0 };
    tc.trophies.forEach(function(t){
      var s = state.seasons[t.sid];
      if(t.medal && s && String(seasonYearOf(s)) === y) med[t.medal] = (med[t.medal] || 0) + 1;
    });
    var tally = ['gold', 'silver', 'bronze'].map(function(k){ return med[k] ? CR_MEDAL_ICON[k] + (med[k] > 1 ? '×' + med[k] : '') : ''; }).join(' ');
    return '<div class="cp-item"><div class="cp-year">' + escapeHtml(y) +
      (d == null ? '' : ' <span class="cp-delta ' + (d > 0 ? 'cr-up' : d < 0 ? 'cr-down' : 'muted') + '">' + (d > 0 ? '▲' + d : d < 0 ? '▼' + (-d) : '=') + '</span>') + '</div>' +
      '<div class="fc-pick" role="button" tabindex="0" data-career-team="' + escapeHtml(n) + '" data-career-year="' + escapeHtml(y) + '" title="' +
      escapeHtml(crL('Xem sự nghiệp tính đến hết ' + y, 'View career as of the end of ' + y)) + '">' + renderFifaCardHtml(card) + '</div>' +
      '<div class="cp-tally">' + (tally.trim() || '&nbsp;') + '</div></div>';
  }).filter(Boolean);
  var dlg = smDialog('<h4>🛤️ Career path · <span class="no-i18n">' + escapeHtml(name) + '</span></h4>' +
    '<p class="muted sm-scope-note">' + escapeHtml(crL('Thẻ sự nghiệp tính đến hết mỗi năm. Bấm vào thẻ để xem sự nghiệp tại thời điểm đó.', 'Career card as of the end of each year. Click a card to see the career at that time.')) + '</p>' +
    (items.length ? '<div class="cp-row">' + items.join('') + '</div>' : '<div class="muted">' + crL('Chưa có dữ liệu.', 'No data yet.') + '</div>') +
    '<div class="lg-dialog-foot">' + (items.length ? '<button type="button" data-cp-export>📷 ' + crL('Xuất ảnh', 'Export image') + '</button> ' : '') +
    '<button type="button" data-close>' + crL('Đóng', 'Close') + '</button></div>', function(e, d){
      if(e.target.closest('[data-cp-export]')) exportCareerPathImage(d, name);
    });
  dlg.classList.add('cp-dialog');
  var row = dlg.querySelector('.cp-row');
  if(row) row.scrollLeft = row.scrollWidth; // newest year in view
}

// Career path -> PNG: every card at full size (max 5 per row), shown in a window ready to copy.
function exportCareerPathImage(dlg, name){
  var src = dlg.querySelector('.cp-row'), btn = dlg.querySelector('[data-cp-export]');
  if(!src || typeof captureNodeSnapshot !== 'function') return;
  var title = 'Career path · ' + name, n = src.querySelectorAll('.cp-item').length, cols = Math.min(5, n);
  if(btn) btn.disabled = true;
  var w = openExportWindow(); // synchronous inside the click so popup blockers allow it
  captureNodeSnapshot(function(bg){
    var wrap = document.createElement('div');
    wrap.className = 'cp-snap';
    wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;width:' + (cols * 262 + 48) + 'px;padding:24px;' +
      'box-sizing:border-box;background:' + bg + ';color:var(--text);font-family:inherit;';
    var head = document.createElement('div');
    head.className = 'cp-snap-head no-i18n';
    head.textContent = '🛤️ ' + title;
    var sub = document.createElement('div');
    sub.className = 'cp-snap-sub';
    sub.textContent = crL('Thẻ sự nghiệp tính đến hết mỗi năm', 'Career card as of the end of each year');
    var clone = src.cloneNode(true);
    // cloneNode does not copy canvas pixels (live profile cards).
    var cvs = src.querySelectorAll('canvas');
    [].forEach.call(clone.querySelectorAll('canvas'), function(c, i){
      var o = cvs[i];
      if(!o || !o.width || !o.height) return;
      c.width = o.width; c.height = o.height;
      try { c.getContext('2d').drawImage(o, 0, 0); } catch(_){}
    });
    wrap.appendChild(head);
    wrap.appendChild(sub);
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    return wrap;
  }).then(function(blob){
    return blobToDataUrl(blob).then(function(url){
      var opts = { heading: crL('📤 Export Career path', '📤 Export career path'), text: title };
      if(!fillExportWindow(w, title, blob, url, opts)) showRoundExportDialog(title, blob, url, opts);
    });
  }).catch(function(err){
    console.error('Career path export failed:', err);
    if(w && !w.closed) w.close();
    alert(crL('Không tạo được ảnh: ', 'Could not create the image: ') + (err && err.message ? err.message : err));
  }).then(function(){
    if(btn) btn.disabled = false;
  });
}

// FIFA card(s) at the top of the team dialog (league.js openTeamDialog); doubles teams show both players.
function renderTeamDialogCard(name){
  var box = $('teamFifaCard');
  if(!box) return;
  var cd = careerData(state), s = activeSeason(), names = [name];
  if(s && crIsDoubles(s)){
    var idx = (s.teams || []).map(careerName).indexOf(careerName(name)), pair = idx >= 0 ? crPairOf(s, idx) : null;
    if(pair) names = pair;
  }
  var html = names.map(function(nm){
    var n = careerResolveName(cd, nm), card = careerFifaCard(cd, n);
    return card ? '<div class="fc-pick" role="button" tabindex="0" data-career-team="' + escapeHtml(n) + '" title="' + escapeHtml(crL('Xem toàn bộ sự nghiệp', 'View full career')) + '">' + renderFifaCardHtml(card) + '</div>' : '';
  }).join('');
  box.innerHTML = html && names.length > 1 ? '<div class="fc-pair">' + html + '</div>' : html;
  box.hidden = !html;
}

// ---------------- Head-to-head ----------------
function renderH2HHtml(cd, a, b){
  a = careerResolveName(cd, a); b = careerResolveName(cd, b);
  var list = teamCareer(cd, a).list.filter(function(x){ return x.opp === b; });
  var P = list.length, cnt = { W: 0, D: 0, L: 0 }, GF = 0, GA = 0, ko = { P: 0, W: 0, L: 0 };
  var bigA = null, bigB = null, lastA = null, lastB = null;
  list.forEach(function(x){
    cnt[x.r]++; GF += x.gf; GA += x.ga;
    var d = x.gf - x.ga;
    if(d > 0){ lastA = x; if(!bigA || d > bigA.gf - bigA.ga) bigA = x; }
    if(d < 0){ lastB = x; if(!bigB || -d > bigB.ga - bigB.gf) bigB = x; }
  });
  var ea = cd.elo[a], eb = cd.elo[b], ca = careerFifaCard(cd, a), cb = careerFifaCard(cd, b);
  (cd.ties || []).forEach(function(m){
    if(!((m.home === a && m.away === b) || (m.home === b && m.away === a)) || m.hg === m.ag) return;
    ko.P++;
    if((m.home === a) === (m.hg > m.ag)) ko.W++; else ko.L++;
  });
  function side(name, card, e, cls){
    var logo = card ? card.logo : careerTeamLogo(cd.st, name);
    // The FIFA card sits on the outer side of the name (A: left, B: right) so both sides mirror each other.
    var cardHtml = card ? '<div class="h2h-card fc-pick" role="button" tabindex="0" data-career-team="' + escapeHtml(name) + '" title="' +
      escapeHtml(crL('Xem toàn bộ sự nghiệp', 'View full career')) + '">' + renderFifaCardHtml(card) + '</div>' : '';
    return '<div class="h2h-side ' + cls + (card ? ' has-card' : '') + '">' + cardHtml + '<div class="h2h-info">' +
      (logo && !card ? '<img class="h2h-logo" src="' + escapeHtml(logo) + '" alt="">' : '') +
      '<div class="h2h-name">' + crTeam(name) + '</div>' +
      '<div class="h2h-meta">' + (card ? '<span class="h2h-ovr tier-' + card.tier + '" title="' + crL('Chỉ số tổng', 'Overall rating') + '">' + card.ovr + '</span>' : '') +
      (e ? 'Elo ' + Math.round(e.elo) : crL('Chưa có trận', 'No matches')) + '</div></div></div>';
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
    row(crL('Tỉ lệ thắng sự nghiệp', 'Career win rate'), ea.P ? ea.W * 100 / ea.P : 0, eb.P ? eb.W * 100 / eb.P : 0, function(v){ return Math.round(v) + '%'; });
    row(crL('Số trận sự nghiệp', 'Career matches'), ea.P, eb.P);
  }
  row(crL('Điểm danh hiệu', 'Trophy points'), careerTrophyPts(cd, a), careerTrophyPts(cd, b));
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
      return '<tr><td class="no-i18n">' + crSeasonLink(id, s.name) + '</td><td>' + escapeHtml(crModeLabel(s.mode)) + '</td><td>' + s.P + '</td><td>' + s.W + '</td><td>' + s.D + '</td><td>' + s.L + '</td><td>' + s.GF + '-' + s.GA + '</td></tr>';
    }).join('') + '</tbody></table></div>');

  html += crSection(crL('Tất cả các trận đối đầu', 'All meetings') + ' (' + P + ')', '<div class="team-match-list">' + list.slice().reverse().map(crMatchRow).join('') + '</div>');
  return html;
}

// ---------------- Stats page (Career / Head-to-head / Elo / Records) ----------------
var statsTab = 'career', statsCareer = null, statsCareerYear = null, statsH2H = [null, null], statsMasterOnly = true, statsQuery = '';

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

function statsApplySearch(){
  var q = crSearchKey(statsQuery.trim());
  document.querySelectorAll('#statsPage .fc-grid .fc-pick').forEach(function(el){
    el.hidden = !!q && el.getAttribute('data-search').indexOf(q) === -1;
  });
}

// Elo tab: every column sortable (click a header; again = reverse). '#' keeps the Elo rank.
var crEloSort = { k: 'elo', dir: -1 };
var CR_ELO_ASC = { rank: 1, name: 1, L: 1, GA: 1, gam: 1 };
function crEloCols(anyD){
  var gTip = crL('Chỉ tính trận có tỉ số thật (không tính ván KO tự điền 1-0)', 'Real-score matches only (auto-filled 1-0 KO games excluded)');
  return [
    { k: 'rank', l: '#' },
    { k: 'name', l: crL('Đội', 'Team') },
    { k: 'elo', l: 'Elo' },
    { k: 'd10', l: crL('10 trận', 'Last 10'), t: crL('Thay đổi sau 10 trận gần nhất', 'Change over the last 10 matches') },
    { k: 'peak', l: crL('Đỉnh cao', 'Peak') },
    { k: 'P', l: CR_COL.P, t: crL('Số trận', 'Matches played'), grp: 1 },
    { k: 'W', l: crL('T', 'W'), t: crL('Thắng', 'Won') },
    { k: 'D', l: crL('H', 'D'), t: crL('Hòa', 'Drawn') },
    { k: 'L', l: crL('B', 'L'), t: crL('Thua', 'Lost') },
    { k: 'wr', l: CR_COL.win, t: crL('Tỉ lệ thắng', 'Win rate') },
    { k: 'GF', l: crL('BT', 'GF'), t: crL('Tổng bàn thắng', 'Goals scored (total)'), grp: 1 },
    { k: 'GA', l: crL('BB', 'GA'), t: crL('Tổng bàn thua', 'Goals conceded (total)') },
    { k: 'GD', l: crL('HS', 'GD'), t: crL('Hiệu số bàn thắng', 'Goal difference') },
    { k: 'gfm', l: crL('BT/trận', 'GF/match'), t: crL('Bàn thắng trung bình mỗi trận. ', 'Goals scored per match. ') + gTip, grp: 1 },
    { k: 'gam', l: crL('BB/trận', 'GA/match'), t: crL('Bàn thua trung bình mỗi trận. ', 'Goals conceded per match. ') + gTip }
  ].concat(anyD ? [{ k: 'DP', l: crL('Đôi (T-H-B)', 'Doubles (W-D-L)'), t: crL('Số trận đá đôi', 'Doubles matches played'), grp: 1 }] : []);
}
function crEloHtml(cd, only){
  var html, rows = careerEloTable(cd, only), anyD = rows.some(function(t){ return t.DP; });
  var cols = crEloCols(anyD), col = cols.filter(function(c){ return c.k === crEloSort.k; })[0] || cols[2], dir = crEloSort.dir;
  rows = rows.map(function(t, i){
    var tl = t.timeline, back = tl.length > 10 ? tl[tl.length - 11] : ELO_BASE;
    return { t: t, rank: i + 1, name: t.name, elo: t.elo, d10: t.elo - back, peak: t.peak, P: t.P, W: t.W, D: t.D, L: t.L,
      wr: t.P ? t.W / t.P : null, GF: t.GF, GA: t.GA, GD: t.GF - t.GA,
      gfm: t.Pg ? t.GFg / t.Pg : null, gam: t.Pg ? t.GAg / t.Pg : null, DP: t.DP };
  });
  rows.sort(function(a, b){
    if(col.k === 'name') return dir * a.name.localeCompare(b.name);
    var x = a[col.k], y = b[col.k];
    if(x == null || y == null) return (x == null) - (y == null) || a.rank - b.rank; // empty values always last
    return dir * (x - y) || a.rank - b.rank;
  });
  var head = cols.map(function(c){
    var on = c.k === col.k, cls = (on ? 'sorted' : '') + (c.grp ? ' cr-grp' : '');
    return '<th data-cr-sort="' + c.k + '"' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (c.t ? ' title="' + escapeHtml(c.t) + '"' : '') + '>' +
      escapeHtml(c.l) + '<span class="cr-arrow">' + (on ? (dir > 0 ? '▲' : '▼') : '') + '</span></th>';
  }).join('');
  var dec = function(v){ return v == null ? '<span class="muted">—</span>' : v.toFixed(2); };
  var sc = function(k, inner, extra){ var cls = (k === col.k ? 'sorted' : '') + (extra ? ' ' + extra : ''); return '<td' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + '>' + inner + '</td>'; };
    html = '<div class="cr-table-wrap"><table class="cr-table cr-elo"><thead><tr>' + head + '</tr></thead><tbody>' +
      rows.map(function(r){
        var t = r.t, d = r.d10;
        return '<tr' + (t.P + t.DP < ELO_PROVISIONAL ? ' class="cr-prov" title="' + crL('Dưới ' + ELO_PROVISIONAL + ' trận: Elo tạm tính', 'Under ' + ELO_PROVISIONAL + ' matches: provisional Elo') + '"' : '') + '>' +
          sc('rank', '<span class="cr-rk' + (r.rank <= 3 ? ' r' + r.rank : '') + '">' + r.rank + '</span>') + sc('name', crTeam(t.name)) +
          sc('elo', '<b>' + Math.round(t.elo) + '</b>') + sc('d10', crSigned(d), Math.round(d) > 0 ? 'cr-up' : Math.round(d) < 0 ? 'cr-down' : 'muted') + sc('peak', Math.round(t.peak)) +
          sc('P', t.P, 'cr-grp') + sc('W', t.W) + sc('D', t.D) + sc('L', t.L) + sc('wr', crPct(t.W, t.P)) +
          sc('GF', t.GF, 'cr-grp') + sc('GA', t.GA) + sc('GD', crSigned(r.GD), r.GD > 0 ? 'cr-up' : r.GD < 0 ? 'cr-down' : 'muted') +
          sc('gfm', dec(r.gfm), 'cr-grp') + sc('gam', dec(r.gam)) +
          (anyD ? sc('DP', t.DP ? t.DW + '-' + t.DD + '-' + t.DL : '<span class="muted">—</span>', 'cr-grp') : '') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="muted cr-note">' + crL(
        'Bấm tiêu đề cột để sắp xếp. BT/BB: tổng bàn thắng/thua; BT/trận, BB/trận chỉ tính trận có tỉ số thật. Elo khởi điểm ' + ELO_BASE + ', K=' + ELO_K + '. Trận thường: nhân thêm theo cách biệt bàn thắng. Loại trực tiếp: nếu có tỉ số từng trận thì mỗi trận được tính riêng (×' + ELO_KO_FACTOR + '); nếu chỉ có tỉ số loạt (Bo3/Bo5) thì tính 1 trận thắng/thua, ×' + ELO_KO_FACTOR + ', thắng trắng thêm ×' + ELO_SWEEP_FACTOR + '. Đá đôi: Elo mỗi bên = trung bình 2 tuyển thủ, cả 2 cùng được cộng/trừ. Thứ tự theo thanh chọn mùa (cũ → mới). Hàng mờ: dưới ' + ELO_PROVISIONAL + ' trận.',
        'Click a column header to sort. GF/GA: total goals; GF/match and GA/match count real-score matches only. Elo starts at ' + ELO_BASE + ', K=' + ELO_K + '. Regular matches are scaled by the goal margin. Knock-out: when per-game scores are entered each game is rated on its own (×' + ELO_KO_FACTOR + '); otherwise the series (Bo3/Bo5) counts as one win/loss, ×' + ELO_KO_FACTOR + ', a clean sweep adds ×' + ELO_SWEEP_FACTOR + '. Doubles: each side is rated as the average of its two players, both gain/lose the same. Order follows the season bar (old → new). Faded rows: under ' + ELO_PROVISIONAL + ' matches.') + '</div>';
  if(!rows.length) html = '<div class="muted">' + crL('Chưa có dữ liệu.', 'No data yet.') + '</div>';
  return html;
}

// Records tab: grouped sections; each card = leader block (#1) + compact #2/#3 rows.
function crRecVal(v){
  v = String(v == null ? '' : v);
  var m = /^([−+±-]?\d[\d.,]*%?(?: – \d+)?)\s*(.*)$/.exec(v);
  return m ? '<b>' + escapeHtml(m[1]) + '</b>' + (m[2] ? '<small>' + escapeHtml(m[2]) + '</small>' : '') : '<b>' + escapeHtml(v) + '</b>';
}
function crRecordsHtml(cd, only){
  var all = careerRecords(cd, only);
  var groups = [
    { k: 'top', icon: '👑', l: crL('Danh hiệu & đẳng cấp', 'Trophies & class') },
    { k: 'streak', icon: '🔥', l: crL('Chuỗi trận', 'Streaks') },
    { k: 'goal', icon: '⚽', l: crL('Tấn công & phòng ngự', 'Attack & defence') },
    { k: 'match', icon: '🏟️', l: crL('Trận đấu & đối đầu', 'Matches & rivalries') },
    { k: 'fun', icon: '🎉', l: crL('Kỷ lục vui', 'Fun records') }
  ];
  function who(it){
    return it.team ? crTeam(it.team)
      : it.pair ? crTeam(it.pair[0]) + ' <span class="rec-vs">vs</span> ' + crTeam(it.pair[1])
      : crTeam(it.match.home) + ' <span class="rec-vs">–</span> ' + crTeam(it.match.away);
  }
  function sub(it){
    return it.match ? '<div class="rec-sub no-i18n">' + crSeasonLink(it.match.sid, it.match.season) + ' · ' + escapeHtml(it.match.stage) + (it.note ? '<br>' + escapeHtml(it.note) : '') + '</div>'
      : it.sub ? '<div class="rec-sub">' + escapeHtml(it.sub) + '</div>' : '';
  }
  function card(r){
    var it = r.items, top = it[0];
    var title = String(r.title).replace(/\s*\((≥[^)]*)\)\s*$/, '<small>$1</small>');
    var body = top ? '<div class="rec-top"><span class="rec-rank r1">1</span><div class="rec-who">' + who(top) + sub(top) + '</div><div class="rec-val">' + crRecVal(top.value) + '</div></div>' +
      (it.length > 1 ? '<ol class="rec-list">' + it.slice(1).map(function(x, i){
        return '<li><span class="rec-rank r' + (i + 2) + '">' + (i + 2) + '</span><div class="rec-who">' + who(x) + sub(x) + '</div><span class="rec-val">' + crRecVal(x.value) + '</span></li>';
      }).join('') + '</ol>' : '')
      : '<div class="rec-none">' + crL('Chưa có dữ liệu', 'No data yet') + '</div>';
    return '<div class="rec-card' + (r.fun ? ' rec-fun' : '') + '"><div class="rec-head"><span class="rec-ico">' + r.icon + '</span><span class="rec-title">' + title + '</span></div>' + body + '</div>';
  }
  return groups.map(function(g){
    var list = all.filter(function(r){ return (r.fun ? 'fun' : r.grp || 'top') === g.k; });
    if(!list.length) return '';
    return '<section class="rec-sec"><h3 class="rec-group"><span>' + g.icon + '</span> ' + g.l + ' <small>' + list.length + '</small></h3><div class="rec-grid">' + list.map(card).join('') + '</div></section>';
  }).join('');
}

var STATS_TABS = [
  { k: 'career', icon: '🃏', label: crL('Sự nghiệp', 'Career') },
  { k: 'h2h', icon: '⚔️', label: crL('Đối đầu', 'Head-to-head') },
  { k: 'elo', icon: '📈', label: 'Elo' },
  { k: 'records', icon: '🏅', label: crL('Kỷ lục', 'Records') },
  { k: 'autolegend', icon: '🏛️', label: 'Hall of Legend' },
  { k: 'pesrank', icon: '🏆', label: 'PES Ranking' }, // features/pes-ranking.js (automatic)
  { k: 'admin', icon: '📝', label: crL('Nhập kết quả', 'Enter results'), admin: true } // features/admin-fixtures.js
];

function renderStatsPage(){
  var host = $('statsPage');
  if(!host) return;
  var tabs = STATS_TABS.filter(function(t){
    return !t.admin || (hasAnyPerm(['score', 'submit']) && typeof amRenderHtml === 'function');
  });
  if(!tabs.some(function(t){ return t.k === statsTab; })) statsTab = statsTab === 'legend' ? 'autolegend' : statsTab === 'ranking' ? 'pesrank' : 'career';
  var cd = careerData(state), hasMaster = !!(state.teamMasterList || []).length, only = hasMaster && statsMasterOnly;
  var adminTab = statsTab === 'admin', autoHall = statsTab === 'autolegend';
  var html = '<div class="view-tabs sp-tabs">' + tabs.map(function(t){
      return '<button type="button" class="view-tab' + (t.k === statsTab ? ' active' : '') + '" data-sp-tab="' + t.k + '">' + t.icon + ' ' + t.label + '</button>';
    }).join('') + crEloToggleBtn('view-tab elo-toggle') +
    '<button type="button" class="view-tab sp-back" id="spBack">← ' + crL('Về mùa giải', 'Back to season') + '</button></div>';
  var tools = '';
  if(statsTab === 'career' && !statsCareer) tools += '<input type="search" id="spSearch" class="sp-search" placeholder="' + escapeHtml(crL('Tìm tuyển thủ…', 'Search player…')) + '" value="' + escapeHtml(statsQuery) + '">';
  if(hasMaster && !adminTab && !autoHall && !(statsTab === 'career' && statsCareer)) tools += '<label class="sp-check"><input type="checkbox" id="spMasterOnly"' + (only ? ' checked' : '') + '> ' + crL('Chỉ tuyển thủ trong danh sách', 'Master-list players only') + '</label>';
  if(statsTab === 'career' && typeof openCardExport === 'function') tools += '<button type="button" class="ghost" id="spCardExport" title="' + escapeHtml(crL('Xuất thẻ 54 × 86 mm để in', 'Export a 54 × 86 mm card for printing')) + '">🖨️ ' + crL('In thẻ', 'Print card') + '</button>';
  if(statsTab === 'career' && statsCareer) tools += '<button type="button" class="ghost" id="spCareerPath" title="' + escapeHtml(crL('Thẻ sự nghiệp qua từng năm', 'Career card year by year')) + '">🛤️ Career path</button>';
  if(!adminTab && typeof seasonStatsCount === 'function'){
    var sc = seasonStatsCount();
    if(sc.on < sc.all) tools += '<span class="sp-scope muted" title="' + escapeHtml(crL('Một số mùa đã được admin tắt khỏi thống kê', 'Some seasons were turned off by an admin')) + '">📊 ' + crL('Đang tính trên ', 'Counting ') + sc.on + '/' + sc.all + crL(' mùa', ' seasons') + '</span>';
    if(isAdminUser()) tools += '<button type="button" class="ghost" id="spSeasonScope">⚙️ ' + crL('Mùa tính thống kê', 'Counted seasons') + '</button>';
    if(isAdminUser() && statsTab === 'pesrank' && typeof prPlayersDialog === 'function'){
      var pc = prPlayersCount();
      tools += '<button type="button" class="ghost" id="spRankPlayers">👥 ' + crL('Người tính rank', 'Ranked players') + ' <small class="muted">' + pc.on + '/' + pc.all + '</small></button>';
    }
  }
  if(tools) html += '<div class="sp-tools">' + tools + '</div>';
  var body = '';
  if(autoHall) body = '<p class="muted lg-auto-note">' + escapeHtml(crL(
      'Tự động từ các giải chính thức đã kết thúc (cùng dữ liệu với thẻ & danh hiệu), nhóm theo năm của giải. 🥉 chỉ tính khi giải bật "hạng 3" trong Cài đặt giải.',
      'Built automatically from finished official seasons (same data as cards & trophies), grouped by season year. 🥉 only for seasons with "3rd place" ticked in the season settings.')) + '</p>' +
    '<div id="spModeHost" data-mode="legend"></div>';
  else if(adminTab) body = amRenderHtml();
  else if(statsTab === 'career'){
    if(statsCareer && statsCareerYear){
      body = '<div class="sp-career-head"><button type="button" class="ghost" id="spCareerBack">← Hall of Legend</button>' +
        '<h3 class="no-i18n">' + escapeHtml(statsCareer) + '</h3><span class="sp-asof">📅 ' + escapeHtml(crL('Tính đến hết năm ', 'As of the end of ') + statsCareerYear) + '</span>' +
        '<button type="button" class="ghost" id="spCareerNow">' + crL('Xem hiện tại', 'View current') + ' →</button></div>' +
        renderCareerHtml(careerDataUntil(statsCareerYear), statsCareer);
    } else if(statsCareer){
      body = '<div class="sp-career-head"><button type="button" class="ghost" id="spCareerBack">← ' + crL('Tất cả thẻ', 'All cards') + '</button>' +
        '<h3 class="no-i18n">' + escapeHtml(statsCareer) + '</h3></div>' + renderCareerHtml(cd, statsCareer);
    } else body = renderCareerCardsHtml(cd, only);
  } else if(statsTab === 'h2h'){
    var names = careerEloTable(cd, only).map(function(t){ return t.name; });
    if(!statsH2H[0] || names.indexOf(statsH2H[0]) === -1) statsH2H[0] = names[0] || null;
    if(!statsH2H[1] || names.indexOf(statsH2H[1]) === -1 || statsH2H[1] === statsH2H[0]) statsH2H[1] = names.filter(function(n){ return n !== statsH2H[0]; })[0] || null;
    var opts = function(sel){ return names.map(function(n){ return '<option value="' + escapeHtml(n) + '"' + (n === sel ? ' selected' : '') + '>' + escapeHtml(n) + '</option>'; }).join(''); };
    body = '<div class="sp-h2h-pick"><select id="spH2HA" class="no-i18n">' + opts(statsH2H[0]) + '</select>' +
      '<button type="button" class="ghost" id="spH2HSwap" title="' + escapeHtml(crL('Đổi bên', 'Swap')) + '">⇄</button>' +
      '<select id="spH2HB" class="no-i18n">' + opts(statsH2H[1]) + '</select>' +
      (statsH2H[0] && statsH2H[1] ? '<button type="button" class="ghost" id="spH2HExport" title="' + escapeHtml(crL('Xuất ảnh để copy', 'Export as image to copy')) + '">📷 ' + crL('Xuất ảnh', 'Export image') + '</button>' : '') + '</div>' +
      (statsH2H[0] && statsH2H[1] ? '<div class="sp-h2h">' + renderH2HHtml(cd, statsH2H[0], statsH2H[1]) + '</div>' : '<div class="muted">' + crL('Chưa có dữ liệu.', 'No data yet.') + '</div>');
  } else if(statsTab === 'pesrank') body = prRenderHtml(only);
  else if(statsTab === 'elo') body = crEloHtml(cd, only);
  else body = crRecordsHtml(cd, only);
  host.innerHTML = html + '<div class="sp-body">' + body + '</div>';
  if(statsTab === 'career' && !statsCareer) statsApplySearch();
  if(adminTab) amApplySearch();
  if(autoHall){
    PES_MODE_HOST = $('spModeHost');
    try { renderLegendMode(careerAutoLegend(state)); }
    catch(e){ console.error('Dashboard auto legend render failed:', e); }
  }
}

function openStatsPage(tab, name, year){
  if(tab) statsTab = tab;
  statsCareer = (statsTab === 'career' && name) ? careerName(name) : null;
  statsCareerYear = statsCareer && year ? String(year) : null;
  document.querySelectorAll('dialog[open]').forEach(function(d){ try { d.close(); } catch(e){} });
  var host = $('statsPage');
  if(!host) return;
  host.hidden = false;
  document.body.classList.add('page-stats');
  if(typeof pesSeasonSelSync === 'function') pesSeasonSelSync();
  renderStatsPage();
  window.scrollTo(0, 0);
}

// noSync: the caller refreshes the season UI itself (seasonSel change -> refreshAll).
function closeStatsPage(noSync){
  var host = $('statsPage');
  if(host) host.hidden = true;
  var was = document.body.classList.contains('page-stats');
  document.body.classList.remove('page-stats');
  if(was && !noSync && typeof pesSeasonSelSync === 'function') pesSeasonSelSync();
}

// Head-to-head tab -> PNG (round-export.js helpers), shown in a window ready to copy.
function exportH2HImage(){
  var src = document.querySelector('#statsPage .sp-h2h');
  if(!src || !statsH2H[0] || !statsH2H[1] || typeof captureNodeSnapshot !== 'function') return;
  var title = statsH2H[0] + ' vs ' + statsH2H[1];
  var btn = $('spH2HExport');
  if(btn) btn.disabled = true;
  var w = openExportWindow(); // synchronous inside the click so popup blockers allow it
  captureNodeSnapshot(function(bg){
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;width:900px;padding:18px;' +
      'box-sizing:border-box;background:' + bg + ';color:var(--text);font-family:inherit;';
    var head = document.createElement('div');
    head.className = 'no-i18n';
    head.textContent = '⚔️ ' + title;
    head.style.cssText = 'font-size:20px;font-weight:800;margin:0 0 12px;text-align:center;color:var(--text);';
    var clone = src.cloneNode(true);
    // cloneNode does not copy canvas pixels (live profile cards).
    var cvs = src.querySelectorAll('canvas');
    [].forEach.call(clone.querySelectorAll('canvas'), function(c, i){
      var o = cvs[i];
      if(!o || !o.width || !o.height) return;
      c.width = o.width; c.height = o.height;
      try { c.getContext('2d').drawImage(o, 0, 0); } catch(_){}
    });
    [].forEach.call(clone.querySelectorAll('details'), function(d){ d.open = true; });
    [].forEach.call(clone.querySelectorAll('summary'), function(sm){ sm.style.listStyle = 'none'; sm.style.display = 'block'; });
    wrap.appendChild(head);
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    return wrap;
  }).then(function(blob){
    return blobToDataUrl(blob).then(function(url){
      var opts = { heading: crL('📤 Export đối đầu', '📤 Export head-to-head'), text: title };
      if(!fillExportWindow(w, title, blob, url, opts)) showRoundExportDialog(title, blob, url, opts);
    });
  }).catch(function(err){
    console.error('H2H export failed:', err);
    if(w && !w.closed) w.close();
    alert(crL('Không tạo được ảnh: ', 'Could not create the image: ') + (err && err.message ? err.message : err));
  }).then(function(){
    var b = $('spH2HExport');
    if(b) b.disabled = false;
  });
}

// Per-match Elo ± badges on/off (localStorage pesShowElo, default on).
function crEloShown(){ try { return localStorage.getItem('pesShowElo') !== '0'; } catch(e){ return true; } }
function crApplyEloShown(){
  var on = crEloShown();
  document.body.classList.toggle('hide-elo', !on);
  [].forEach.call(document.querySelectorAll('[data-elo-toggle]'), function(b){
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function crSetEloShown(on){
  try { localStorage.setItem('pesShowElo', on ? '1' : '0'); } catch(e){}
  crApplyEloShown();
}
function crEloToggleBtn(cls){
  var on = crEloShown();
  return '<button type="button" class="' + cls + (on ? ' on' : '') + '" data-elo-toggle aria-pressed="' + on + '" title="' +
    escapeHtml(crL('Bật/tắt Elo ± của từng trận', 'Show/hide the Elo ± of every match')) + '">Elo ±</button>';
}

document.addEventListener('click', function(e){
  var t = e.target;
  if(!t || !t.closest) return;
  var x = t.closest('.dlg-x');
  if(x){ e.preventDefault(); var dlg = x.closest('dialog'); if(dlg) dlg.close(); return; }
  var a = t.closest('[data-career-team]');
  if(a){
    e.preventDefault();
    var nm = a.getAttribute('data-career-team');
    if(!a.classList.contains('fc-pick') && typeof openPlayerMini === 'function') openPlayerMini(nm);
    else openCareerDialog(nm, a.getAttribute('data-career-year'));
    return;
  }
  var go = t.closest('[data-goto-season]');
  if(go){ e.preventDefault(); crGotoSeason(go.getAttribute('data-goto-season')); return; }
  if(t.closest('#btnTeamCareer')){
    var tn = $('teamDialog').getAttribute('data-team-name'), s = activeSeason();
    if(s && crIsDoubles(s)){
      var idx = (s.teams || []).map(careerName).indexOf(careerName(tn)), pair = idx >= 0 ? crPairOf(s, idx) : null;
      if(pair) tn = pair[0];
    }
    openCareerDialog(tn);
    return;
  }
  if(t.closest('#btnStatsPage')){
    var det = t.closest('details');
    if(det) det.open = false;
    openStatsPage(statsTab === 'career' ? 'career' : statsTab);
    return;
  }
  if(t.closest('#spBack')){ closeStatsPage(); return; }
  if(t.closest('#spCareerBack')){
    if(statsCareerYear){ statsCareerYear = null; openStatsPage('autolegend'); return; }
    statsCareer = null; renderStatsPage(); return;
  }
  if(t.closest('#spCareerNow')){ statsCareerYear = null; renderStatsPage(); window.scrollTo(0, 0); return; }
  if(t.closest('#spCareerPath')){ openCareerPath(statsCareer); return; }
  if(t.closest('#spH2HSwap')){ statsH2H = [statsH2H[1], statsH2H[0]]; renderStatsPage(); return; }
  if(t.closest('#spH2HExport')){ exportH2HImage(); return; }
  if(t.closest('[data-elo-toggle]')){ crSetEloShown(!crEloShown()); return; }
  var srt = t.closest('#statsPage [data-cr-sort]');
  if(srt){
    var sk = srt.getAttribute('data-cr-sort');
    if(crEloSort.k === sk) crEloSort.dir = -crEloSort.dir;
    else { crEloSort.k = sk; crEloSort.dir = CR_ELO_ASC[sk] ? 1 : -1; }
    renderStatsPage();
    return;
  }
  var tab = t.closest('[data-sp-tab]');
  if(tab){ statsTab = tab.getAttribute('data-sp-tab'); statsCareer = null; statsCareerYear = null; renderStatsPage(); return; }
  if(t.closest('#spSeasonScope') && typeof seasonScopeDialog === 'function') seasonScopeDialog();
  if(t.closest('#spRankPlayers') && typeof prPlayersDialog === 'function') prPlayersDialog();
});

document.addEventListener('keydown', function(e){
  if((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('fc-pick')){
    e.preventDefault();
    openCareerDialog(e.target.getAttribute('data-career-team'), e.target.getAttribute('data-career-year'));
  }
});

document.addEventListener('input', function(e){
  if(e.target && e.target.id === 'spSearch'){ statsQuery = e.target.value; statsApplySearch(); }
});

document.addEventListener('change', function(e){
  var id = e.target && e.target.id;
  if(id === 'spMasterOnly'){ statsMasterOnly = e.target.checked; renderStatsPage(); }
  else if(id === 'spH2HA' || id === 'spH2HB'){ statsH2H[id === 'spH2HA' ? 0 : 1] = e.target.value; renderStatsPage(); }
});

// Elo gained / lost by each side, shown on every played match of the season views.
function crEloDecorate(){
  var s = typeof activeSeason === 'function' ? activeSeason() : null, sid = s ? careerSeasonIdOf(s) : null;
  if(!sid) return;
  var map = null;
  document.querySelectorAll('main [data-key]').forEach(function(el){
    if(!el.querySelector('input.scoreH')) return;
    map = map || careerEloDeltas(careerData(state));
    var d = map[sid + '|' + el.getAttribute('data-key')];
    var sig = d ? Math.round(d.h) + '/' + Math.round(d.a) : '';
    if(el.getAttribute('data-elo-sig') === sig && (!d || el.querySelector('.elo-dl'))) return;
    el.setAttribute('data-elo-sig', sig);
    el.querySelectorAll('.elo-dl, .elo-dl-line').forEach(function(x){ x.remove(); });
    if(!d) return;
    var cells = el.querySelectorAll(':scope > .teamCell');
    if(cells.length === 2){
      cells[0].insertAdjacentHTML('beforeend', crEloBadge(d.h));
      cells[1].insertAdjacentHTML('afterbegin', crEloBadge(d.a));
    } else {
      el.insertAdjacentHTML('beforeend', '<div class="elo-dl-line">' + crEloBadge(d.h) + '<span class="muted">Elo</span>' + crEloBadge(d.a) + '</div>');
    }
  });
  // Bracket tree boxes: badge in front of each row's score.
  document.querySelectorAll('main [data-tree-key]').forEach(function(box){
    map = map || careerEloDeltas(careerData(state));
    var d = map[sid + '|' + box.getAttribute('data-tree-key')], rows = box.querySelectorAll('.de-tree-row');
    if(!d || rows.length !== 2 || box.querySelector('.elo-dl')) return;
    [d.h, d.a].forEach(function(v, i){
      var sc = rows[i].querySelector('.de-tree-score');
      if(sc) sc.insertAdjacentHTML('beforebegin', crEloBadge(v));
    });
  });
}
(function(){
  var timer = null;
  function start(){
    crApplyEloShown();
    crEloDecorate();
    new MutationObserver(function(muts){
      for(var i = 0; i < muts.length; i++){
        var t = muts[i].target;
        if(t && t.closest && t.closest('.elo-dl-line, .elo-dl')) continue;
        clearTimeout(timer); timer = setTimeout(crEloDecorate, 150);
        return;
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
