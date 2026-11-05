// Marvell PES Club - modes/chess-swiss.js (split from app.js; shared global scope, load order set in index.html)
/* =====================================================================
   CHESS-SWISS MODE (classic chess Swiss system)
   - Win = 2 pts, Draw = 1 pt, Loss = 0 pt
   - Odd team count auto-adds a virtual 'BYE' player (opponent auto-wins)
   - Fixed number of rounds; round 1 random, later rounds pair by points
   - Avoid rematches (backtracking), allow rematch only if unavoidable
   - Standings tie-break football-style: Pts, GD, GF, Wins
   Result keys: 'cswiss-{round}-{match}'  -> {hg, ag} or {bye:true, winner}
   ===================================================================== */

// Build the chess-swiss structure on a season (adds BYE team if odd)
function buildChessSwiss(s, numRounds){
  numRounds = numRounds || s.numChessSwissRounds || 5;
  var byeIndex = null;
  if(s.teams.length % 2 === 1){
    s.teams.push('BYE');
    if(s.teamColors) s.teamColors.push('#444c66');
    if(s.teamLogos) s.teamLogos.push(DEFAULT_TEAM_LOGO);
    s.teamCount = s.teams.length;
    byeIndex = s.teams.length - 1;
  }
  s.chessSwiss = { numRounds: numRounds, rounds: [], byeIndex: byeIndex };
  if(s.settings) s.settings.enableRegen = true;
  chessSwissGenerateRound(s, 0);
  return s.chessSwiss;
}

// Compute per-team stats from results of rounds [0, uptoRoundExclusive)
function chessSwissStats(s, uptoRoundExclusive){
  var cs = s.chessSwiss;
  var stats = s.teams.map(function(team, idx){
    return { idx: idx, team: team, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0,
             isBye: (idx === cs.byeIndex), byes: 0 };
  });
  var maxR = (uptoRoundExclusive == null) ? cs.rounds.length : uptoRoundExclusive;
  for(var r = 0; r < maxR && r < cs.rounds.length; r++){
    var round = cs.rounds[r];
    if(!round || !round.matches) continue;
    round.matches.forEach(function(m, mi){
      var res = s.results['cswiss-' + r + '-' + mi];
      if(!res) return;
      var h = m.home, a = m.away;
      if(h == null || a == null) return;
      if(res.bye){
        var winner = (typeof res.winner === 'number') ? res.winner : (h === cs.byeIndex ? a : h);
        var st = stats[winner];
        if(st){ st.P++; st.W++; st.Pts += 2; st.byes++; }
        return;
      }
      var H = stats[h], A = stats[a];
      H.P++; A.P++;
      H.GF += res.hg; H.GA += res.ag; A.GF += res.ag; A.GA += res.hg;
      if(res.hg > res.ag){ H.W++; H.Pts += 2; A.L++; }
      else if(res.ag > res.hg){ A.W++; A.Pts += 2; H.L++; }
      else { H.D++; A.D++; H.Pts++; A.Pts++; }
    });
  }
  stats.forEach(function(st){ st.GD = st.GF - st.GA; });
  return stats;
}

// Map of "a-b" -> true for every pairing already played before uptoRoundExclusive
function chessSwissHasPlayed(s, uptoRoundExclusive){
  var cs = s.chessSwiss;
  var map = {};
  var maxR = (uptoRoundExclusive == null) ? cs.rounds.length : uptoRoundExclusive;
  for(var r = 0; r < maxR && r < cs.rounds.length; r++){
    var round = cs.rounds[r];
    if(!round || !round.matches) continue;
    round.matches.forEach(function(m){
      if(m.home == null || m.away == null) return;
      map[m.home + '-' + m.away] = true;
      map[m.away + '-' + m.home] = true;
    });
  }
  return map;
}

// Backtracking pairing over a list (strongest first). Pairs nearest opponents
// first to keep similar scores together. Avoids rematches when possible,
// otherwise allows them. Returns array of [stat,stat] pairs.
function chessSwissPairList(list, hasPlayed){
  var n = list.length;
  if(n === 0) return [];
  var used = new Array(n).fill(false);
  var result = [];
  function backtrack(allowRematch){
    var i = 0;
    while(i < n && used[i]) i++;
    if(i >= n) return true;
    used[i] = true;
    for(var j = i + 1; j < n; j++){
      if(used[j]) continue;
      if(!allowRematch && hasPlayed[list[i].idx + '-' + list[j].idx]) continue;
      used[j] = true;
      result.push([list[i], list[j]]);
      if(backtrack(allowRematch)) return true;
      result.pop();
      used[j] = false;
    }
    used[i] = false;
    return false;
  }
  if(backtrack(false)) return result.slice();
  result.length = 0;
  for(var k = 0; k < n; k++) used[k] = false;
  if(backtrack(true)) return result.slice();
  // Last resort: sequential pairing
  var seq = [];
  for(var p = 0; p + 1 < n; p += 2) seq.push([list[p], list[p+1]]);
  return seq;
}

// Generate (or regenerate) the pairings for a given round index
function chessSwissGenerateRound(s, roundIdx){
  var cs = s.chessSwiss;
  var stats = chessSwissStats(s, roundIdx);
  var hasPlayed = chessSwissHasPlayed(s, roundIdx);
  var matches = [];
  if(roundIdx === 0){
    // Round 1: random pairing
    var order = stats.slice();
    for(var i = order.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    for(var k = 0; k + 1 < order.length; k += 2){
      matches.push({ home: order[k].idx, away: order[k+1].idx });
    }
  } else {
    // Later rounds: sort by points (BYE always last), then pair nearby
    var sorted = stats.slice().sort(function(a, b){
      if(a.isBye !== b.isBye) return a.isBye ? 1 : -1;
      if(b.Pts !== a.Pts) return b.Pts - a.Pts;
      if(b.GD !== a.GD) return b.GD - a.GD;
      if(b.GF !== a.GF) return b.GF - a.GF;
      return Math.random() - 0.5;
    });
    var pairs = chessSwissPairList(sorted, hasPlayed);
    pairs.forEach(function(pr){
      var a = pr[0].idx, b = pr[1].idx;
      if(a === cs.byeIndex){ var tmp = a; a = b; b = tmp; } // keep BYE on away side
      matches.push({ home: a, away: b });
    });
  }
  cs.rounds[roundIdx] = { matches: matches, generated: true };
  chessSwissAutofillByes(s, roundIdx);
  return cs.rounds[roundIdx];
}

// Auto-record the result for any match involving the virtual BYE team
function chessSwissAutofillByes(s, roundIdx){
  var cs = s.chessSwiss;
  if(cs.byeIndex == null) return;
  var round = cs.rounds[roundIdx];
  if(!round || !round.matches) return;
  round.matches.forEach(function(m, mi){
    if(m.home === cs.byeIndex || m.away === cs.byeIndex){
      var winner = (m.home === cs.byeIndex) ? m.away : m.home;
      s.results['cswiss-' + roundIdx + '-' + mi] = { bye: true, winner: winner, hg: 0, ag: 0 };
    }
  });
}

// True when every match of a round has a result
function chessSwissRoundComplete(s, roundIdx){
  var cs = s.chessSwiss;
  var round = cs.rounds[roundIdx];
  if(!round || !round.matches || !round.matches.length) return false;
  for(var mi = 0; mi < round.matches.length; mi++){
    if(!s.results['cswiss-' + roundIdx + '-' + mi]) return false;
  }
  return true;
}

// Auto-generate subsequent rounds while the latest round is complete
function checkAndGenerateNextChessSwiss(s){
  var cs = s.chessSwiss;
  if(!cs || !cs.rounds.length) return;
  for(var r = 0; r < cs.rounds.length; r++) chessSwissAutofillByes(s, r);
  while(cs.rounds.length < cs.numRounds && chessSwissRoundComplete(s, cs.rounds.length - 1)){
    chessSwissGenerateRound(s, cs.rounds.length);
  }
}

// Build the DOM for a single chess-swiss round (title, admin buttons, matches).
// Optional filters: { filterTeam, showOnlyDone, showOnlyPending }.
// Returns null when no match passes the filter.
function buildChessSwissRoundDiv(s, roundIdx, filters){
  var cs = s.chessSwiss;
  var round = cs.rounds[roundIdx];
  if(!round || !round.matches) return null;
  filters = filters || {};
  var filterTeam = (filters.filterTeam != null) ? filters.filterTeam : null;
  var showOnlyDone = !!filters.showOnlyDone;
  var showOnlyPending = !!filters.showOnlyPending;

  var stats = chessSwissStats(s, roundIdx); // points BEFORE this round
  var maxTeamNameWidth = getMaxTeamNameWidth(s.teams) + 40;
  var predShim = null;
  try { predShim = chessSwissLeagueShim(s); } catch(e) { predShim = null; }

  var roundDiv = document.createElement('div');
  roundDiv.className = 'cswiss-round';

  var roundTitle = document.createElement('h4');
  roundTitle.className = 'cup-round-title';
  roundTitle.textContent = 'Vòng ' + (roundIdx + 1);
  roundDiv.appendChild(roundTitle);

  // Admin toolbar (regenerate / random-all) — single row above the matches
  var adminBar = null;
  if(isAdmin()){
    adminBar = document.createElement('div');
    adminBar.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px;';
    roundDiv.appendChild(adminBar);
  }

  // Admin: regenerate this round's pairings (clears this + later rounds)
  if(isAdmin() && roundIdx > 0 && s.settings && s.settings.enableRegen !== false){
    var regenBtn = document.createElement('button');
    regenBtn.textContent = '🔄 Regenerate';
    regenBtn.title = 'Tạo lại cặp đấu vòng này (xoá kết quả vòng này và các vòng sau)';
    regenBtn.style.cssText = 'padding: 4px 10px; font-size: 11px; border: 1px solid var(--accent); border-radius: 4px; background: var(--card); color: var(--text); cursor: pointer; font-weight: 600;';
    (function(capturedIdx){
      regenBtn.addEventListener('click', function(){
        if(!isAdmin()){ toast('Chỉ admin được phép sửa'); return; }
        if(!confirm('Tạo lại cặp đấu Vòng ' + (capturedIdx + 1) + '?\nKết quả vòng này và các vòng sau sẽ bị xoá.')) return;
        for(var rr = capturedIdx; rr < cs.rounds.length; rr++){
          var rd = cs.rounds[rr];
          if(rd && rd.matches) rd.matches.forEach(function(_, mi){ delete s.results['cswiss-' + rr + '-' + mi]; });
        }
        cs.rounds.length = capturedIdx;
        chessSwissGenerateRound(s, capturedIdx);
        checkAndGenerateNextChessSwiss(s);
        saveAll();
        refreshChessSwiss(s);
      });
    })(roundIdx);
    adminBar.appendChild(regenBtn);
  }

  // Admin: random ALL scores of this round at once
  if(isAdmin()){
    var randomAllBtn = document.createElement('button');
    randomAllBtn.textContent = '🎲 Random cả vòng';
    randomAllBtn.title = 'Random tỉ số cho tất cả các trận của vòng này';
    randomAllBtn.style.cssText = 'padding: 4px 10px; font-size: 11px; border: 1px solid var(--accent); border-radius: 4px; background: var(--card); color: var(--text); cursor: pointer; font-weight: 600;';
    (function(capturedIdx){
      randomAllBtn.addEventListener('click', function(){
        if(!isAdmin()){ toast('Chỉ admin được phép sửa'); return; }
        var rd = cs.rounds[capturedIdx];
        if(!rd || !rd.matches) return;
        // Editing a completed round reshuffles later rounds; confirm once
        var roundWasComplete = chessSwissRoundComplete(s, capturedIdx);
        if(cs.rounds.length > capturedIdx + 1 && roundWasComplete){
          if(!confirm('Random lại cả vòng sẽ tạo lại lịch các vòng sau. Tiếp tục?')) return;
        }
        var scores = [0,0,1,1,1,2,2,2,3,3,4];
        rd.matches.forEach(function(m, mi){
          if(cs.byeIndex != null && (m.home === cs.byeIndex || m.away === cs.byeIndex)) return; // skip BYE
          var hg = scores[Math.floor(Math.random()*scores.length)];
          var ag = scores[Math.floor(Math.random()*scores.length)];
          s.results['cswiss-' + capturedIdx + '-' + mi] = { hg: hg, ag: ag };
        });
        // Clear subsequent rounds (pairings depend on results)
        if(cs.rounds.length > capturedIdx + 1){
          for(var rr = capturedIdx + 1; rr < cs.rounds.length; rr++){
            var nrd = cs.rounds[rr];
            if(nrd && nrd.matches) nrd.matches.forEach(function(_, mi){ delete s.results['cswiss-' + rr + '-' + mi]; });
          }
          cs.rounds.length = capturedIdx + 1;
        }
        checkAndGenerateNextChessSwiss(s);
        saveAll();
        refreshChessSwiss(s);
      });
    })(roundIdx);
    adminBar.appendChild(randomAllBtn);
  }

  var shownCount = 0;

  round.matches.forEach(function(match, matchIdx){
    var key = 'cswiss-' + roundIdx + '-' + matchIdx;
    var result = s.results[key] || {};
    var homeIdx = match.home, awayIdx = match.away;
    var isByeMatch = (cs.byeIndex != null && (homeIdx === cs.byeIndex || awayIdx === cs.byeIndex));

    // Apply filters
    if(filterTeam != null && homeIdx !== filterTeam && awayIdx !== filterTeam) return;
    var hasResult = !!s.results[key];
    if(showOnlyDone && !hasResult) return;
    if(showOnlyPending && hasResult) return;

    shownCount++;

    var homeTeam = s.teams[homeIdx] || 'TBD';
    var awayTeam = s.teams[awayIdx] || 'TBD';

    var el = document.createElement('div');
    el.className = 'fixture';
    el.setAttribute('data-key', key);

    var vhg = (result.hg == null || result.bye) ? '' : result.hg;
    var vag = (result.ag == null || result.bye) ? '' : result.ag;
    var hgVal = parseInt(vhg, 10), agVal = parseInt(vag, 10);

    // Winner/loser styling
    var homeClass = '', awayClass = '';
    if(result.bye){
      if(homeIdx !== cs.byeIndex){ homeClass = ' bracket-team-winner'; }
      if(awayIdx !== cs.byeIndex){ awayClass = ' bracket-team-winner'; }
    } else if(!isNaN(hgVal) && !isNaN(agVal)){
      if(hgVal > agVal){ homeClass = ' bracket-team-winner'; awayClass = ' bracket-team-loser'; }
      else if(agVal > hgVal){ awayClass = ' bracket-team-winner'; homeClass = ' bracket-team-loser'; }
    }

    function logoHtml(idx){
      if(idx != null && s.teamLogos && s.teamLogos[idx]){
        return '<span class="fixture-logo" style="background-image:url(' + s.teamLogos[idx] + '); background-size:cover; background-position:center;"></span>';
      }
      var bg = (idx != null && s.teamColors) ? (s.teamColors[idx] || '#1b2550') : '#1b2550';
      return '<span class="fixture-logo" style="background:' + bg + '; width:26px; height:26px; border-radius:6px; border:1px solid var(--border); display:inline-block;"></span>';
    }

    // Points badge (chess-swiss specific, shown from round 2)
    function ptsBadge(idx){
      if(roundIdx <= 0 || idx === cs.byeIndex) return '';
      return ' <span class="csPts">' + stats[idx].Pts + 'đ</span>';
    }

    // Middle (scores or BYE) + prob/predScore for non-bye matches
    var scoreCellsHtml, probHtml, predHtml;
    if(isByeMatch){
      scoreCellsHtml =
        '<div style="grid-column: 3 / 6; text-align:center; color:#22c55e; font-weight:800;">BYE +2</div>';
      probHtml = '<div class="prob"></div>';
      predHtml = '<div class="predScore"></div>';
    } else {
      scoreCellsHtml =
        '<input class="scoreH" type="number" min="0" value="' + vhg + '"/>' +
        '<div style="text-align:center">–</div>' +
        '<input class="scoreA" type="number" min="0" value="' + vag + '"/>';
      var probStr = '', predStr = '';
      if(predShim && typeof matchProbs === 'function'){
        try {
          var pr = matchProbs(predShim, homeIdx, awayIdx);
          var pct = function(x){ return Math.round(x * 100); };
          probStr = pct(pr.home) + '%-' + pct(pr.draw) + '%-' + pct(pr.away) + '%';
          predStr = (typeof estimatePredScore === 'function') ? estimatePredScore(predShim, { home: homeIdx, away: awayIdx }) : '';
        } catch(e) {}
      }
      probHtml = '<div class="prob">' + probStr + '</div>';
      predHtml = '<div class="predScore">' + predStr + '</div>';
    }

    el.innerHTML =
      '<div class="muted">V' + (roundIdx + 1) + '-' + (matchIdx + 1) + '</div>' +
      '<div class="teamCell' + homeClass + '">' + logoHtml(homeIdx) + homeTeam + ptsBadge(homeIdx) + '</div>' +
      scoreCellsHtml +
      '<div class="teamCell right' + awayClass + '">' + ptsBadge(awayIdx) + awayTeam + logoHtml(awayIdx) + '</div>' +
      probHtml +
      predHtml;

    if(!isByeMatch){
      var homeScore = el.querySelector('.scoreH');
      var awayScore = el.querySelector('.scoreA');
      if(isAdmin()){
        homeScore.removeAttribute('readonly'); awayScore.removeAttribute('readonly');
        homeScore.disabled = false; awayScore.disabled = false;
      } else {
        homeScore.setAttribute('readonly','readonly'); awayScore.setAttribute('readonly','readonly');
        homeScore.disabled = true; awayScore.disabled = true;
      }

      var commit = function(){
        if(!isAdmin()){ toast('Chỉ admin được phép sửa'); return; }
        // If later rounds exist and this round was complete, editing reshuffles later rounds
        var hadLaterRounds = cs.rounds.length > roundIdx + 1;
        if(hadLaterRounds && s.results[key]){
          if(!confirm('Sửa kết quả này sẽ tạo lại lịch các vòng sau. Tiếp tục?')){
            var ex = s.results[key];
            if(ex){ homeScore.value = ex.hg; awayScore.value = ex.ag; }
            return;
          }
        }
        var hv = homeScore.value.trim(), av = awayScore.value.trim();
        if(hv === '' && av === ''){
          delete s.results[key];
        } else {
          var hg = clamp(parseInt(hv,10)||0,0,99);
          var ag = clamp(parseInt(av,10)||0,0,99);
          s.results[key] = { hg: hg, ag: ag };
        }
        // Clear all subsequent rounds (pairings depend on this result)
        if(cs.rounds.length > roundIdx + 1){
          for(var rr = roundIdx + 1; rr < cs.rounds.length; rr++){
            var rd = cs.rounds[rr];
            if(rd && rd.matches) rd.matches.forEach(function(_, mi){ delete s.results['cswiss-' + rr + '-' + mi]; });
          }
          cs.rounds.length = roundIdx + 1;
        }
        // Auto-generate next rounds when complete
        checkAndGenerateNextChessSwiss(s);
        saveAll();
        refreshChessSwiss(s);
      };
      homeScore.addEventListener('change', commit);
      awayScore.addEventListener('change', commit);
    }

    roundDiv.appendChild(el);
  });

  if(shownCount === 0) return null;
  return roundDiv;
}

// Render the chess-swiss schedule into #fixtures (League-like layout).
// Uses the league round checkbox selector (#roundCheckboxes) + team/status filters.
function renderChessSwissFixtures(s){
  var cs = s.chessSwiss;
  if(!cs) return;
  checkAndGenerateNextChessSwiss(s);

  // Determine selected rounds from checkboxes; default to the latest round.
  var selectedRounds = [];
  var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked');
  if(checkboxes.length > 0){
    checkboxes.forEach(function(cb){ selectedRounds.push(Number(cb.value)); });
  } else {
    if(cs.rounds.length > 0) selectedRounds = [cs.rounds.length - 1];
  }

  // (Re)build round checkboxes
  var box = document.getElementById('roundCheckboxes');
  if(box){
    box.innerHTML = '';
    for(var i = 0; i < cs.rounds.length; i++){
      var label = document.createElement('label');
      label.style.cssText = 'display:flex; align-items:center; gap:4px; cursor:pointer; padding:4px; border-radius:4px; background:var(--card);';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = String(i);
      checkbox.className = 'round-checkbox';
      if(selectedRounds.indexOf(i) !== -1) checkbox.checked = true;
      var span = document.createElement('span');
      span.textContent = 'V' + (i + 1);
      span.style.fontSize = '12px';
      label.appendChild(checkbox);
      label.appendChild(span);
      box.appendChild(label);
      checkbox.addEventListener('change', function(){ renderFixturesWithRound(); });
    }
  }

  // Team filter dropdown
  var teamFilter = $('teamFilter');
  if(teamFilter){
    var prev = teamFilter.value || '';
    teamFilter.innerHTML = '';
    var any = document.createElement('option'); any.value = ''; any.textContent = '— Tất cả —'; teamFilter.appendChild(any);
    var teamList = s.teams.map(function(t, i){ return { name: t, idx: i }; });
    teamList.sort(function(a, b){ return a.name.localeCompare(b.name); });
    teamList.forEach(function(team){
      if(cs.byeIndex != null && team.idx === cs.byeIndex) return; // skip BYE in filter
      var o = document.createElement('option'); o.value = String(team.idx); o.textContent = team.name; teamFilter.appendChild(o);
    });
    if(prev !== '' && Number(prev) < s.teams.length) teamFilter.value = prev;
  }
  var filterTeam = (teamFilter && teamFilter.value !== '') ? Number(teamFilter.value) : null;
  var showOnlyDone = $('onlyDone') && $('onlyDone').checked;
  var showOnlyPending = $('onlyPending') && $('onlyPending').checked;

  var fixturesDiv = $('fixtures');
  fixturesDiv.innerHTML = '';

  // When filtering by team, show all rounds that contain that team.
  var roundsToShow = selectedRounds.slice();
  if(filterTeam != null){
    roundsToShow = [];
    for(var r = 0; r < cs.rounds.length; r++) roundsToShow.push(r);
  }
  roundsToShow.sort(function(a, b){ return a - b; });

  if(roundsToShow.length === 0){
    fixturesDiv.innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--muted);">' +
      '<p style="font-size:16px; margin:0 0 8px 0;">📋 Chưa chọn vòng nào</p>' +
      '<p style="font-size:13px; margin:0;">Nhấn nút "Chọn vòng" ở trên để chọn vòng đấu cần xem</p>' +
    '</div>';
    return;
  }

  var anyShown = false;
  roundsToShow.forEach(function(r){
    if(r < 0 || r >= cs.rounds.length) return;
    var roundDiv = buildChessSwissRoundDiv(s, r, {
      filterTeam: filterTeam,
      showOnlyDone: showOnlyDone,
      showOnlyPending: showOnlyPending
    });
    if(roundDiv){ fixturesDiv.appendChild(roundDiv); anyShown = true; }
  });

  if(!anyShown){
    fixturesDiv.innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--muted);">Không có trận nào khớp bộ lọc.</div>';
  }
}

// Render the chess-swiss standings table (football-style tie-breakers)
function renderChessSwissStandings(s){
  var cs = s.chessSwiss;
  $('seasonTitle').textContent = '— ' + s.name + ' (CHESS-SWISS)';
  $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';

  var thead = document.querySelector('#tblStandings thead tr');
  if(thead){
    thead.innerHTML = '<th class="pos">#</th>' +
                      '<th>Đội</th>' +
                      '<th>P</th><th>W</th><th>D</th><th>L</th>' +
                      '<th>GF</th><th>GA</th><th>GD</th>' +
                      '<th>Pts</th>' +
                      '<th>Form</th>' +
                      '<th>Trend</th><th>Δ</th>';
  }

  var tbody = $('standings');
  tbody.innerHTML = '';

  var stats = chessSwissStats(s, cs.rounds.length).filter(function(st){ return !st.isBye; });
  stats.sort(function(a, b){
    if(b.Pts !== a.Pts) return b.Pts - a.Pts;
    if(b.GD !== a.GD) return b.GD - a.GD;
    if(b.GF !== a.GF) return b.GF - a.GF;
    if(b.W !== a.W) return b.W - a.W;
    return a.team.localeCompare(b.team);
  });

  var finished = cs.rounds.length >= cs.numRounds && chessSwissRoundComplete(s, cs.numRounds - 1);

  // Band settings (same as League): top / euro / playoff / relegation
  var topBand = s.settings.top || 0,
      euroBand = s.settings.euro || 0,
      playoffBand = s.settings.playoff || 0,
      rel = s.settings.rel || 0;
  var totalRows = stats.length;

  // Previous-position map (one recorded round earlier) for the Δ column
  var timeline = chessSwissRanksTimeline(s);
  var prevMap = {};
  s.teams.forEach(function(_, idx){
    var series = timeline[idx] || [];
    if(series.length >= 2) prevMap[idx] = series[series.length - 2];
  });

  stats.forEach(function(row, pos){
    var tr = document.createElement('tr');
    // Band classes (mirror League)
    var isTop = topBand > 0 && pos < topBand;
    var isEuro = euroBand > 0 && pos >= topBand && pos < euroBand;
    var isPlayoff = playoffBand > 0 && pos >= totalRows - rel - playoffBand && pos < totalRows - rel;
    var isRel = rel > 0 && pos >= totalRows - rel;
    if(isTop) tr.classList.add('band-top');
    else if(isEuro) tr.classList.add('band-euro');
    else if(isPlayoff) tr.classList.add('band-playoff');
    else if(isRel) tr.classList.add('band-rel');
    if(finished && pos === 0) tr.classList.add('band-champion');
    var logo = s.teamLogos && s.teamLogos[row.idx] ? '<img src="' + s.teamLogos[row.idx] + '" alt="logo"/>' : '';
    var badge = logo ? ('<span class="badge">' + logo + '</span>') : ('<span class="badge" style="background:' + (s.teamColors[row.idx] || '#1b2550') + '"></span>');
    var champ = finished ? (pos === 0 ? ' 🏆' : pos === 1 ? ' 🥈' : pos === 2 ? ' 🥉' : '') : '';
    var curPos = pos + 1;
    var prevPos = (prevMap[row.idx] != null) ? prevMap[row.idx] : null;
    var change = (prevPos == null) ? 0 : (prevPos - curPos);
    var formSeq = chessSwissFormSeq(s, row.idx).slice(-7);
    tr.innerHTML = '<td class="pos">' + (pos + 1) + '</td>' +
                  '<td class="team">' + badge + escapeHtml(row.team) + champ + '</td>' +
                  '<td>' + row.P + '</td>' +
                  '<td>' + row.W + '</td>' +
                  '<td>' + row.D + '</td>' +
                  '<td>' + row.L + '</td>' +
                  '<td>' + row.GF + '</td>' +
                  '<td>' + row.GA + '</td>' +
                  '<td>' + (row.GD >= 0 ? '+' : '') + row.GD + '</td>' +
                  '<td style="font-weight:700;">' + row.Pts + '</td>' +
                  '<td>' + renderFormCells(formSeq) + '</td>' +
                  '<td><canvas class="spark" data-team="' + row.idx + '"></canvas></td>' +
                  renderDeltaCell(change, prevPos != null);
    tr.addEventListener('click', function(){ try { if(typeof openTeamDialog === 'function') openTeamDialog(row.idx); } catch(e) {} });
    tbody.appendChild(tr);
  });

  // Draw trend sparklines (chess-swiss timeline)
  try { drawChessSwissRankSparks(s, stats.map(function(x){ return x.idx; }), timeline); } catch(e) {}
}

/* ---------- CHESS-SWISS: League-style extra features ---------- */

// Build a league-compatible "season" view of chess-swiss so we can reuse the
// existing prediction math (matchProbs / estimatePredScore / computeRFExpectedGoals).
// rounds = array of arrays of {home,away}; results keyed 'r-k' (BYE matches omitted).
function chessSwissLeagueShim(s){
  var cs = s.chessSwiss;
  var shim = {
    name: s.name,
    teams: s.teams,
    teamCount: s.teams.length,
    teamColors: s.teamColors,
    teamLogos: s.teamLogos,
    settings: s.settings || {},
    rounds: [],
    results: {}
  };
  (cs.rounds || []).forEach(function(round, r){
    var ms = (round.matches || []).map(function(m){ return { home: m.home, away: m.away }; });
    shim.rounds.push(ms);
    ms.forEach(function(m, k){
      var res = s.results['cswiss-' + r + '-' + k];
      if(res && !res.bye && res.hg != null && res.ag != null){
        shim.results[r + '-' + k] = { hg: res.hg, ag: res.ag };
      }
    });
  });
  return shim;
}

// W/D/L sequence for a team across played chess-swiss rounds (BYE counts as W)
function chessSwissFormSeq(s, teamIdx){
  var cs = s.chessSwiss;
  var out = [];
  for(var r = 0; r < cs.rounds.length; r++){
    var round = cs.rounds[r];
    if(!round || !round.matches) continue;
    round.matches.forEach(function(m, k){
      var res = s.results['cswiss-' + r + '-' + k];
      if(!res) return;
      if(res.bye){
        var winner = (typeof res.winner === 'number') ? res.winner : (m.home === cs.byeIndex ? m.away : m.home);
        if(winner === teamIdx) out.push('W');
        return;
      }
      if(m.home === teamIdx) out.push(res.hg > res.ag ? 'W' : (res.hg < res.ag ? 'L' : 'D'));
      else if(m.away === teamIdx) out.push(res.ag > res.hg ? 'W' : (res.ag < res.hg ? 'L' : 'D'));
    });
  }
  return out;
}

// Position-history timeline: timeline[teamIdx] = [position after each completed-ish round]
function chessSwissRanksTimeline(s){
  var cs = s.chessSwiss;
  var timeline = s.teams.map(function(){ return []; });
  for(var r = 0; r < cs.rounds.length; r++){
    var round = cs.rounds[r];
    if(!round || !round.matches) continue;
    // include this round if it has at least one result
    var hasResult = round.matches.some(function(_, k){ return !!s.results['cswiss-' + r + '-' + k]; });
    if(!hasResult) continue;
    var stats = chessSwissStats(s, r + 1).filter(function(st){ return !st.isBye; });
    stats.sort(function(a, b){
      if(b.Pts !== a.Pts) return b.Pts - a.Pts;
      if(b.GD !== a.GD) return b.GD - a.GD;
      if(b.GF !== a.GF) return b.GF - a.GF;
      if(b.W !== a.W) return b.W - a.W;
      return a.team.localeCompare(b.team);
    });
    stats.forEach(function(st, idx){ timeline[st.idx].push(idx + 1); });
  }
  return timeline;
}

// Populate the 6 rank-chart team selectors and draw the chart (chess-swiss)
function renderChessSwissStandingTracker(s){
  var cs = s.chessSwiss;
  for(var selNum = 1; selNum <= 6; selNum++){
    var sel = $('rankTeamSel' + selNum);
    if(!sel) continue;
    sel.innerHTML = '';
    var empty = document.createElement('option');
    empty.value = ''; empty.textContent = '-- Chọn đội --';
    sel.appendChild(empty);
    var teamList = s.teams.map(function(t, i){ return { name: t, idx: i }; })
      .filter(function(t){ return t.idx !== cs.byeIndex; });
    teamList.sort(function(a, b){ return a.name.localeCompare(b.name); });
    teamList.forEach(function(team){
      var o = document.createElement('option');
      o.value = String(team.idx); o.textContent = team.name;
      sel.appendChild(o);
    });
    sel.onchange = function(){ drawChessSwissRankChart(s); };
  }
  drawChessSwissRankChart(s);
}

// Draw the small trend sparkline canvases inside the standings table (chess-swiss)
function drawChessSwissRankSparks(s, teamIdxList, timeline){
  timeline = timeline || chessSwissRanksTimeline(s);
  var max = s.teams.length - (s.chessSwiss.byeIndex != null ? 1 : 0);
  teamIdxList.forEach(function(idx){
    var canvas = document.querySelector('canvas.spark[data-team="' + idx + '"]');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width = canvas.clientWidth;
    var h = canvas.height = canvas.clientHeight;
    var series = timeline[idx] || [];
    ctx.clearRect(0, 0, w, h);
    if(!series.length) return;
    var X = function(i){ return (i / ((series.length - 1) || 1)) * w; };
    var Y = function(rank){ return ((rank - 1) / ((max - 1) || 1)) * h; };
    ctx.beginPath();
    ctx.moveTo(0, Y(series[0]));
    for(var i = 1; i < series.length; i++) ctx.lineTo(X(i), Y(series[i]));
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawChessSwissRankChart(s){
  var cs = s.chessSwiss;
  var canvas = $('rankChart'); if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.clientWidth;
  var h = canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  var colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  var selectedTeams = [];
  for(var i = 1; i <= 6; i++){
    var sel = $('rankTeamSel' + i);
    if(sel && sel.value !== '') selectedTeams.push({ idx: Number(sel.value), color: colors[i - 1] });
  }
  if(selectedTeams.length === 0){
    ctx.fillStyle = '#999';
    ctx.fillText('Chọn đội để xem biểu đồ xếp hạng', 10, h / 2);
    return;
  }

  var timeline = chessSwissRanksTimeline(s);
  var teamCount = s.teams.length - (cs.byeIndex != null ? 1 : 0);
  var maxRounds = 0;
  selectedTeams.forEach(function(t){ maxRounds = Math.max(maxRounds, (timeline[t.idx] || []).length); });
  if(maxRounds === 0){
    ctx.fillStyle = '#999';
    ctx.fillText('Chưa đủ dữ liệu', 10, h / 2);
    return;
  }

  var X = function(idx){ return 40 + (idx / ((maxRounds - 1) || 1)) * (w - 200); };
  var Y = function(rank){ return 20 + ((rank - 1) / ((teamCount - 1) || 1)) * (h - 40); };

  // gridlines + round labels
  ctx.strokeStyle = 'rgba(150,150,150,0.15)';
  ctx.fillStyle = '#8aa0c5';
  ctx.font = '10px sans-serif';
  for(var rr = 0; rr < maxRounds; rr++){
    var x = X(rr);
    ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x, h - 20); ctx.stroke();
    ctx.fillText('V' + (rr + 1), x - 6, h - 6);
  }

  selectedTeams.forEach(function(t){
    var series = timeline[t.idx] || [];
    if(!series.length) return;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(series[0]));
    for(var k = 1; k < series.length; k++) ctx.lineTo(X(k), Y(series[k]));
    ctx.strokeStyle = t.color; ctx.lineWidth = 2.5; ctx.stroke();
    for(var p = 0; p < series.length; p++){
      ctx.beginPath();
      ctx.arc(X(p), Y(series[p]), 3, 0, Math.PI * 2);
      ctx.fillStyle = t.color; ctx.fill();
    }
    // team label at the end
    var lastX = X(series.length - 1), lastY = Y(series[series.length - 1]);
    ctx.fillStyle = t.color; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(s.teams[t.idx], lastX + 8, lastY + 4);
  });
}

// Insights: best attack / best GD / best defense
function renderChessSwissInsights(s){
  var ul = $('insights'); if(!ul) return;
  var stats = chessSwissStats(s, s.chessSwiss.rounds.length).filter(function(st){ return !st.isBye && st.P > 0; });
  if(!stats.length){ ul.innerHTML = '<li class="muted">Chưa có dữ liệu</li>'; return; }
  var mostGF = stats.slice().sort(function(a, b){ return b.GF - a.GF; })[0];
  var bestGD = stats.slice().sort(function(a, b){ return b.GD - a.GD; })[0];
  var leastGA = stats.slice().sort(function(a, b){ return a.GA - b.GA; })[0];
  ul.innerHTML = '<li>Hàng công tốt nhất: <strong>' + escapeHtml(mostGF.team) + '</strong> (' + mostGF.GF + ' GF)</li>' +
                 '<li>Hiệu số tốt nhất: <strong>' + escapeHtml(bestGD.team) + '</strong> (' + (bestGD.GD >= 0 ? '+' : '') + bestGD.GD + ')</li>' +
                 '<li>Thủ chắc nhất: <strong>' + escapeHtml(leastGA.team) + '</strong> (' + leastGA.GA + ' GA)</li>';
}

// Season stats: best 5-match form, longest win streak, highest scoring match
function renderChessSwissSeasonStats(s){
  var cs = s.chessSwiss;
  var ul = $('seasonStats'); if(!ul) return;
  var stats = chessSwissStats(s, cs.rounds.length).filter(function(st){ return !st.isBye; });
  if(!stats.length){ ul.innerHTML = '<li class="muted">Chưa có dữ liệu</li>'; return; }

  function formScore(seq){ var sc = 0; for(var i = 0; i < seq.length; i++) sc += (seq[i] === 'W' ? 2 : (seq[i] === 'D' ? 1 : 0)); return sc; }
  var bestForm = { team: '', score: -1, seq: [] };
  stats.forEach(function(r){
    var seq = chessSwissFormSeq(s, r.idx).slice(-5);
    var sc = formScore(seq);
    if(sc > bestForm.score) bestForm = { team: r.team, score: sc, seq: seq };
  });

  function longestRun(seq){ var m = 0, c = 0; for(var i = 0; i < seq.length; i++){ if(seq[i] === 'W'){ c++; if(c > m) m = c; } else c = 0; } return m; }
  var bestStreak = { team: '', len: 0 };
  stats.forEach(function(r){ var L = longestRun(chessSwissFormSeq(s, r.idx)); if(L > bestStreak.len) bestStreak = { team: r.team, len: L }; });

  var maxGoals = -1, maxLabel = '—';
  for(var r = 0; r < cs.rounds.length; r++){
    var round = cs.rounds[r]; if(!round || !round.matches) continue;
    round.matches.forEach(function(m, k){
      var res = s.results['cswiss-' + r + '-' + k];
      if(!res || res.bye) return;
      var sum = (+res.hg) + (+res.ag);
      if(sum > maxGoals){ maxGoals = sum; maxLabel = 'V' + (r + 1) + ': ' + s.teams[m.home] + ' ' + res.hg + '–' + res.ag + ' ' + s.teams[m.away]; }
    });
  }

  ul.innerHTML =
    '<li>Form tốt nhất 5 trận: <strong>' + bestForm.team + '</strong> (' + bestForm.score + 'đ)' + (bestForm.seq && bestForm.seq.length ? ' <span style="color:#8aa0c5">– ' + bestForm.seq.join(' ') + '</span>' : '') + '</li>' +
    '<li>Chuỗi thắng dài nhất: <strong>' + bestStreak.team + '</strong> (' + bestStreak.len + ' trận)</li>' +
    '<li>Trận nhiều bàn nhất: <strong>' + maxLabel + '</strong></li>';
}

// Champion prediction (Monte Carlo): simulate remaining rounds & pairings
function runChessSwissSimulation(s, N){
  var cs = s.chessSwiss;
  if(!cs) return;
  N = N || 300;
  var nTeams = s.teams.length;
  var champ = Array(nTeams).fill(0);
  var top3 = Array(nTeams).fill(0);
  var topHalf = Array(nTeams).fill(0);
  var nonByeCount = nTeams - (cs.byeIndex != null ? 1 : 0);
  var halfCut = Math.ceil(nonByeCount / 2);

  for(var it = 0; it < N; it++){
    // Build a lightweight clone to simulate on
    var tmp = {
      teams: s.teams,
      teamColors: s.teamColors,
      teamLogos: s.teamLogos,
      settings: s.settings,
      results: {},
      chessSwiss: { numRounds: cs.numRounds, byeIndex: cs.byeIndex, rounds: [] }
    };
    Object.keys(s.results).forEach(function(k){ if(k.indexOf('cswiss-') === 0) tmp.results[k] = s.results[k]; });
    cs.rounds.forEach(function(rd, r){
      tmp.chessSwiss.rounds[r] = { generated: true, matches: rd.matches.map(function(m){ return { home: m.home, away: m.away }; }) };
    });

    for(var r = 0; r < cs.numRounds; r++){
      if(!tmp.chessSwiss.rounds[r]) chessSwissGenerateRound(tmp, r); // also autofills byes
      var round = tmp.chessSwiss.rounds[r];
      round.matches.forEach(function(m, k){
        if(cs.byeIndex != null && (m.home === cs.byeIndex || m.away === cs.byeIndex)) return;
        var key = 'cswiss-' + r + '-' + k;
        if(tmp.results[key]) return; // keep real results
        var hg = Math.max(0, randPoisson(1.3 + Math.random() * 0.5));
        var ag = Math.max(0, randPoisson(1.2 + Math.random() * 0.5));
        tmp.results[key] = { hg: hg, ag: ag };
      });
    }

    var final = chessSwissStats(tmp, cs.numRounds).filter(function(st){ return !st.isBye; });
    final.sort(function(a, b){
      if(b.Pts !== a.Pts) return b.Pts - a.Pts;
      if(b.GD !== a.GD) return b.GD - a.GD;
      if(b.GF !== a.GF) return b.GF - a.GF;
      if(b.W !== a.W) return b.W - a.W;
      return Math.random() - 0.5;
    });
    final.forEach(function(st, idx){
      if(idx === 0) champ[st.idx]++;
      if(idx < 3) top3[st.idx]++;
      if(idx < halfCut) topHalf[st.idx]++;
    });
  }

  var pct = function(x){ return (x * 100 / N).toFixed(1) + '%'; };
  var order = s.teams.map(function(name, i){ return { name: name, idx: i }; })
    .filter(function(t){ return t.idx !== cs.byeIndex; })
    .sort(function(a, b){ return champ[b.idx] - champ[a.idx]; });

  var table = $('simTable'); if(!table) return;
  table.innerHTML = '';
  var head = document.createElement('tr');
  head.innerHTML = '<th align="left">Đội</th><th>Vô địch</th><th>Top 3</th><th>Nửa trên</th>';
  table.appendChild(head);
  order.forEach(function(t){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + escapeHtml(t.name) + '</td><td>' + pct(champ[t.idx]) + '</td><td>' + pct(top3[t.idx]) + '</td><td>' + pct(topHalf[t.idx]) + '</td>';
    table.appendChild(tr);
  });
  // highlight top contenders
  var rowsEls = Array.from(table.querySelectorAll('tr')).slice(1);
  rowsEls.forEach(function(rEl, i){ if(i < 3) rEl.style.background = 'rgba(34,197,94,0.12)'; });
}

// Refresh all chess-swiss League-style panels
function refreshChessSwiss(s){
  renderChessSwissFixtures(s);
  renderChessSwissStandings(s);
  try { renderChessSwissStandingTracker(s); } catch(e) {}
  try { renderChessSwissInsights(s); } catch(e) {}
  try { renderChessSwissSeasonStats(s); } catch(e) {}
}
