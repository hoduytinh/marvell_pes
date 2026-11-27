// Marvell PES Club - features/season-news.js
// Season info card (#seasonOverview) for every format: key numbers, upcoming matches with Elo
// predictions, title / relegation odds and the PesNews newspaper corner — generated headlines
// (analysis, predictions, banter) that change with new results, page reloads or the 🔄 button.
// Rendered by renderSeasonOverview() (overview.js). Uses career.js data (Elo, history) and the
// sentence bank in news-bank.js (snLine). snHeadlines() feeds the same headlines to Teo Robot.

var SN_NONCE = Math.floor(Math.random() * 1e9), snShuffle = 0, snMemo = { key: null, html: '' };
var SN_SIMS = 600;

function snRng(seed){
  var a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function snHash(str){
  var h = 2166136261;
  for(var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function snPct(p){
  if(p <= 0) return '0%';
  if(p >= 1) return '100%';
  if(p < 0.01) return '<1%';
  if(p > 0.99) return '>99%';
  return Math.round(p * 100) + '%';
}
function snWinP(eh, ea){ return 1 / (1 + Math.pow(10, (ea - eh) / 400)); }
// Win / draw / loss chances from the Elo gap; knock-out ties have no draw.
function snProbs(eh, ea, ko){
  var p = snWinP(eh, ea);
  if(ko) return { h: p, d: 0, a: 1 - p };
  var d = 0.3 * (1 - Math.abs(2 * p - 1));
  return { h: p - d / 2, d: d, a: 1 - p - d / 2 };
}
function snE(x){ return escapeHtml(String(x == null ? '' : x)); }
// snB also remembers which team each bold name stands for (SN_TMAP, reset by snNews), so a headline
// can pull in the career / season facts of the team it is about.
var SN_TMAP = null;
function snB(t){
  var h = '<b class="no-i18n">' + snE(t && t.name != null ? t.name : t) + '</b>';
  if(SN_TMAP && t && (!SN_TMAP[h] || (typeof t !== 'string' && !SN_TMAP[h].ck))) SN_TMAP[h] = typeof t === 'string' ? { name: t } : t;
  return h;
}
function snSigned(v){ v = Math.round(v); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v); }

// ---------------- Season data ----------------
// Momentum on top of the career Elo: last 5 results of this season (needs 3+), at most ±35.
function snFormBonus(form){
  var f = form.slice(-5);
  if(f.length < 3) return 0;
  var ppg = f.reduce(function(a, r){ return a + (r === 'W' ? 3 : r === 'D' ? 1 : 0); }, 0) / f.length;
  return Math.max(-35, Math.min(35, (ppg - 1.5) * 25));
}
function snData(s){
  var cd = careerData(state), sid = careerSeasonIdOf(s), mode = s.mode || 'league';
  var names = (s.teams || []).map(careerName), dbl = crIsDoubles(s);
  var byeIdx = mode === 'chess-swiss' && s.chessSwiss ? s.chessSwiss.byeIndex : null;
  var T = {}, idxOf = {}, teams = [];
  names.forEach(function(n, i){
    if(i === byeIdx || !n || /^bye$/i.test(n)) return;
    var pair = dbl ? crPairOf(s, i) : null, pl = pair && pair.length ? pair : [n], sum = 0;
    pl.forEach(function(p){ var e = cd.elo[careerResolveName(cd, p)]; sum += e ? e.elo : ELO_BASE; });
    var t = { idx: i, name: n, ck: careerResolveName(cd, n), elo: sum / pl.length, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, gP: 0,
      Pts: 0, form: [], cs: 0, blank: 0, eloD: 0, koL: 0, swL: 0, out: false, koBy: null };
    T[i] = t; idxOf[n] = i; teams.push(t);
  });

  // Rated entries of this season (knock-out series with per-game scores are split into games).
  var ent = cd.hist.concat(cd.dbl || []).filter(function(m){ return m.sid === sid; }), games = [];
  ent.forEach(function(m){
    var h = T[idxOf[m.home]], a = T[idxOf[m.away]];
    if(!h || !a) return;
    m._h = h; m._a = a;
    if(isFinite(m.eloD)){ h.eloD += m.eloD; a.eloD -= m.eloD; }
    [[h, m.hg, m.ag], [a, m.ag, m.hg]].forEach(function(x){
      var t = x[0], r = careerResult(x[1], x[2]);
      t.P++; t[r]++; t.form.push(r);
      if(!m.ko && !m.est){ t.gP++; t.GF += x[1]; t.GA += x[2]; if(!x[2]) t.cs++; if(!x[1]) t.blank++; }
    });
    if(!m.ko && !m.est) games.push(m);
  });
  teams.forEach(function(t){ t.rt = t.elo + snFormBonus(t.form); });

  var list = collectSeasonMatches(s).filter(function(m){ return m.rest == null && T[m.home] && T[m.away]; });
  var played = list.filter(function(m){ return m.res; }), pending = list.filter(function(m){ return !m.res; });
  var W3 = mode === 'chess-swiss' ? 2 : 3;
  played.forEach(function(m){
    var h = T[m.home], a = T[m.away], hg = m.res.hg, ag = m.res.ag;
    if(!m.ko){ h.Pts += hg > ag ? W3 : (hg === ag ? 1 : 0); a.Pts += ag > hg ? W3 : (hg === ag ? 1 : 0); }
    if(hg === ag) return;
    var lo = hg > ag ? a : h, wi = hg > ag ? h : a;
    if(m.ko && !/hạng 3|3rd/i.test(m.stage)){
      lo.koL++; lo.koBy = { t: wi, m: m };
      if(/^de-(losers|playoff)-/.test(m.key)) lo.out = true;
    }
    if(/^Swiss V/.test(m.stage)) lo.swL++;
  });

  var fin = null;
  try { fin = careerSeasonFinishes(s); } catch(e){ fin = null; }
  var podium = {};
  if(fin) Object.keys(fin).forEach(function(k){ var f = fin[k]; if(f.medal && T[k] && !podium[f.medal]) podium[f.medal] = T[k]; });

  var kind = (mode === 'league' || mode === 'chess-swiss') ? 'table' : 'ko', table = [];
  if(mode === 'league'){
    table = computeStandingsFor(s, 'overall').filter(function(r){ return T[r.idx]; })
      .map(function(r){ return { t: T[r.idx], Pts: r.Pts, GD: r.GD, GF: r.GF }; });
  } else if(mode === 'chess-swiss' && s.chessSwiss){
    table = chessSwissStats(s, (s.chessSwiss.rounds || []).length).filter(function(r){ return !r.isBye && T[r.idx]; })
      .sort(function(a, b){ return b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || b.W - a.W; })
      .map(function(r){ return { t: T[r.idx], Pts: r.Pts, GD: r.GD, GF: r.GF }; });
  }

  var alive = null;
  if(kind === 'ko'){
    if(podium.gold) alive = [podium.gold];
    else if(mode === 'double-elimination') alive = teams.filter(function(t){ return !t.out && t.koL < 2; });
    else if(mode === 'swiss'){
      var sw = s.swiss || {}, q = sw.playoffQualifiers || [], el = sw.eliminated || [], Lmax = sw.lossesToEliminate || 3;
      alive = q.length ? q.map(function(i){ return T[i]; }).filter(function(t){ return t && !t.koL; })
        : teams.filter(function(t){ return el.indexOf(t.idx) === -1 && t.swL < Lmax; });
    } else if(mode === 'tournament'){
      var inKo = {};
      list.forEach(function(m){ if(m.ko && m.key.indexOf('knockout-') === 0){ inKo[m.home] = 1; inKo[m.away] = 1; } });
      alive = Object.keys(inKo).length ? teams.filter(function(t){ return inKo[t.idx] && !t.koL; }) : teams.slice();
    } else alive = teams.filter(function(t){ return !t.koL; });
  }

  var extraRounds = 0, total = list.length;
  if(mode === 'chess-swiss' && s.chessSwiss){
    extraRounds = Math.max(0, (s.chessSwiss.numRounds || 0) - (s.chessSwiss.rounds || []).length);
    total += extraRounds * Math.floor(teams.length / 2);
  }
  var G = 0;
  games.forEach(function(m){ G += m.hg + m.ag; });
  var done = !!podium.gold || !!s.locked || !!s.forceEnded || (kind === 'table' && played.length > 0 && !pending.length && !extraRounds);
  return { s: s, cd: cd, sid: sid, mode: mode, kind: kind, dbl: dbl, T: T, teams: teams, ent: ent, games: games, list: list,
    played: played, pending: pending, W3: W3, podium: podium, table: table, alive: alive, total: total, extraRounds: extraRounds,
    G: G, avgGoals: games.length ? G / games.length : null, done: done,
    status: done ? 'done' : (played.length ? 'live' : 'idle') };
}

// ---------------- Odds ----------------
// Table formats: Monte-Carlo of the remaining fixtures (Elo win/draw/loss chances).
// Knock-out formats: share of Elo strength among the teams still alive.
function snOdds(D, rng){
  if(D.done || !D.teams.length) return null;
  var T = D.T, out = { title: [], rel: null, relN: 0, topN: 0, sims: 0, method: 'elo' };
  if(D.kind === 'table' && D.table.length){
    var st = D.s.settings || {}, rel = D.mode === 'league' ? Math.max(0, +st.rel || 0) : 0;
    var topN = D.mode === 'league' ? Math.max(0, +st.top || 0) : 0;
    var fx = D.pending.map(function(m){ return { h: m.home, a: m.away, p: snProbs(T[m.home].rt, T[m.away].rt, false) }; });
    var N = (!fx.length && !D.extraRounds) ? 1 : SN_SIMS, W3 = D.W3, cnt = {};
    D.table.forEach(function(b){ cnt[b.t.idx] = { c: 0, top: 0, rel: 0 }; });
    var play = function(H, A, p){
      var x = rng(), g = 1 + (rng() < 0.35 ? 1 : 0) + (rng() < 0.1 ? 1 : 0);
      if(x < p.h){ H.Pts += W3; H.GD += g; A.GD -= g; H.GF += g; }
      else if(x < p.h + p.d){ H.Pts++; A.Pts++; H.GF++; A.GF++; }
      else { A.Pts += W3; A.GD += g; H.GD -= g; A.GF += g; }
    };
    for(var k = 0; k < N; k++){
      var cur = {}, arr = D.table.map(function(b){ return (cur[b.t.idx] = { i: b.t.idx, elo: b.t.rt, Pts: b.Pts, GD: b.GD, GF: b.GF, r: rng() }); });
      fx.forEach(function(f){ play(cur[f.h], cur[f.a], f.p); });
      for(var x = 0; x < D.extraRounds; x++){
        arr.sort(function(a, b){ return b.Pts - a.Pts || a.r - b.r; });
        for(var j = 0; j + 1 < arr.length; j += 2) play(arr[j], arr[j + 1], snProbs(arr[j].elo, arr[j + 1].elo, false));
        if(arr.length % 2) arr[arr.length - 1].Pts += W3;
      }
      arr.sort(function(a, b){ return b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.r - b.r; });
      cnt[arr[0].i].c++;
      arr.forEach(function(e, pos){ if(pos < topN) cnt[e.i].top++; if(rel && pos >= arr.length - rel) cnt[e.i].rel++; });
    }
    var all = D.table.map(function(b){ var c = cnt[b.t.idx]; return { t: b.t, p: c.c / N, top: c.top / N, rel: c.rel / N }; });
    out.title = all.filter(function(x){ return x.p > 0; }).sort(function(a, b){ return b.p - a.p; });
    out.all = all;
    if(rel) out.rel = all.filter(function(x){ return x.rel > 0; }).sort(function(a, b){ return b.rel - a.rel; });
    out.relN = rel; out.topN = topN; out.sims = N; out.method = 'sim';
  } else {
    var pool = D.alive && D.alive.length ? D.alive : D.teams, sum = 0;
    var w = pool.map(function(t){
      var v = Math.pow(10, t.rt / 400) * (D.mode === 'double-elimination' && t.koL ? 0.55 : 1);
      sum += v;
      return { t: t, v: v };
    });
    out.title = w.map(function(x){ return { t: x.t, p: x.v / sum }; }).sort(function(a, b){ return b.p - a.p; });
  }
  return out;
}

// Predicted result of an unplayed match: chances from Elo + form, score = most likely
// Poisson scoreline (goal rates from the Elo gap and the season attack/defence) that
// agrees with the favourite (draw when the chances are within 12%).
function snPredict(D, m){
  var h = D.T[m.home], a = D.T[m.away], p = snProbs(h.rt, a.rt, m.ko);
  var r = { p: p, sc: null, h: h, a: a, fav: p.h >= p.a ? h : a, dog: p.h >= p.a ? a : h, pf: Math.max(p.h, p.a) };
  if(m.ko) return r;
  var base = D.avgGoals != null && D.games.length >= 3 ? D.avgGoals / 2 : 1.4;
  var att = function(t){ return (t.GF + 3 * base) / (t.gP + 3) / base; };
  var def = function(t){ return (t.GA + 3 * base) / (t.gP + 3) / base; };
  var lh = base * Math.pow(10, (h.rt - a.rt) / 800) * Math.sqrt(att(h) * def(a));
  var la = base * Math.pow(10, (a.rt - h.rt) / 800) * Math.sqrt(att(a) * def(h));
  var cat = p.h - p.a > 0.12 ? 'h' : (p.a - p.h > 0.12 ? 'a' : 'd');
  var pmf = function(l){ var out = [Math.exp(-l)]; for(var k = 1; k <= 8; k++) out.push(out[k - 1] * l / k); return out; };
  var ph = pmf(lh), pa = pmf(la), best = { x: 1, y: 1, q: -1 };
  for(var x = 0; x <= 8; x++) for(var y = 0; y <= 8; y++){
    if((cat === 'h' && x <= y) || (cat === 'a' && x >= y) || (cat === 'd' && x !== y)) continue;
    var q = ph[x] * pa[y];
    if(q > best.q + 1e-12 || (Math.abs(q - best.q) <= 1e-12 && x + y < best.x + best.y)) best = { x: x, y: y, q: q };
  }
  r.x = best.x; r.y = best.y; r.sc = best.x + ' – ' + best.y;
  return r;
}

// Shared per-match prediction for the fixture lists (same model as the season news).
// Returns { p:{h,d,a}, x, y } or null when the season/teams are not rated.
var snPredMemo = { cd: null, list: [] };
function pesMatchPrediction(s, hi, ai){
  if(typeof careerData !== 'function' || !s) return null;
  var cd = careerData(state);
  if(snPredMemo.cd !== cd) snPredMemo = { cd: cd, list: [] };
  var hit = snPredMemo.list.filter(function(e){ return e.s === s; })[0];
  if(!hit){
    hit = { s: s, D: null };
    try { if(careerSeasonIdOf(s)) hit.D = snData(s); } catch(e){ console.warn('Prediction data failed:', e); }
    snPredMemo.list.push(hit);
  }
  if(!hit.D || !hit.D.T[hi] || !hit.D.T[ai]) return null;
  return snPredict(hit.D, { home: hi, away: ai, ko: false });
}

function snH2H(cd, a, b){
  var r = { W: 0, D: 0, L: 0, P: 0 };
  cd.hist.forEach(function(m){
    var x = m.home === a && m.away === b ? careerResult(m.hg, m.ag) : (m.home === b && m.away === a ? careerResult(m.ag, m.hg) : null);
    if(x){ r[x]++; r.P++; }
  });
  return r;
}

function snStreak(t, kind){
  var k = 0;
  for(var i = t.form.length - 1; i >= 0; i--){
    var r = t.form[i];
    if(kind === 'W' ? r === 'W' : kind === 'L' ? r === 'L' : kind === 'U' ? r !== 'L' : kind === 'D' ? r === 'D' : r !== 'W') k++; else break;
  }
  return k;
}
function snFormPts(t, n){ return t.form.slice(-n).reduce(function(a, r){ return a + (r === 'W' ? 3 : r === 'D' ? 1 : 0); }, 0); }
function snMax(arr, fn){
  var best = null, bv = -Infinity;
  arr.forEach(function(x){ var v = fn(x); if(v > bv){ bv = v; best = x; } });
  return best;
}

// ---------------- Newspaper ----------------
// Every sentence comes from SN_BANK (features/news-bank.js), shared with the match commentary and
// Teo Robot. snNews only decides which situations apply to the season and fills in the facts.
var SN_TAGS = {
  hot: crL('Tiêu điểm', 'Headline'), race: crL('Cuộc đua', 'Title race'), pred: crL('Dự đoán', 'Prediction'),
  preview: crL('Soi kèo', 'Preview'), result: crL('Kết quả', 'Result'), shock: crL('Sốc', 'Shock'),
  troll: crL('Cà khịa', 'Banter'), stats: crL('Thống kê', 'Stats'), rumor: crL('Tin đồn', 'Rumour'),
  mile: crL('Cột mốc', 'Milestone'), form: crL('Phong độ', 'Form'), rel: crL('Rớt hạng', 'Relegation'),
  profile: crL('Hồ sơ', 'Profile'), h2h: crL('Đối đầu', 'Rivalry'), hist: crL('Lịch sử', 'History'),
  ko: crL('Loại trực tiếp', 'Knock-out'), elo: 'Elo', future: crL('Tương lai', 'Outlook'),
  quote: crL('Phát ngôn', 'Quote'), fun: crL('Bên lề', 'Sidelines'),
  gossip: crL('Lá cải', 'Gossip'), office: crL('Công sở', 'Office')
};
var SN_MAX_ITEMS = 14, SN_TAG_LIMIT = { rumor: 2, quote: 1, fun: 1, result: 2, troll: 3, profile: 3, gossip: 2, office: 1 };

// Same competition in other years: the name without digits / punctuation ("2026 - Seri A" -> "seri a").
function snSeriesKey(name){
  return String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/\d+/g, ' ').replace(/[^a-z]+/g, ' ').trim();
}
function snYearOf(name){ var m = /(19|20)\d{2}/.exec(String(name || '')); return m ? m[0] : null; }
function snLc(n){ return careerName(n).toLowerCase(); }
// Earlier editions of D's competition (oldest first) with their champions and title counts.
function snSeries(D){
  var key = snSeriesKey(D.s.name), ids = careerSeasonIds(state), prev = [], titles = {};
  if(!key || !D.sid) return null;
  for(var i = 0; i < ids.length && ids[i] !== D.sid; i++){
    var s = state.seasons[ids[i]], champ = null, fin = null;
    if(!s || snSeriesKey(s.name) !== key) continue;
    try { fin = careerSeasonFinishes(s); } catch(e){ fin = null; }
    if(fin) Object.keys(fin).forEach(function(k){ if(fin[k].medal === 'gold' && !champ) champ = careerName((s.teams || [])[k]); });
    if(champ) titles[snLc(champ)] = (titles[snLc(champ)] || 0) + 1;
    prev.push({ sid: ids[i], champ: champ });
  }
  return { editions: prev.length + 1, prev: prev, titles: titles, last: prev.length ? prev[prev.length - 1].champ : null };
}
function snGolds(cd, name){
  var t = cd.trophies[snLc(name)];
  return t ? t.list.filter(function(x){ return x.medal === 'gold'; }) : [];
}
function snShuffled(arr, rng){
  var a = arr.slice();
  for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(rng() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
  return a;
}

// all = true: every applicable headline (Teo Robot); otherwise a varied front page.
function snNews(D, odds, rng, all){
  var cd = D.cd, items = [], teams = D.teams, nPlayed = D.played.length, W3 = D.W3;
  SN_TMAP = {};
  var posOf = {};
  D.table.forEach(function(b, i){ posOf[b.t.idx] = { pos: i + 1, pts: b.Pts }; });
  var fmtH = function(x, k){ return k === 'n' ? snB(x) : '<span class="no-i18n">' + snE(x) + '</span>'; };
  // Facts of the team a headline is about: career (snPlayerCtx) + this season.
  function ctxOf(v, id){
    var keys = [SN_SUBJ[id], 't', 'n', 'c', 'l', 'r', 'b', 'w', 'd', 'f', 'a', 'h'], t = null;
    for(var i = 0; i < keys.length && !t; i++) if(keys[i] && typeof v[keys[i]] === 'string') t = SN_TMAP[v[keys[i]]] || null;
    if(!t) return null;
    var c = {}, pc = D.dbl ? null : snPlayerCtx(cd, t.ck || careerResolveName(cd, t.name), fmtH);
    if(pc) Object.keys(pc).forEach(function(k){ c[k] = pc[k]; });
    if(t.idx != null && D.T[t.idx] === t && t.P){
      c.sP = t.P; c.sW = t.W; c.sD = t.D; c.sL = t.L;
      if(t.gP){ c.sGF = t.GF; c.sGA = t.GA; }
      if(t.cs) c.sCS = t.cs;
      if(Math.round(t.eloD)) c.sEloD = snSigned(t.eloD);
      if(t.form.length >= 3) c.sForm = t.form.slice(-5).map(function(r){ return crL({ W: 'T', D: 'H', L: 'B' }[r], r); }).join('-');
      if(posOf[t.idx]){ c.sPos = posOf[t.idx].pos; c.sPts = posOf[t.idx].pts; }
    }
    return c;
  }
  function say(pri, id, v, tag){
    if(!SN_BANK[id]) return;
    var c = ctxOf(v, id), vv = v;
    if(c){ vv = c; Object.keys(v).forEach(function(k){ vv[k] = v[k]; }); }
    items.push({ pri: pri + rng() * 14, tag: tag || SN_BANK[id].tag, grp: [snGroupOf(id)], html: snLine(id, vv, rng) });
  }
  function pickR(arr){ return arr[Math.floor(rng() * arr.length)]; }
  var byElo = teams.slice().sort(function(a, b){ return b.elo - a.elo; });
  var eloRank = {}, byName = {};
  byElo.forEach(function(t, i){ eloRank[t.idx] = i + 1; });
  teams.forEach(function(t){ byName[snLc(t.name)] = t; });
  var season = '<span class="no-i18n">' + snE(D.s.name || '') + '</span>';
  var stTxt = function(x){ return '<span class="no-i18n">' + snE(x) + '</span>'; };
  var series = snSeries(D), year = snYearOf(D.s.name), clinched = false;
  var defending = series && series.last ? byName[snLc(series.last)] || null : null;
  var defOut = !!(defending && D.kind === 'ko' && D.alive && nPlayed && !D.done && D.alive.indexOf(defending) === -1);
  var yearGolds = function(t){
    return D.dbl || !year ? 0 : snGolds(cd, t.ck).filter(function(g){ return g.sid !== D.sid && snYearOf(g.season) === year; }).length;
  };

  // --- Finished season ---
  if(D.done && D.podium.gold){
    var c = D.podium.gold, r2 = D.podium.silver, b3 = D.podium.bronze;
    say(100, 'champ', { c: snB(c), s: season });
    if(r2) say(70, 'runnerUp', { r: snB(r2) });
    if(b3) say(50, 'bronze', { b: snB(b3) });
    say(58, 'champRecord', { c: snB(c), w: c.W, d: c.D, l: c.L, e: snSigned(c.eloD) });
    if(c.P >= 3 && !c.L) say(80, 'champUnbeaten', { c: snB(c) });
    if(!D.dbl){
      var golds = snGolds(cd, c.ck), mine = golds.some(function(g){ return g.sid === D.sid; });
      if(mine && golds.length === 1) say(78, 'champFirst', { c: snB(c) });
      else if(mine && golds.length >= 3) say(74, 'champDynasty', { c: snB(c), k: golds.length });
      var yg = yearGolds(c);
      if(yg) say(66, 'champYearDouble', { c: snB(c), k: yg + 1 });
      var rt = r2 ? cd.trophies[snLc(r2.ck)] : null, rc = rt ? medalCount(rt.list) : null;
      if(rc && rc.silver >= 2 && !rc.gold) say(60, 'silverCurse', { r: snB(r2), k: rc.silver });
    }
    if(series && series.last && snLc(series.last) === snLc(c.name)) say(82, 'champDefend', { c: snB(c), s: season });
    else if(series && series.titles[snLc(c.name)]) say(64, 'champSeriesKing', { c: snB(c), k: series.titles[snLc(c.name)] + 1 });
    if(D.mode === 'league' && D.table.length){
      var relN = Math.max(0, +((D.s.settings || {}).rel) || 0);
      var relT = D.table.slice(D.table.length - relN);
      if(relT.length) say(62, 'relegated', { t: relT.map(function(x){ return snB(x.t); }).join(', ') });
    }
    if(D.kind === 'table' && D.table.length >= 4){
      var spoon = D.table[D.table.length - 1];
      say(46, 'woodenSpoon', { t: snB(spoon.t), p: spoon.Pts });
    }
    var fav = byElo[0];
    if(fav && fav !== c) say(52, 'eloFlop', { f: snB(fav), c: snB(c) });
  }

  // --- Not started ---
  if(D.status === 'idle' && byElo.length){
    var f0 = byElo[0], lo = byElo[byElo.length - 1];
    say(95, 'kickoff', { s: season, n: teams.length, f: snB(f0), e: Math.round(f0.elo) });
    if(lo && lo !== f0) say(50, 'weakest', { t: snB(lo), e: Math.round(lo.elo) });
    if(byElo[1] && f0.elo - byElo[1].elo < 25) say(58, 'preGap', { f: snB(f0), t2: snB(byElo[1]), g: Math.round(f0.elo - byElo[1].elo) });
    if(!D.dbl){
      var rookies = teams.filter(function(t){ return !cd.elo[t.ck]; });
      if(rookies.length) say(46, 'debutant', { t: snB(pickR(rookies)) });
      var vet = snMax(teams, function(t){ return cd.elo[t.ck] ? cd.elo[t.ck].P : 0; });
      if(vet && cd.elo[vet.ck] && cd.elo[vet.ck].P >= 30) say(40, 'preVeteran', { t: snB(vet), k: cd.elo[vet.ck].P });
    }
  }
  if(defending && !D.done && !defOut) say(D.status === 'idle' ? 72 : 38, 'defending', { t: snB(defending), s: season });

  // --- History of this competition ---
  if(series){
    if(series.editions === 1){ if(!D.done) say(44, 'hsFirst', { s: season }); }
    else {
      say(28, 'hsEditions', { k: series.editions, s: season });
      var kingK = 0, kingN = null;
      Object.keys(series.titles).forEach(function(k){ if(series.titles[k] > kingK){ kingK = series.titles[k]; kingN = k; } });
      if(kingN && kingK >= 2 && byName[kingN] && !D.done) say(50, 'hsKing', { t: snB(byName[kingN]), k: kingK });
      if(series.last && !defending && !D.done) say(42, 'hsAbsent', { t: snB(series.last) });
      if(series.prev.length >= 2 && kingK === 1 && series.prev.every(function(p){ return p.champ; })) say(34, 'hsNoRepeat', { k: series.prev.length });
    }
  }

  // --- Title race (table formats) ---
  if(D.kind === 'table' && D.status === 'live' && D.table.length >= 2){
    var L = D.table[0], S = D.table[1], gap = L.Pts - S.Pts, rem = {};
    D.table.forEach(function(b){ rem[b.t.idx] = D.extraRounds; });
    D.pending.forEach(function(m){ if(rem[m.home] != null) rem[m.home]++; if(rem[m.away] != null) rem[m.away]++; });
    var rivals = D.table.slice(1);
    clinched = rivals.every(function(b){ return L.Pts - b.Pts > W3 * rem[b.t.idx]; });
    if(clinched) say(97, 'clinch', { l: snB(L.t) });
    else {
      say(gap >= 6 || gap <= 1 ? 86 : 80, gap >= 6 ? 'runaway' : gap === 0 ? 'level' : gap <= 1 ? 'tight' : 'lead',
        { l: snB(L.t), s2: snB(S.t), g: gap, p: L.Pts });
      if(rem[L.t.idx] && rivals.every(function(b){ return L.Pts + W3 - b.Pts > W3 * rem[b.t.idx]; })) say(84, 'fClinchNext', { l: snB(L.t) });
    }
    var lastL = null;
    D.ent.forEach(function(m){ if(!m.ko && (m._h === L.t || m._a === L.t)) lastL = m; });
    if(lastL){
      var lh = lastL._h === L.t, lgf = lh ? lastL.hg : lastL.ag, lga = lh ? lastL.ag : lastL.hg;
      if(lgf < lga) say(74, 'leaderSlip', { l: snB(L.t), o: snB(lh ? lastL._a : lastL._h), sc: lgf + '–' + lga });
    }
    // Table position vs Elo expectation
    if(nPlayed >= teams.length){
      var diffs = D.table.map(function(x, i){ return { t: x.t, pos: i + 1, er: eloRank[x.t.idx], d: (i + 1) - eloRank[x.t.idx] }; });
      var under = snMax(diffs, function(x){ return x.d; }), over = snMax(diffs, function(x){ return -x.d; });
      if(under && under.d >= 3) say(60, 'under', { t: snB(under.t), e: under.er, p: under.pos });
      if(over && over.d <= -3) say(52, 'over', { t: snB(over.t), e: over.er, p: over.pos });
      if(D.table.length >= 4){ var B = D.table[D.table.length - 1]; say(44, 'bottom', { t: snB(B.t), p: B.Pts }); }
    }
    var topN = D.mode === 'league' ? Math.max(0, +((D.s.settings || {}).top) || 0) : 0;
    if(topN >= 2 && D.table.length > topN + 1){
      var cut = D.table[topN - 1].Pts, fight = D.table.filter(function(b){ return Math.abs(b.Pts - cut) <= 3; });
      if(fight.length > topN) say(54, 'topSpots', { n: topN, list: fight.slice(0, 6).map(function(b){ return snB(b.t); }).join(', ') });
    }
  }

  // --- Predictions ---
  if(odds && odds.title.length){
    var top = odds.title[0], sec = odds.title[1];
    var how = odds.method === 'sim' ? crL('sau ' + odds.sims + ' kịch bản mô phỏng', 'over ' + odds.sims + ' simulations') : crL('theo Elo', 'by Elo');
    if(!clinched){
      if(top.p >= 0.9 && D.status === 'live') say(80, 'nearlyDone', { t: snB(top.t), p: snPct(top.p) });
      else say(78, 'titleOdds', { t: snB(top.t), p: snPct(top.p), h: how });
    }
    if(sec && top.p < 0.45) say(66, 'shared', { t: snB(top.t), p: snPct(top.p), t2: snB(sec.t), p2: snPct(sec.p) });
    var median = byElo[Math.floor(byElo.length / 2)];
    var horse = odds.title.slice(1, 6).filter(function(x){ return x.p >= 0.04 && x.p <= 0.35 && median && x.t.elo <= median.elo; })[0];
    if(horse) say(56, 'darkHorse', { t: snB(horse.t), p: snPct(horse.p), e: Math.round(horse.t.elo) });
    if(D.kind === 'table' && D.table.length && D.table[0].t !== top.t && D.status === 'live')
      say(64, 'trustOther', { l: snB(D.table[0].t), t: snB(top.t), p: snPct(top.p),
        p2: snPct((odds.all || []).filter(function(x){ return x.t === D.table[0].t; }).map(function(x){ return x.p; })[0] || 0) });
    if(odds.all && D.status === 'live'){
      var gone = odds.all.filter(function(x){ return !x.p && eloRank[x.t.idx] <= 3; })[0];
      if(gone) say(58, 'bigOut', { t: snB(gone.t), e: Math.round(gone.t.elo) });
      var mid = odds.topN ? odds.all.filter(function(x){ return x.top >= 0.3 && x.top <= 0.7; }) : [];
      if(mid.length){ var mx = pickR(mid); say(50, 'topN', { t: snB(mx.t), p: snPct(mx.top), n: odds.topN }); }
    }
    var yh = yearGolds(top.t);
    if(yh) say(56, 'yearHunt', { t: snB(top.t), k: yh, p: snPct(top.p) });
    if(odds.rel && odds.rel.length && D.status === 'live'){
      var rr = odds.rel[0];
      if(rr.rel >= 0.99) say(72, 'relSure', { t: snB(rr.t), p: snPct(rr.rel) });
      else if(rr.rel >= 0.3) say(70, 'relDanger', { t: snB(rr.t), p: snPct(rr.rel) });
      var r2b = odds.rel.filter(function(x){ return x !== rr && x.rel >= 0.15 && x.rel <= 0.7; })[0];
      if(r2b) say(46, 'relSecond', { t: snB(r2b.t), p: snPct(r2b.rel) });
    }
  }

  // --- Knock-out: who is still alive ---
  if(D.kind === 'ko' && D.alive && !D.done && nPlayed){
    var out = teams.filter(function(t){ return D.alive.indexOf(t) === -1; });
    if(D.alive.length === 2) say(90, 'finalPair', { a: snB(D.alive[0]), b: snB(D.alive[1]) });
    else if(D.alive.length && D.alive.length <= 8 && out.length) say(76, 'alive', { n: D.alive.length, list: D.alive.map(function(t){ return snB(t); }).join(', ') });
    var fallen = out.filter(function(t){ return eloRank[t.idx] <= 3 && t !== defending; }).sort(function(a, b){ return eloRank[a.idx] - eloRank[b.idx]; })[0];
    if(fallen) say(74, 'fallen', { t: snB(fallen), k: eloRank[fallen.idx], by: fallen.koBy ? crL(' dưới tay ', ' by ') + snB(fallen.koBy.t) : '' });
    if(defOut) say(80, 'defendingOut', { t: snB(defending) });
    if(D.alive.length >= 3){
      var mouse = D.alive.slice().sort(function(a, b){ return a.elo - b.elo; })[0];
      if(eloRank[mouse.idx] > teams.length / 2) say(62, 'underdogAlive', { t: snB(mouse), e: Math.round(mouse.elo) });
    }
    if(D.mode === 'double-elimination'){
      var zs = D.alive.filter(function(t){ return t.koL === 1; });
      if(zs.length) say(54, 'deSurvivor', { t: snB(pickR(zs)) });
    }
    if(D.mode === 'swiss' && D.s.swiss && !(D.s.swiss.playoffQualifiers || []).length){
      var ql = (D.s.swiss.qualified || []).map(function(i){ return D.T[i]; }).filter(Boolean);
      if(ql.length) say(58, 'swissTickets', { n: ql.length, list: ql.map(function(t){ return snB(t); }).join(', ') });
    }
    if(odds && odds.title.length >= 2 && D.alive.length >= 4) say(52, 'fFinalGuess', { a: snB(odds.title[0].t), b: snB(odds.title[1].t) });
  }

  // --- Latest results (same commentary as Teo Robot) ---
  if(!D.dbl){
    var idxs = [];
    cd.hist.forEach(function(m, i){ if(m.sid === D.sid) idxs.push(i); });
    idxs.slice(-2).reverse().forEach(function(i, k){
      var cm = careerCommentary(cd, i), m = cd.hist[i];
      if(!cm) return;
      items.push({ pri: (k ? 58 : 73) + rng() * 10, tag: 'result',
        grp: (cm.ids || []).filter(function(id){ return ['r_convincing', 'r_narrow', 'r_decider'].indexOf(id) === -1; }).map(snGroupOf),
        html: '<span class="sn-score no-i18n">' + snE(m.home + ' ' + m.hg + ' – ' + m.ag + ' ' + m.away) + '</span> <small class="muted no-i18n">' + snE(m.stage) + '</small><br>' + snE(cm.lines.join(' ')) });
    });
  }

  // --- Upset of the season ---
  var ups = D.ent.filter(function(m){ return m.hg !== m.ag && isFinite(m.eloH) && isFinite(m.eloA); })
    .map(function(m){ var hw = m.hg > m.ag; return { m: m, d: hw ? m.eloA - m.eloH : m.eloH - m.eloA, w: hw ? m._h : m._a, l: hw ? m._a : m._h, ew: hw ? m.eloH : m.eloA, el: hw ? m.eloA : m.eloH }; });
  var up = snMax(ups, function(x){ return x.d; });
  if(up && up.d >= 60) say(62, 'upset', { w: snB(up.w), l: snB(up.l), ew: Math.round(up.ew), el: Math.round(up.el), d: Math.round(up.d),
    sc: up.m.hg + '–' + up.m.ag, st: stTxt(up.m.stage) });

  // --- Form ---
  var active = teams.filter(function(t){ return t.P >= 3; });
  var hot = snMax(active, function(t){ return snStreak(t, 'W') * 10 + snFormPts(t, 5); });
  if(hot && snStreak(hot, 'W') >= 3) say(66, 'hot', { t: snB(hot), k: snStreak(hot, 'W') });
  else if(hot && snFormPts(hot, 5) >= 10) say(50, 'bestForm', { t: snB(hot), p: snFormPts(hot, 5) });
  var cold = snMax(active, function(t){ return snStreak(t, 'L') * 10 + snStreak(t, 'N'); });
  if(cold && cold !== hot){
    if(snStreak(cold, 'L') >= 3) say(64, 'coldLose', { t: snB(cold), k: snStreak(cold, 'L') });
    else if(snStreak(cold, 'N') >= 4) say(58, 'coldWinless', { t: snB(cold), k: snStreak(cold, 'N') });
  }
  var unb = snMax(active, function(t){ return snStreak(t, 'U'); });
  if(unb && unb !== hot && snStreak(unb, 'U') >= 5) say(48, 'unbeaten', { t: snB(unb), k: snStreak(unb, 'U') });
  var zig = active.filter(function(t){
    var f = t.form.slice(-5);
    return f.length === 5 && f.every(function(r, i){ return r !== 'D' && (!i || r !== f[i - 1]); });
  });
  if(zig.length){
    var zt = pickR(zig);
    say(40, 'zigzag', { t: snB(zt), f: zt.form.slice(-5).map(function(r){ return crL({ W: 'T', D: 'H', L: 'B' }[r], r); }).join('-') });
  }
  var drr = snMax(active, function(t){ return snStreak(t, 'D'); });
  if(drr && snStreak(drr, 'D') >= 3) say(38, 'drawRun', { t: snB(drr), k: snStreak(drr, 'D') });

  // --- Attack / defence ---
  var g2 = teams.filter(function(t){ return t.gP >= 2; });
  var att = snMax(g2, function(t){ return t.GF / t.gP; });
  if(att) say(46, 'attack', { t: snB(att), gf: att.GF, p: att.gP, a: (att.GF / att.gP).toFixed(1) });
  var leak = snMax(g2, function(t){ return t.GA / t.gP; });
  if(leak && leak.GA / leak.gP >= 2) say(54, 'leak', { t: snB(leak), ga: leak.GA, p: leak.gP, a: (leak.GA / leak.gP).toFixed(1) });
  var g3 = teams.filter(function(t){ return t.gP >= 3; });
  var wall = snMax(g3, function(t){ return -t.GA / t.gP; });
  if(wall && wall !== leak && wall.GA / wall.gP <= 1.2) say(44, 'wall', { t: snB(wall), ga: wall.GA, p: wall.gP });
  var blank = snMax(teams, function(t){ return t.blank; });
  if(blank && blank.blank >= 2) say(42, 'blank', { t: snB(blank), k: blank.blank });
  var cs = snMax(teams, function(t){ return t.cs; });
  if(cs && cs.cs >= 2 && cs !== wall) say(34, 'cleanSheets', { t: snB(cs), k: cs.cs });
  var dk = snMax(teams, function(t){ return t.D; });
  if(dk && dk.D >= 3) say(36, 'drawKing', { t: snB(dk), k: dk.D });

  // --- Matches of the season ---
  var big = snMax(D.games, function(m){ return Math.abs(m.hg - m.ag) * 10 + m.hg + m.ag; });
  if(big && Math.abs(big.hg - big.ag) >= 3) say(40, 'bigWin', { h: snB(big._h), a: snB(big._a), sc: big.hg + '–' + big.ag, st: stTxt(big.stage) });
  var fest = snMax(D.games, function(m){ return m.hg + m.ag; });
  if(fest && fest !== big && fest.hg + fest.ag >= 6) say(38, 'fest', { h: snB(fest._h), a: snB(fest._a), sc: fest.hg + '–' + fest.ag });
  if(D.games.length >= 6){
    var avg = D.avgGoals, draws = D.games.filter(function(m){ return m.hg === m.ag; }).length / D.games.length;
    say(32, 'avgGoals', { g: D.G, m: D.games.length, a: avg.toFixed(2), c: snLine(avg >= 4 ? 'avgHi' : avg <= 2.2 ? 'avgLo' : 'avgMid', {}, rng) });
    if(draws >= 0.35) say(30, 'drawShare', { p: snPct(draws) });
  }
  if(D.games.length >= 8){
    var scs = {};
    D.games.forEach(function(m){ var k = Math.max(m.hg, m.ag) + '–' + Math.min(m.hg, m.ag); scs[k] = (scs[k] || 0) + 1; });
    var topSc = snMax(Object.keys(scs), function(k){ return scs[k]; });
    if(topSc && scs[topSc] >= 3) say(28, 'commonScore', { sc: topSc, k: scs[topSc] });
  }

  // --- Elo ---
  var eg = snMax(teams, function(t){ return t.eloD; }), el = snMax(teams, function(t){ return -t.eloD; });
  if(eg && eg.eloD >= 10) say(44, 'eloGain', { t: snB(eg), d: snSigned(eg.eloD) });
  if(el && el.eloD <= -10) say(46, 'eloDrop', { t: snB(el), d: Math.round(-el.eloD) });
  if(!D.dbl){
    var et = careerEloTable(cd, false)[0], ek = et ? byName[snLc(et.name)] : null;
    if(ek) say(46, 'eloKing', { t: snB(ek), e: Math.round(et.elo) });
    var lowE = byElo[byElo.length - 1];
    if(lowE && lowE.elo < ELO_BASE - 40 && cd.elo[lowE.ck] && cd.elo[lowE.ck].P >= 10) say(36, 'eloBelowBase', { t: snB(lowE), e: Math.round(lowE.elo) });
  }
  if(byElo.length >= 3 && byElo[0].elo - byElo[byElo.length - 1].elo >= 150)
    say(30, 'eloGapField', { a: snB(byElo[0]), b: snB(byElo[byElo.length - 1]), g: Math.round(byElo[0].elo - byElo[byElo.length - 1].elo) });

  // --- Previews of the next matches ---
  if(D.pending.length && !D.done){
    var rnd = D.pending.slice(0, Math.max(4, Math.floor(teams.length / 2)));
    var preds = rnd.map(function(m){ var x = snPredict(D, m); return { m: m, x: x, hh: D.dbl ? null : snH2H(cd, x.h.ck, x.a.ck) }; });
    var bigM = snMax(preds, function(p){ return p.x.h.elo + p.x.a.elo; });
    var oneSided = snMax(preds, function(p){ return p.x.pf; });
    var evenM = snMax(preds, function(p){ return -Math.abs(p.x.p.h - p.x.p.a); });
    var pick = function(p){ return p.m.ko ? crL(snB(p.x.fav) + ' đi tiếp (' + snPct(p.x.pf) + ')', snB(p.x.fav) + ' to go through (' + snPct(p.x.pf) + ')')
      : crL('dự đoán ' + p.x.sc, 'predicted ' + p.x.sc); };
    if(bigM){
      var hh = bigM.hh;
      say(74, 'bigMatch', { st: stTxt(bigM.m.stage), h: snB(bigM.x.h), a: snB(bigM.x.a), f: snB(bigM.x.fav), p: snPct(bigM.x.pf), pk: pick(bigM),
        hh: hh && hh.P ? crL(' Lịch sử đối đầu: ', ' Head-to-head: ') + hh.W + '-' + hh.D + '-' + hh.L + '.' : '' });
      if(hh && hh.P >= 3){
        var dog = bigM.x.dog, dogW = dog === bigM.x.h ? hh.W : hh.L, favW = dog === bigM.x.h ? hh.L : hh.W;
        if(dogW > favW) say(60, 'curse', { d: snB(dog), f: snB(bigM.x.fav), w: dogW, l: favW });
      }
    }
    if(oneSided && oneSided !== bigM && oneSided.x.pf >= 0.72)
      say(56, 'oneSided', { d: snB(oneSided.x.dog), f: snB(oneSided.x.fav), p: snPct(1 - oneSided.x.pf - oneSided.x.p.d) });
    if(evenM && evenM !== bigM && evenM !== oneSided && Math.abs(evenM.x.p.h - evenM.x.p.a) < 0.08)
      say(48, 'coinFlip', { h: snB(evenM.x.h), a: snB(evenM.x.a), pk: pick(evenM) });
    if(!D.dbl){
      var fresh = preds.filter(function(p){ return !p.hh.P; })[0];
      if(fresh) say(44, 'firstMeet', { h: snB(fresh.x.h), a: snB(fresh.x.a) });
      var cls = snMax(preds.filter(function(p){ return p !== bigM && p.hh.P >= 6; }), function(p){ return p.hh.P; });
      if(cls) say(52, 'classic', { h: snB(cls.x.h), a: snB(cls.x.a), n: cls.hh.P, w: cls.hh.W, d: cls.hh.D, l: cls.hh.L });
      var sk = snMax(preds, function(p){ return Math.max(snStreak(p.x.h, 'W'), snStreak(p.x.a, 'W')); });
      if(sk){
        var skT = snStreak(sk.x.h, 'W') >= snStreak(sk.x.a, 'W') ? sk.x.h : sk.x.a, skK = snStreak(skT, 'W');
        if(skK >= 3) say(54, 'streakLine', { t: snB(skT), k: skK, o: snB(skT === sk.x.h ? sk.x.a : sk.x.h) });
      }
      var rv = null;
      preds.forEach(function(p){
        if(rv) return;
        var hc = p.x.h.ck, ac = p.x.a.ck, last = null;
        cd.hist.forEach(function(m){ if(!m.ko && ((m.home === hc && m.away === ac) || (m.home === ac && m.away === hc))) last = m; });
        if(last && Math.abs(last.hg - last.ag) >= 2){
          var hLost = (last.home === hc) === (last.hg < last.ag);
          rv = { t: hLost ? p.x.h : p.x.a, o: hLost ? p.x.a : p.x.h, sc: Math.min(last.hg, last.ag) + '–' + Math.max(last.hg, last.ag) };
        }
      });
      if(rv) say(50, 'revengeChance', { t: snB(rv.t), o: snB(rv.o), sc: rv.sc });
    }
  }
  if(D.status === 'live'){
    var left = D.pending.length + D.extraRounds * Math.floor(teams.length / 2);
    if(left >= 2 && left <= 12) say(34, 'fRemaining', { k: left });
  }

  // --- Milestones ---
  if(!D.dbl){
    teams.forEach(function(t){
      var e = cd.elo[t.ck];
      if(!e) return;
      var nextM = Math.ceil((e.P + 1) / 50) * 50;
      if(nextM - e.P <= 2 && e.P >= 20) say(28, 'mileMatches', { t: snB(t), k: nextM - e.P, m: nextM });
      var nw = Math.ceil((e.W + 1) / 25) * 25;
      if(e.W >= 20 && nw - e.W <= 2) say(30, 'mileWins', { t: snB(t), k: nw - e.W, m: nw });
      var ng = Math.ceil((e.GF + 1) / 100) * 100;
      if(e.GF >= 50 && ng - e.GF <= 5) say(30, 'mileGoals', { t: snB(t), k: ng - e.GF, m: ng });
      if(t.P && Math.abs(e.elo - e.peak) < 0.5 && e.P >= 15) say(40, 'milePeak', { t: snB(t), e: Math.round(e.elo) });
    });
    var seen = {};
    cd.hist.forEach(function(m){
      if(m.sid === D.sid) return;
      [m.home, m.away].forEach(function(n){ (seen[n] || (seen[n] = {}))[m.sid] = 1; });
    });
    var nSeas = function(t){ return seen[t.ck] ? Object.keys(seen[t.ck]).length : 0; };
    var vt = snMax(teams, nSeas);
    if(vt && nSeas(vt) + 1 >= 6) say(30, 'mileSeasons', { t: snB(vt), k: nSeas(vt) + 1 });
  }

  // --- Career spotlight: a few random teams of the field, seen through their whole history ---
  if(!D.dbl){
    snShuffled(teams, rng).slice(0, 5).forEach(function(t){
      if(!cd.elo[t.ck]) return;
      snShuffled(snCareerOpts(cd, t.ck, snB(t), D.sid), rng).slice(0, 2).forEach(function(x){ say(x[0], x[1], x[2]); });
    });
  }

  // --- Rivalries inside the field ---
  if(!D.dbl && teams.length >= 3){
    var inF = {}, pairs = {};
    teams.forEach(function(t){ inF[t.ck] = t; });
    cd.hist.forEach(function(m){
      var a = inF[m.home], b = inF[m.away];
      if(!a || !b || a === b) return;
      var x = a.ck < b.ck ? a : b, y = x === a ? b : a, k = x.ck + '\u0000' + y.ck;
      var pr = pairs[k] || (pairs[k] = { a: x, b: y, P: 0, W: 0, D: 0, L: 0 });
      pr.P++; pr[x === a ? careerResult(m.hg, m.ag) : careerResult(m.ag, m.hg)]++;
    });
    var pl = Object.keys(pairs).map(function(k){ return pairs[k]; });
    var riv = snMax(pl.filter(function(p){ return p.P >= 6; }), function(p){ return p.P + rng() * 4; });
    if(riv) say(40, 'hRivalry', { a: snB(riv.a), b: snB(riv.b), n: riv.P, w: riv.W, d: riv.D, l: riv.L });
    var lop = snMax(pl.filter(function(p){ return p.P >= 4 && Math.abs(p.W - p.L) >= 4 && Math.min(p.W, p.L) * 3 <= Math.max(p.W, p.L); }),
      function(p){ return Math.abs(p.W - p.L) + rng(); });
    if(lop){
      var aw = lop.W >= lop.L;
      say(38, 'hLopsided', { a: snB(aw ? lop.a : lop.b), b: snB(aw ? lop.b : lop.a), w: Math.max(lop.W, lop.L), l: Math.min(lop.W, lop.L) });
    }
    var ev = snMax(pl.filter(function(p){ return p.P >= 6 && p.W === p.L && p !== riv; }), function(p){ return p.P; });
    if(ev) say(34, 'hEven', { a: snB(ev.a), b: snB(ev.b), n: ev.P });
  }

  // --- Sidelines ---
  if(rng() < 0.5) say(14, 'clubMatches', { k: cd.hist.length + (cd.dbl || []).length });
  else {
    var cg = 0;
    cd.hist.concat(cd.dbl || []).forEach(function(m){ if(!m.est) cg += m.hg + m.ag; });
    say(14, 'clubGoals', { k: cg });
  }
  if(!D.dbl && D.sid){
    var avgs = careerSeasonIds(state).filter(function(id){ var s = state.seasons[id]; return s && !crIsDoubles(s) && (s.teams || []).length >= 3; })
      .map(function(id){
        var ns = state.seasons[id].teams.map(careerName).filter(function(x){ return x && !/^bye$/i.test(x); }), sum = 0;
        ns.forEach(function(x){ var e = cd.elo[careerResolveName(cd, x)]; sum += e ? e.elo : ELO_BASE; });
        return { id: id, v: ns.length ? sum / ns.length : 0 };
      }).sort(function(a, b){ return b.v - a.v; });
    var me = avgs.filter(function(x){ return x.id === D.sid; })[0], mr = avgs.indexOf(me) + 1;
    if(me && avgs.length >= 3 && (mr <= 2 || mr === avgs.length)) say(26, 'fieldAvg', { e: Math.round(me.v), r: mr, n: avgs.length });
  }

  // --- Rumours & quotes ---
  if(teams.length){
    var victims = teams.filter(function(t){ return t.L > t.W; });
    say(18 + rng() * 30, 'rumor', { t: snB(pickR(victims.length ? victims : teams)) });
    if(D.status !== 'idle'){
      var qL = D.podium.gold || (D.kind === 'table' && D.table.length ? D.table[0].t : odds && odds.title.length ? odds.title[0].t : byElo[0]);
      say(20 + rng() * 26, 'qLeader', { t: snB(qL) });
      var qs = snMax(victims, function(t){ return t.L - t.W; });
      if(qs && qs !== qL) say(20 + rng() * 26, 'qStruggler', { t: snB(qs) });
    }
  }
  say(10 + rng() * 20, 'qTeo', {});

  // --- Gossip & office life (features/news-gossip.js): random topics, each about a different player ---
  if(typeof SN_GOSSIP !== 'undefined' && teams.length){
    var gLeft = all ? 10 : 5, gUsed = {};
    var gFit = function(who, t){
      if(who === 'win') return t.P ? t.W >= t.L : eloRank[t.idx] <= Math.ceil(teams.length / 2);
      if(who === 'lose') return t.P ? t.L > t.W : eloRank[t.idx] > Math.floor(teams.length / 2);
      return true;
    };
    snShuffled(SN_GOSSIP, rng).forEach(function(g){
      if(gLeft <= 0 || !SN_BANK[g.id]) return;
      var pool = teams.filter(function(t){ return !gUsed[t.idx] && gFit(g.who, t); });
      if(!pool.length) return;
      var gt = pickR(pool), others = teams.filter(function(t){ return t !== gt; });
      gUsed[gt.idx] = 1; gLeft--;
      say(16 + rng() * 34, g.id, { t: snB(gt), o: others.length ? snB(pickR(others)) : null });
    });
  }

  items.sort(function(a, b){ return b.pri - a.pri; });
  items = items.filter(function(it){ return it.html; });
  // One story per group: the strongest item of a group hides the others.
  var gSeen = {};
  items = items.filter(function(it){
    var gs = it.grp || [];
    if(gs.some(function(g){ return gSeen[g]; })) return false;
    gs.forEach(function(g){ gSeen[g] = 1; });
    return true;
  });
  SN_TMAP = null;
  if(all) return items;
  // Pick a varied front page.
  var outList = [], per = {};
  items.forEach(function(it){
    var lim = SN_TAG_LIMIT[it.tag] || 2;
    if(outList.length >= SN_MAX_ITEMS || (per[it.tag] || 0) >= lim) return;
    per[it.tag] = (per[it.tag] || 0) + 1;
    outList.push(it);
  });
  return outList;
}

// Every headline of a season for Teo Robot (default: the newest rated season).
function snHeadlines(s){
  if(typeof careerData !== 'function' || !state || !state.seasons) return [];
  if(!s || CAREER_SKIP_MODES[s.mode] || !careerSeasonIdOf(s)){
    var ids = careerSeasonIds(state);
    s = ids.length ? state.seasons[ids[ids.length - 1]] : null;
  }
  if(!s) return [];
  var rng = snRng(Math.floor(Math.random() * 4294967296)), D = snData(s);
  return snNews(D, snOdds(D, rng), rng, true).map(function(n){ return { tag: n.tag, label: SN_TAGS[n.tag] || '', html: n.html }; });
}

// Career spotlight sentences of player ck (n = bold name): [pri, id, vars] options.
// sid: season whose trophies do not count as "last season" (the running one), or null.
function snCareerOpts(cd, ck, n, sid){
  var tc = teamCareer(cd, ck), opts = [];
  if(!tc.list.length) return opts;
  var stTxt = function(x){ return '<span class="no-i18n">' + snE(x) + '</span>'; };
  var P = tc.list.length, Wn = tc.list.filter(function(x){ return x.r === 'W'; }).length;
  var real = tc.list.filter(function(x){ return !x.m.est && !x.m.ko; }), GA = real.reduce(function(a, x){ return a + x.ga; }, 0);
  var mc = medalCount(tc.trophies);
  var o = function(pri, id, v){ v.n = n; opts.push([pri, id, v]); };
  var nem = tc.opponents.filter(function(x){ return x.L >= 3 && x.L > x.W; }).sort(function(a, b){ return b.L - a.L; })[0];
  if(nem) o(44, 'pNemesis', { x: snB(nem.name), xl: nem.L, xw: nem.W });
  var nb = tc.opponents.filter(function(x){ return x.P >= 3 && !x.W; }).sort(function(a, b){ return b.P - a.P; })[0];
  if(nb) o(42, 'pNeverBeat', { x: snB(nb.name), xp: nb.P });
  var vic = tc.opponents.filter(function(x){ return x.W >= 4 && x.W >= 3 * x.L; }).sort(function(a, b){ return b.W - a.W; })[0];
  if(vic) o(36, 'pVictim', { x: snB(vic.name), k: vic.W });
  var wl = tc.worstLoss, bw = tc.biggestWin;
  if(wl && wl.ga - wl.gf >= 3) o(36, 'pWorstLoss', { x: snB(wl.opp), sc: wl.gf + '–' + wl.ga, s: stTxt(wl.m.season), st: stTxt(wl.m.stage) });
  if(bw && bw.gf - bw.ga >= 3) o(32, 'pBestWin', { x: snB(bw.opp), sc: bw.gf + '–' + bw.ga, s: stTxt(bw.m.season) });
  if(tc.elo && tc.elo.peak - tc.elo.elo >= 60) o(40, 'pPeakDrop', { k: Math.round(tc.elo.peak - tc.elo.elo), pk: Math.round(tc.elo.peak) });
  if(P >= 15 && Wn / P < 0.35) o(40, 'pLowWin', { k: Math.round(Wn * 100 / P) });
  else if(P >= 15 && Wn / P >= 0.6) o(36, 'pWinRateHigh', { k: Math.round(Wn * 100 / P) });
  if(real.length >= 20 && GA / real.length >= 2.5) o(38, 'pLeaky', { k: (GA / real.length).toFixed(1) });
  if(tc.ko.P >= 4 && tc.ko.W / tc.ko.P < 0.4) o(40, 'pKoChoke', { k: tc.ko.W + '/' + tc.ko.P });
  else if(tc.ko.P >= 4 && tc.ko.W / tc.ko.P >= 0.65) o(34, 'pKoKing', { k: tc.ko.W + '/' + tc.ko.P });
  if(P >= 20 && !mc.gold) o(38, 'pNoGold', { k: P });
  else if(mc.gold + mc.silver + mc.bronze >= 3) o(34, 'pCabinet', { g: mc.gold, s: mc.silver, b: mc.bronze });
  if(tc.rank === 1) o(46, 'pThrone', {});
  if(tc.streaks.best.win >= 6) o(28, 'pBestStreak', { k: tc.streaks.best.win });
  if(P >= 150) o(26, 'pVeteran', { k: P });
  else if(P < 12) o(26, 'pRookie', { k: P });
  var prevT = tc.trophies.filter(function(x){ return x.sid !== sid; }), lastT = prevT[prevT.length - 1];
  if(lastT) o(32, 'pLastSeason', { s: stTxt(lastT.season), pl: (lastT.medal ? CR_MEDAL_ICON[lastT.medal] + ' ' : '') + snE(lastT.place) });
  return opts;
}

// ---------------- Head-to-head PesNews ----------------
// PesNews takes on one pair of players (H2H tab, Teo Robot): their record, the Elo forecast, the last
// meeting and a few career / gossip lines of each side. Same sentence bank as the newspaper.
function snH2HNews(cd, a, b, rng){
  a = careerResolveName(cd, a); b = careerResolveName(cd, b);
  var items = [];
  SN_TMAP = {};
  var A = snB(a), B = snB(b), stTxt = function(x){ return '<span class="no-i18n">' + snE(x) + '</span>'; };
  var fmtH = function(x, k){ return k === 'n' ? snB(x) : stTxt(x); };
  // gk: per-player group key, so the same kind of story may be told once for each side.
  function say(pri, id, v, gk, tag){
    if(!SN_BANK[id]) return;
    var keys = [SN_SUBJ[id], 'n', 't', 'h', 'a', 'd', 'f'], who = null, vv = {};
    for(var i = 0; i < keys.length && !who; i++) if(keys[i] && typeof v[keys[i]] === 'string' && SN_TMAP[v[keys[i]]]) who = SN_TMAP[v[keys[i]]].name;
    var pc = who ? snPlayerCtx(cd, careerResolveName(cd, who), fmtH) : null;
    if(pc) Object.keys(pc).forEach(function(k){ vv[k] = pc[k]; });
    Object.keys(v).forEach(function(k){ vv[k] = v[k]; });
    items.push({ pri: pri + rng() * 14, tag: tag || SN_BANK[id].tag, grp: [snGroupOf(id) + (gk ? '|' + gk : '')], html: snLine(id, vv, rng) });
  }
  var ta = teamCareer(cd, a), tb = teamCareer(cd, b);
  var list = ta.list.filter(function(x){ return x.opp === b; }), P = list.length, W = 0, D = 0, L = 0;
  list.forEach(function(x){ if(x.r === 'W') W++; else if(x.r === 'D') D++; else L++; });
  var ea = cd.elo[a], eb = cd.elo[b], p = ea && eb ? snProbs(ea.elo, eb.elo, false) : null;

  // --- Record ---
  if(!P) say(95, 'firstMeet', { h: A, a: B });
  if(P >= 2) say(80, 'hRivalry', { a: A, b: B, n: P, w: W, d: D, l: L });
  if(P >= 5) say(80, 'classic', { h: A, a: B, n: P, w: W, d: D, l: L });
  if(P >= 4 && W === L) say(88, 'hEven', { a: A, b: B, n: P });
  var aDom = W >= L, dw = Math.max(W, L), dl = Math.min(W, L), Dom = aDom ? A : B, Sub = aDom ? B : A;
  if(P >= 3 && dw - dl >= 2 && dl * 2 <= dw){
    say(84, 'hLopsided', { a: Dom, b: Sub, w: dw, l: dl });
    say(84, 'pNemesis', { n: Sub, x: Dom, xl: dw, xw: dl });
    if(dw >= 3) say(82, 'pVictim', { n: Dom, x: Sub, k: dw });
    if(!dl) say(90, 'pNeverBeat', { n: Sub, x: Dom, xp: P });
  }

  // --- Elo forecast ---
  if(p){
    var favA = p.h >= p.a, F = favA ? A : B, Dg = favA ? B : A;
    if(Math.abs(p.h - p.a) < 0.08) say(76, 'coinFlip', { h: A, a: B, pk: crL('cửa thắng ' + snPct(p.h) + ' – ' + snPct(p.a), 'win chances ' + snPct(p.h) + ' – ' + snPct(p.a)) });
    else if(Math.max(p.h, p.a) >= 0.6) say(74, 'oneSided', { d: Dg, f: F, p: snPct(Math.min(p.h, p.a)) });
    var dogW = favA ? L : W, favW = favA ? W : L;
    if(P >= 3 && dogW > favW) say(86, 'curse', { d: Dg, f: F, w: dogW, l: favW });
  }

  // --- Last meeting ---
  var last = list[P - 1];
  if(last){
    var cm = careerCommentary(cd, last.i), m = last.m;
    if(cm) items.push({ pri: 78 + rng() * 10, tag: 'result',
      grp: (cm.ids || []).filter(function(id){ return ['r_convincing', 'r_narrow', 'r_decider'].indexOf(id) === -1; }).map(snGroupOf),
      html: crL('Lần gặp gần nhất: ', 'Latest meeting: ') + '<span class="sn-score no-i18n">' + snE(m.home + ' ' + m.hg + ' – ' + m.ag + ' ' + m.away) + '</span> <small class="muted no-i18n">' +
        snE(m.season + ' · ' + m.stage) + '</small><br>' + snE(cm.lines.join(' ')) });
    if(Math.abs(last.gf - last.ga) >= 2){
      var aLost = last.r === 'L';
      say(72, 'revengeChance', { t: aLost ? A : B, o: aLost ? B : A, sc: Math.min(last.gf, last.ga) + '–' + Math.max(last.gf, last.ga) });
    }
  }

  // --- Current form ---
  [[ta, A, B], [tb, B, A]].forEach(function(x){
    var k = x[0].streaks.cur.win;
    if(k >= 3) say(66, 'streakLine', { t: x[1], k: k, o: x[2] });
  });

  // --- Career spotlight of each side (stories about this pair are already told above) ---
  [[a, A, B], [b, B, A]].forEach(function(x){
    snShuffled(snCareerOpts(cd, x[0], x[1], null).filter(function(o){ return o[2].x !== x[2] || ['pNemesis', 'pNeverBeat', 'pVictim'].indexOf(o[1]) === -1; }), rng).slice(0, 3)
      .forEach(function(o){ say(o[0], o[1], o[2], x[0]); });
  });

  // --- Gossip, rumours & quotes ---
  if(typeof SN_GOSSIP !== 'undefined'){
    var gs = snShuffled(SN_GOSSIP.filter(function(g){ return SN_BANK[g.id] && g.who === 'any'; }), rng);
    if(gs[0]) say(16 + rng() * 30, gs[0].id, { t: A, o: B });
    if(gs[1]) say(16 + rng() * 30, gs[1].id, { t: B, o: A });
  }
  say(14 + rng() * 30, 'rumor', { t: rng() < 0.5 ? A : B });
  say(8 + rng() * 20, 'qTeo', {});

  items.sort(function(x, y){ return y.pri - x.pri; });
  var gSeen = {};
  items = items.filter(function(it){
    if(!it.html) return false;
    var g = it.grp || [];
    if(g.some(function(k){ return gSeen[k]; })) return false;
    g.forEach(function(k){ gSeen[k] = 1; });
    return true;
  });
  SN_TMAP = null;
  return { items: items.slice(0, 14), a: a, b: b, P: P, W: W, D: D, L: L, p: p };
}

function snH2HPaperHtml(a, b, rng){
  var cd = careerData(state), r = snH2HNews(cd, a, b, rng), E = snE;
  var date = new Date().toLocaleDateString(CR_EN ? 'en-GB' : 'vi-VN');
  var html = '<section class="sn-paper h2hn-paper"><div class="sn-paper-head"><span class="sn-mast">📰 PesNews</span>' +
    '<span class="sn-ed muted"><span class="no-i18n">' + E(r.a) + '</span> vs <span class="no-i18n">' + E(r.b) + '</span> · ' + date + '</span>' +
    '<button type="button" class="ghost sn-refresh" data-h2hn-refresh title="' + E(crL('Tin khác', 'More news')) + '">🔄</button></div>';
  var fx = '<div class="sn-fx-teams"><span class="no-i18n">' + E(r.a) + '</span><b class="sn-fx-sc" title="' + E(crL('Thắng – Hòa – Thua', 'Won – Drawn – Lost')) + '">' +
    r.W + ' – ' + r.D + ' – ' + r.L + '</b><span class="no-i18n">' + E(r.b) + '</span></div>';
  if(r.p) fx += '<div class="sn-fx-bar"><i class="h" style="width:' + (r.p.h * 100).toFixed(1) + '%"></i><i class="d" style="width:' + (r.p.d * 100).toFixed(1) + '%"></i>' +
    '<i class="a" style="width:' + (r.p.a * 100).toFixed(1) + '%"></i></div><div class="sn-fx-cap muted">🔮 ' + crL('Trận tới (theo Elo): ', 'Next match (Elo): ') +
    '<span class="no-i18n">' + E(r.a) + '</span> ' + snPct(r.p.h) + ' · ' + crL('Hòa ', 'Draw ') + snPct(r.p.d) + ' · <span class="no-i18n">' + E(r.b) + '</span> ' + snPct(r.p.a) + '</div>';
  html += '<div class="h2hn-fx">' + fx + '</div>';
  if(r.items.length){
    var top = r.items[0];
    html += '<article class="sn-top"><span class="sn-tag t-' + top.tag + '">' + SN_TAGS[top.tag] + '</span><div class="sn-top-text">' + top.html + '</div></article>' +
      '<div class="sn-list">' + r.items.slice(1).map(function(n){
        return '<article class="sn-item"><span class="sn-tag t-' + n.tag + '">' + SN_TAGS[n.tag] + '</span><div class="sn-text">' + n.html + '</div></article>';
      }).join('') + '</div>';
  } else html += '<div class="muted">' + crL('PesNews chưa có gì để viết về cặp đấu này.', 'PesNews has nothing to write about this pair yet.') + '</div>';
  return html + '<div class="sn-foot muted">' + crL('PesNews viết tự động từ lịch sử đối đầu, Elo và sự nghiệp của hai bên — bấm 🔄 để đọc nhận định khác.',
    'PesNews is written automatically from the head-to-head record, Elo and both careers — press 🔄 for another take.') + '</div></section>';
}

// Popup with PesNews' take on a pair of players.
function openH2HNews(a, b){
  if(!a || !b || typeof careerData !== 'function' || typeof smDialog !== 'function') return;
  var seed = function(){ return snRng(Math.floor(Math.random() * 4294967296)); };
  var dlg = smDialog('<div class="no-i18n"><div class="h2hn-body">' + snH2HPaperHtml(a, b, seed()) + '</div>' +
    '<div class="lg-dialog-foot"><button type="button" data-close>' + snE(crL('Đóng', 'Close')) + '</button></div></div>', function(e, d){
      if(!e.target.closest('[data-h2hn-refresh]')) return;
      d.querySelector('.h2hn-body').innerHTML = snH2HPaperHtml(a, b, seed());
    });
  dlg.classList.add('h2hn-dialog');
}

// "📰 PesNews" button of a head-to-head view.
function snH2HNewsBtn(a, b, cls){
  return '<button type="button" class="' + (cls || 'ghost') + '" data-h2h-news data-h2h-a="' + snE(a) + '" data-h2h-b="' + snE(b) + '" title="' +
    snE(crL('Nhận định của PesNews về cặp đấu', 'PesNews take on this pair')) + '">📰 PesNews</button>';
}

// ---------------- Rendering ----------------
function snStat(label, value, cls, sub){
  return '<div class="ov-stat' + (cls ? ' ' + cls : '') + '"><div class="ov-label">' + label + '</div><div class="ov-value">' + value + '</div>' +
    (sub ? '<div class="ov-sub">' + sub + '</div>' : '') + '</div>';
}

function snStatsGrid(D){
  var h = [], M = crL(' trận', ' matches');
  h.push(snStat(crL('Số đội', 'Teams'), D.teams.length + (D.dbl ? ' <small class="muted">· ' + crL('đá đôi', 'doubles') + '</small>' : '')));
  var pl = D.played.length, tot = Math.max(D.total, pl), pct = tot ? Math.round(pl * 100 / tot) : 0;
  h.push(snStat(crL('Tiến độ', 'Progress'), pl + ' / ' + tot + ' <small class="muted">(' + pct + '%)</small><div class="ov-bar"><i style="width:' + pct + '%"></i></div>',
    '', D.kind === 'ko' && !D.done ? crL('trận đã xếp lịch', 'scheduled matches') : ''));
  if(D.games.length) h.push(snStat(crL('Bàn thắng', 'Goals'), D.G + ' <small class="muted">· ' + D.avgGoals.toFixed(2) + crL('/trận', '/match') + '</small>'));
  if(D.podium.gold) h.push(snStat(crL('Vô địch', 'Champion'), '🏆 ' + snB(D.podium.gold), 'ov-champ', D.podium.silver ? '🥈 ' + snB(D.podium.silver) : ''));
  else if(D.kind === 'table' && D.played.length && D.table.length){
    var L = D.table[0], S = D.table[1];
    h.push(snStat(crL('Dẫn đầu', 'Leader'), snB(L.t), '', L.Pts + crL(' điểm', ' pts') + (S ? ' · ' + crL('hơn ', '+') + (L.Pts - S.Pts) + crL(' điểm', '') : '')));
  } else if(D.kind === 'ko' && D.alive && D.played.length) h.push(snStat(crL('Còn lại', 'Still alive'), D.alive.length + crL(' đội', ' teams'), '',
    D.alive.slice().sort(function(a, b){ return b.elo - a.elo; }).slice(0, 3).map(snB).join(', ') + (D.alive.length > 3 ? '…' : '')));
  var act = D.teams.filter(function(t){ return t.P >= 2; });
  var hot = snMax(act, function(t){ return snFormPts(t, 5) * 10 + snStreak(t, 'W'); });
  if(hot) h.push(snStat(crL('Phong độ cao nhất', 'Best form'), snB(hot), '', '<span class="sn-form">' + hot.form.slice(-5).map(function(r){ return '<i class="' + r + '">' + r + '</i>'; }).join('') + '</span>'));
  var g = D.teams.filter(function(t){ return t.gP >= 1; });
  var att = snMax(g, function(t){ return t.GF / t.gP + t.GF / 1000; });
  if(att && att.GF) h.push(snStat(crL('Hàng công tốt nhất', 'Best attack'), snB(att), '', att.GF + crL(' bàn · ', ' goals · ') + (att.GF / att.gP).toFixed(2) + crL('/trận', '/match')));
  var def = snMax(D.teams.filter(function(t){ return t.gP >= 2; }), function(t){ return -t.GA / t.gP + t.gP / 1000; });
  if(def) h.push(snStat(crL('Hàng thủ tốt nhất', 'Best defence'), snB(def), '', def.GA + crL(' bàn thua · ', ' conceded · ') + (def.GA / def.gP).toFixed(2) + crL('/trận', '/match')));
  var big = snMax(D.games, function(m){ return Math.abs(m.hg - m.ag) * 10 + m.hg + m.ag; });
  if(big && big.hg !== big.ag) h.push(snStat(crL('Thắng đậm nhất', 'Biggest win'), '<span class="no-i18n">' + snE(big.home + ' ' + big.hg + '–' + big.ag + ' ' + big.away) + '</span>', 'ov-wide', '<span class="no-i18n">' + snE(big.stage) + '</span>'));
  var eg = snMax(D.teams, function(t){ return t.eloD; });
  if(eg && eg.eloD >= 1) h.push(snStat(crL('Tăng Elo nhiều nhất', 'Top Elo gain'), snB(eg), '', '<span class="cr-up">' + snSigned(eg.eloD) + '</span> Elo'));
  var top = D.teams.slice().sort(function(a, b){ return b.elo - a.elo; })[0];
  if(top) h.push(snStat(crL('Elo cao nhất giải', 'Highest Elo'), snB(top), '', Math.round(top.elo) + ' Elo'));
  if(D.games.length >= 4){
    var dr = D.games.filter(function(m){ return m.hg === m.ag; }).length;
    h.push(snStat(crL('Tỉ lệ hòa', 'Draw rate'), snPct(dr / D.games.length), '', dr + '/' + D.games.length + M));
  }
  return '<div class="ov-grid">' + h.join('') + '</div>';
}

function snOddsBox(D, odds){
  if(D.done && D.podium.gold){
    var pod = [['gold', '🥇'], ['silver', '🥈'], ['bronze', '🥉']].filter(function(x){ return D.podium[x[0]]; });
    return '<div class="sn-box"><div class="sn-box-title">🏅 ' + crL('Bảng vàng', 'Podium') + '</div>' +
      pod.map(function(x){ return '<div class="sn-pod">' + x[1] + ' ' + snB(D.podium[x[0]]) + '</div>'; }).join('') + '</div>';
  }
  if(!odds || !odds.title.length) return '';
  var rows = odds.title.slice(0, 6).map(function(x){
    return '<div class="sn-odds-row"><span class="sn-odds-name no-i18n">' + snE(x.t.name) + '</span><span class="sn-odds-bar"><i style="width:' + Math.max(2, x.p * 100).toFixed(1) + '%"></i></span><b>' + snPct(x.p) + '</b></div>';
  }).join('');
  var note = odds.method === 'sim' ? crL('Mô phỏng ' + odds.sims + ' lần phần còn lại của mùa theo Elo.', odds.sims + ' Elo-based simulations of the rest of the season.')
    : crL('Ước tính theo Elo của các đội còn cơ hội.', 'Estimated from the Elo of the teams still in contention.');
  return '<div class="sn-box"><div class="sn-box-title">🔮 ' + crL('Dự đoán vô địch', 'Title odds') + '</div>' + rows + '<div class="sn-note muted">' + note + '</div></div>';
}

function snRelBox(odds){
  if(!odds || !odds.rel || !odds.rel.length) return '';
  var rows = odds.rel.filter(function(x){ return x.rel >= 0.01; }).slice(0, 5).map(function(x){
    return '<div class="sn-odds-row rel"><span class="sn-odds-name no-i18n">' + snE(x.t.name) + '</span><span class="sn-odds-bar"><i style="width:' + Math.max(2, x.rel * 100).toFixed(1) + '%"></i></span><b>' + snPct(x.rel) + '</b></div>';
  }).join('');
  return rows ? '<div class="sn-box"><div class="sn-box-title">⚠️ ' + crL('Nguy cơ rớt hạng', 'Relegation risk') + ' <small class="muted">(' + odds.relN + crL(' suất', ' spots') + ')</small></div>' + rows + '</div>' : '';
}

function snFixturesBox(D){
  if(D.done || !D.pending.length) return '';
  var rows = D.pending.slice(0, 4).map(function(m){
    var x = snPredict(D, m), p = x.p;
    var mid = x.sc ? x.sc : 'vs';
    var cap = m.ko ? snE(m.stage) + ' · ' + Math.round(p.h * 100) + '% – ' + Math.round(p.a * 100) + '%'
      : snE(m.stage) + ' · ' + crL('T ', 'H ') + Math.round(p.h * 100) + '% · ' + crL('H ', 'D ') + Math.round(p.d * 100) + '% · ' + crL('B ', 'A ') + Math.round(p.a * 100) + '%';
    return '<div class="sn-fx"><div class="sn-fx-teams"><span class="no-i18n">' + snE(x.h.name) + '</span><b class="sn-fx-sc">' + mid + '</b><span class="no-i18n">' + snE(x.a.name) + '</span></div>' +
      '<div class="sn-fx-bar"><i class="h" style="width:' + (p.h * 100).toFixed(1) + '%"></i><i class="d" style="width:' + (p.d * 100).toFixed(1) + '%"></i><i class="a" style="width:' + (p.a * 100).toFixed(1) + '%"></i></div>' +
      '<div class="sn-fx-cap muted no-i18n">' + cap + '</div></div>';
  }).join('');
  return '<div class="sn-box"><div class="sn-box-title">📅 ' + crL('Trận sắp tới & dự đoán', 'Next matches & predictions') + '</div>' + rows + '</div>';
}

function snEloBox(D){
  var ts = D.teams.filter(function(t){ return t.P && Math.round(t.eloD); }).sort(function(a, b){ return b.eloD - a.eloD; });
  if(ts.length < 2) return '';
  var up = ts.slice(0, 3).filter(function(t){ return t.eloD > 0; }), dn = ts.slice(-3).reverse().filter(function(t){ return t.eloD < 0; });
  var row = function(t){ return '<div class="sn-elo-row"><span class="no-i18n">' + snE(t.name) + '</span><b class="' + (t.eloD > 0 ? 'cr-up' : 'cr-down') + '">' + snSigned(t.eloD) + '</b></div>'; };
  return '<div class="sn-box"><div class="sn-box-title">📈 ' + crL('Elo mùa này', 'Elo this season') + '</div>' + up.map(row).join('') +
    (up.length && dn.length ? '<div class="sn-sep"></div>' : '') + dn.map(row).join('') + '</div>';
}

function snBuildHtml(s, rng, key){
  var D = snData(s), def = getModeDef(s), odds = snOdds(D, rng), news = snNews(D, odds, rng);
  var st = D.status === 'done' ? crL('Đã kết thúc', 'Finished') : D.status === 'live' ? crL('Đang diễn ra', 'In progress') : crL('Chưa bắt đầu', 'Not started');
  var html = '<div class="ov-head"><span class="ov-mode">' + snE(def.label) + '</span><span class="ov-title no-i18n">' + snE(s.name || '') + '</span>' +
    '<span class="ov-status ' + D.status + '">' + st + '</span></div>';
  html += snStatsGrid(D);
  var ed = (snHash(key) % 900) + 100, date = new Date().toLocaleDateString(CR_EN ? 'en-GB' : 'vi-VN');
  var paper = '<section class="sn-paper"><div class="sn-paper-head"><span class="sn-mast">📰 ' + 'PesNews' + '</span>' +
    '<span class="sn-ed muted">' + crL('Số ', 'No. ') + ed + ' · ' + date + '</span>' +
    '<button type="button" class="ghost sn-refresh" data-sn-refresh title="' + snE(crL('Tin khác', 'More news')) + '">🔄</button></div>';
  if(news.length){
    var top = news[0];
    paper += '<article class="sn-top"><span class="sn-tag t-' + top.tag + '">' + SN_TAGS[top.tag] + '</span><div class="sn-top-text">' + top.html + '</div></article>' +
      '<div class="sn-list">' + news.slice(1).map(function(n){
        return '<article class="sn-item"><span class="sn-tag t-' + n.tag + '">' + SN_TAGS[n.tag] + '</span><div class="sn-text">' + n.html + '</div></article>';
      }).join('') + '</div>';
  } else paper += '<div class="muted">' + crL('Chưa có tin gì để đưa. Đá vài trận đi rồi PesNews viết báo!', 'No news yet. Play a few matches and PesNews will start writing!') + '</div>';
  paper += '<div class="sn-foot muted">' + crL('PesNews được viết tự động từ kết quả và Elo — tin thay đổi khi có kết quả mới, khi tải lại trang hoặc bấm 🔄.', 'PesNews is written automatically from results and Elo — changes with new results, page reloads or 🔄.') + '</div></section>';
  var boxes = [snOddsBox(D, odds), snRelBox(odds), snFixturesBox(D), snEloBox(D)].filter(Boolean);
  // Many boxes (live leagues) make a tall side column next to a short paper -> lay them out in a row below.
  html += '<div class="sn-main no-i18n' + (boxes.length >= 3 ? ' wide' : '') + '">' + paper +
    (boxes.length ? '<aside class="sn-side">' + boxes.join('') + '</aside>' : '') + '</div>';
  return html;
}

function snRenderOverview(s){
  var sid = careerSeasonIdOf(s) || s.name || '';
  var sig = [sid, s.mode, (s.teams || []).join('|'), JSON.stringify(s.results || {}), collectSeasonMatches(s).length,
    s.locked ? 1 : 0, s.forceEnded ? 1 : 0, CR_EN ? 'en' : 'vi'].join('#');
  var key = String(snHash(sig)) + ':' + SN_NONCE + ':' + snShuffle;
  if(snMemo.key === key) return snMemo.html;
  var html = snBuildHtml(s, snRng(snHash(key)), key);
  snMemo = { key: key, html: html };
  return html;
}

document.addEventListener('click', function(e){
  var hn = e.target && e.target.closest ? e.target.closest('[data-h2h-news]') : null;
  if(hn){ openH2HNews(hn.getAttribute('data-h2h-a'), hn.getAttribute('data-h2h-b')); return; }
  if(!e.target || !e.target.closest || !e.target.closest('[data-sn-refresh]')) return;
  snShuffle++;
  if(typeof renderSeasonOverview === 'function') renderSeasonOverview(activeSeason());
});
