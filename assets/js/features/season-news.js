// Marvell PES Club - features/season-news.js
// Season info card (#seasonOverview) for every format: key numbers, upcoming matches with Elo
// predictions, title / relegation odds and the "PES newspaper" corner — generated headlines
// (analysis, predictions, banter) that change with new results, page reloads or the 🔄 button.
// Rendered by renderSeasonOverview() (overview.js). Uses career.js data (Elo, history, commentary).

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
function snB(t){ return '<b class="no-i18n">' + snE(t && t.name != null ? t.name : t) + '</b>'; }
function snSigned(v){ v = Math.round(v); return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v); }

// ---------------- Season data ----------------
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
    var fx = D.pending.map(function(m){ return { h: m.home, a: m.away, p: snProbs(T[m.home].elo, T[m.away].elo, false) }; });
    var N = (!fx.length && !D.extraRounds) ? 1 : SN_SIMS, W3 = D.W3, cnt = {};
    D.table.forEach(function(b){ cnt[b.t.idx] = { c: 0, top: 0, rel: 0 }; });
    var play = function(H, A, p){
      var x = rng(), g = 1 + (rng() < 0.35 ? 1 : 0) + (rng() < 0.1 ? 1 : 0);
      if(x < p.h){ H.Pts += W3; H.GD += g; A.GD -= g; H.GF += g; }
      else if(x < p.h + p.d){ H.Pts++; A.Pts++; H.GF++; A.GF++; }
      else { A.Pts += W3; A.GD += g; H.GD -= g; A.GF += g; }
    };
    for(var k = 0; k < N; k++){
      var cur = {}, arr = D.table.map(function(b){ return (cur[b.t.idx] = { i: b.t.idx, elo: b.t.elo, Pts: b.Pts, GD: b.GD, GF: b.GF, r: rng() }); });
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
      var v = Math.pow(10, t.elo / 400) * (D.mode === 'double-elimination' && t.koL ? 0.55 : 1);
      sum += v;
      return { t: t, v: v };
    });
    out.title = w.map(function(x){ return { t: x.t, p: x.v / sum }; }).sort(function(a, b){ return b.p - a.p; });
  }
  return out;
}

// Predicted result of an unplayed match.
function snPredict(D, m){
  var h = D.T[m.home], a = D.T[m.away], p = snProbs(h.elo, a.elo, m.ko);
  if(m.ko) return { p: p, sc: null, h: h, a: a, fav: p.h >= p.a ? h : a, dog: p.h >= p.a ? a : h, pf: Math.max(p.h, p.a) };
  var base = D.avgGoals != null && D.games.length >= 3 ? D.avgGoals / 2 : 1.4;
  var gh = Math.round(base * Math.pow(10, (h.elo - a.elo) / 800)), ga = Math.round(base * Math.pow(10, (a.elo - h.elo) / 800));
  if(p.h - p.a > 0.12 && gh <= ga) gh = ga + 1;
  else if(p.a - p.h > 0.12 && ga <= gh) ga = gh + 1;
  else if(Math.abs(p.h - p.a) <= 0.12) gh = ga = Math.min(gh, ga);
  return { p: p, sc: gh + ' – ' + ga, h: h, a: a, fav: p.h >= p.a ? h : a, dog: p.h >= p.a ? a : h, pf: Math.max(p.h, p.a) };
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
    if(kind === 'W' ? r === 'W' : kind === 'L' ? r === 'L' : kind === 'U' ? r !== 'L' : r !== 'W') k++; else break;
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
var SN_TAGS = {
  hot: crL('Tiêu điểm', 'Headline'), race: crL('Cuộc đua', 'Title race'), pred: crL('Dự đoán', 'Prediction'),
  preview: crL('Soi kèo', 'Preview'), result: crL('Kết quả', 'Result'), shock: crL('Sốc', 'Shock'),
  troll: crL('Cà khịa', 'Banter'), stats: crL('Thống kê', 'Stats'), rumor: crL('Tin đồn', 'Rumour'),
  mile: crL('Cột mốc', 'Milestone'), form: crL('Phong độ', 'Form'), rel: crL('Rớt hạng', 'Relegation')
};

function snNews(D, odds, rng){
  var cd = D.cd, items = [], teams = D.teams, nPlayed = D.played.length;
  function say(pri, tag, vi, en, v){
    var arr = CR_EN ? en : vi;
    items.push({ pri: pri + rng() * 14, tag: tag, html: careerFill(arr[Math.floor(rng() * arr.length)], v || {}) });
  }
  var byElo = teams.slice().sort(function(a, b){ return b.elo - a.elo; });
  var eloRank = {};
  byElo.forEach(function(t, i){ eloRank[t.idx] = i + 1; });
  var season = '<span class="no-i18n">' + snE(D.s.name || '') + '</span>';

  // --- Finished season ---
  if(D.done && D.podium.gold){
    var c = D.podium.gold, r2 = D.podium.silver;
    say(100, 'hot', ['🏆 {c} chính thức lên ngôi vô địch {s}! Tèo xin cúi đầu bái phục.', '👑 Ngai vàng {s} đã có chủ: {c}. Các đội còn lại hẹn mùa sau nhé!',
      '🏆 {c} vô địch {s}! Champagne đâu, mở ra cho Tèo một chai.'],
      ['🏆 {c} are officially the {s} champions! Teo takes a bow.', '👑 The {s} throne has an owner: {c}. Everyone else, see you next season!',
      '🏆 {c} win {s}! Pop the champagne — and save a glass for Teo.'], { c: snB(c), s: season });
    if(r2) say(70, 'troll', ['🥈 {r} về nhì. Huy chương bạc cũng đẹp mà... đúng không? 🥲', '🥈 {r} á quân — gần lắm rồi mà vẫn xa. Tèo hiểu cảm giác đó.',
      '🥈 {r} dừng bước ở vị trí thứ 2. Lịch sử thường chỉ nhớ người thắng, nhưng Tèo vẫn nhớ {r}.'],
      ['🥈 {r} finish second. Silver is pretty too... right? 🥲', '🥈 Runners-up {r} — so close, yet so far. Teo knows the feeling.',
      '🥈 {r} stop at number 2. History remembers winners, but Teo remembers {r}.'], { r: snB(r2) });
    say(58, 'stats', ['📋 Thành tích của nhà vô địch {c}: {w} thắng – {d} hòa – {l} thua, Elo {e} sau mùa giải.'],
      ['📋 Champions {c} record: {w} wins – {d} draws – {l} losses, {e} Elo over the season.'],
      { c: snB(c), w: c.W, d: c.D, l: c.L, e: snSigned(c.eloD) });
    if(D.mode === 'league' && D.table.length){
      var relN = Math.max(0, +((D.s.settings || {}).rel) || 0);
      D.table.slice(D.table.length - relN).forEach(function(x){
        say(62, 'rel', ['⬇️ {t} chính thức xuống hạng. Hẹn gặp lại... hoặc không.', '⬇️ {t} rớt hạng. Mùa sau nhớ mang theo bản đồ đường về.'],
          ['⬇️ {t} are relegated. See you again... maybe.', '⬇️ {t} go down. Remember the way back next season.'], { t: snB(x.t) });
      });
    }
    var fav = byElo[0];
    if(fav && fav !== c) say(52, 'troll', ['🎭 {f} có Elo cao nhất giải nhưng chiếc cúp lại về tay {c}. Elo chỉ là con số!'],
      ['🎭 {f} had the highest Elo in the field, but the trophy went to {c}. Elo is just a number!'], { f: snB(fav), c: snB(c) });
  }

  // --- Not started ---
  if(D.status === 'idle' && byElo.length){
    var f0 = byElo[0], lo = byElo[byElo.length - 1];
    say(95, 'hot', ['📣 {s} sắp khởi tranh với {n} đội. Ứng viên số 1 trên giấy tờ: {f} (Elo {e}).', '📣 Tiếng còi khai cuộc {s} sắp vang lên! {n} đội, 1 chiếc cúp, và {f} là cái tên được đánh giá cao nhất.'],
      ['📣 {s} is about to kick off with {n} teams. Favourite on paper: {f} (Elo {e}).', '📣 {s} is about to start! {n} teams, 1 trophy, and {f} are the name to beat.'],
      { s: season, n: teams.length, f: snB(f0), e: Math.round(f0.elo) });
    if(lo && lo !== f0) say(50, 'troll', ['🐣 {t} vào giải với Elo thấp nhất ({e}). Mục tiêu: không thua quá đậm?', '🐣 {t} là "tân binh" yếu nhất trên giấy tờ. Nhưng giấy thì... dễ rách lắm.'],
      ['🐣 {t} enter with the lowest Elo ({e}). Target: avoid a thrashing?', '🐣 {t} are the weakest on paper. But paper tears easily.'], { t: snB(lo), e: Math.round(lo.elo) });
  }

  // --- Title race (table formats) ---
  if(D.kind === 'table' && D.status === 'live' && D.table.length >= 2){
    var L = D.table[0], S = D.table[1], gap = L.Pts - S.Pts;
    if(gap >= 6) say(86, 'race', ['🚀 {l} bỏ xa {s2} tới {g} điểm. Cuộc đua vô địch sắp thành cuộc dạo chơi?', '🏃 {l} đang chạy một mình: hơn đội nhì {s2} {g} điểm. Ai đó gọi họ quay lại đi!'],
      ['🚀 {l} are {g} points clear of {s2}. Is the title race turning into a stroll?', '🏃 {l} are running alone: {g} points ahead of {s2}. Someone call them back!'], { l: snB(L.t), s2: snB(S.t), g: gap });
    else if(gap === 0) say(86, 'race', ['🔥 {l} và {s2} đang bằng điểm nhau ({p} điểm). Ngôi đầu chỉ còn tính bằng hiệu số!', '⚔️ Hai con hổ chung một núi: {l} và {s2} cùng có {p} điểm.'],
      ['🔥 {l} and {s2} are level on {p} points. The top spot comes down to goal difference!', '⚔️ Two tigers, one mountain: {l} and {s2} both have {p} points.'], { l: snB(L.t), s2: snB(S.t), p: L.Pts });
    else if(gap <= 1) say(86, 'race', ['🔥 Cuộc đua nghẹt thở: {l} và {s2} chỉ cách nhau {g} điểm!', '⚔️ Ngôi đầu đang bị đe dọa: {s2} bám sát {l} chỉ {g} điểm.'],
      ['🔥 Breathless race: {l} and {s2} are separated by {g} point(s)!', '⚔️ The top spot is under threat: {s2} sit just {g} point(s) behind {l}.'], { l: snB(L.t), s2: snB(S.t), g: gap });
    else say(80, 'race', ['📊 {l} tạm dẫn đầu với {p} điểm, hơn {s2} {g} điểm.', '📊 {l} đang ngồi trên đỉnh ({p} điểm). {s2} đứng thứ 2, kém {g} điểm.'],
      ['📊 {l} lead with {p} points, {g} ahead of {s2}.', '📊 {l} sit on top ({p} pts). {s2} are second, {g} behind.'], { l: snB(L.t), s2: snB(S.t), g: gap, p: L.Pts });
    // Table position vs Elo expectation
    if(nPlayed >= teams.length){
      var diffs = D.table.map(function(x, i){ return { t: x.t, pos: i + 1, er: eloRank[x.t.idx], d: (i + 1) - eloRank[x.t.idx] }; });
      var under = snMax(diffs, function(x){ return x.d; }), over = snMax(diffs, function(x){ return -x.d; });
      if(under && under.d >= 3) say(60, 'troll', ['🎭 {t} có Elo cao thứ {e} giải nhưng đang đứng thứ {p}. Hữu danh vô thực?', '🫠 {t}: Elo xếp thứ {e}, bảng xếp hạng thứ {p}. Có ai thấy phong độ của {t} đâu không?'],
        ['🎭 {t} have the #{e} Elo but sit #{p}. All name, no game?', '🫠 {t}: #{e} by Elo, #{p} in the table. Has anyone seen their form?'], { t: snB(under.t), e: under.er, p: under.pos });
      if(over && over.d <= -3) say(52, 'form', ['🌟 {t} đứng thứ {p} dù Elo chỉ xếp thứ {e}. Vượt xa kỳ vọng!', '🌟 Hiện tượng của mùa: {t} (Elo thứ {e}) đang chễm chệ vị trí thứ {p}.'],
        ['🌟 {t} are #{p} despite being #{e} by Elo. Way above expectations!', '🌟 Surprise package: {t} (#{e} by Elo) are sitting #{p}.'], { t: snB(over.t), e: over.er, p: over.pos });
    }
  }

  // --- Predictions ---
  if(odds && odds.title.length){
    var top = odds.title[0], sec = odds.title[1];
    var how = odds.method === 'sim' ? crL('sau ' + odds.sims + ' kịch bản mô phỏng', 'over ' + odds.sims + ' simulations') : crL('theo Elo', 'by Elo');
    say(78, 'pred', ['🔮 Máy tính của Tèo ({h}): {t} vô địch với xác suất {p}.', '🔮 Tèo đặt cửa {t} lên ngôi ({p}, {h}). Ai không đồng ý thì ra sân chứng minh!',
      '🔮 Nếu phải đặt cược, Tèo chọn {t}: {p} cơ hội vô địch ({h}).'],
      ['🔮 Teo\'s computer ({h}): {t} win the title with {p} probability.', '🔮 Teo backs {t} to lift the trophy ({p}, {h}). Disagree? Prove it on the pitch!',
      '🔮 If Teo had to bet, it would be on {t}: {p} title chance ({h}).'], { t: snB(top.t), p: snPct(top.p), h: how });
    if(sec && top.p < 0.45) say(66, 'pred', ['🎲 Chưa ai chắc suất: {t} ({p}) và {t2} ({p2}) đang chia nhau cơ hội vô địch.'],
      ['🎲 Nothing is settled: {t} ({p}) and {t2} ({p2}) share the title chances.'], { t: snB(top.t), p: snPct(top.p), t2: snB(sec.t), p2: snPct(sec.p) });
    var median = byElo[Math.floor(byElo.length / 2)];
    var horse = odds.title.slice(1, 6).filter(function(x){ return x.p >= 0.04 && x.p <= 0.35 && median && x.t.elo <= median.elo; })[0];
    if(horse) say(56, 'pred', ['🐴 Ngựa ô: {t} có {p} cơ hội vô địch dù Elo chỉ {e}.', '🐴 Đừng ngạc nhiên nếu {t} gây sốc — Tèo cho họ {p} cơ hội.'],
      ['🐴 Dark horse: {t} have a {p} title chance despite an Elo of just {e}.', '🐴 Don\'t be shocked if {t} cause an upset — Teo gives them {p}.'], { t: snB(horse.t), p: snPct(horse.p), e: Math.round(horse.t.elo) });
    if(D.kind === 'table' && D.table.length && D.table[0].t !== top.t && D.status === 'live')
      say(64, 'pred', ['🤔 {l} đang đứng đầu nhưng Tèo vẫn tin {t} hơn ({p} vs {p2}). Lịch đấu còn dài!'],
        ['🤔 {l} lead the table, but Teo still trusts {t} more ({p} vs {p2}). Plenty of games left!'],
        { l: snB(D.table[0].t), t: snB(top.t), p: snPct(top.p), p2: snPct((odds.all || []).filter(function(x){ return x.t === D.table[0].t; }).map(function(x){ return x.p; })[0] || 0) });
    if(odds.rel && odds.rel.length && D.status === 'live'){
      var rr = odds.rel[0];
      if(rr.rel >= 0.99) say(72, 'rel', ['⚰️ {t} gần như chắc chắn xuống hạng ({p}). Đặt vé tàu chưa?', '⚰️ Phép màu cũng khó cứu {t}: {p} khả năng rớt hạng.'],
        ['⚰️ {t} are all but relegated ({p}). Train tickets booked yet?', '⚰️ Only a miracle saves {t}: {p} relegation chance.'], { t: snB(rr.t), p: snPct(rr.rel) });
      else if(rr.rel >= 0.3) say(70, 'rel', ['⚠️ {t} đang đứng trước nguy cơ rớt hạng: {p}.', '🚨 Báo động đỏ cho {t}: {p} khả năng phải xuống chơi giải dưới.'],
        ['⚠️ {t} are in relegation danger: {p}.', '🚨 Red alert for {t}: {p} chance of going down.'], { t: snB(rr.t), p: snPct(rr.rel) });
      var r2b = odds.rel.filter(function(x){ return x !== rr && x.rel >= 0.15 && x.rel <= 0.7; })[0];
      if(r2b) say(46, 'rel', ['😰 {t} vẫn chưa an toàn ({p} nguy cơ rớt hạng). Đừng vội ăn mừng!'],
        ['😰 {t} are not safe yet ({p} relegation risk). No celebrating yet!'], { t: snB(r2b.t), p: snPct(r2b.rel) });
    }
  }

  // --- Knock-out: who is still alive ---
  if(D.kind === 'ko' && D.alive && !D.done && nPlayed){
    var out = teams.filter(function(t){ return D.alive.indexOf(t) === -1; });
    if(D.alive.length && D.alive.length <= 8 && out.length) say(76, 'race', ['🎯 Còn {n} đội trên đường đua: {list}.', '🎯 Cuộc chơi thu hẹp lại còn {n} đội: {list}. Ai sẽ là người cuối cùng?'],
      ['🎯 {n} teams left standing: {list}.', '🎯 Down to {n}: {list}. Who will be the last one standing?'],
      { n: D.alive.length, list: D.alive.map(snB).join(', ') });
    var fallen = out.filter(function(t){ return eloRank[t.idx] <= 3; }).sort(function(a, b){ return eloRank[a.idx] - eloRank[b.idx]; })[0];
    if(fallen) say(74, 'shock', ['💔 Cú sốc: {t} — Elo cao thứ {k} giải — đã bị loại{by}!', '😵 Ứng viên {t} (Elo thứ {k}) đã phải dừng bước{by}. Ai đoán được chứ?'],
      ['💔 Shock: {t} — #{k} by Elo — are out{by}!', '😵 Contenders {t} (#{k} by Elo) have been knocked out{by}. Who saw that coming?'],
      { t: snB(fallen), k: eloRank[fallen.idx], by: fallen.koBy ? crL(' dưới tay ', ' by ') + snB(fallen.koBy.t) : '' });
    if(D.mode === 'swiss' && D.s.swiss && !(D.s.swiss.playoffQualifiers || []).length){
      var ql = (D.s.swiss.qualified || []).map(function(i){ return D.T[i]; }).filter(Boolean);
      if(ql.length) say(58, 'race', ['🎟️ {n} đội đã có vé playoff: {list}.'], ['🎟️ {n} teams have booked a playoff ticket: {list}.'], { n: ql.length, list: ql.map(snB).join(', ') });
    }
  }

  // --- Latest results ---
  if(!D.dbl){
    var idxs = [];
    cd.hist.forEach(function(m, i){ if(m.sid === D.sid) idxs.push(i); });
    idxs.slice(-2).reverse().forEach(function(i, k){
      var c = careerCommentary(cd, i), m = cd.hist[i];
      if(!c) return;
      items.push({ pri: (k ? 58 : 73) + rng() * 10, tag: 'result',
        html: '<span class="sn-score no-i18n">' + snE(m.home + ' ' + m.hg + ' – ' + m.ag + ' ' + m.away) + '</span> <small class="muted no-i18n">' + snE(m.stage) + '</small><br>' + snE(c.lines.join(' ')) });
    });
  }

  // --- Upset of the season ---
  var ups = D.ent.filter(function(m){ return m.hg !== m.ag && isFinite(m.eloH) && isFinite(m.eloA); })
    .map(function(m){ var hw = m.hg > m.ag; return { m: m, d: hw ? m.eloA - m.eloH : m.eloH - m.eloA, w: hw ? m._h : m._a, l: hw ? m._a : m._h, ew: hw ? m.eloH : m.eloA, el: hw ? m.eloA : m.eloH }; });
  var up = snMax(ups, function(x){ return x.d; });
  if(up && up.d >= 60) say(62, 'shock', ['😱 Địa chấn của mùa: {w} (Elo {ew}) hạ {l} (Elo {el}) {sc} ở {st}.', '🤯 Không ai tin nổi: {w} kém {d} Elo vẫn quật ngã {l} {sc} ({st}).'],
    ['😱 Upset of the season: {w} (Elo {ew}) beat {l} (Elo {el}) {sc} in {st}.', '🤯 Nobody believed it: {w}, {d} Elo behind, toppled {l} {sc} ({st}).'],
    { w: snB(up.w), l: snB(up.l), ew: Math.round(up.ew), el: Math.round(up.el), d: Math.round(up.d), sc: up.m.hg + '–' + up.m.ag, st: '<span class="no-i18n">' + snE(up.m.stage) + '</span>' });

  // --- Form ---
  var active = teams.filter(function(t){ return t.P >= 3; });
  var hot = snMax(active, function(t){ return snStreak(t, 'W') * 10 + snFormPts(t, 5); });
  if(hot && snStreak(hot, 'W') >= 3) say(66, 'form', ['🔥 {t} đã thắng {k} trận liên tiếp. Ai sẽ là người chặn đứng?', '🚀 {t} đang bay cao với {k} chiến thắng liền mạch.', '🔥 {k} trận thắng liền cho {t}. Nóng như chảo dầu!'],
    ['🔥 {t} have won {k} in a row. Who will stop them?', '🚀 {t} are flying with {k} straight wins.', '🔥 {k} wins on the bounce for {t}. Red hot!'], { t: snB(hot), k: snStreak(hot, 'W') });
  else if(hot && snFormPts(hot, 5) >= 10) say(50, 'form', ['📈 {t} có phong độ tốt nhất giải: {p}/15 điểm trong 5 trận gần nhất.'],
    ['📈 {t} are in the best form: {p}/15 points from their last 5.'], { t: snB(hot), p: snFormPts(hot, 5) });
  var cold = snMax(active, function(t){ return snStreak(t, 'L') * 10 + snStreak(t, 'N'); });
  if(cold && cold !== hot){
    if(snStreak(cold, 'L') >= 3) say(64, 'troll', ['🚑 {t} thua {k} trận liền. Tèo đề nghị kiểm tra lại tay cầm.', '📉 {t} đã thua {k} trận liên tiếp. Có cần gọi bác sĩ tâm lý không?', '🧯 {t} thua {k} trận liền — cháy nhà rồi, ai dập lửa đây?'],
      ['🚑 {t} have lost {k} in a row. Teo suggests checking the controller.', '📉 {k} straight defeats for {t}. Time to call a sports psychologist?', '🧯 {t} have lost {k} straight — the house is on fire!'], { t: snB(cold), k: snStreak(cold, 'L') });
    else if(snStreak(cold, 'N') >= 4) say(58, 'troll', ['🥶 {t} đã {k} trận không biết thắng. Có ai mang bùa may mắn cho họ không?', '🍋 {k} trận chưa biết mùi chiến thắng — {t} chua như chanh.'],
      ['🥶 {t} are {k} games without a win. Someone bring them a lucky charm?', '🍋 {k} games without a win — sour times for {t}.'], { t: snB(cold), k: snStreak(cold, 'N') });
  }
  var unb = snMax(active, function(t){ return snStreak(t, 'U'); });
  if(unb && unb !== hot && snStreak(unb, 'U') >= 5) say(48, 'form', ['🛡️ {t} bất bại {k} trận liên tiếp. Muốn hạ họ phải có kế hoạch đặc biệt.'],
    ['🛡️ {t} are unbeaten in {k}. Beating them takes a special plan.'], { t: snB(unb), k: snStreak(unb, 'U') });

  // --- Attack / defence ---
  var g2 = teams.filter(function(t){ return t.gP >= 2; });
  var att = snMax(g2, function(t){ return t.GF / t.gP; });
  if(att) say(46, 'stats', ['⚽ Hàng công {t} đã nổ {gf} bàn sau {p} trận ({a}/trận). Thủ môn các đội khác hãy cẩn thận!', '⚽ {t} là cỗ máy ghi bàn của mùa: {a} bàn mỗi trận.'],
    ['⚽ {t} have scored {gf} in {p} games ({a}/match). Goalkeepers, beware!', '⚽ {t} are the goal machine of the season: {a} per match.'], { t: snB(att), gf: att.GF, p: att.gP, a: (att.GF / att.gP).toFixed(1) });
  var leak = snMax(g2, function(t){ return t.GA / t.gP; });
  if(leak && leak.GA / leak.gP >= 2) say(54, 'troll', ['🥅 {t} thủng lưới {ga} bàn sau {p} trận. Lưới hay là lưới đánh cá?', '🧀 Hàng thủ {t} như miếng phô mai Thụy Sĩ: {a} bàn thua mỗi trận.', '🚪 Cửa nhà {t} mở toang: {a} bàn thua/trận. Ai đó lắp giùm cái khóa!'],
    ['🥅 {t} have conceded {ga} in {p} games. Goal net or fishing net?', '🧀 The {t} defence is Swiss cheese: {a} conceded per match.', '🚪 The {t} door is wide open: {a} conceded per match. Someone fit a lock!'], { t: snB(leak), ga: leak.GA, p: leak.gP, a: (leak.GA / leak.gP).toFixed(1) });
  var g3 = teams.filter(function(t){ return t.gP >= 3; });
  var wall = snMax(g3, function(t){ return -t.GA / t.gP; });
  if(wall && wall !== leak && wall.GA / wall.gP <= 1.2) say(44, 'stats', ['🧱 {t} mới để thủng lưới {ga} bàn sau {p} trận — bức tường thực sự.'],
    ['🧱 {t} have let in only {ga} in {p} games — a real wall.'], { t: snB(wall), ga: wall.GA, p: wall.gP });
  var blank = snMax(teams, function(t){ return t.blank; });
  if(blank && blank.blank >= 2) say(42, 'troll', ['🔇 {t} đã {k} trận tịt ngòi. Tiền đạo đi nghỉ mát rồi à?', '🔇 {k} trận không ghi nổi bàn nào — {t} cần gấp một tiền đạo.'],
    ['🔇 {t} have drawn a blank {k} times. Are the strikers on holiday?', '🔇 {k} games without a goal — {t} urgently need a striker.'], { t: snB(blank), k: blank.blank });
  var cs = snMax(teams, function(t){ return t.cs; });
  if(cs && cs.cs >= 2 && cs !== wall) say(34, 'stats', ['🧤 {t} giữ sạch lưới {k} trận — thủ môn xứng đáng được tăng lương.'],
    ['🧤 {t} have kept {k} clean sheets — give the keeper a raise.'], { t: snB(cs), k: cs.cs });
  var dk = snMax(teams, function(t){ return t.D; });
  if(dk && dk.D >= 3) say(36, 'troll', ['🤝 {t} là "vua hòa" với {k} trận hòa. Chia điểm là đam mê.', '🤝 {k} trận hòa — {t} đúng là sứ giả hòa bình của giải.'],
    ['🤝 {t} are the draw kings with {k} draws. Sharing is caring.', '🤝 {k} draws — {t} are the league\'s peace ambassadors.'], { t: snB(dk), k: dk.D });

  // --- Matches of the season ---
  var big = snMax(D.games, function(m){ return Math.abs(m.hg - m.ag) * 10 + m.hg + m.ag; });
  if(big && Math.abs(big.hg - big.ag) >= 3) say(40, 'stats', ['💥 Trận thắng đậm nhất mùa: {h} {sc} {a} ({st}).'],
    ['💥 Biggest win of the season: {h} {sc} {a} ({st}).'], { h: snB(big._h), a: snB(big._a), sc: big.hg + '–' + big.ag, st: '<span class="no-i18n">' + snE(big.stage) + '</span>' });
  var fest = snMax(D.games, function(m){ return m.hg + m.ag; });
  if(fest && fest !== big && fest.hg + fest.ag >= 6) say(38, 'stats', ['🎆 Mưa bàn thắng: {h} {sc} {a} là trận nhiều bàn nhất mùa.'],
    ['🎆 Goal fest: {h} {sc} {a} is the highest-scoring match of the season.'], { h: snB(fest._h), a: snB(fest._a), sc: fest.hg + '–' + fest.ag });
  if(D.games.length >= 6){
    var avg = D.avgGoals, draws = D.games.filter(function(m){ return m.hg === m.ag; }).length / D.games.length;
    say(32, 'stats', ['📊 Mùa này: {g} bàn sau {m} trận, trung bình {a} bàn/trận. {c}'], ['📊 This season: {g} goals in {m} games, {a} per match. {c}'],
      { g: D.G, m: D.games.length, a: avg.toFixed(2), c: avg >= 4 ? crL('Hàng thủ các đội đi đâu hết rồi?', 'Where did all the defenders go?') : avg <= 2.2 ? crL('Hơi buồn ngủ một chút...', 'A bit sleepy...') : crL('Vừa đủ để khán giả không ngủ gật.', 'Just enough to keep the crowd awake.') });
    if(draws >= 0.35) say(30, 'troll', ['😴 {p} số trận kết thúc hòa — giải đấu của những người yêu hòa bình.'], ['😴 {p} of matches ended level — a tournament for peace lovers.'], { p: snPct(draws) });
  }

  // --- Elo winners / losers ---
  var eg = snMax(teams, function(t){ return t.eloD; }), el = snMax(teams, function(t){ return -t.eloD; });
  if(eg && eg.eloD >= 10) say(44, 'stats', ['📈 {t} là đội hưởng lợi nhiều nhất mùa này: {d} Elo.', '💰 Cổ phiếu {t} đang tăng trần: {d} Elo chỉ trong mùa này.'],
    ['📈 {t} are the biggest winners this season: {d} Elo.', '💰 {t} stock is soaring: {d} Elo this season alone.'], { t: snB(eg), d: snSigned(eg.eloD) });
  if(el && el.eloD <= -10) say(46, 'troll', ['📉 {t} đã rơi {d} Elo mùa này. Chứng khoán còn đỡ hơn.', '📉 {t} mất {d} Elo — Tèo đề nghị bán gấp trước khi quá muộn.'],
    ['📉 {t} have shed {d} Elo this season. Even the stock market is kinder.', '📉 {t} are down {d} Elo — Teo says sell before it is too late.'], { t: snB(el), d: Math.round(-el.eloD) });

  // --- Previews of the next matches ---
  if(D.pending.length && !D.done){
    var rnd = D.pending.slice(0, Math.max(4, Math.floor(teams.length / 2)));
    var preds = rnd.map(function(m){ return { m: m, x: snPredict(D, m) }; });
    var bigM = snMax(preds, function(p){ return p.x.h.elo + p.x.a.elo; });
    var oneSided = snMax(preds, function(p){ return p.x.pf; });
    var evenM = snMax(preds, function(p){ return -Math.abs(p.x.p.h - p.x.p.a); });
    var stTxt = function(m){ return '<span class="no-i18n">' + snE(m.stage) + '</span>'; };
    var pick = function(p){ return p.m.ko ? crL(snB(p.x.fav) + ' đi tiếp (' + snPct(p.x.pf) + ')', snB(p.x.fav) + ' to go through (' + snPct(p.x.pf) + ')')
      : crL('dự đoán ' + p.x.sc, 'predicted ' + p.x.sc); };
    if(bigM){
      var hh = D.dbl ? null : snH2H(cd, bigM.x.h.ck, bigM.x.a.ck);
      say(74, 'preview', ['⚔️ Đại chiến {st}: {h} vs {a}. Tèo nghiêng về {f} ({p}), {pk}.{hh}', '🍿 Tâm điểm {st}: {h} đụng độ {a}. {f} được đánh giá cao hơn ({p}), {pk}.{hh}'],
        ['⚔️ Big match, {st}: {h} vs {a}. Teo leans towards {f} ({p}), {pk}.{hh}', '🍿 Spotlight on {st}: {h} take on {a}. {f} are favourites ({p}), {pk}.{hh}'],
        { st: stTxt(bigM.m), h: snB(bigM.x.h), a: snB(bigM.x.a), f: snB(bigM.x.fav), p: snPct(bigM.x.pf), pk: pick(bigM),
          hh: hh && hh.P ? crL(' Lịch sử đối đầu: ', ' Head-to-head: ') + hh.W + '-' + hh.D + '-' + hh.L + '.' : '' });
      if(hh && hh.P >= 3){
        var dog = bigM.x.dog, favT = bigM.x.fav, dogW = dog === bigM.x.h ? hh.W : hh.L, favW = dog === bigM.x.h ? hh.L : hh.W;
        if(dogW > favW) say(60, 'preview', ['🧿 {d} kém Elo nhưng lại đang thắng {f} {w}-{l} trong đối đầu. Lời nguyền có tiếp diễn?'],
          ['🧿 {d} trail on Elo but lead {f} {w}-{l} head-to-head. Will the curse continue?'], { d: snB(dog), f: snB(favT), w: dogW, l: favW });
      }
    }
    if(oneSided && oneSided !== bigM && oneSided.x.pf >= 0.72) say(56, 'troll', ['🐟 {d} gặp {f}: Tèo cho {d} {p} cơ hội. Mang theo áo mưa nhé!', '🙏 {d} chạm trán {f}. Tèo chỉ biết chúc {d} may mắn ({p}).'],
      ['🐟 {d} face {f}: Teo gives {d} a {p} chance. Bring a raincoat!', '🙏 {d} meet {f}. All Teo can say is good luck, {d} ({p}).'],
      { d: snB(oneSided.x.dog), f: snB(oneSided.x.fav), p: snPct(1 - oneSided.x.pf - oneSided.x.p.d) });
    if(evenM && evenM !== bigM && evenM !== oneSided && Math.abs(evenM.x.p.h - evenM.x.p.a) < 0.08) say(48, 'preview', ['🎲 {h} vs {a} là kèo 50-50 đúng nghĩa. Tèo... xin phép không đoán!', '⚖️ {h} – {a}: hai bên ngang tài ngang sức, {pk}.'],
      ['🎲 {h} vs {a} is a true coin flip. Teo... would rather not guess!', '⚖️ {h} – {a}: evenly matched, {pk}.'], { h: snB(evenM.x.h), a: snB(evenM.x.a), pk: pick(evenM) });
  }

  // --- Milestones ---
  if(!D.dbl) teams.forEach(function(t){
    var e = cd.elo[t.ck];
    if(!e) return;
    var nextM = Math.ceil((e.P + 1) / 50) * 50, k = nextM - e.P;
    if(k <= 2 && e.P >= 20) say(28, 'mile', ['🎖️ {t} chỉ còn {k} trận nữa là cán mốc {m} trận sự nghiệp.'], ['🎖️ {t} are {k} match(es) away from {m} career games.'], { t: snB(t), k: k, m: nextM });
    if(t.P && Math.abs(e.elo - e.peak) < 0.5 && e.P >= 15) say(40, 'mile', ['🏔️ {t} đang ở đỉnh cao Elo sự nghiệp ({e}). Đừng nhìn xuống!'], ['🏔️ {t} are at their career-high Elo ({e}). Don\'t look down!'], { t: snB(t), e: Math.round(e.elo) });
  });

  // --- Rumours ---
  if(teams.length){
    var victims = teams.filter(function(t){ return t.L > t.W; });
    var who = (victims.length ? victims : teams)[Math.floor(rng() * (victims.length || teams.length))];
    say(18 + rng() * 30, 'rumor', [
      '🕵️ Tin đồn: {t} đang bí mật luyện tập lúc 2h sáng để chuẩn bị cho trận tới.',
      '📱 Nguồn tin thân cận: {t} đã đổi hình nền điện thoại thành bảng xếp hạng để tự tạo động lực.',
      '🧂 Tin đồn chưa kiểm chứng: {t} đổ lỗi phong độ cho... tay cầm bị lag.',
      '☕ Theo Tèo được biết, {t} uống 3 ly cà phê trước mỗi trận. Hiệu quả? Chưa rõ.',
      '🎤 {t} tuyên bố: "Mùa này không vô địch thì mùa sau". Tèo đã ghi âm lại làm bằng chứng.',
      '📺 Có người thấy {t} xem lại highlight trận thua tới 10 lần. Đau nhưng phải học.',
      '🧘 {t} được cho là đang tập thiền để giữ bình tĩnh khi bị dẫn bàn.'],
      ['🕵️ Rumour: {t} are secretly training at 2 a.m. for the next match.',
      '📱 Sources close to {t} say the table is now their phone wallpaper — for motivation.',
      '🧂 Unconfirmed: {t} blame their form on... a laggy controller.',
      '☕ Teo hears {t} drink 3 coffees before every match. Effective? Unclear.',
      '🎤 {t} declare: "If not this season, then next season". Teo has it on tape.',
      '📺 {t} were spotted rewatching their last defeat 10 times. Painful but educational.',
      '🧘 {t} are reportedly taking up meditation to stay calm when going behind.'], { t: snB(who) });
  }

  // Pick a varied front page.
  items.sort(function(a, b){ return b.pri - a.pri; });
  var outList = [], per = {}, LIM = { rumor: 1, result: 2, troll: 3 };
  items.forEach(function(it){
    var lim = LIM[it.tag] || 2;
    if(outList.length >= 9 || (per[it.tag] || 0) >= lim) return;
    per[it.tag] = (per[it.tag] || 0) + 1;
    outList.push(it);
  });
  return outList;
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
  var paper = '<section class="sn-paper"><div class="sn-paper-head"><span class="sn-mast">📰 ' + crL('Góc báo PES', 'The PES Gazette') + '</span>' +
    '<span class="sn-ed muted">' + crL('Số ', 'No. ') + ed + ' · ' + date + '</span>' +
    '<button type="button" class="ghost sn-refresh" data-sn-refresh title="' + snE(crL('Tin khác', 'More news')) + '">🔄</button></div>';
  if(news.length){
    var top = news[0];
    paper += '<article class="sn-top"><span class="sn-tag t-' + top.tag + '">' + SN_TAGS[top.tag] + '</span><div class="sn-top-text">' + top.html + '</div></article>' +
      '<div class="sn-list">' + news.slice(1).map(function(n){
        return '<article class="sn-item"><span class="sn-tag t-' + n.tag + '">' + SN_TAGS[n.tag] + '</span><div class="sn-text">' + n.html + '</div></article>';
      }).join('') + '</div>';
  } else paper += '<div class="muted">' + crL('Chưa có tin gì để đưa. Đá vài trận đi rồi Tèo viết báo!', 'No news yet. Play a few matches and Teo will start writing!') + '</div>';
  paper += '<div class="sn-foot muted">' + crL('Tèo Robot viết tự động từ kết quả và Elo — tin thay đổi khi có kết quả mới, khi tải lại trang hoặc bấm 🔄.', 'Written automatically by Teo Robot from results and Elo — changes with new results, page reloads or 🔄.') + '</div></section>';
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
  if(!e.target || !e.target.closest || !e.target.closest('[data-sn-refresh]')) return;
  snShuffle++;
  if(typeof renderSeasonOverview === 'function') renderSeasonOverview(activeSeason());
});
