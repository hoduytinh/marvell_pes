// Marvell PES Club - features/team-matches.js
// Mode-agnostic list of a season's matches (resolved to season team indices),
// used by the team info dialog (form, last 10 results, H2H, home/away split).

// Resolve a single-elimination slot (team number or {fromRound, matchId, isLoser} ref).
function tmResolveSlot(rounds, keyFor, results, slot, mapIdx, ext, depth){
  if(typeof slot === 'number') return mapIdx ? mapIdx(slot) : slot;
  if(!slot || typeof slot !== 'object' || slot.fromRound == null || slot.matchId == null || depth > 12) return null;
  if(ext){ var e = ext(slot); if(e !== undefined) return e; }
  var pm = rounds[slot.fromRound] && rounds[slot.fromRound][slot.matchId];
  var res = results[keyFor(slot.fromRound, slot.matchId)];
  if(!pm || !res || res.hg == null || res.ag == null || +res.hg === +res.ag) return null;
  var h = tmResolveSlot(rounds, keyFor, results, pm.home, mapIdx, ext, depth + 1);
  var a = tmResolveSlot(rounds, keyFor, results, pm.away, mapIdx, ext, depth + 1);
  if(h == null || a == null) return null;
  var homeWon = +res.hg > +res.ag;
  return slot.isLoser ? (homeWon ? a : h) : (homeWon ? h : a);
}

// Returns [{stage, home, away, res|null}] in (approximate) play order.
// Only matches whose two teams are known are included.
function collectSeasonMatches(s){
  var out = [], results = s.results || {};
  function push(stage, h, a, key){
    if(typeof h !== 'number' || typeof a !== 'number' || h === a) return;
    var r = results[key];
    if(r && (r.bye || r.hg == null || r.ag == null || r.hg === '' || r.ag === '')) r = r.bye ? 'bye' : null;
    if(r === 'bye') return;
    out.push({ stage: stage, home: h, away: a, key: key, res: r ? { hg: +r.hg, ag: +r.ag } : null });
  }
  function knockout(br, prefix, label, mapIdx, ext){
    if(!br || !br.rounds) return;
    var keyFor = function(r, m){ return prefix + r + '-' + m; };
    br.rounds.forEach(function(round, r){
      (round || []).forEach(function(m, mi){
        if(!m) return;
        push(label(r), tmResolveSlot(br.rounds, keyFor, results, m.home, mapIdx, ext, 0),
          tmResolveSlot(br.rounds, keyFor, results, m.away, mapIdx, ext, 0), keyFor(r, mi));
      });
    });
  }
  // Teams of `teams` without a match in `ms` rest that round (odd team count).
  function rests(stage, teams, ms, mapIdx){
    var busy = {};
    (ms || []).forEach(function(m){ busy[mapIdx ? mapIdx(m.home) : m.home] = 1; busy[mapIdx ? mapIdx(m.away) : m.away] = 1; });
    teams.forEach(function(t){ if(!busy[t]) out.push({ stage: stage, rest: t }); });
  }
  function stageName(br, r, pre){ return (pre || '') + ((br.stageNames && br.stageNames[r]) || ('Vòng ' + (r + 1))); }
  var mode = s.mode || 'league';

  if(mode === 'league'){
    var allTeams = (s.teams || []).map(function(_, i){ return i; });
    (s.rounds || []).forEach(function(ms, r){
      ms.forEach(function(m, mi){ push('V' + (r + 1), m.home, m.away, r + '-' + mi); });
      rests('V' + (r + 1), allTeams, ms);
    });
  } else if(mode === 'tournament'){
    var groups = s.groups || {}, gNames = Object.keys(groups).sort();
    var maxR = 0;
    gNames.forEach(function(g){ maxR = Math.max(maxR, (groups[g].fixtures || []).length); });
    for(var r = 0; r < maxR; r++){
      gNames.forEach(function(g){
        var grp = groups[g], rd = (grp.fixtures || [])[r], ti = grp.teamIndices || [];
        if(!rd) return;
        rd.forEach(function(m, mi){
          push('Bảng ' + g + ' · L' + (r + 1), ti[m.home], ti[m.away], 'group-' + g + '-' + r + '-' + mi);
        });
        rests('Bảng ' + g + ' · L' + (r + 1), ti, rd, function(i){ return ti[i]; });
      });
    }
    var kb = s.knockoutBracket;
    if(kb){
      knockout(kb, 'knockout-', function(r){ return stageName(kb, r); });
      var B = kb.serieB;
      if(B && B.rounds){
        var aKey = function(r, m){ return 'knockout-' + r + '-' + m; };
        knockout(B, 'knockoutB-', function(r){ var n = stageName(B, r); return /serie b/i.test(n) ? n : 'Serie B · ' + n; }, null, function(ref){
          if(ref.series !== 'A') return undefined;
          return tmResolveSlot(kb.rounds, aKey, results, {fromRound: ref.fromRound, matchId: ref.matchId, isLoser: ref.isLoser}, null, null, 0);
        });
      }
    }
  } else if(mode === 'cup'){
    if(s.cup) knockout(s.cup, 'cup-', function(r){ return stageName(s.cup, r); });
  } else if(mode === 'swiss' && s.swiss){
    var sw = s.swiss, swRounds = sw.rounds || [];
    swRounds.forEach(function(round, r){
      (round.matches || []).forEach(function(m, mi){
        var res0 = function(slot){
          if(typeof slot === 'number' || !slot || slot.fromRound == null) return slot;
          var pr = swRounds[slot.fromRound], pm = pr && pr.matches && pr.matches[slot.matchId];
          var x = results['swiss-' + slot.fromRound + '-' + slot.matchId];
          if(!pm || !x || +x.hg === +x.ag || typeof pm.home !== 'number' || typeof pm.away !== 'number') return null;
          return +x.hg > +x.ag ? pm.home : pm.away;
        };
        push(round.isPrePlayoff ? 'Play-in' : 'Swiss V' + (swRounds[0] && swRounds[0].isPrePlayoff ? r : r + 1),
          res0(m.home), res0(m.away), 'swiss-' + r + '-' + mi);
      });
    });
    var pb = sw.playoffBracket, q = sw.playoffQualifiers || [];
    if(pb) knockout(pb, 'swiss-playoff-', function(r){ return stageName(pb, r, 'Playoff · '); },
      function(n){ return q[n] != null ? q[n] : null; });
  } else if(mode === 'double-elimination' && s.doubleElimination){
    var de = s.doubleElimination;
    var res = function(slot){ try { return resolveDoubleEliminationTeam(s, slot); } catch(e){ return null; } };
    (de.playoffRound || []).forEach(function(m, mi){ push('Play-in', res(m.home), res(m.away), 'de-playoff-0-' + mi); });
    var wb = de.winnersRounds || [], lb = de.losersRounds || [];
    for(var i = 0; i < Math.max(wb.length, lb.length); i++){
      (wb[i] || []).forEach(function(m, mi){ push('WB V' + (i + 1), res(m.home), res(m.away), 'de-winners-' + i + '-' + mi); });
      (lb[i] || []).forEach(function(m, mi){ push('LB V' + (i + 1), res(m.home), res(m.away), 'de-losers-' + i + '-' + mi); });
    }
    (de.grandFinals || []).forEach(function(m, mi){ push('Chung kết tổng', res(m.home), res(m.away), 'de-grand-final-' + mi); });
  } else if(mode === 'chess-swiss' && s.chessSwiss){
    var cs = s.chessSwiss;
    (cs.rounds || []).forEach(function(round, r){
      (round.matches || []).forEach(function(m, mi){
        if(m.home === cs.byeIndex || m.away === cs.byeIndex){
          out.push({ stage: 'V' + (r + 1), rest: m.home === cs.byeIndex ? m.away : m.home, bye: true });
          return;
        }
        push('V' + (r + 1), m.home, m.away, 'cswiss-' + r + '-' + mi);
      });
    });
  }
  return out;
}

// All matches of one team (played, unplayed and rest rounds), in play order, from
// the team's perspective. Unplayed matches have r = null; rest rounds have rest = true.
function teamMatches(s, teamIdx, all){
  return (all || collectSeasonMatches(s)).filter(function(x){
    return x.rest === teamIdx || x.home === teamIdx || x.away === teamIdx;
  }).map(function(x){
    if(x.rest != null) return { stage: x.stage, rest: true, bye: !!x.bye, r: null };
    var isHome = x.home === teamIdx, m = { stage: x.stage, home: x.home, away: x.away, isHome: isHome,
      opp: isHome ? x.away : x.home, r: null };
    if(x.res){
      m.hg = x.res.hg; m.ag = x.res.ag;
      m.gf = isHome ? m.hg : m.ag; m.ga = isHome ? m.ag : m.hg;
      m.r = m.gf > m.ga ? 'W' : (m.gf < m.ga ? 'L' : 'D');
    }
    return m;
  });
}

function renderTeamMatchList(s, list){
  if(!list.length) return '<div class="muted">—</div>';
  return '<div class="team-match-list">' + list.map(function(m){
    if(m.rest) return '<div class="team-match-row tm-rest">' +
      '<span class="formBox N">–</span>' +
      '<span class="tm-stage">' + escapeHtml(m.stage) + '</span>' +
      '<span class="tm-rest-note">' + escapeHtml(m.bye ? 'Nghỉ (BYE +2đ)' : 'Nghỉ – không có lịch thi đấu') + '</span>' +
      '</div>';
    var played = !!m.r;
    return '<div class="team-match-row' + (played ? '' : ' tm-pending') + '">' +
      '<span class="formBox ' + (played ? m.r : 'N') + '">' + (played ? m.r : '–') + '</span>' +
      '<span class="tm-stage">' + escapeHtml(m.stage) + '</span>' +
      '<span class="tm-team tm-home' + (m.isHome ? ' tm-self' : '') + '">' + escapeHtml(s.teams[m.home] || '') + '</span>' +
      '<span class="tm-score">' + (played ? m.hg + ' – ' + m.ag : '') + '</span>' +
      '<span class="tm-team tm-away' + (m.isHome ? '' : ' tm-self') + '">' + escapeHtml(s.teams[m.away] || '') + '</span>' +
      '</div>';
  }).join('') + '</div>';
}
