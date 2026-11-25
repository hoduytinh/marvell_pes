// Marvell PES Club - features/mode-settings.js
// Mode-specific options in the "Cài đặt" dialog (tournament / cup / swiss / chess-swiss).

var MS_THIRD = 'Tranh hạng 3';

function msHasResults(s, prefixes){
  return Object.keys(s.results || {}).some(function(k){
    return prefixes.some(function(p){ return k.indexOf(p) === 0; });
  });
}

function msDeleteResults(s, prefixes){
  Object.keys(s.results || {}).forEach(function(k){
    if(prefixes.some(function(p){ return k.indexOf(p) === 0; })) delete s.results[k];
  });
}

// Brackets that store numbers once a slot is known (swiss playoff): replace {fromRound, matchId, isLoser}
// refs whose source match is already decided by the winner / loser. Returns true when something changed.
function msResolveBracketRefs(br, prefix, results){
  if(!br || !br.rounds) return false;
  var changed = false;
  results = results || {};
  br.rounds.forEach(function(round){
    (round || []).forEach(function(m){
      if(!m) return;
      ['home', 'away'].forEach(function(side){
        var ref = m[side];
        if(!ref || typeof ref !== 'object' || ref.fromRound == null || ref.matchId == null || ref.series) return;
        var src = br.rounds[ref.fromRound] && br.rounds[ref.fromRound][ref.matchId];
        var r = results[prefix + ref.fromRound + '-' + ref.matchId];
        if(!src || typeof src.home !== 'number' || typeof src.away !== 'number' || !r) return;
        var hg = parseInt(r.hg, 10), ag = parseInt(r.ag, 10);
        if(!isFinite(hg) || !isFinite(ag) || hg === ag) return;
        var homeWon = hg > ag;
        m[side] = ref.isLoser ? (homeWon ? src.away : src.home) : (homeWon ? src.home : src.away);
        changed = true;
      });
    });
  });
  return changed;
}

// Add/remove the 3rd-place round in an existing single-elimination bracket,
// keeping played results (final result key is shifted accordingly).
function msToggle3rdPlace(br, prefix, results, enable){
  if(!br || !br.rounds || br.rounds.length < 2 || !br.stageNames) return;
  var idx = br.stageNames.indexOf(MS_THIRD);
  if(enable && idx < 0){
    var finalIdx = br.rounds.length - 1, semiIdx = finalIdx - 1;
    if(br.rounds[semiIdx].length !== 2) return;
    br.rounds.splice(finalIdx, 0, [{
      home: {fromRound: semiIdx, matchId: 0, isLoser: true},
      away: {fromRound: semiIdx, matchId: 1, isLoser: true}
    }]);
    br.stageNames.splice(finalIdx, 0, MS_THIRD);
    var fk = prefix + finalIdx + '-0';
    if(results[fk]){ results[prefix + (finalIdx + 1) + '-0'] = results[fk]; delete results[fk]; }
  } else if(!enable && idx >= 0){
    br.rounds.splice(idx, 1);
    br.stageNames.splice(idx, 1);
    delete results[prefix + idx + '-0'];
    for(var r = idx + 1; r <= br.rounds.length; r++){
      Object.keys(results).forEach(function(k){
        if(k.indexOf(prefix + r + '-') === 0){
          results[prefix + (r - 1) + k.slice((prefix + r).length)] = results[k];
          delete results[k];
        }
      });
    }
  }
}

function msShow(id, on, disp){ var e = $(id); if(e) e.style.display = on ? (disp || '') : 'none'; }

function msSyncSerieAB(){
  var on = $('cfgSerieAB').checked;
  msShow('cfgNumSerieARow', on, 'flex');
  msShow('cfgNumKnockoutRow', !on, 'flex');
}

// Knock-out modes get a real 3rd-place match; the other modes only award the bronze medal.
function msThirdIsMatch(m){ return m === 'tournament' || m === 'cup' || m === 'swiss'; }

function fillModeSettings(s){
  var m = s.mode;
  var tour = m === 'tournament', chess = m === 'chess-swiss';
  var third = m !== 'legend' && m !== 'ranking';
  $('cfgForceEnd').checked = !!s.forceEnded;
  if($('cfgLock')) $('cfgLock').checked = !!s.locked;
  if($('cfgInStats')) $('cfgInStats').checked = !s.statsOff;
  if($('cfgRankWrap') && typeof prRange === 'function'){
    msShow('cfgRankWrap', third, 'flex');
    var rg = prRange(s), df = prDefaults(s);
    $('cfgRankMax').value = rg.max; $('cfgRankMax').placeholder = df.max;
    $('cfgRankMin').value = rg.min; $('cfgRankMin').placeholder = df.min;
  }
  if($('cfgKind')) $('cfgKind').value = (typeof seasonKind === 'function') ? seasonKind(s) : (s.kind || 'official');
  if($('cfgFormat')) $('cfgFormat').value = (typeof seasonIsDoubles === 'function' && seasonIsDoubles(s)) ? 'double' : 'single';
  msShow('cfgModeSection', tour || chess || third);
  msShow('cfgTournamentWrap', tour);
  msShow('cfgChessRoundsWrap', chess, 'flex');
  msShow('cfg3rdWrap', third, 'flex');
  $('cfg3rdPlace').checked = !!s.has3rdPlace;
  if($('cfg3rdLabel')) $('cfg3rdLabel').textContent = msThirdIsMatch(m)
    ? 'Thêm trận tranh hạng 3 (tính 🥉 HC đồng)'
    : (m === 'double-elimination' ? 'Tính hạng 3 (🥉 HC đồng cho đội thua chung kết nhánh thua)' : 'Tính hạng 3 (🥉 HC đồng cho đội đứng thứ 3)');
  if(tour){
    $('cfgNumGroups').value = s.numGroups || Object.keys(s.groups || {}).length || 4;
    var rr = s.groupRoundRobin || 'double';
    document.getElementsByName('cfgGroupRR').forEach(function(r){ r.checked = r.value === rr; });
    var sab = typeof isSerieAB === 'function' && isSerieAB(s);
    $('cfgSerieAB').checked = !!sab;
    $('cfgNumSerieA').value = String(sab ? s.numSerieA : 8);
    $('cfgNumKnockout').value = s.numKnockoutTeams || 8;
    msSyncSerieAB();
  }
  if(chess && s.chessSwiss){
    var minR = Math.max(1, s.chessSwiss.rounds.length);
    $('cfgChessRounds').min = minR;
    $('cfgChessRounds').value = s.chessSwiss.numRounds;
  }
}

// Returns false when the user cancels / validation fails (nothing is changed).
function applyModeSettings(s){
  // Locked season staying locked: only metadata can change, never the structure.
  if(s.locked && $('cfgLock') && $('cfgLock').checked){ msApplyMeta(s); return true; }
  var m = s.mode, results = s.results || (s.results = {});
  var want3rd = $('cfg3rdPlace').checked;
  var backedUp = false;
  function backup(){
    if(backedUp || typeof createSeasonBackup !== 'function') return;
    createSeasonBackup(state.current, 'Tự động: trước khi đổi cài đặt');
    backedUp = true;
  }

  if(m === 'tournament'){
    var n = s.teams.length;
    var numGroups = clamp(parseInt($('cfgNumGroups').value, 10) || 4, 2, 8);
    var rr = 'double';
    document.getElementsByName('cfgGroupRR').forEach(function(r){ if(r.checked) rr = r.value; });
    var serieAB = $('cfgSerieAB').checked;
    var numSerieA = serieAB ? (parseInt($('cfgNumSerieA').value, 10) || 8) : 0;
    var ko = serieAB ? numSerieA + numSerieA / 2 : clamp(parseInt($('cfgNumKnockout').value, 10) || 8, 2, 32);

    if(n < numGroups * 2){ alert(numGroups + ' bảng cần tối thiểu ' + (numGroups * 2) + ' đội (hiện có ' + n + ').'); return false; }
    if(ko > numGroups * 5){ alert('Với ' + numGroups + ' bảng, tối đa ' + (numGroups * 5) + ' đội vào vòng loại trực tiếp.'); return false; }
    if(ko > n){ alert('Số đội đi tiếp (' + ko + ') vượt quá số đội của giải (' + n + ').'); return false; }

    var groupChanged = numGroups !== (s.numGroups || 4) || rr !== (s.groupRoundRobin || 'double');
    var curSAB = isSerieAB(s);
    var koChanged = ko !== (s.numKnockoutTeams || 8) || serieAB !== curSAB || (serieAB && numSerieA !== s.numSerieA);
    var thirdChanged = want3rd !== !!s.has3rdPlace;
    var koPrefixes = ['knockout-', 'knockoutB-'];

    if(groupChanged){
      var hasAny = msHasResults(s, ['group-'].concat(koPrefixes));
      if(hasAny && !confirm('Đổi số bảng / lượt đấu sẽ bốc thăm lại các bảng và XÓA toàn bộ kết quả vòng bảng + knock-out. Tiếp tục?')) return false;
      backup();
      msDeleteResults(s, ['group-'].concat(koPrefixes));
      s.groups = generateTournamentGroups(s.teams, n, numGroups, rr);
      s.groupStandings = {};
      s.knockoutBracket = null;
      s.tournamentPhase = 'group';
    } else if(koChanged){
      if(msHasResults(s, koPrefixes)){
        if(!confirm('Đổi cấu trúc knock-out sẽ XÓA kết quả vòng knock-out đã đá. Tiếp tục?')) return false;
        backup();
      }
      msDeleteResults(s, koPrefixes);
      s.knockoutBracket = null;
      s.tournamentPhase = 'group';
    } else if(thirdChanged && s.knockoutBracket){
      backup();
      msToggle3rdPlace(s.knockoutBracket, 'knockout-', results, want3rd);
    }
    s.numGroups = numGroups;
    s.groupRoundRobin = rr;
    s.numKnockoutTeams = ko;
    if(serieAB){ s.knockoutFormat = 'serieAB'; s.numSerieA = numSerieA; }
    else { delete s.knockoutFormat; delete s.numSerieA; }
    s.has3rdPlace = want3rd;
    if(typeof checkAndGenerateKnockout === 'function' && !s.knockoutBracket) checkAndGenerateKnockout(s);
  } else if(m === 'cup'){
    if(want3rd !== !!s.has3rdPlace){
      if(msHasResults(s, ['cup-'])) backup();
      msToggle3rdPlace(s.cup, 'cup-', results, want3rd);
      s.has3rdPlace = want3rd;
    }
  } else if(m === 'swiss'){
    if(want3rd !== !!s.has3rdPlace){
      if(s.swiss && s.swiss.playoffBracket){
        if(msHasResults(s, ['swiss-playoff-'])) backup();
        msToggle3rdPlace(s.swiss.playoffBracket, 'swiss-playoff-', results, want3rd);
        msResolveBracketRefs(s.swiss.playoffBracket, 'swiss-playoff-', results);
      }
      s.has3rdPlace = want3rd;
    }
  } else if(m === 'chess-swiss' && s.chessSwiss){
    var cs = s.chessSwiss;
    var nr = parseInt($('cfgChessRounds').value, 10) || cs.numRounds;
    if(nr < cs.rounds.length){ alert('Đã tạo ' + cs.rounds.length + ' vòng, không thể giảm xuống ' + nr + '.'); return false; }
    nr = clamp(nr, 1, 20);
    if(nr !== cs.numRounds){
      cs.numRounds = nr;
      s.numChessSwissRounds = nr;
      if(typeof checkAndGenerateNextChessSwiss === 'function') checkAndGenerateNextChessSwiss(s);
    }
  }
  msApplyMeta(s);
  return true;
}

function msApplyMeta(s){
  if($('cfgForceEnd').checked) s.forceEnded = true; else delete s.forceEnded;
  if($('cfgKind')) s.kind = $('cfgKind').value === 'playoff' ? 'playoff' : 'official';
  if($('cfgFormat')) s.format = $('cfgFormat').value === 'double' ? 'double' : 'single';
  if($('cfgLock')){ if($('cfgLock').checked) s.locked = true; else delete s.locked; }
  if($('cfgInStats')){ if($('cfgInStats').checked) delete s.statsOff; else s.statsOff = true; }
  // PES Ranking max/min points (features/pes-ranking.js): metadata, allowed for locked seasons too.
  if($('cfgRankMax') && typeof prSetRange === 'function' && s.mode !== 'legend' && s.mode !== 'ranking') prSetRange(s, $('cfgRankMax').value, $('cfgRankMin').value);
  // Bronze-only setting (no bracket change): allowed even for locked seasons.
  if(s.mode !== 'legend' && s.mode !== 'ranking' && !msThirdIsMatch(s.mode)) s.has3rdPlace = $('cfg3rdPlace').checked;
}

document.addEventListener('change', function(e){
  if(e.target && e.target.id === 'cfgSerieAB') msSyncSerieAB();
});
