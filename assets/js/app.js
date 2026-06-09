(function(){
// Knockout bracket generator for CUP seasons
function buildCupBracket(s){
  var ids = s.teams.map((_,i)=>i);
  var n = ids.length;
  
  // Check if n is a power of 2
  function isPowerOf2(num) {
    return num > 0 && (num & (num - 1)) === 0;
  }
  
  // Find bracket size
  var bracketSize;
  if(isPowerOf2(n)) {
    // If n is already a power of 2, use it directly
    bracketSize = n;
  } else {
    // Otherwise, find nearest lower power of 2
    bracketSize = 1;
    while(bracketSize * 2 < n) bracketSize *= 2;
  }
  
  var rounds = [];
  var names = [];
  var currentTeams = [];
  
  // Check if we need playoff round (only when n is NOT a power of 2)
  if(n > bracketSize) {
    // Number of teams that go directly to Round 1
    var directTeams = bracketSize - (n - bracketSize);
    // Number of teams in playoff (must be even)
    var playoffTeams = n - directTeams;
    
    // Create playoff round
    var playoff = [];
    for(var i = 0; i < playoffTeams; i += 2) {
      playoff.push({
        home: i,
        away: i + 1
      });
    }
    rounds.push(playoff);
    names.push('Playoff');
    
    // Setup teams for Round 1: interleave playoff winners with direct qualifiers
    var playoffWinners = [];
    for(var j = 0; j < playoff.length; j++) {
      playoffWinners.push({fromRound: 0, matchId: j});
    }
    
    var directQualifiers = [];
    for(var k = playoffTeams; k < n; k++) {
      directQualifiers.push(k);
    }
    
    // Interleave: direct qualifier, playoff winner, direct qualifier, playoff winner, etc.
    var pwIdx = 0;
    var dqIdx = 0;
    for(var pos = 0; pos < bracketSize; pos++) {
      if(pwIdx < playoffWinners.length && dqIdx < directQualifiers.length) {
        // Alternate between direct qualifiers and playoff winners
        if(pos % 2 === 0) {
          currentTeams.push(directQualifiers[dqIdx++]);
        } else {
          currentTeams.push(playoffWinners[pwIdx++]);
        }
      } else if(pwIdx < playoffWinners.length) {
        currentTeams.push(playoffWinners[pwIdx++]);
      } else if(dqIdx < directQualifiers.length) {
        currentTeams.push(directQualifiers[dqIdx++]);
      }
    }
  } else {
    // No playoff needed - all teams go directly to Round 1
    currentTeams = ids.slice();
  }
  
  // Build rounds until we have a winner
  var numRounds = Math.log2(bracketSize);
  var roundNames = ['Vòng 1', 'Vòng 2', 'Vòng 3', 'Vòng 4', 'Vòng 5', 'Vòng 6'];
  
  // Custom names for common round counts
  if(bracketSize === 32) {
    roundNames = ['Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Chung kết'];
  } else if(bracketSize === 16) {
    roundNames = ['Vòng 1/8', 'Tứ kết', 'Bán kết', 'Chung kết'];
  } else if(bracketSize === 8) {
    roundNames = ['Tứ kết', 'Bán kết', 'Chung kết'];
  } else if(bracketSize === 4) {
    roundNames = ['Bán kết', 'Chung kết'];
  } else if(bracketSize === 2) {
    roundNames = ['Chung kết'];
  }
  
  for(var r = 0; r < numRounds; r++) {
    var round = [];
    for(var i = 0; i < currentTeams.length; i += 2) {
      round.push({
        home: currentTeams[i],
        away: currentTeams[i + 1]
      });
    }
    
    rounds.push(round);
    names.push(roundNames[r] || ('Vòng ' + (r + 1)));
    
    // Prepare next round teams (use current rounds.length - 1 as index)
    var nextTeams = [];
    var currentRoundIdx = rounds.length - 1;
    for(var m = 0; m < round.length; m++) {
      nextTeams.push({fromRound: currentRoundIdx, matchId: m});
    }
    currentTeams = nextTeams;
  }
  
  // Insert 3rd place match before the final (if enabled)
  if(s.has3rdPlace && rounds.length >= 2) {
    var semiFinalIdx = rounds.length - 2; // Index of semi-final round
    var thirdPlaceMatch = [{
      home: {fromRound: semiFinalIdx, matchId: 0, isLoser: true},
      away: {fromRound: semiFinalIdx, matchId: 1, isLoser: true}
    }];
    // Insert before the final
    var finalRound = rounds.pop(); // Remove final
    var finalName = names.pop(); // Remove final name
    rounds.push(thirdPlaceMatch); // Add 3rd place
    names.push('Tranh hạng 3');
    rounds.push(finalRound); // Add final back
    names.push(finalName);
  }
  
  return { seeds: ids, rounds: rounds, stageNames: names };
}

// Swiss System bracket generator (CS:GO/Valorant Major style)
function buildSwissBracket(s) {
  var numTeams = s.teams.length;
  
  // Helper function to check if number is power of 2
  function isPowerOf2(num) {
    return num > 0 && (num & (num - 1)) === 0;
  }
  
  // Determine Swiss bracket size (must be power of 2: 4, 8, 16, 32...)
  var swissBracketSize;
  if(isPowerOf2(numTeams)) {
    // Already power of 2, use it directly
    swissBracketSize = numTeams;
  } else {
    // Find the nearest lower power of 2
    swissBracketSize = 1;
    while(swissBracketSize * 2 <= numTeams) {
      swissBracketSize *= 2;
    }
  }
  
  if(swissBracketSize < 4) swissBracketSize = 4;
  
  var teamsToAdvance = Math.floor(swissBracketSize / 2);
  
  // Initialize Swiss system with threshold-based rules
  var swissRounds = [];
  var prePlayoffRound = null;
  
  // If we have more teams than Swiss bracket size, create pre-Swiss playoff
  if(numTeams > swissBracketSize) {
    // Calculate how many teams need to play in pre-playoff
    // We need (numTeams - swissBracketSize) teams to be eliminated
    // So we need (numTeams - swissBracketSize) matches in pre-playoff
    var teamsToEliminate = numTeams - swissBracketSize;
    var playoffMatches = teamsToEliminate; // Each match eliminates 1 team (the loser)
    var playoffTeamsCount = playoffMatches * 2; // Each match has 2 teams
    
    // Bottom teams (0 to playoffTeamsCount-1) play in playoff
    // Top teams (playoffTeamsCount to numTeams-1) go directly to Swiss
    var matches = [];
    for(var i = 0; i < playoffTeamsCount; i += 2) {
      matches.push({
        home: i,
        away: i + 1
      });
    }
    
    prePlayoffRound = {
      matches: matches,
      generated: true,
      roundNumber: 0,
      isPrePlayoff: true
    };
    swissRounds.push(prePlayoffRound);
  }
  
  // Generate first Swiss round
  var teams;
  
  if(prePlayoffRound) {
    // Mix playoff winners with direct qualifiers
    teams = [];
    var teamsToEliminate = numTeams - swissBracketSize;
    var playoffTeamsCount = teamsToEliminate * 2; // Teams in playoff matches
    
    // Add references to playoff winners (teamsToEliminate winners will advance)
    for(var pw = 0; pw < prePlayoffRound.matches.length; pw++) {
      teams.push({fromRound: 0, matchId: pw});
    }
    
    // Add direct qualifiers (teams that skip playoff)
    // These are the top teams (from playoffTeamsCount to numTeams-1)
    for(var dq = playoffTeamsCount; dq < numTeams; dq++) {
      teams.push(dq);
    }
    
    // Shuffle the combined teams
    for(var i = teams.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = teams[i];
      teams[i] = teams[j];
      teams[j] = temp;
    }
  } else {
    // No playoff needed - use all teams
    teams = s.teams.map(function(_, i) { return i; });
    // Shuffle teams for first round
    for(var i = teams.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = teams[i];
      teams[i] = teams[j];
      teams[j] = temp;
    }
  }
  
  // Create first Swiss round matches
  var firstRound = [];
  for(var i = 0; i < teams.length; i += 2) {
    if(i + 1 < teams.length) {
      firstRound.push({
        home: teams[i],
        away: teams[i + 1]
      });
    }
  }
  
  swissRounds.push({
    matches: firstRound,
    generated: true,
    roundNumber: prePlayoffRound ? 1 : 1
  });
  
  return {
    rounds: swissRounds,
    playoffBracket: null,
    phase: 'swiss',
    winsToAdvance: 3,
    lossesToEliminate: 3,
    teamsToAdvance: teamsToAdvance,
    qualified: [],
    eliminated: [],
    swissBracketSize: swissBracketSize,
    hasPrePlayoff: prePlayoffRound !== null
  };
}

// Double Elimination bracket generator
function buildDoubleEliminationBracket(s){
  var ids = s.teams.map((_,i)=>i);
  var n = ids.length;
  
  // Check if n is a power of 2
  function isPowerOf2(num) {
    return num > 0 && (num & (num - 1)) === 0;
  }
  
  // Find bracket size
  var bracketSize;
  if(isPowerOf2(n)) {
    // If n is already a power of 2, use it directly
    bracketSize = n;
  } else {
    // Otherwise, find nearest lower power of 2
    bracketSize = 1;
    while(bracketSize * 2 < n) bracketSize *= 2;
  }
  
  // Winners bracket structure
  var winnersRounds = [];
  var winnersNames = [];
  
  // Losers bracket structure
  var losersRounds = [];
  var losersNames = [];
  
  // Playoff round structure
  var playoffRound = null;
  var playoffName = '';
  
  var currentWinners = [];
  
  // Check if we need playoff round (only when n is NOT a power of 2)
  if(n > bracketSize) {
    // Number of teams that go directly to Round 1
    var directTeams = bracketSize - (n - bracketSize);
    // Number of teams in playoff (must be even)
    var playoffTeams = n - directTeams;
    
    // Create playoff round
    var playoff = [];
    for(var i = 0; i < playoffTeams; i += 2) {
      playoff.push({
        home: i,
        away: i + 1,
        bracket: 'playoff'
      });
    }
    playoffRound = playoff;
    playoffName = 'Playoff';
    
    // Setup teams for Round 1: interleave playoff winners with direct qualifiers
    // This ensures playoff winners don't face each other in Round 1
    currentWinners = [];
    
    var playoffWinners = [];
    for(var j = 0; j < playoff.length; j++) {
      playoffWinners.push({fromRound: -1, matchId: j, bracket: 'playoff'});
    }
    
    var directQualifiers = [];
    for(var k = playoffTeams; k < n; k++) {
      directQualifiers.push(k);
    }
    
    // Interleave: playoff winner, direct qualifier, playoff winner, direct qualifier, etc.
    var pwIdx = 0;
    var dqIdx = 0;
    for(var pos = 0; pos < bracketSize; pos++) {
      if(pwIdx < playoffWinners.length && dqIdx < directQualifiers.length) {
        // Alternate between playoff winners and direct qualifiers
        if(pos % 2 === 0) {
          currentWinners.push(directQualifiers[dqIdx++]);
        } else {
          currentWinners.push(playoffWinners[pwIdx++]);
        }
      } else if(pwIdx < playoffWinners.length) {
        currentWinners.push(playoffWinners[pwIdx++]);
      } else if(dqIdx < directQualifiers.length) {
        currentWinners.push(directQualifiers[dqIdx++]);
      }
    }
  } else {
    // No playoff needed - all teams go directly to Round 1
    currentWinners = ids.slice();
    
    // Add byes if needed
    var numByes = bracketSize - n;
    for(var i = 0; i < numByes; i++) {
      currentWinners.push(null); // null represents bye
    }
  }
  
  // Calculate number of rounds
  var numWinnerRounds = Math.log2(bracketSize);
  
  // Build Winners Bracket
  for(var wr = 0; wr < numWinnerRounds; wr++) {
    var round = [];
    for(var i = 0; i < currentWinners.length; i += 2) {
      if(currentWinners[i] !== null || currentWinners[i+1] !== null) {
        round.push({
          home: currentWinners[i],
          away: currentWinners[i+1],
          bracket: 'winners'
        });
      }
    }
    winnersRounds.push(round);
    
    // Round names
    var teamsInRound = round.length * 2;
    if(teamsInRound === bracketSize) winnersNames.push('WB Vòng 1');
    else if(teamsInRound === 16) winnersNames.push('WB Vòng 1/8');
    else if(teamsInRound === 8) winnersNames.push('WB Tứ kết');
    else if(teamsInRound === 4) winnersNames.push('WB Bán kết');
    else if(teamsInRound === 2) winnersNames.push('WB Chung kết');
    else winnersNames.push('WB Vòng ' + (wr + 1));
    
    // Next round winners (placeholders)
    var nextWinners = [];
    for(var j = 0; j < round.length; j++) {
      nextWinners.push({fromRound: wr, matchId: j, bracket: 'winners'});
    }
    currentWinners = nextWinners;
  }
  
  // Build Losers Bracket
  // Losers bracket has (2 * numWinnerRounds - 1) rounds
  var numLoserRounds = 2 * numWinnerRounds - 1;
  var loserRoundIdx = 0;
  
  // First round of losers: losers from WB Round 1
  if(winnersRounds[0] && winnersRounds[0].length > 0) {
    var firstLoserRound = [];
    for(var i = 0; i < winnersRounds[0].length; i += 2) {
      firstLoserRound.push({
        home: {fromRound: 0, matchId: i, bracket: 'winners', position: 'loser'},
        away: {fromRound: 0, matchId: i+1, bracket: 'winners', position: 'loser'},
        bracket: 'losers'
      });
    }
    if(firstLoserRound.length > 0) {
      losersRounds.push(firstLoserRound);
      losersNames.push('LB Vòng 1');
      loserRoundIdx++;
    }
  }
  
  // Subsequent loser rounds alternate between:
  // 1. Winners from previous loser round
  // 2. Mix of loser round winners + new losers from winners bracket
  for(var lr = 1; lr < numLoserRounds; lr++) {
    var loserRound = [];
    
    if(lr % 2 === 1) {
      // Odd rounds: previous LB winners play against new losers from WB
      var wbRoundToLose = Math.floor(lr / 2) + 1;
      if(wbRoundToLose < winnersRounds.length) {
        var numMatches = Math.max(
          losersRounds[loserRoundIdx - 1] ? losersRounds[loserRoundIdx - 1].length : 0,
          winnersRounds[wbRoundToLose] ? winnersRounds[wbRoundToLose].length : 0
        );
        
        for(var m = 0; m < numMatches; m++) {
          loserRound.push({
            home: {fromRound: loserRoundIdx - 1, matchId: m, bracket: 'losers'},
            away: {fromRound: wbRoundToLose, matchId: m, bracket: 'winners', position: 'loser'},
            bracket: 'losers'
          });
        }
      }
    } else {
      // Even rounds: winners from previous loser round play each other
      if(losersRounds[loserRoundIdx - 1]) {
        var prevRound = losersRounds[loserRoundIdx - 1];
        for(var m = 0; m < prevRound.length; m += 2) {
          if(m + 1 < prevRound.length) {
            loserRound.push({
              home: {fromRound: loserRoundIdx - 1, matchId: m, bracket: 'losers'},
              away: {fromRound: loserRoundIdx - 1, matchId: m + 1, bracket: 'losers'},
              bracket: 'losers'
            });
          }
        }
      }
    }
    
    if(loserRound.length > 0) {
      losersRounds.push(loserRound);
      losersNames.push('LB Vòng ' + (loserRoundIdx + 1));
      loserRoundIdx++;
    }
  }
  
  // Grand Finals
  var grandFinals = [{
    home: {fromRound: winnersRounds.length - 1, matchId: 0, bracket: 'winners'},
    away: {fromRound: losersRounds.length - 1, matchId: 0, bracket: 'losers'},
    bracket: 'grand-final'
  }];
  
  return {
    seeds: ids,
    playoffRound: playoffRound,
    playoffName: playoffName,
    winnersRounds: winnersRounds,
    winnersNames: winnersNames,
    losersRounds: losersRounds,
    losersNames: losersNames,
    grandFinals: grandFinals
  };
}

// Render horizontal CUP bracket with simple column layout
function renderCupBracket(s, customHost){
  var host = customHost || document.getElementById('cupBracket');
  if(!host || !s.cup) return;
  
  host.innerHTML = '';
  host.className = 'cup-bracket-container';
  
  s.cup.rounds.forEach(function(round, roundIdx){
    var roundDiv = document.createElement('div');
    roundDiv.className = 'cup-round';
    
    var roundTitle = document.createElement('h4');
    roundTitle.className = 'cup-round-title' + 
      (s.cup.stageNames[roundIdx] === 'Chung kết' ? ' final' : '');
    roundTitle.textContent = s.cup.stageNames[roundIdx] || ('Vòng ' + (roundIdx + 1));
    roundDiv.appendChild(roundTitle);
    
    round.forEach(function(match, matchIdx){
      var key = 'cup-' + roundIdx + '-' + matchIdx;
      var result = s.results[key] || {};
      
      var homeTeam = getTeamNameForMatch(s, match.home);
      var awayTeam = getTeamNameForMatch(s, match.away);
      
      // Always show match - either with actual teams or TBD placeholders
      var shouldShowMatch = true;
      
      if(shouldShowMatch) {
        var el = document.createElement('div');
        el.className = 'fixture cup-match' + 
          (s.cup.stageNames[roundIdx] === 'Playoff' ? ' playoff' : '') +
          (s.cup.stageNames[roundIdx] === 'Chung kết' ? ' final' : '') +
          (s.cup.stageNames[roundIdx] === 'Tranh hạng 3' ? ' third-place' : '');
        el.setAttribute('data-key', key);
        
        var vhg = (result.hg == null ? '' : result.hg);
        var vag = (result.ag == null ? '' : result.ag);
        
        // Calculate max team name width for consistent sizing (use helper function)
        var maxTeamNameWidth = getMaxTeamNameWidth(s.teams);
        
        // Three-section layout
        var matchRow = document.createElement('div');
        var sectionWidth = maxTeamNameWidth + 24 + 8;
        matchRow.style.cssText = `
          display: grid;
          grid-template-columns: ${sectionWidth}px auto ${sectionWidth}px;
          gap: 12px;
          align-items: center;
          padding: 4px;
        `;
        
        // Resolve team indices - handle both direct indices and references (winner/loser)
        var displayHomeIdx = null;
        var displayAwayIdx = null;
        
        if(typeof match.home === 'number') {
          displayHomeIdx = match.home;
        } else if(match.home && match.home.isLoser) {
          // Resolve loser from previous match
          displayHomeIdx = resolveLoserFromMatch(s, match.home.fromRound, match.home.matchId);
        } else if(match.home && match.home.fromRound != null) {
          // Resolve winner from previous match
          var prevKey = 'cup-' + match.home.fromRound + '-' + match.home.matchId;
          var prevRes = s.results[prevKey];
          if(prevRes && prevRes.hg != null && prevRes.ag != null) {
            var prevMatch = s.cup.rounds[match.home.fromRound][match.home.matchId];
            var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
            var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
            if(prevHomeIdx != null && prevAwayIdx != null) {
              displayHomeIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
            }
          }
        }
        
        if(typeof match.away === 'number') {
          displayAwayIdx = match.away;
        } else if(match.away && match.away.isLoser) {
          // Resolve loser from previous match
          displayAwayIdx = resolveLoserFromMatch(s, match.away.fromRound, match.away.matchId);
        } else if(match.away && match.away.fromRound != null) {
          // Resolve winner from previous match
          var prevKey = 'cup-' + match.away.fromRound + '-' + match.away.matchId;
          var prevRes = s.results[prevKey];
          if(prevRes && prevRes.hg != null && prevRes.ag != null) {
            var prevMatch = s.cup.rounds[match.away.fromRound][match.away.matchId];
            var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
            var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
            if(prevHomeIdx != null && prevAwayIdx != null) {
              displayAwayIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
            }
          }
        }
        
        // Home logo
        var homeLogo = document.createElement('div');
        if(displayHomeIdx != null && s.teamLogos && s.teamLogos[displayHomeIdx]) {
          homeLogo.innerHTML = `<img src="${s.teamLogos[displayHomeIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
        } else {
          var homeBg = (displayHomeIdx != null && s.teamColors) ? (s.teamColors[displayHomeIdx] || '#1b2550') : '#1b2550';
          homeLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${homeBg};`;
        }
        
        // Home team name or dropdown
        var homeTeamDisplay;
        if(isAdmin() && roundIdx === 0 && typeof match.home === 'number') {
          homeTeamDisplay = document.createElement('select');
          homeTeamDisplay.className = 'teamHome';
          homeTeamDisplay.style.cssText = `font-size: 12px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); width: ${maxTeamNameWidth}px; box-sizing: border-box; padding: 2px 4px;`;
          s.teams.forEach(function(teamName, teamIdx) {
            var option = document.createElement('option');
            option.value = teamIdx;
            option.textContent = teamName;
            if(teamIdx === match.home) option.selected = true;
            homeTeamDisplay.appendChild(option);
          });
          // Add winner/loser class to dropdown
          var hgVal = parseInt(vhg, 10);
          var agVal = parseInt(vag, 10);
          if(!isNaN(hgVal) && !isNaN(agVal)) {
            if(hgVal > agVal) {
              homeTeamDisplay.className += ' bracket-team-winner';
            } else if(hgVal < agVal) {
              homeTeamDisplay.className += ' bracket-team-loser';
            }
          }
        } else {
          homeTeamDisplay = document.createElement('span');
          homeTeamDisplay.textContent = homeTeam;
          homeTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; width: ${maxTeamNameWidth}px; display: inline-block;`;
          // Add winner/loser class
          var hgVal = parseInt(vhg, 10);
          var agVal = parseInt(vag, 10);
          if(!isNaN(hgVal) && !isNaN(agVal)) {
            if(hgVal > agVal) {
              homeTeamDisplay.className = 'bracket-team-winner';
            } else if(hgVal < agVal) {
              homeTeamDisplay.className = 'bracket-team-loser';
            }
          }
        }
        
        // Home score
        var homeScore = document.createElement('input');
        homeScore.className = 'scoreH';
        homeScore.type = 'number';
        homeScore.min = '0';
        homeScore.value = vhg;
        homeScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
        
        // Away score
        var awayScore = document.createElement('input');
        awayScore.className = 'scoreA';
        awayScore.type = 'number';
        awayScore.min = '0';
        awayScore.value = vag;
        awayScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
        
        // Away team name or dropdown
        var awayTeamDisplay;
        if(isAdmin() && roundIdx === 0 && typeof match.away === 'number') {
          awayTeamDisplay = document.createElement('select');
          awayTeamDisplay.className = 'teamAway';
          awayTeamDisplay.style.cssText = `font-size: 12px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); width: ${maxTeamNameWidth}px; box-sizing: border-box; padding: 2px 4px;`;
          s.teams.forEach(function(teamName, teamIdx) {
            var option = document.createElement('option');
            option.value = teamIdx;
            option.textContent = teamName;
            if(teamIdx === match.away) option.selected = true;
            awayTeamDisplay.appendChild(option);
          });
          // Add winner/loser class to dropdown
          var hgVal = parseInt(vhg, 10);
          var agVal = parseInt(vag, 10);
          if(!isNaN(hgVal) && !isNaN(agVal)) {
            if(agVal > hgVal) {
              awayTeamDisplay.className += ' bracket-team-winner';
            } else if(agVal < hgVal) {
              awayTeamDisplay.className += ' bracket-team-loser';
            }
          }
        } else {
          awayTeamDisplay = document.createElement('span');
          awayTeamDisplay.textContent = awayTeam;
          awayTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; width: ${maxTeamNameWidth}px; display: inline-block;`;
          // Add winner/loser class
          var hgVal = parseInt(vhg, 10);
          var agVal = parseInt(vag, 10);
          if(!isNaN(hgVal) && !isNaN(agVal)) {
            if(agVal > hgVal) {
              awayTeamDisplay.className = 'bracket-team-winner';
            } else if(agVal < hgVal) {
              awayTeamDisplay.className = 'bracket-team-loser';
            }
          }
        }
        
        // Away logo
        var awayLogo = document.createElement('div');
        if(displayAwayIdx != null && s.teamLogos && s.teamLogos[displayAwayIdx]) {
          awayLogo.innerHTML = `<img src="${s.teamLogos[displayAwayIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
        } else {
          var awayBg = (displayAwayIdx != null && s.teamColors) ? (s.teamColors[displayAwayIdx] || '#1b2550') : '#1b2550';
          awayLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${awayBg};`;
        }
        
        // Create home section
        var homeSection = document.createElement('div');
        homeSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-start; width: ${sectionWidth}px;`;
        homeSection.appendChild(homeLogo);
        homeSection.appendChild(homeTeamDisplay);
        
        // Create scores section
        var scoresSection = document.createElement('div');
        scoresSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: center;`;
        var scoreDash = document.createElement('span');
        scoreDash.textContent = '–';
        scoreDash.style.cssText = `font-weight: bold; font-size: 16px; color: var(--muted); margin: 0 4px;`;
        scoresSection.appendChild(homeScore);
        scoresSection.appendChild(scoreDash);
        scoresSection.appendChild(awayScore);
        
        // Check if both teams are determined (needed for random button)
        var bothTeamsDetermined = (displayHomeIdx != null && displayAwayIdx != null);
        
        // Add random result button for admin
        if(isAdmin() && bothTeamsDetermined) {
          var randomBtn = document.createElement('button');
          randomBtn.textContent = '🎲';
          randomBtn.title = 'Random Result';
          randomBtn.style.cssText = `
            width: 24px; 
            height: 24px; 
            padding: 0; 
            margin-left: 8px;
            border: 1px solid var(--border); 
            border-radius: 4px; 
            background: var(--card); 
            color: var(--text);
            cursor: pointer; 
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          `;
          randomBtn.addEventListener('mouseenter', function() {
            this.style.background = 'var(--accent)';
            this.style.transform = 'scale(1.1)';
          });
          randomBtn.addEventListener('mouseleave', function() {
            this.style.background = 'var(--card)';
            this.style.transform = 'scale(1)';
          });
          randomBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
            
            // Generate random scores (0-5 range, with varying probabilities)
            var scores = [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5]; // Weighted random
            var homeGoals = scores[Math.floor(Math.random() * scores.length)];
            var awayGoals = scores[Math.floor(Math.random() * scores.length)];
            
            // Ensure it's not a draw (knockout must have winner)
            while(homeGoals === awayGoals) {
              awayGoals = scores[Math.floor(Math.random() * scores.length)];
            }
            
            homeScore.value = homeGoals;
            awayScore.value = awayGoals;
            
            // Trigger commit
            commit();
          });
          scoresSection.appendChild(randomBtn);
        }
        
        // Create away section
        var awaySection = document.createElement('div');
        awaySection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-end; width: ${sectionWidth}px;`;
        awaySection.appendChild(awayTeamDisplay);
        awaySection.appendChild(awayLogo);
        
        matchRow.appendChild(homeSection);
        matchRow.appendChild(scoresSection);
        matchRow.appendChild(awaySection);
        el.appendChild(matchRow);
        
        // Admin permissions
        if (isAdmin() && bothTeamsDetermined) {
          homeScore.removeAttribute('readonly');
          awayScore.removeAttribute('readonly');
          homeScore.removeAttribute('disabled');
          awayScore.removeAttribute('disabled');
        } else {
          homeScore.setAttribute('readonly', 'readonly');
          awayScore.setAttribute('readonly', 'readonly');
          homeScore.setAttribute('disabled', 'disabled');
          awayScore.setAttribute('disabled', 'disabled');
        }
        
        // Commit function
        function commit() {
          if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
          
          // Check if this round is locked (has results and next round has results)
          var isRoundLocked = false;
          if(roundIdx < s.cup.rounds.length - 1) {
            // Check if current round is complete
            var currentRoundComplete = s.cup.rounds[roundIdx].every(function(m, idx) {
              var k = 'cup-' + roundIdx + '-' + idx;
              return s.results[k] != null;
            });
            
            // Check if any next round has results
            if(currentRoundComplete) {
              for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < s.cup.rounds.length; nextRoundIdx++) {
                var hasNextRoundResults = s.cup.rounds[nextRoundIdx].some(function(m, idx) {
                  var k = 'cup-' + nextRoundIdx + '-' + idx;
                  return s.results[k] != null;
                });
                if(hasNextRoundResults) {
                  isRoundLocked = true;
                  break;
                }
              }
            }
          }
          
          // If round is locked and we're trying to change a result, ask for confirmation
          if(isRoundLocked) {
            var existingResult = s.results[key];
            if(existingResult) {
              var confirmMsg = 'This round is locked because subsequent rounds have results. Changing this will clear dependent matches. Continue?';
              if(!confirm(confirmMsg)) {
                // Restore original values
                homeScore.value = existingResult.hg;
                awayScore.value = existingResult.ag;
                return;
              }
            }
          }
          
          var needsRerender = false;
          var homeTeamSel = el.querySelector('.teamHome');
          var awayTeamSel = el.querySelector('.teamAway');
          if(homeTeamSel && awayTeamSel && roundIdx === 0) {
            var newHome = parseInt(homeTeamSel.value, 10);
            var newAway = parseInt(awayTeamSel.value, 10);
            if(newHome === newAway) {
              toast('Không thể chọn cùng một đội cho cả hai bên');
              homeTeamSel.value = match.home;
              awayTeamSel.value = match.away;
              return;
            }
            s.cup.rounds[roundIdx][matchIdx].home = newHome;
            s.cup.rounds[roundIdx][matchIdx].away = newAway;
            match.home = newHome;
            match.away = newAway;
            needsRerender = true;
          }
          var hg = homeScore.value.trim();
          var ag = awayScore.value.trim();
          
          if(hg === '' || ag === '') { 
            delete s.results[key];
            // Only clear results and reset references in subsequent rounds that depend on this match
            for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < s.cup.rounds.length; nextRoundIdx++) {
              var nextRound = s.cup.rounds[nextRoundIdx];
              nextRound.forEach(function(nextMatch, nextMatchIdx) {
                // Check if this match depends on the current match
                var dependsOnCurrent = false;
                var homeDepends = false;
                var awayDepends = false;
                
                if(nextMatch.home && typeof nextMatch.home === 'object' && 
                   nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx) {
                  dependsOnCurrent = true;
                  homeDepends = true;
                }
                if(nextMatch.away && typeof nextMatch.away === 'object' && 
                   nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx) {
                  dependsOnCurrent = true;
                  awayDepends = true;
                }
                if(typeof nextMatch.home === 'number' && 
                   (nextMatch.home === match.home || nextMatch.home === match.away)) {
                  dependsOnCurrent = true;
                  homeDepends = true;
                }
                if(typeof nextMatch.away === 'number' && 
                   (nextMatch.away === match.home || nextMatch.away === match.away)) {
                  dependsOnCurrent = true;
                  awayDepends = true;
                }
                
                // Only delete result and reset teams if this match depends on the current match
                if(dependsOnCurrent) {
                  var nextKey = 'cup-' + nextRoundIdx + '-' + nextMatchIdx;
                  delete s.results[nextKey];
                  
                  // Reset teams to reference objects
                  var isLoserRef = s.cup.stageNames[nextRoundIdx] === 'Tranh hạng 3';
                  
                  if(homeDepends && typeof nextMatch.home === 'number') {
                    nextMatch.home = {fromRound: roundIdx, matchId: matchIdx, isLoser: isLoserRef ? true : undefined};
                    if(!isLoserRef) delete nextMatch.home.isLoser;
                  }
                  
                  if(awayDepends && typeof nextMatch.away === 'number') {
                    nextMatch.away = {fromRound: roundIdx, matchId: matchIdx, isLoser: isLoserRef ? true : undefined};
                    if(!isLoserRef) delete nextMatch.away.isLoser;
                  }
                }
              });
            }
            needsRerender = true;
          } else { 
            var hgVal = parseInt(hg, 10);
            var agVal = parseInt(ag, 10);
            
            // Get old result to detect winner changes
            var oldResult = s.results[key];
            var oldWinner = null;
            var oldLoser = null;
            if(oldResult && oldResult.hg != null && oldResult.ag != null) {
              if(oldResult.hg > oldResult.ag) {
                oldWinner = match.home;
                oldLoser = match.away;
              } else if(oldResult.ag > oldResult.hg) {
                oldWinner = match.away;
                oldLoser = match.home;
              }
            }
            
            s.results[key] = { hg: hgVal, ag: agVal };
            
            // Only clear results in subsequent rounds that depend on this match
            // Don't clear parallel rounds (like Final when updating 3rd place)
            for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < s.cup.rounds.length; nextRoundIdx++) {
              var nextRound = s.cup.rounds[nextRoundIdx];
              nextRound.forEach(function(nextMatch, nextMatchIdx) {
                // Check if this match depends on the current match
                var dependsOnCurrent = false;
                
                if(nextMatch.home && typeof nextMatch.home === 'object' && 
                   nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx) {
                  dependsOnCurrent = true;
                }
                if(nextMatch.away && typeof nextMatch.away === 'object' && 
                   nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx) {
                  dependsOnCurrent = true;
                }
                if(typeof nextMatch.home === 'number' && 
                   (nextMatch.home === match.home || nextMatch.home === match.away)) {
                  dependsOnCurrent = true;
                }
                if(typeof nextMatch.away === 'number' && 
                   (nextMatch.away === match.home || nextMatch.away === match.away)) {
                  dependsOnCurrent = true;
                }
                
                // Only delete result if this match depends on the current match
                if(dependsOnCurrent) {
                  var nextKey = 'cup-' + nextRoundIdx + '-' + nextMatchIdx;
                  delete s.results[nextKey];
                }
              });
            }
            
            // Update next rounds immediately if there's a winner and/or loser
            if(hgVal !== agVal && roundIdx + 1 < s.cup.rounds.length && typeof match.home === 'number' && typeof match.away === 'number') {
              var winnerIdx = hgVal > agVal ? match.home : match.away;
              var loserIdx = hgVal > agVal ? match.away : match.home;
              
              // Check all subsequent rounds and update with new winner/loser
              for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < s.cup.rounds.length; nextRoundIdx++) {
                var nextRound = s.cup.rounds[nextRoundIdx];
                
                nextRound.forEach(function(nextMatch) {
                  // Check for WINNER references (object-based or already filled team indices)
                  var homeRefersToWinner = nextMatch.home && typeof nextMatch.home === 'object' && 
                     nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx && nextMatch.home.isLoser !== true;
                     
                  var awayRefersToWinner = nextMatch.away && typeof nextMatch.away === 'object' && 
                     nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx && nextMatch.away.isLoser !== true;
                  
                  // Check for LOSER references (object-based or already filled team indices)
                  var homeRefersToLoser = nextMatch.home && typeof nextMatch.home === 'object' && 
                     nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx && nextMatch.home.isLoser === true;
                     
                  var awayRefersToLoser = nextMatch.away && typeof nextMatch.away === 'object' && 
                     nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx && nextMatch.away.isLoser === true;
                  
                  // Also check if a team number is currently in the slot (could be either home or away from current match)
                  var homeHasOldTeam = typeof nextMatch.home === 'number' && 
                     (nextMatch.home === match.home || nextMatch.home === match.away);
                  var awayHasOldTeam = typeof nextMatch.away === 'number' && 
                     (nextMatch.away === match.home || nextMatch.away === match.away);
                  
                  // Determine if slot should have winner or loser based on stage name
                  var isLoserStage = s.cup.stageNames[nextRoundIdx] === 'Tranh hạng 3';
                  
                  // Update winner references
                  if(homeRefersToWinner) {
                    nextMatch.home = winnerIdx;
                  } else if(homeHasOldTeam && !isLoserStage) {
                    // This slot had an old team and it's not a loser stage, so it should be the winner
                    nextMatch.home = winnerIdx;
                  }
                  
                  if(awayRefersToWinner) {
                    nextMatch.away = winnerIdx;
                  } else if(awayHasOldTeam && !isLoserStage) {
                    // This slot had an old team and it's not a loser stage, so it should be the winner
                    nextMatch.away = winnerIdx;
                  }
                  
                  // Update loser references
                  if(homeRefersToLoser) {
                    nextMatch.home = loserIdx;
                  } else if(homeHasOldTeam && isLoserStage) {
                    // This slot had an old team and it's a loser stage, so it should be the loser
                    nextMatch.home = loserIdx;
                  }
                  
                  if(awayRefersToLoser) {
                    nextMatch.away = loserIdx;
                  } else if(awayHasOldTeam && isLoserStage) {
                    // This slot had an old team and it's a loser stage, so it should be the loser
                    nextMatch.away = loserIdx;
                  }
                });
              }
              needsRerender = true;
            }
          }
          saveAll();
          
          // Re-render to show updated next round and standings
          if(needsRerender) {
            setTimeout(function(){ 
              renderCupBracket(s); 
              renderCupStandings(s);
            }, 0);
          } else {
            // Update standings even if bracket doesn't need full re-render
            renderCupStandings(s);
          }
        }
        
        // Attach events
        if(isAdmin() && bothTeamsDetermined) {
          homeScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
          awayScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
          homeScore.addEventListener('blur', commit);
          awayScore.addEventListener('blur', commit);
          homeScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
          awayScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
        }
        if(isAdmin() && roundIdx === 0) {
          var homeTeamSel = el.querySelector('.teamHome');
          var awayTeamSel = el.querySelector('.teamAway');
          if(homeTeamSel) homeTeamSel.addEventListener('change', commit);
          if(awayTeamSel) awayTeamSel.addEventListener('change', commit);
        }
        
        roundDiv.appendChild(el);
      }
    });
    
    host.appendChild(roundDiv);
  });
}

// Get team name for bracket display
function getTeamNameForMatch(s, team){
  if(typeof team === 'number'){
    return s.teams[team] || ('Team ' + (team + 1));
  } else if(team && typeof team === 'object' && team.fromRound != null){
    if(team.isLoser) {
      return 'Thua ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
    }
    return 'Thắng ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
  }
  return 'TBD';
}

// Resolve loser from a match result
function resolveLoserFromMatch(s, fromRound, matchId) {
  var bracket = s.cup || s.knockoutBracket;
  if(!bracket || !bracket.rounds || !bracket.rounds[fromRound]) return null;
  
  var match = bracket.rounds[fromRound][matchId];
  if(!match) return null;
  
  var key = s.cup ? ('cup-' + fromRound + '-' + matchId) : ('knockout-' + fromRound + '-' + matchId);
  var result = s.results[key];
  
  if(!result || result.hg == null || result.ag == null) return null;
  
  var homeIdx = typeof match.home === 'number' ? match.home : null;
  var awayIdx = typeof match.away === 'number' ? match.away : null;
  
  if(homeIdx == null || awayIdx == null) return null;
  
  // Return the loser
  if(result.hg < result.ag) return homeIdx;
  if(result.ag < result.hg) return awayIdx;
  return null; // Draw has no loser
}

// Get team name for bracket display
function getTeamNameForMatch(s, team){
  if(typeof team === 'number'){
    return s.teams[team] || ('Team ' + (team + 1));
  } else if(team && typeof team === 'object' && team.fromRound != null){
    if(team.isLoser) {
      return 'Thua ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
    }
    return 'Thắng ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
  }
  return 'TBD';
}

// Render Double Elimination bracket with winners and losers brackets
function renderDoubleEliminationBracket(s){
  var host = document.getElementById('doubleEliminationBracket');
  if(!host || !s.doubleElimination) return;
  
  host.innerHTML = '';
  
  var de = s.doubleElimination;
  
  // Helper function to render a bracket section (winners/losers)
  function renderBracketSection(rounds, names, sectionTitle, sectionClass) {
    var section = document.createElement('div');
    section.className = 'de-bracket-section ' + sectionClass;
    
    var title = document.createElement('div');
    title.className = 'de-bracket-title ' + sectionClass;
    title.textContent = sectionTitle;
    section.appendChild(title);
    
    var roundsContainer = document.createElement('div');
    roundsContainer.className = 'de-bracket-rounds';
    
    rounds.forEach(function(round, roundIdx){
      // Check if previous round has ANY results (for rounds after the first)
      var canShowRound = true;
      if(roundIdx > 0) {
        var prevRound = rounds[roundIdx - 1];
        // Show next round if ANY match in previous round has a result
        canShowRound = prevRound.some(function(prevMatch){
          var prevKey = 'de-' + prevMatch.bracket + '-' + (roundIdx - 1) + '-' + prevRound.indexOf(prevMatch);
          var prevResult = s.results[prevKey];
          return prevResult && prevResult.hg != null && prevResult.ag != null;
        });
      }
      
      if(!canShowRound) {
        return; // Skip this round if previous round has no results yet
      }
      
      var roundDiv = document.createElement('div');
      roundDiv.className = 'de-round';
      
      var roundTitle = document.createElement('h4');
      roundTitle.className = 'de-round-title';
      roundTitle.textContent = names[roundIdx] || ('Vòng ' + (roundIdx + 1));
      roundDiv.appendChild(roundTitle);
      
      round.forEach(function(match, matchIdx){
        // Generate key based on bracket type
        var key;
        if(match.bracket === 'grand-final') {
          key = 'de-grand-final-' + matchIdx;
        } else {
          key = 'de-' + match.bracket + '-' + roundIdx + '-' + matchIdx;
        }
        var result = s.results[key] || {};
        
        // Resolve actual team indices
        var homeIdx = resolveDoubleEliminationTeam(s, match.home);
        var awayIdx = resolveDoubleEliminationTeam(s, match.away);
        
        // Get display names
        var homeTeam = getResolvedTeamName(s, match.home);
        var awayTeam = getResolvedTeamName(s, match.away);
        
        // Always show match - either with actual teams or TBD placeholders
        var shouldShowMatch = true;
        
        if(shouldShowMatch) {
          var el = document.createElement('div');
          el.className = 'fixture de-match ' + 
            (match.bracket === 'winners' ? 'winner-side' : 
             match.bracket === 'losers' ? 'loser-side' : 
             match.bracket === 'playoff' ? 'playoff-side' : 
             match.bracket === 'grand-final' ? 'grand-final' : '');
          el.setAttribute('data-key', key);
          
          var vhg = (result.hg == null ? '' : result.hg);
          var vag = (result.ag == null ? '' : result.ag);
          
          // Calculate max team name width for consistent sizing (use helper function)
          var baseWidth = getMaxTeamNameWidth(s.teams);
          var maxTeamNameWidth = roundIdx === 0 ? baseWidth + 12 : baseWidth;
          
          // Three-section layout
          var matchRow = document.createElement('div');
          var sectionWidth = maxTeamNameWidth + 24 + 8;
          matchRow.style.cssText = `
            display: grid;
            grid-template-columns: ${sectionWidth}px auto ${sectionWidth}px;
            gap: 12px;
            align-items: center;
            padding: 4px;
          `;
          
          var displayHomeIdx = homeIdx != null ? homeIdx : (typeof match.home === 'number' ? match.home : null);
          var displayAwayIdx = awayIdx != null ? awayIdx : (typeof match.away === 'number' ? match.away : null);
          
          // Home logo
          var homeLogo = document.createElement('div');
          if(displayHomeIdx != null && s.teamLogos && s.teamLogos[displayHomeIdx]) {
            homeLogo.innerHTML = `<img src="${s.teamLogos[displayHomeIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
          } else {
            var homeBg = (displayHomeIdx != null && s.teamColors) ? (s.teamColors[displayHomeIdx] || '#1b2550') : '#1b2550';
            homeLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${homeBg};`;
          }
          
          // Home team name or dropdown
          var homeTeamDisplay;
          if(isAdmin() && roundIdx === 0 && typeof match.home === 'number') {
            homeTeamDisplay = document.createElement('select');
            homeTeamDisplay.className = 'teamHome';
            homeTeamDisplay.style.cssText = `font-size: 12px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); width: ${maxTeamNameWidth}px; box-sizing: border-box; padding: 2px 4px;`;
            s.teams.forEach(function(teamName, teamIdx) {
              var option = document.createElement('option');
              option.value = teamIdx;
              option.textContent = teamName;
              if(teamIdx === match.home) option.selected = true;
              homeTeamDisplay.appendChild(option);
            });
            // Add winner/loser class to dropdown
            var hgVal = parseInt(vhg, 10);
            var agVal = parseInt(vag, 10);
            if(!isNaN(hgVal) && !isNaN(agVal)) {
              if(hgVal > agVal) {
                homeTeamDisplay.className += ' bracket-team-winner';
              } else if(hgVal < agVal) {
                homeTeamDisplay.className += ' bracket-team-loser';
              }
            }
          } else {
            homeTeamDisplay = document.createElement('span');
            homeTeamDisplay.textContent = homeTeam;
            homeTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; width: ${maxTeamNameWidth}px; display: inline-block;`;
            // Add winner/loser class
            var hgVal = parseInt(vhg, 10);
            var agVal = parseInt(vag, 10);
            if(!isNaN(hgVal) && !isNaN(agVal)) {
              if(hgVal > agVal) {
                homeTeamDisplay.className = 'bracket-team-winner';
              } else if(hgVal < agVal) {
                homeTeamDisplay.className = 'bracket-team-loser';
              }
            }
          }
          
          // Home score
          var homeScore = document.createElement('input');
          homeScore.className = 'scoreH';
          homeScore.type = 'number';
          homeScore.min = '0';
          homeScore.value = vhg;
          homeScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
          
          // Away score
          var awayScore = document.createElement('input');
          awayScore.className = 'scoreA';
          awayScore.type = 'number';
          awayScore.min = '0';
          awayScore.value = vag;
          awayScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
          
          // Away team name or dropdown
          var awayTeamDisplay;
          if(isAdmin() && roundIdx === 0 && typeof match.away === 'number') {
            awayTeamDisplay = document.createElement('select');
            awayTeamDisplay.className = 'teamAway';
            awayTeamDisplay.style.cssText = `font-size: 12px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); width: ${maxTeamNameWidth}px; box-sizing: border-box; padding: 2px 4px;`;
            s.teams.forEach(function(teamName, teamIdx) {
              var option = document.createElement('option');
              option.value = teamIdx;
              option.textContent = teamName;
              if(teamIdx === match.away) option.selected = true;
              awayTeamDisplay.appendChild(option);
            });
            // Add winner/loser class to dropdown
            var hgVal = parseInt(vhg, 10);
            var agVal = parseInt(vag, 10);
            if(!isNaN(hgVal) && !isNaN(agVal)) {
              if(agVal > hgVal) {
                awayTeamDisplay.className += ' bracket-team-winner';
              } else if(agVal < hgVal) {
                awayTeamDisplay.className += ' bracket-team-loser';
              }
            }
          } else {
            awayTeamDisplay = document.createElement('span');
            awayTeamDisplay.textContent = awayTeam;
            awayTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; width: ${maxTeamNameWidth}px; display: inline-block;`;
            // Add winner/loser class
            var hgVal = parseInt(vhg, 10);
            var agVal = parseInt(vag, 10);
            if(!isNaN(hgVal) && !isNaN(agVal)) {
              if(agVal > hgVal) {
                awayTeamDisplay.className = 'bracket-team-winner';
              } else if(agVal < hgVal) {
                awayTeamDisplay.className = 'bracket-team-loser';
              }
            }
          }
          
          // Away logo
          var awayLogo = document.createElement('div');
          if(displayAwayIdx != null && s.teamLogos && s.teamLogos[displayAwayIdx]) {
            awayLogo.innerHTML = `<img src="${s.teamLogos[displayAwayIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
          } else {
            var awayBg = (displayAwayIdx != null && s.teamColors) ? (s.teamColors[displayAwayIdx] || '#1b2550') : '#1b2550';
            awayLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${awayBg};`;
          }
          
          // Create home section
          var homeSection = document.createElement('div');
          homeSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-start; width: ${sectionWidth}px;`;
          homeSection.appendChild(homeLogo);
          homeSection.appendChild(homeTeamDisplay);
          
          // Create scores section
          var scoresSection = document.createElement('div');
          scoresSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: center;`;
          var scoreDash = document.createElement('span');
          scoreDash.textContent = '–';
          scoreDash.style.cssText = `font-weight: bold; font-size: 16px; color: var(--muted); margin: 0 4px;`;
          scoresSection.appendChild(homeScore);
          scoresSection.appendChild(scoreDash);
          scoresSection.appendChild(awayScore);
          
          // Check if both teams are determined (before using in random button)
          var bothTeamsDetermined = (homeIdx != null && awayIdx != null) || 
                                     (typeof match.home === 'number' && typeof match.away === 'number');
          
          // Add random result button for admin
          if(isAdmin() && bothTeamsDetermined) {
            var randomBtn = document.createElement('button');
            randomBtn.textContent = '🎲';
            randomBtn.title = 'Random Result';
            randomBtn.style.cssText = `
              width: 24px; 
              height: 24px; 
              padding: 0; 
              margin-left: 8px;
              border: 1px solid var(--border); 
              border-radius: 4px; 
              background: var(--card); 
              color: var(--text);
              cursor: pointer; 
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            `;
            randomBtn.addEventListener('mouseenter', function() {
              this.style.background = 'var(--accent)';
              this.style.transform = 'scale(1.1)';
            });
            randomBtn.addEventListener('mouseleave', function() {
              this.style.background = 'var(--card)';
              this.style.transform = 'scale(1)';
            });
            randomBtn.addEventListener('click', function(e) {
              e.preventDefault();
              if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
              
              // Generate random scores (0-5 range, with varying probabilities)
              var scores = [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5]; // Weighted random
              var homeGoals = scores[Math.floor(Math.random() * scores.length)];
              var awayGoals = scores[Math.floor(Math.random() * scores.length)];
              
              // Ensure it's not a draw (knockout must have winner)
              while(homeGoals === awayGoals) {
                awayGoals = scores[Math.floor(Math.random() * scores.length)];
              }
              
              homeScore.value = homeGoals;
              awayScore.value = awayGoals;
              
              // Trigger commit
              commit();
            });
            scoresSection.appendChild(randomBtn);
          }
          
          // Create away section
          var awaySection = document.createElement('div');
          awaySection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-end; width: ${sectionWidth}px;`;
          awaySection.appendChild(awayTeamDisplay);
          awaySection.appendChild(awayLogo);
          
          matchRow.appendChild(homeSection);
          matchRow.appendChild(scoresSection);
          matchRow.appendChild(awaySection);
          el.appendChild(matchRow);
          
          // Admin permissions
          if (isAdmin() && bothTeamsDetermined) {
            homeScore.removeAttribute('readonly');
            awayScore.removeAttribute('readonly');
            homeScore.removeAttribute('disabled');
            awayScore.removeAttribute('disabled');
          } else {
            homeScore.setAttribute('readonly', 'readonly');
            awayScore.setAttribute('readonly', 'readonly');
            homeScore.setAttribute('disabled', 'disabled');
            awayScore.setAttribute('disabled', 'disabled');
          }
          
          // Commit function
          function commit() {
            if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
            
            // Check if this round is locked (has results and dependent matches have results)
            var isRoundLocked = false;
            var existingResult = s.results[key];
            
            if(existingResult && s.doubleElimination) {
              var de = s.doubleElimination;
              var hasDependent = false;
              
              // Check all subsequent rounds in the same bracket
              if(match.bracket === 'winners' && de.winnersRounds) {
                for(var r = roundIdx + 1; r < de.winnersRounds.length; r++) {
                  var checkRound = de.winnersRounds[r];
                  for(var m = 0; m < checkRound.length; m++) {
                    var checkMatch = checkRound[m];
                    var checkKey = 'de-winners-' + r + '-' + m;
                    
                    if(s.results[checkKey]) {
                      // Check if this match depends on current match
                      if((checkMatch.home && typeof checkMatch.home === 'object' && 
                          checkMatch.home.fromRound === roundIdx && checkMatch.home.matchId === matchIdx &&
                          checkMatch.home.bracket === 'winners') ||
                         (checkMatch.away && typeof checkMatch.away === 'object' && 
                          checkMatch.away.fromRound === roundIdx && checkMatch.away.matchId === matchIdx &&
                          checkMatch.away.bracket === 'winners')) {
                        hasDependent = true;
                        break;
                      }
                    }
                  }
                  if(hasDependent) break;
                }
              }
              
              // Check losers bracket for dependencies (winners feed into losers)
              if(!hasDependent && de.losersRounds) {
                for(var r = 0; r < de.losersRounds.length; r++) {
                  var checkRound = de.losersRounds[r];
                  for(var m = 0; m < checkRound.length; m++) {
                    var checkMatch = checkRound[m];
                    var checkKey = 'de-losers-' + r + '-' + m;
                    
                    if(s.results[checkKey]) {
                      // Check if this match depends on current match
                      if((checkMatch.home && typeof checkMatch.home === 'object' && 
                          checkMatch.home.fromRound === roundIdx && checkMatch.home.matchId === matchIdx &&
                          checkMatch.home.bracket === match.bracket) ||
                         (checkMatch.away && typeof checkMatch.away === 'object' && 
                          checkMatch.away.fromRound === roundIdx && checkMatch.away.matchId === matchIdx &&
                          checkMatch.away.bracket === match.bracket)) {
                        hasDependent = true;
                        break;
                      }
                    }
                  }
                  if(hasDependent) break;
                }
              }
              
              // Check grand final
              if(!hasDependent && de.grandFinal) {
                for(var m = 0; m < de.grandFinal.length; m++) {
                  var checkMatch = de.grandFinal[m];
                  var checkKey = 'de-grand-final-' + m;
                  
                  if(s.results[checkKey]) {
                    if((checkMatch.home && typeof checkMatch.home === 'object' && 
                        checkMatch.home.fromRound === roundIdx && checkMatch.home.matchId === matchIdx &&
                        checkMatch.home.bracket === match.bracket) ||
                       (checkMatch.away && typeof checkMatch.away === 'object' && 
                        checkMatch.away.fromRound === roundIdx && checkMatch.away.matchId === matchIdx &&
                        checkMatch.away.bracket === match.bracket)) {
                      hasDependent = true;
                      break;
                    }
                  }
                }
              }
              
              isRoundLocked = hasDependent;
            }
            
            // If round is locked, ask for confirmation
            if(isRoundLocked) {
              var confirmMsg = 'This match is locked because dependent matches have results. Changing this will clear those matches. Continue?';
              if(!confirm(confirmMsg)) {
                // Restore original values
                if(existingResult) {
                  homeScore.value = existingResult.hg;
                  awayScore.value = existingResult.ag;
                }
                return;
              }
            }
            
            var needsRerender = false;
            var homeTeamSel = el.querySelector('.teamHome');
            var awayTeamSel = el.querySelector('.teamAway');
            if(homeTeamSel && awayTeamSel && roundIdx === 0) {
              var newHome = parseInt(homeTeamSel.value, 10);
              var newAway = parseInt(awayTeamSel.value, 10);
              if(newHome === newAway) {
                toast('Không thể chọn cùng một đội cho cả hai bên');
                homeTeamSel.value = match.home;
                awayTeamSel.value = match.away;
                return;
              }
              if(match.bracket === 'winners') {
                s.doubleElimination.winnersRounds[roundIdx][matchIdx].home = newHome;
                s.doubleElimination.winnersRounds[roundIdx][matchIdx].away = newAway;
              } else if(match.bracket === 'losers') {
                s.doubleElimination.losersRounds[roundIdx][matchIdx].home = newHome;
                s.doubleElimination.losersRounds[roundIdx][matchIdx].away = newAway;
              }
              match.home = newHome;
              match.away = newAway;
              needsRerender = true;
            }
            var hg = homeScore.value.trim();
            var ag = awayScore.value.trim();
            
            // Check if this is a complete result that might unlock new rounds
            var wasEmpty = !s.results[key] || s.results[key].hg == null || s.results[key].ag == null;
            var isNowFilled = (hg !== '' && ag !== '');
            
            // Check if the winner changed (result was modified)
            var winnerChanged = false;
            if(s.results[key] && hg !== '' && ag !== '') {
              var oldHg = s.results[key].hg;
              var oldAg = s.results[key].ag;
              var newHg = parseInt(hg, 10);
              var newAg = parseInt(ag, 10);
              var oldWinner = oldHg > oldAg ? 'home' : (oldAg > oldHg ? 'away' : 'draw');
              var newWinner = newHg > newAg ? 'home' : (newAg > newHg ? 'away' : 'draw');
              winnerChanged = (oldWinner !== newWinner);
            }
            
            if(hg === '' || ag === '') { delete s.results[key]; }
            else { s.results[key] = { hg: parseInt(hg, 10), ag: parseInt(ag, 10) }; }
            saveAll();
            
            // Re-render bracket and standings when result changes winner or is new
            if(needsRerender || (wasEmpty && isNowFilled) || winnerChanged) {
              setTimeout(function(){ 
                renderDoubleEliminationBracket(s);
                renderCupStandings(s);
              }, 0);
            } else {
              // Update standings even if bracket doesn't need full re-render
              renderCupStandings(s);
            }
          }
          
          // Attach events
          if(isAdmin() && bothTeamsDetermined) {
            homeScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
            awayScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
            homeScore.addEventListener('blur', commit);
            awayScore.addEventListener('blur', commit);
            homeScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
            awayScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
          }
          if(isAdmin() && roundIdx === 0) {
            var homeTeamSel = el.querySelector('.teamHome');
            var awayTeamSel = el.querySelector('.teamAway');
            if(homeTeamSel) homeTeamSel.addEventListener('change', commit);
            if(awayTeamSel) awayTeamSel.addEventListener('change', commit);
          }
          
          roundDiv.appendChild(el);
        }
      });
      
      if(roundDiv.children.length > 1) { // Only append if has matches (more than just title)
        roundsContainer.appendChild(roundDiv);
      }
    });
    
    section.appendChild(roundsContainer);
    return section;
  }
  
  // Render Playoff Round (if exists)
  if(de.playoffRound && de.playoffRound.length > 0) {
    var playoffSection = renderBracketSection(
      [de.playoffRound], 
      ['Playoff Round'], 
      '⚡ Playoff Round',
      'playoff'
    );
    host.appendChild(playoffSection);
  }
  
  // Render Winners Bracket
  if(de.winnersRounds && de.winnersRounds.length > 0) {
    var winnersSection = renderBracketSection(
      de.winnersRounds, 
      de.winnersNames, 
      '🏆 Winners Bracket',
      'winners'
    );
    host.appendChild(winnersSection);
  }
  
  // Render Losers Bracket
  if(de.losersRounds && de.losersRounds.length > 0) {
    var losersSection = renderBracketSection(
      de.losersRounds, 
      de.losersNames, 
      '💀 Losers Bracket',
      'losers'
    );
    host.appendChild(losersSection);
  }
  
  // Render Grand Finals
  if(de.grandFinals && de.grandFinals.length > 0) {
    // Check if both Winners and Losers finals have ANY results
    var canShowGrandFinals = false;
    
    // Check last round of winners bracket has any result
    if(de.winnersRounds && de.winnersRounds.length > 0) {
      var lastWinnersRound = de.winnersRounds[de.winnersRounds.length - 1];
      var hasWinnersResult = lastWinnersRound.some(function(prevMatch, idx){
        var prevKey = 'de-winners-' + (de.winnersRounds.length - 1) + '-' + idx;
        var prevResult = s.results[prevKey];
        return prevResult && prevResult.hg != null && prevResult.ag != null;
      });
      
      // Check last round of losers bracket has any result
      if(hasWinnersResult && de.losersRounds && de.losersRounds.length > 0) {
        var lastLosersRound = de.losersRounds[de.losersRounds.length - 1];
        var hasLosersResult = lastLosersRound.some(function(prevMatch, idx){
          var prevKey = 'de-losers-' + (de.losersRounds.length - 1) + '-' + idx;
          var prevResult = s.results[prevKey];
          return prevResult && prevResult.hg != null && prevResult.ag != null;
        });
        canShowGrandFinals = hasLosersResult;
      }
    }
    
    if(canShowGrandFinals) {
      var finalsSection = renderBracketSection(
        [de.grandFinals], 
        ['Grand Finals'], 
        '👑 Grand Finals',
        'grand-final'
      );
      host.appendChild(finalsSection);
    }
  }
}

// Helper function to get team name for double elimination matches
function getTeamNameForDoubleElimination(s, team) {
  if(typeof team === 'number') {
    return s.teams[team] || ('Team ' + (team + 1));
  } else if(team && typeof team === 'object') {
    if(team.bracket === 'playoff') {
      return 'Thắng PO ' + (team.matchId + 1);
    } else if(team.bracket === 'winners') {
      if(team.position === 'loser') {
        return 'Thua WB ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
      }
      return 'Thắng WB ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
    } else if(team.bracket === 'losers') {
      return 'Thắng LB ' + (team.fromRound + 1) + '-' + (team.matchId + 1);
    }
    return 'TBD';
  } else if(team === null) {
    return 'BYE';
  }
  return 'TBD';
}

// Resolve team index from match reference for double elimination
function resolveDoubleEliminationTeam(s, team, position) {
  if(typeof team === 'number') {
    return team;
  } else if(team && typeof team === 'object' && team.matchId != null) {
    var bracket = team.bracket || 'winners';
    // For playoff, fromRound is -1, but we store results with roundIdx 0
    var roundKey = (bracket === 'playoff') ? 0 : team.fromRound;
    var key = 'de-' + bracket + '-' + roundKey + '-' + team.matchId;
    var result = s.results[key];
    
    if(!result || result.hg == null || result.ag == null) {
      return null; // Match not played yet
    }
    
    // Get the previous match
    var prevMatch;
    if(bracket === 'playoff') {
      prevMatch = s.doubleElimination.playoffRound[team.matchId];
    } else if(bracket === 'winners') {
      prevMatch = s.doubleElimination.winnersRounds[team.fromRound][team.matchId];
    } else if(bracket === 'losers') {
      prevMatch = s.doubleElimination.losersRounds[team.fromRound][team.matchId];
    }
    
    if(!prevMatch) return null;
    
    var homeIdx = resolveDoubleEliminationTeam(s, prevMatch.home);
    var awayIdx = resolveDoubleEliminationTeam(s, prevMatch.away);
    
    if(homeIdx == null || awayIdx == null) return null;
    
    // Determine winner or loser based on position
    if(team.position === 'loser') {
      // Return the loser
      if(result.hg > result.ag) return awayIdx;
      if(result.ag > result.hg) return homeIdx;
      return null; // Draw - no clear loser
    } else {
      // Return the winner
      if(result.hg > result.ag) return homeIdx;
      if(result.ag > result.hg) return awayIdx;
      return null; // Draw - no clear winner
    }
  } else if(team === null) {
    return null; // BYE
  }
  return null;
}

// Get display name for resolved team in double elimination
function getResolvedTeamName(s, team, position) {
  var teamIdx = resolveDoubleEliminationTeam(s, team, position);
  if(teamIdx != null && typeof teamIdx === 'number') {
    return s.teams[teamIdx] || ('Team ' + (teamIdx + 1));
  }
  return getTeamNameForDoubleElimination(s, team);
}

// Save double elimination match scores
function saveDoubleEliminationScore(key, hg, ag) {
  var s = state.seasons[state.current];
  if(!s) return;
  
  hg = parseInt(hg);
  ag = parseInt(ag);
  
  if(!isNaN(hg) && !isNaN(ag)) {
    s.results[key] = {hg: hg, ag: ag};
  } else {
    delete s.results[key];
  }
  
  saveAll();
  refreshAll();
}

// Render Swiss System bracket
function renderSwissBracket(s) {
  var host = document.getElementById('cupBracket');
  if(!host || !s.swiss) return;
  
  host.innerHTML = '';
  host.style.cssText = 'display: block;'; // Override any flex layout
  
  var swiss = s.swiss;
  
  // Create Swiss Rounds container box
  var swissContainer = document.createElement('div');
  swissContainer.style.cssText = 'border: 2px solid var(--accent); border-radius: 8px; padding: 20px; margin-bottom: 30px; background: var(--card-bg); width: 100%;';
  
  var swissTitle = document.createElement('h3');
  swissTitle.textContent = '🎯 Swiss System Rounds';
  swissTitle.style.cssText = 'margin: 0 0 20px 0; text-align: center; color: var(--accent); font-size: 20px;';
  swissContainer.appendChild(swissTitle);
  
  var swissBracketContainer = document.createElement('div');
  swissBracketContainer.className = 'cup-bracket-container';
  swissContainer.appendChild(swissBracketContainer);
  
  // Render Swiss Rounds
  swiss.rounds.forEach(function(round, roundIdx) {
    if(!round.generated || !round.matches || round.matches.length === 0) return;
    
    var roundDiv = document.createElement('div');
    roundDiv.className = 'swiss-round';
    
    var roundTitle = document.createElement('h4');
    roundTitle.className = 'cup-round-title';
    
    // Check if this is the pre-playoff round
    if(round.isPrePlayoff) {
      roundTitle.textContent = '⚡ Pre-Swiss Playoff';
      roundTitle.style.cssText += ' background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: white;';
    } else {
      roundTitle.textContent = 'Swiss Round ' + round.roundNumber;
    }
    roundDiv.appendChild(roundTitle);

    // Admin-only: Regenerate pairings button for this Swiss round
    if(isAdmin() && !round.isPrePlayoff) {
      var regenBtn = document.createElement('button');
      regenBtn.textContent = '🔄 Regenerate';
      regenBtn.title = 'Tạo lại các cặp đấu cho vòng này (sẽ xóa kết quả của vòng này và các vòng sau)';
      regenBtn.style.cssText = 'display: block; margin: 4px auto 10px auto; padding: 4px 10px; font-size: 11px; border: 1px solid var(--accent); border-radius: 4px; background: var(--card); color: var(--text); cursor: pointer; font-weight: 600; transition: all 0.2s;';
      regenBtn.addEventListener('mouseenter', function() {
        this.style.background = 'var(--accent)';
        this.style.color = 'white';
      });
      regenBtn.addEventListener('mouseleave', function() {
        this.style.background = 'var(--card)';
        this.style.color = 'var(--text)';
      });
      (function(capturedRoundIdx, capturedRound) {
        regenBtn.addEventListener('click', function() {
          if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
          var msg = 'Tạo lại các cặp đấu cho Swiss Round ' + capturedRound.roundNumber + '?\n\n' +
                   'Lưu ý: Kết quả của vòng này và TẤT CẢ các vòng sau (kể cả playoff) sẽ bị xóa.';
          if(!confirm(msg)) return;
          regenerateSwissRound(s, capturedRoundIdx);
          saveAll();
        });
      })(roundIdx, round);
      roundDiv.appendChild(regenBtn);
    }
    
    // Calculate records up to this round for display (skip pre-playoff rounds)
    var teamRecords = s.teams.map(function() { return { wins: 0, losses: 0 }; });
    for(var r = 0; r < roundIdx; r++) {
      var prevRound = swiss.rounds[r];
      if(!prevRound.matches || prevRound.isPrePlayoff) continue; // Skip pre-playoff
      prevRound.matches.forEach(function(m, midx) {
        var k = 'swiss-' + r + '-' + midx;
        var res = s.results[k];
        if(!res) return;
        
        // Resolve team indices (in case of references)
        var homeIdx = typeof m.home === 'number' ? m.home : null;
        var awayIdx = typeof m.away === 'number' ? m.away : null;
        
        if(homeIdx == null || awayIdx == null) return;
        
        if(res.hg > res.ag) {
          teamRecords[homeIdx].wins++;
          teamRecords[awayIdx].losses++;
        } else if(res.ag > res.hg) {
          teamRecords[awayIdx].wins++;
          teamRecords[homeIdx].losses++;
        }
      });
    }
    
    round.matches.forEach(function(match, matchIdx) {
      var key = 'swiss-' + roundIdx + '-' + matchIdx;
      var result = s.results[key] || {};
      
      // Resolve team indices (handle references from previous rounds)
      var homeIdx = match.home;
      var awayIdx = match.away;
      
      if(typeof homeIdx === 'object' && homeIdx.fromRound != null) {
        // Team is a reference to winner of previous match
        var prevKey = 'swiss-' + homeIdx.fromRound + '-' + homeIdx.matchId;
        var prevResult = s.results[prevKey];
        if(prevResult && prevResult.hg != null && prevResult.ag != null) {
          var prevMatch = swiss.rounds[homeIdx.fromRound].matches[homeIdx.matchId];
          // Get the WINNER of the previous match
          homeIdx = prevResult.hg > prevResult.ag ? prevMatch.home : prevMatch.away;
        } else {
          homeIdx = null; // Match not played yet
        }
      }
      
      if(typeof awayIdx === 'object' && awayIdx.fromRound != null) {
        // Team is a reference to winner of previous match
        var prevKey = 'swiss-' + awayIdx.fromRound + '-' + awayIdx.matchId;
        var prevResult = s.results[prevKey];
        if(prevResult && prevResult.hg != null && prevResult.ag != null) {
          var prevMatch = swiss.rounds[awayIdx.fromRound].matches[awayIdx.matchId];
          // Get the WINNER of the previous match
          awayIdx = prevResult.hg > prevResult.ag ? prevMatch.home : prevMatch.away;
        } else {
          awayIdx = null; // Match not played yet
        }
      }
      
      var homeTeam = homeIdx != null ? (s.teams[homeIdx] || 'TBD') : 'TBD';
      var awayTeam = awayIdx != null ? (s.teams[awayIdx] || 'TBD') : 'TBD';
      
      // Get records for these teams (only for Swiss rounds, not pre-playoff)
      var homeRecord = null;
      var awayRecord = null;
      
      if(!round.isPrePlayoff && homeIdx != null && awayIdx != null) {
        homeRecord = teamRecords[homeIdx];
        awayRecord = teamRecords[awayIdx];
      }
      
      // Check if both teams have the same record
      var sameRecord = false;
      var recordKey = '';
      if(homeRecord && awayRecord && homeRecord.wins === awayRecord.wins && homeRecord.losses === awayRecord.losses) {
        sameRecord = true;
        recordKey = homeRecord.wins + '-' + homeRecord.losses;
      }
      
      var el = document.createElement('div');
      el.className = 'fixture cup-match';
      el.setAttribute('data-key', key);
      
      // Add background color for same-record matches
      if(sameRecord) {
        el.setAttribute('data-record', recordKey);
      }
      
      var vhg = (result.hg == null ? '' : result.hg);
      var vag = (result.ag == null ? '' : result.ag);
      
      // Calculate max team name width for consistent sizing (use helper function)
      // Add extra padding for record badge (30px) and spacing (10px)
      var maxTeamNameWidth = getMaxTeamNameWidth(s.teams) + 40;
      
      // Three-section layout with more space for team names
      var matchRow = document.createElement('div');
      var sectionWidth = maxTeamNameWidth + 22; // logo (20px) + gap (8px)
      matchRow.style.cssText = `
        display: grid;
        grid-template-columns: ${sectionWidth}px auto ${sectionWidth}px;
        gap: 12px;
        align-items: center;
        padding: 8px 12px;
      `;
      
      // Home logo
      var homeLogo = document.createElement('div');
      if(homeIdx != null && s.teamLogos && s.teamLogos[homeIdx]) {
        homeLogo.innerHTML = `<img src="${s.teamLogos[homeIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
      } else {
        var homeBg = (homeIdx != null && s.teamColors) ? (s.teamColors[homeIdx] || '#1b2550') : '#1b2550';
        homeLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${homeBg};`;
      }
      
      // Home team name with record
      var homeTeamDisplay = document.createElement('div');
      homeTeamDisplay.style.cssText = `display: flex; align-items: center; gap: 6px; width: 100%; min-width: ${maxTeamNameWidth}px;`;
      
      var homeNameSpan = document.createElement('span');
      homeNameSpan.textContent = homeTeam;
      homeNameSpan.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;`;
      
      // Add winner/loser class to name
      var hgVal = parseInt(vhg, 10);
      var agVal = parseInt(vag, 10);
      if(!isNaN(hgVal) && !isNaN(agVal)) {
        if(hgVal > agVal) {
          homeNameSpan.className = 'bracket-team-winner';
        } else if(hgVal < agVal) {
          homeNameSpan.className = 'bracket-team-loser';
        }
      }
      
      homeTeamDisplay.appendChild(homeNameSpan);
      
      // Add record badge if round > 0
      if(roundIdx > 0 && homeRecord) {
        var homeRecordBadge = document.createElement('span');
        homeRecordBadge.textContent = homeRecord.wins + '-' + homeRecord.losses;
        homeRecordBadge.style.cssText = `font-size: 10px; padding: 2px 5px; background: var(--accent); color: white; border-radius: 3px; font-weight: 600; white-space: nowrap;`;
        homeTeamDisplay.appendChild(homeRecordBadge);
      }
      
      // Home score
      var homeScore = document.createElement('input');
      homeScore.className = 'scoreH';
      homeScore.type = 'number';
      homeScore.min = '0';
      homeScore.value = vhg;
      homeScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
      
      // Away score
      var awayScore = document.createElement('input');
      awayScore.className = 'scoreA';
      awayScore.type = 'number';
      awayScore.min = '0';
      awayScore.value = vag;
      awayScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
      
      // Away team name with record
      var awayTeamDisplay = document.createElement('div');
      awayTeamDisplay.style.cssText = `display: flex; align-items: center; gap: 6px; justify-content: flex-end; width: 100%; min-width: ${maxTeamNameWidth}px;`;
      
      // Add record badge if round > 0
      if(roundIdx > 0 && awayRecord) {
        var awayRecordBadge = document.createElement('span');
        awayRecordBadge.textContent = awayRecord.wins + '-' + awayRecord.losses;
        awayRecordBadge.style.cssText = `font-size: 10px; padding: 2px 5px; background: var(--accent); color: white; border-radius: 3px; font-weight: 600; white-space: nowrap;`;
        awayTeamDisplay.appendChild(awayRecordBadge);
      }
      
      var awayNameSpan = document.createElement('span');
      awayNameSpan.textContent = awayTeam;
      awayNameSpan.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; flex: 1; min-width: 0;`;
      
      // Add winner/loser class to name
      if(!isNaN(hgVal) && !isNaN(agVal)) {
        if(agVal > hgVal) {
          awayNameSpan.className = 'bracket-team-winner';
        } else if(agVal < hgVal) {
          awayNameSpan.className = 'bracket-team-loser';
        }
      }
      
      awayTeamDisplay.appendChild(awayNameSpan);
      
      // Away logo
      var awayLogo = document.createElement('div');
      if(awayIdx != null && s.teamLogos && s.teamLogos[awayIdx]) {
        awayLogo.innerHTML = `<img src="${s.teamLogos[awayIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
      } else {
        var awayBg = (awayIdx != null && s.teamColors) ? (s.teamColors[awayIdx] || '#1b2550') : '#1b2550';
        awayLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${awayBg};`;
      }
      
      // Create home section
      var homeSection = document.createElement('div');
      homeSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-start;`;
      homeSection.appendChild(homeLogo);
      homeSection.appendChild(homeTeamDisplay);
      
      // Create scores section
      var scoresSection = document.createElement('div');
      scoresSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: center;`;
      var scoreDash = document.createElement('span');
      scoreDash.textContent = '–';
      scoreDash.style.cssText = `font-weight: bold; font-size: 16px; color: var(--muted); margin: 0 4px;`;
      scoresSection.appendChild(homeScore);
      scoresSection.appendChild(scoreDash);
      scoresSection.appendChild(awayScore);
      
      // Add random result button for admin
      if(isAdmin()) {
        var randomBtn = document.createElement('button');
        randomBtn.textContent = '🎲';
        randomBtn.title = 'Random Result';
        randomBtn.style.cssText = `
          width: 24px; 
          height: 24px; 
          padding: 0; 
          margin-left: 8px;
          border: 1px solid var(--border); 
          border-radius: 4px; 
          background: var(--card); 
          color: var(--text);
          cursor: pointer; 
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        `;
        randomBtn.addEventListener('mouseenter', function() {
          this.style.background = 'var(--accent)';
          this.style.transform = 'scale(1.1)';
        });
        randomBtn.addEventListener('mouseleave', function() {
          this.style.background = 'var(--card)';
          this.style.transform = 'scale(1)';
        });
        randomBtn.addEventListener('click', function(e) {
          e.preventDefault();
          if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
          
          // Generate random scores (0-5 range, with varying probabilities)
          var scores = [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5]; // Weighted random
          var homeGoals = scores[Math.floor(Math.random() * scores.length)];
          var awayGoals = scores[Math.floor(Math.random() * scores.length)];
          
          // Ensure it's not a draw (Swiss system should have winners)
          while(homeGoals === awayGoals) {
            awayGoals = scores[Math.floor(Math.random() * scores.length)];
          }
          
          homeScore.value = homeGoals;
          awayScore.value = awayGoals;
          
          // Trigger commit
          commit();
        });
        scoresSection.appendChild(randomBtn);
      }
      
      // Create away section
      var awaySection = document.createElement('div');
      awaySection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-end;`;
      awaySection.appendChild(awayTeamDisplay);
      awaySection.appendChild(awayLogo);
      
      // Assemble the row
      matchRow.appendChild(homeSection);
      matchRow.appendChild(scoresSection);
      matchRow.appendChild(awaySection);
      
      el.appendChild(matchRow);
      
      // Admin permissions
      if(isAdmin()) {
        homeScore.removeAttribute('readonly');
        awayScore.removeAttribute('readonly');
        homeScore.removeAttribute('disabled');
        awayScore.removeAttribute('disabled');
      } else {
        homeScore.setAttribute('readonly', 'readonly');
        awayScore.setAttribute('readonly', 'readonly');
        homeScore.setAttribute('disabled', 'disabled');
        awayScore.setAttribute('disabled', 'disabled');
      }
      
      // Commit function
      function commit() {
        if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
        
        // Check if this round is locked (fully completed with next round generated)
        var isRoundLocked = false;
        if(swiss.rounds.length > roundIdx + 1) {
          // Next round exists, check if current round was fully completed
          var allMatchesInCurrentRound = round.matches.every(function(m, idx) {
            var k = 'swiss-' + roundIdx + '-' + idx;
            return s.results[k] != null;
          });
          if(allMatchesInCurrentRound) {
            isRoundLocked = true;
          }
        }
        
        // If round is locked and we're trying to change a result, ask for confirmation
        if(isRoundLocked) {
          var existingResult = s.results[key];
          if(existingResult) {
            var confirmMsg = 'This round is locked because subsequent rounds have been generated. Changing this result will clear all subsequent rounds. Continue?';
            if(!confirm(confirmMsg)) {
              // Restore original values
              var homeInput = el.querySelector('.scoreH');
              var awayInput = el.querySelector('.scoreA');
              if(homeInput && awayInput && existingResult) {
                homeInput.value = existingResult.hg;
                awayInput.value = existingResult.ag;
              }
              return;
            }
          }
        }
        
        // Get values from the actual input elements in the DOM
        var homeInput = el.querySelector('.scoreH');
        var awayInput = el.querySelector('.scoreA');
        
        if(!homeInput || !awayInput) return;
        
        var hg = homeInput.value.trim();
        var ag = awayInput.value.trim();
        
        // Only delete if BOTH are empty (intentional clear)
        // If one is filled and one is empty, just return and wait for the other
        if(hg === '' && ag === '') {
          delete s.results[key];
          
          // If clearing a pre-playoff match, reset team references in first Swiss round
          if(round.isPrePlayoff && roundIdx + 1 < swiss.rounds.length) {
            var loserIdx = match.home; // Could be either, doesn't matter when clearing
            
            // Remove loser from eliminated list
            if(swiss.eliminated) {
              swiss.eliminated = swiss.eliminated.filter(function(idx) {
                return idx !== match.home && idx !== match.away;
              });
            }
            
            var nextRound = swiss.rounds[roundIdx + 1];
            if(nextRound && nextRound.matches) {
              nextRound.matches.forEach(function(nextMatch) {
                // Reset to reference if it was set to a team index
                if(nextMatch.home === match.home || nextMatch.home === match.away) {
                  nextMatch.home = {fromRound: roundIdx, matchId: matchIdx};
                }
                if(nextMatch.away === match.home || nextMatch.away === match.away) {
                  nextMatch.away = {fromRound: roundIdx, matchId: matchIdx};
                }
              });
            }
          }
        } else if(hg !== '' && ag !== '') {
          // Only save when BOTH have values
          var oldResult = s.results[key];
          var isResultChange = oldResult && (oldResult.hg !== parseInt(hg, 10) || oldResult.ag !== parseInt(ag, 10));
          
          s.results[key] = { hg: parseInt(hg, 10), ag: parseInt(ag, 10) };
          
          // If this is a pre-playoff match, advance winner to first Swiss round
          if(round.isPrePlayoff && roundIdx + 1 < swiss.rounds.length) {
            var hgVal = parseInt(hg, 10);
            var agVal = parseInt(ag, 10);
            var winnerIdx = hgVal > agVal ? match.home : match.away;
            var loserIdx = hgVal > agVal ? match.away : match.home;
            
            // Add loser to eliminated list with maximum losses
            if(!swiss.eliminated) swiss.eliminated = [];
            if(swiss.eliminated.indexOf(loserIdx) === -1) {
              swiss.eliminated.push(loserIdx);
            }
            
            // Store pre-playoff loser record (0 wins, 3 losses for elimination)
            if(!swiss.prePlayoffRecords) swiss.prePlayoffRecords = {};
            swiss.prePlayoffRecords[loserIdx] = { wins: 0, losses: swiss.lossesToEliminate || 3 };
            
            var nextRound = swiss.rounds[roundIdx + 1];
            if(nextRound && nextRound.matches) {
              nextRound.matches.forEach(function(nextMatch) {
                // Update ANY reference to this match (whether it's already resolved or still a reference)
                if((nextMatch.home && typeof nextMatch.home === 'object' && 
                   nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx) ||
                   nextMatch.home === match.home || nextMatch.home === match.away) {
                  nextMatch.home = winnerIdx;
                }
                if((nextMatch.away && typeof nextMatch.away === 'object' && 
                   nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx) ||
                   nextMatch.away === match.home || nextMatch.away === match.away) {
                  nextMatch.away = winnerIdx;
                }
              });
              
              // Clear first Swiss round results when pre-playoff changes
              nextRound.matches.forEach(function(m, idx) {
                var k = 'swiss-' + (roundIdx + 1) + '-' + idx;
                delete s.results[k];
              });
              
              // Clear all rounds after first Swiss round
              for(var r = roundIdx + 2; r < swiss.rounds.length; r++) {
                var subsequentRound = swiss.rounds[r];
                if(subsequentRound && subsequentRound.matches) {
                  subsequentRound.matches.forEach(function(m, idx) {
                    var k = 'swiss-' + r + '-' + idx;
                    delete s.results[k];
                  });
                  subsequentRound.generated = false;
                  subsequentRound.matches = [];
                }
              }
              
              // Truncate to first Swiss round
              swiss.rounds = swiss.rounds.slice(0, roundIdx + 2);
            }
          }
        } else {
          // One input has value, one is empty - don't do anything yet
          return;
        }
        
        // Only clear and regenerate rounds for Swiss rounds (not pre-playoff)
        if(!round.isPrePlayoff) {
          // Clear all subsequent rounds and their results when a result is changed
          // This ensures pairings are recalculated with correct records
          
          // First, collect all keys to delete
          var keysToDelete = [];
          for(var r = roundIdx + 1; r < swiss.rounds.length; r++) {
            var subsequentRound = swiss.rounds[r];
            if(subsequentRound && subsequentRound.matches) {
              subsequentRound.matches.forEach(function(m, idx) {
                var k = 'swiss-' + r + '-' + idx;
                keysToDelete.push(k);
              });
            }
          }
          
          // Delete all collected keys
          keysToDelete.forEach(function(k) {
            delete s.results[k];
          });
          
          // Also clear playoff bracket results if they exist
          if(swiss.playoffBracket && swiss.playoffBracket.rounds) {
            swiss.playoffBracket.rounds.forEach(function(pRound, pRoundIdx) {
              if(pRound) {
                pRound.forEach(function(match, matchIdx) {
                  var key = 'playoff-' + pRoundIdx + '-' + matchIdx;
                  delete s.results[key];
                });
              }
            });
            // Reset playoff bracket
            swiss.playoffBracket = null;
            swiss.playoffQualifiers = null;
          }
          
          // Reset qualified and eliminated lists (they will be recalculated)
          swiss.qualified = [];
          swiss.eliminated = swiss.prePlayoffRecords ? Object.keys(swiss.prePlayoffRecords).map(Number) : [];
          
          // Truncate rounds array to only include up to current round
          swiss.rounds = swiss.rounds.slice(0, roundIdx + 1);
          
          // Reset the current round's generated flag to ensure proper regeneration
          if(swiss.rounds[roundIdx]) {
            swiss.rounds[roundIdx].generated = true; // Keep current round as generated
          }
          
          // Regenerate all subsequent rounds if current round and all following rounds are complete
          var currentRoundIdx = roundIdx;
          var keepGenerating = true;
          
          while(keepGenerating) {
            var currentRound = swiss.rounds[currentRoundIdx];
            if(!currentRound || !currentRound.matches) {
              keepGenerating = false;
              break;
            }
            
            // Check if current round is complete
            var allMatchesPlayed = currentRound.matches.every(function(m, idx) {
              var k = 'swiss-' + currentRoundIdx + '-' + idx;
              return s.results[k] != null;
            });
            
            if(allMatchesPlayed) {
              // Generate next round
              generateNextSwissRound(s, currentRoundIdx);
              
              // Check if a new round was actually generated
              if(swiss.rounds.length > currentRoundIdx + 1) {
                currentRoundIdx++;
                // Continue to check if this new round is also complete (has results from before)
              } else {
                // No new round generated (Swiss complete or no more teams)
                keepGenerating = false;
              }
            } else {
              // Current round not complete, stop generating
              keepGenerating = false;
            }
          }
        }
        
        saveAll();
        renderSwissBracket(s);
        renderSwissStandings(s);
        
        // Scroll to the end (rightmost position) to show latest rounds
        setTimeout(function() {
          // Find the scrollable container (.cup-bracket-container inside #cupBracket)
          var cupBracket = document.getElementById('cupBracket');
          if(cupBracket) {
            var scrollContainer = cupBracket.querySelector('.cup-bracket-container');
            if(scrollContainer) {
              scrollContainer.scrollLeft = scrollContainer.scrollWidth;
            }
          }
        }, 150); // Delay to ensure rendering is complete
      }
      
      // Attach events for admin
      if(isAdmin()) {
        homeScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
        awayScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
        homeScore.addEventListener('blur', commit);
        awayScore.addEventListener('blur', commit);
        homeScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
        awayScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
      }
      
      roundDiv.appendChild(el);
    });
    
    swissBracketContainer.appendChild(roundDiv);
  });
  
  // Add Swiss container to host
  host.appendChild(swissContainer);
  
  // Render playoff bracket if available
  if(swiss.playoffBracket && swiss.playoffBracket.rounds) {
    // Create Playoff container box
    var playoffContainer = document.createElement('div');
    playoffContainer.style.cssText = 'border: 2px solid #FFD700; border-radius: 8px; padding: 20px; background: var(--card-bg); width: 100%;';
    
    var playoffTitle = document.createElement('h3');
    playoffTitle.textContent = '🏆 Knock-out stage';
    playoffTitle.style.cssText = 'margin: 0 0 20px 0; text-align: center; color: #FFD700; font-size: 20px;';
    playoffContainer.appendChild(playoffTitle);
    
    // Create a container for the playoff bracket
    var playoffBracketContainer = document.createElement('div');
    playoffBracketContainer.className = 'cup-bracket-container';
    playoffContainer.appendChild(playoffBracketContainer);
    
    // Manually render playoff bracket rounds (don't use renderCupBracket to avoid clearing Swiss rounds)
    renderSwissPlayoffBracket(s, swiss.playoffBracket, playoffBracketContainer);
    
    // Add playoff container to host
    host.appendChild(playoffContainer);
  }
}

// Render Swiss playoff bracket without clearing parent container
function renderSwissPlayoffBracket(s, playoffBracket, container) {
  if(!playoffBracket || !playoffBracket.rounds) return;
  
  container.innerHTML = '';
  
  var qualifiers = s.swiss.playoffQualifiers || [];
  
  playoffBracket.rounds.forEach(function(round, roundIdx) {
    var roundDiv = document.createElement('div');
    roundDiv.className = 'cup-round';
    
    var roundTitle = document.createElement('h4');
    roundTitle.className = 'cup-round-title' + 
      (playoffBracket.stageNames[roundIdx] === 'Chung kết' ? ' final' : '');
    roundTitle.textContent = playoffBracket.stageNames[roundIdx] || ('Vòng ' + (roundIdx + 1));
    roundDiv.appendChild(roundTitle);
    
    round.forEach(function(match, matchIdx) {
      var key = 'swiss-playoff-' + roundIdx + '-' + matchIdx;
      var result = s.results[key] || {};
      
      // Map playoff team indices back to original season team indices
      var homeIdx = typeof match.home === 'number' ? qualifiers[match.home] : null;
      var awayIdx = typeof match.away === 'number' ? qualifiers[match.away] : null;
      
      var homeTeam = homeIdx != null ? s.teams[homeIdx] : 'TBD';
      var awayTeam = awayIdx != null ? s.teams[awayIdx] : 'TBD';
      
      var el = document.createElement('div');
      el.className = 'fixture cup-match' +
        (playoffBracket.stageNames[roundIdx] === 'Chung kết' ? ' final' : '');
      el.setAttribute('data-key', key);
      
      var vhg = (result.hg == null ? '' : result.hg);
      var vag = (result.ag == null ? '' : result.ag);
      
      // Calculate max team name width (use helper function)
      var maxTeamNameWidth = getMaxTeamNameWidth(s.teams);
      
      // Three-section layout
      var matchRow = document.createElement('div');
      var sectionWidth = maxTeamNameWidth + 24 + 8;
      matchRow.style.cssText = `
        display: grid;
        grid-template-columns: ${sectionWidth}px auto ${sectionWidth}px;
        gap: 12px;
        align-items: center;
        padding: 4px;
      `;
      
      // Home logo
      var homeLogo = document.createElement('div');
      if(homeIdx != null && s.teamLogos && s.teamLogos[homeIdx]) {
        homeLogo.innerHTML = `<img src="${s.teamLogos[homeIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
      } else {
        var homeBg = (homeIdx != null && s.teamColors) ? (s.teamColors[homeIdx] || '#1b2550') : '#1b2550';
        homeLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${homeBg};`;
      }
      
      // Home team name
      var homeTeamDisplay = document.createElement('span');
      homeTeamDisplay.textContent = homeTeam;
      homeTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; width: ${maxTeamNameWidth}px; display: inline-block;`;
      var hgVal = parseInt(vhg, 10);
      var agVal = parseInt(vag, 10);
      if(!isNaN(hgVal) && !isNaN(agVal)) {
        if(hgVal > agVal) {
          homeTeamDisplay.className = 'bracket-team-winner';
        } else if(hgVal < agVal) {
          homeTeamDisplay.className = 'bracket-team-loser';
        }
      }
      
      // Home score
      var homeScore = document.createElement('input');
      homeScore.className = 'scoreH';
      homeScore.type = 'number';
      homeScore.min = '0';
      homeScore.value = vhg;
      homeScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
      
      // Away score
      var awayScore = document.createElement('input');
      awayScore.className = 'scoreA';
      awayScore.type = 'number';
      awayScore.min = '0';
      awayScore.value = vag;
      awayScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
      
      // Away team name
      var awayTeamDisplay = document.createElement('span');
      awayTeamDisplay.textContent = awayTeam;
      awayTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; width: ${maxTeamNameWidth}px; display: inline-block;`;
      if(!isNaN(hgVal) && !isNaN(agVal)) {
        if(agVal > hgVal) {
          awayTeamDisplay.className = 'bracket-team-winner';
        } else if(agVal < hgVal) {
          awayTeamDisplay.className = 'bracket-team-loser';
        }
      }
      
      // Away logo
      var awayLogo = document.createElement('div');
      if(awayIdx != null && s.teamLogos && s.teamLogos[awayIdx]) {
        awayLogo.innerHTML = `<img src="${s.teamLogos[awayIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
      } else {
        var awayBg = (awayIdx != null && s.teamColors) ? (s.teamColors[awayIdx] || '#1b2550') : '#1b2550';
        awayLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${awayBg};`;
      }
      
      // Create sections
      var homeSection = document.createElement('div');
      homeSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-start;`;
      homeSection.appendChild(homeLogo);
      homeSection.appendChild(homeTeamDisplay);
      
      var scoresSection = document.createElement('div');
      scoresSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: center;`;
      var scoreDash = document.createElement('span');
      scoreDash.textContent = '–';
      scoreDash.style.cssText = `font-weight: bold; font-size: 16px; color: var(--muted); margin: 0 4px;`;
      scoresSection.appendChild(homeScore);
      scoresSection.appendChild(scoreDash);
      scoresSection.appendChild(awayScore);
      
      var awaySection = document.createElement('div');
      awaySection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-end;`;
      awaySection.appendChild(awayTeamDisplay);
      awaySection.appendChild(awayLogo);
      
      matchRow.appendChild(homeSection);
      matchRow.appendChild(scoresSection);
      matchRow.appendChild(awaySection);
      el.appendChild(matchRow);
      
      // Admin permissions
      if(isAdmin() && homeIdx != null && awayIdx != null) {
        homeScore.removeAttribute('readonly');
        awayScore.removeAttribute('readonly');
        homeScore.removeAttribute('disabled');
        awayScore.removeAttribute('disabled');
      } else {
        homeScore.setAttribute('readonly', 'readonly');
        awayScore.setAttribute('readonly', 'readonly');
        homeScore.setAttribute('disabled', 'disabled');
        awayScore.setAttribute('disabled', 'disabled');
      }
      
      // Commit function
      function commit() {
        if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
        
        var hg = homeScore.value.trim();
        var ag = awayScore.value.trim();
        
        if(hg === '' && ag === '') {
          delete s.results[key];
        } else if(hg !== '' && ag !== '') {
          s.results[key] = { hg: parseInt(hg, 10), ag: parseInt(ag, 10) };
          
          // Advance winner and loser to next rounds
          var hgVal = parseInt(hg, 10);
          var agVal = parseInt(ag, 10);
          
          if(hgVal !== agVal && typeof match.home === 'number' && typeof match.away === 'number') {
            var winnerPlayoffIdx = hgVal > agVal ? match.home : match.away;
            var loserPlayoffIdx = hgVal > agVal ? match.away : match.home;
            
            // Check all subsequent rounds (for both winner and loser references)
            for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < playoffBracket.rounds.length; nextRoundIdx++) {
              var nextRound = playoffBracket.rounds[nextRoundIdx];
              
              nextRound.forEach(function(nextMatch) {
                // Check for WINNER references
                var homeRefersToWinner = nextMatch.home && typeof nextMatch.home === 'object' && 
                   nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx && !nextMatch.home.isLoser;
                   
                var awayRefersToWinner = nextMatch.away && typeof nextMatch.away === 'object' && 
                   nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx && !nextMatch.away.isLoser;
                
                // Check for LOSER references (for 3rd place match)
                var homeRefersToLoser = nextMatch.home && typeof nextMatch.home === 'object' && 
                   nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx && nextMatch.home.isLoser === true;
                   
                var awayRefersToLoser = nextMatch.away && typeof nextMatch.away === 'object' && 
                   nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx && nextMatch.away.isLoser === true;
                
                // Update winner references
                if(homeRefersToWinner) {
                  nextMatch.home = winnerPlayoffIdx;
                }
                if(awayRefersToWinner) {
                  nextMatch.away = winnerPlayoffIdx;
                }
                
                // Update loser references
                if(homeRefersToLoser) {
                  nextMatch.home = loserPlayoffIdx;
                }
                if(awayRefersToLoser) {
                  nextMatch.away = loserPlayoffIdx;
                }
              });
            }
          }
        } else {
          return;
        }
        
        saveAll();
        renderSwissBracket(s);
        renderSwissStandings(s);
      }
      
      // Attach events
      if(isAdmin() && homeIdx != null && awayIdx != null) {
        homeScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
        awayScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
        homeScore.addEventListener('blur', commit);
        awayScore.addEventListener('blur', commit);
        homeScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
        awayScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
      }
      
      roundDiv.appendChild(el);
    });
    
    container.appendChild(roundDiv);
  });
}

// Generate next Swiss round based on current standings
// Generate next Swiss round based on threshold system
// Regenerate pairings for a specific Swiss round (clears that round + all subsequent rounds and playoff)
function regenerateSwissRound(s, roundIdx) {
  if(!s.swiss) return;
  var swiss = s.swiss;
  var round = swiss.rounds[roundIdx];
  if(!round || round.isPrePlayoff) return;

  // Clear results from this round onward
  for(var r = roundIdx; r < swiss.rounds.length; r++) {
    var rd = swiss.rounds[r];
    if(rd && rd.matches) {
      rd.matches.forEach(function(m, idx) {
        delete s.results['swiss-' + r + '-' + idx];
      });
    }
  }

  // Clear any playoff bracket and its results
  if(swiss.playoffBracket && swiss.playoffBracket.rounds) {
    swiss.playoffBracket.rounds.forEach(function(pRound, pRoundIdx) {
      if(pRound) {
        pRound.forEach(function(match, matchIdx) {
          delete s.results['playoff-' + pRoundIdx + '-' + matchIdx];
          delete s.results['swiss-playoff-' + pRoundIdx + '-' + matchIdx];
        });
      }
    });
    swiss.playoffBracket = null;
    swiss.playoffQualifiers = null;
  }
  swiss.phase = 'swiss';

  // Truncate rounds to exclude this round (it will be regenerated)
  swiss.rounds = swiss.rounds.slice(0, roundIdx);

  // Reset qualified/eliminated (keep pre-playoff losers as eliminated)
  swiss.qualified = [];
  swiss.eliminated = swiss.prePlayoffRecords ? Object.keys(swiss.prePlayoffRecords).map(Number) : [];

  var hasPrePlayoff = swiss.rounds.length > 0 && swiss.rounds[0].isPrePlayoff;
  var firstSwissIdx = hasPrePlayoff ? 1 : 0;

  if(roundIdx === firstSwissIdx) {
    // Regenerate the first Swiss round by re-shuffling teams
    var numTeams = s.teams.length;
    var teams;
    if(hasPrePlayoff) {
      var prePlayoffRound = swiss.rounds[0];
      teams = [];
      for(var pw = 0; pw < prePlayoffRound.matches.length; pw++) {
        var ppKey = 'swiss-0-' + pw;
        var ppRes = s.results[ppKey];
        var ppMatch = prePlayoffRound.matches[pw];
        if(ppRes && ppRes.hg != null && ppRes.ag != null) {
          var winner = ppRes.hg > ppRes.ag ? ppMatch.home : ppMatch.away;
          teams.push(winner);
        } else {
          teams.push({fromRound: 0, matchId: pw});
        }
      }
      var teamsToEliminate = numTeams - (swiss.swissBracketSize || numTeams);
      var playoffTeamsCount = teamsToEliminate * 2;
      for(var dq = playoffTeamsCount; dq < numTeams; dq++) {
        teams.push(dq);
      }
    } else {
      teams = s.teams.map(function(_, i) { return i; });
    }
    for(var i = teams.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = teams[i]; teams[i] = teams[j]; teams[j] = t;
    }
    var firstRound = [];
    for(var i = 0; i < teams.length; i += 2) {
      if(i + 1 < teams.length) {
        firstRound.push({ home: teams[i], away: teams[i + 1] });
      }
    }
    swiss.rounds.push({
      matches: firstRound,
      generated: true,
      roundNumber: 1
    });
    saveAll();
  } else {
    // Regenerate based on records up to previous round
    generateNextSwissRound(s, roundIdx - 1);
  }

  renderSwissBracket(s);
  renderSwissStandings(s);
}

function generateNextSwissRound(s, roundIdx) {
  if(!s.swiss) return;
  
  var swiss = s.swiss;
  var winsToAdvance = swiss.winsToAdvance || 3;
  var lossesToEliminate = swiss.lossesToEliminate || 3;
  var teamsToAdvance = swiss.teamsToAdvance;
  
  // Calculate current records for all teams
  var teamRecords = s.teams.map(function(team, idx) {
    // Check if team has pre-playoff record (loser)
    var preRecord = swiss.prePlayoffRecords && swiss.prePlayoffRecords[idx];
    
    return { 
      idx: idx, 
      wins: preRecord ? preRecord.wins : 0, 
      losses: preRecord ? preRecord.losses : 0, 
      gf: 0, 
      ga: 0,
      status: 'active' // 'active', 'qualified', 'eliminated'
    };
  });
  
  // Process all completed rounds (skip pre-playoff rounds)
  swiss.rounds.forEach(function(round, rIdx) {
    if(!round.matches || round.isPrePlayoff) return; // Skip pre-playoff
    
    round.matches.forEach(function(match, mIdx) {
      var key = 'swiss-' + rIdx + '-' + mIdx;
      var result = s.results[key];
      if(!result) return;
      
      // Resolve team indices (in case they're references)
      var homeIdx = typeof match.home === 'number' ? match.home : null;
      var awayIdx = typeof match.away === 'number' ? match.away : null;
      
      if(homeIdx == null || awayIdx == null) return;
      
      var home = teamRecords[homeIdx];
      var away = teamRecords[awayIdx];
      
      home.gf += result.hg;
      home.ga += result.ag;
      away.gf += result.ag;
      away.ga += result.hg;
      
      if(result.hg > result.ag) {
        home.wins++;
        away.losses++;
      } else if(result.ag > result.hg) {
        away.wins++;
        home.losses++;
      }
    });
  });
  
  // Mark teams as qualified or eliminated based on thresholds
  var qualified = [];
  var eliminated = [];
  var active = [];
  
  // First, mark pre-playoff losers as eliminated
  var prePlayoffEliminated = swiss.eliminated || [];
  
  teamRecords.forEach(function(team) {
    // Check if team was eliminated in pre-playoff
    if(prePlayoffEliminated.indexOf(team.idx) !== -1) {
      team.status = 'eliminated';
      eliminated.push(team);
    } else if(team.wins >= winsToAdvance) {
      team.status = 'qualified';
      qualified.push(team);
    } else if(team.losses >= lossesToEliminate) {
      team.status = 'eliminated';
      eliminated.push(team);
    } else {
      active.push(team);
    }
  });
  
  // Sort qualified by wins then GD
  qualified.sort(function(a, b) {
    if(a.wins !== b.wins) return b.wins - a.wins;
    var gdA = a.gf - a.ga;
    var gdB = b.gf - b.ga;
    if(gdA !== gdB) return gdB - gdA;
    return b.gf - a.gf;
  });
  
  // Update swiss data
  swiss.qualified = qualified.map(function(t) { return t.idx; });
  swiss.eliminated = eliminated.map(function(t) { return t.idx; });
  
  // Check if Swiss is complete
  if(qualified.length >= teamsToAdvance && active.length === 0) {
    // Swiss complete - generate playoffs
    generateSwissPlayoffs(s);
    return;
  }
  
  // If no active teams, Swiss is done
  if(active.length === 0) {
    return;
  }
  
  // Group active teams by record
  var recordGroups = {};
  active.forEach(function(team) {
    var record = team.wins + '-' + team.losses;
    if(!recordGroups[record]) {
      recordGroups[record] = [];
    }
    recordGroups[record].push(team);
  });

  // Shuffle teams within each record group so regenerate produces different pairings
  Object.keys(recordGroups).forEach(function(rec) {
    var arr = recordGroups[rec];
    for(var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  });
  
  // Build matchup history (skip pre-playoff)
  var hasPlayed = {};
  swiss.rounds.forEach(function(round) {
    if(!round.matches || round.isPrePlayoff) return; // Skip pre-playoff
    round.matches.forEach(function(match) {
      // Resolve team indices
      var homeIdx = typeof match.home === 'number' ? match.home : null;
      var awayIdx = typeof match.away === 'number' ? match.away : null;
      if(homeIdx != null && awayIdx != null) {
        var key1 = homeIdx + '-' + awayIdx;
        var key2 = awayIdx + '-' + homeIdx;
        hasPlayed[key1] = true;
        hasPlayed[key2] = true;
      }
    });
  });
  
  // Sort record groups by wins (descending)
  var sortedRecords = Object.keys(recordGroups).sort(function(a, b) {
    var winsA = parseInt(a.split('-')[0]);
    var winsB = parseInt(b.split('-')[0]);
    if(winsA !== winsB) return winsB - winsA;
    var lossesA = parseInt(a.split('-')[1]);
    var lossesB = parseInt(b.split('-')[1]);
    return lossesA - lossesB;
  });
  
  // Pair teams within record groups, handle odd groups
  var matches = [];
  var paired = {};
  var carryOver = null;

  // Backtracking: find a perfect pairing of `teams` with NO rematches.
  // Returns array of pairs [[a,b],...] or null if impossible.
  function findNoRematchPairing(teams) {
    if(teams.length === 0) return [];
    if(teams.length % 2 !== 0) return null;
    var first = teams[0];
    for(var i = 1; i < teams.length; i++) {
      var pairKey = first.idx + '-' + teams[i].idx;
      if(hasPlayed[pairKey]) continue;
      var remaining = [];
      for(var j = 1; j < teams.length; j++) {
        if(j !== i) remaining.push(teams[j]);
      }
      var rest = findNoRematchPairing(remaining);
      if(rest !== null) {
        return [[first, teams[i]]].concat(rest);
      }
    }
    return null;
  }

  sortedRecords.forEach(function(record) {
    var group = recordGroups[record];

    // Add carry-over from previous (higher) group if exists
    if(carryOver) {
      group.unshift(carryOver);
      carryOver = null;
    }

    // If odd number in group, push the lowest-rated (last after shuffle) to next group
    if(group.length % 2 === 1) {
      carryOver = group.pop();
    }

    // Try strict no-rematch pairing via backtracking
    var pairs = findNoRematchPairing(group);

    if(pairs === null) {
      // Impossible to fully avoid rematches in this group - fall back to greedy
      // (minimize rematches by trying no-rematch first per pick)
      pairs = [];
      var used = {};
      for(var i = 0; i < group.length; i++) {
        if(used[i]) continue;
        var foundOpponent = -1;
        for(var j = i + 1; j < group.length; j++) {
          if(used[j]) continue;
          var k = group[i].idx + '-' + group[j].idx;
          if(!hasPlayed[k]) { foundOpponent = j; break; }
        }
        if(foundOpponent === -1) {
          for(var j = i + 1; j < group.length; j++) {
            if(!used[j]) { foundOpponent = j; break; }
          }
        }
        if(foundOpponent !== -1) {
          pairs.push([group[i], group[foundOpponent]]);
          used[i] = true;
          used[foundOpponent] = true;
        }
      }
    }

    pairs.forEach(function(p) {
      matches.push({ home: p[0].idx, away: p[1].idx });
      paired[p[0].idx] = true;
      paired[p[1].idx] = true;
      // Update local history so subsequent groups (e.g. carry-over) don't repeat against either
      var k1 = p[0].idx + '-' + p[1].idx;
      var k2 = p[1].idx + '-' + p[0].idx;
      hasPlayed[k1] = true;
      hasPlayed[k2] = true;
    });
  });
  
  // Handle final carry-over if exists
  if(carryOver && !paired[carryOver.idx]) {
    // This shouldn't happen with even team counts, but handle it
    console.warn('Swiss: Unpaired team remaining:', carryOver.idx);
  }
  
  // Add new round if there are matches
  if(matches.length > 0) {
    // Calculate correct round number (count only Swiss rounds, not pre-playoff)
    var swissRoundCount = 0;
    swiss.rounds.forEach(function(r) {
      if(!r.isPrePlayoff) swissRoundCount++;
    });
    
    swiss.rounds.push({
      matches: matches,
      generated: true,
      roundNumber: swissRoundCount + 1
    });
    saveAll();
  }
}

// Generate playoff bracket from top Swiss performers
function generateSwissPlayoffs(s) {
  if(!s.swiss || s.swiss.playoffBracket) return;
  
  var swiss = s.swiss;
  var qualifiedTeams = swiss.qualified || [];
  
  // If not enough teams qualified yet, return
  if(qualifiedTeams.length < swiss.teamsToAdvance) return;
  
  // Calculate final records for sorting
  var teamRecords = qualifiedTeams.map(function(teamIdx) {
    var record = { idx: teamIdx, wins: 0, losses: 0, gf: 0, ga: 0 };
    
    swiss.rounds.forEach(function(round, r) {
      if(!round.matches) return;
      
      round.matches.forEach(function(match, midx) {
        if(match.home !== teamIdx && match.away !== teamIdx) return;
        
        var key = 'swiss-' + r + '-' + midx;
        var result = s.results[key];
        if(!result) return;
        
        if(match.home === teamIdx) {
          record.gf += result.hg;
          record.ga += result.ag;
          if(result.hg > result.ag) record.wins++;
          else if(result.hg < result.ag) record.losses++;
        } else {
          record.gf += result.ag;
          record.ga += result.hg;
          if(result.ag > result.hg) record.wins++;
          else if(result.ag < result.hg) record.losses++;
        }
      });
    });
    
    return record;
  });
  
  // Sort qualified teams by wins, then GD, then GF
  teamRecords.sort(function(a, b) {
    if(a.wins !== b.wins) return b.wins - a.wins;
    var gdA = a.gf - a.ga;
    var gdB = b.gf - b.ga;
    if(gdA !== gdB) return gdB - gdA;
    return b.gf - a.gf;
  });
  
  // Take only the number we need for playoffs (should already be exact)
  var playoffQualifiers = teamRecords.slice(0, swiss.teamsToAdvance).map(function(r) { return r.idx; });

  // Reorder qualifiers using standard single-elimination bracket seeding:
  // n=2  -> [1,2]; n=4 -> [1,4,2,3]; n=8 -> [1,8,4,5,2,7,3,6]; n=16 -> ...
  // This ensures seed 1 vs lowest seed, and top seeds are on opposite halves
  // of the bracket (only meet in the final).
  function bracketSeedOrder(n) {
    if(n <= 1) return [0];
    var half = bracketSeedOrder(n / 2);
    var out = [];
    for(var i = 0; i < half.length; i++) {
      out.push(half[i]);
      out.push(n - 1 - half[i]);
    }
    return out;
  }

  var seedCount = playoffQualifiers.length;
  // Only reorder when seedCount is a power of 2 (Swiss teamsToAdvance always is)
  var isPow2 = seedCount > 0 && (seedCount & (seedCount - 1)) === 0;
  if(isPow2) {
    var order = bracketSeedOrder(seedCount);
    playoffQualifiers = order.map(function(i) { return playoffQualifiers[i]; });
  }

  // Build single elimination bracket
  var tempSeason = {
    teams: playoffQualifiers.map(function(idx) { return s.teams[idx]; }),
    teamCount: playoffQualifiers.length,
    has3rdPlace: s.has3rdPlace || false
  };

  // Create playoff bracket
  s.swiss.playoffBracket = buildCupBracket(tempSeason);
  // Map team indices back to original (in the bracket-seeded order)
  s.swiss.playoffQualifiers = playoffQualifiers;
  s.swiss.phase = 'playoff';

  saveAll();
}

// Render Swiss standings
function renderSwissStandings(s) {
  $('seasonTitle').textContent = '— ' + s.name + ' (SWISS SYSTEM)';
  $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';
  
  // Update table header for Swiss mode
  var thead = document.querySelector('#tblStandings thead tr');
  if(thead) {
    thead.innerHTML = '<th class="pos">#</th>' +
                      '<th>Đội</th>' +
                      '<th>Record</th>' +
                      '<th>P</th><th>W</th><th>L</th>' +
                      '<th>GF</th><th>GA</th><th>GD</th>' +
                      '<th style="text-align: center;">Stage</th>';
  }
  
  var tbody = $('standings');
  tbody.innerHTML = '';
  
  // Calculate standings
  var standings = s.teams.map(function(team, idx) {
    // Check if team has pre-playoff record (loser)
    var preRecord = s.swiss.prePlayoffRecords && s.swiss.prePlayoffRecords[idx];
    
    return {
      idx: idx,
      team: team,
      P: 0, 
      W: preRecord ? preRecord.wins : 0, 
      D: 0, 
      L: preRecord ? preRecord.losses : 0,
      GF: 0, GA: 0, GD: 0, Pts: 0,
      stage: '',
      playoffStage: null
    };
  });
  
  // Add Swiss rounds results (skip pre-playoff)
  s.swiss.rounds.forEach(function(round, r) {
    if(!round.matches || round.isPrePlayoff) return; // Skip pre-playoff
    
    round.matches.forEach(function(match, midx) {
      var key = 'swiss-' + r + '-' + midx;
      var result = s.results[key];
      if(!result) return;
      
      // Resolve team indices
      var homeIdx = typeof match.home === 'number' ? match.home : null;
      var awayIdx = typeof match.away === 'number' ? match.away : null;
      
      if(homeIdx == null || awayIdx == null) return;
      
      var home = standings[homeIdx];
      var away = standings[awayIdx];
      
      home.P++; away.P++;
      home.GF += result.hg; home.GA += result.ag;
      away.GF += result.ag; away.GA += result.hg;
      
      if(result.hg > result.ag) {
        home.W++; home.Pts += 3;
        away.L++;
      } else if(result.ag > result.hg) {
        away.W++; away.Pts += 3;
        home.L++;
      } else {
        home.D++; home.Pts++;
        away.D++; away.Pts++;
      }
      
      home.GD = home.GF - home.GA;
      away.GD = away.GF - away.GA;
    });
  });
  
  // Add playoff bracket results if playoffs exist
  if(s.swiss.playoffBracket && s.swiss.playoffBracket.rounds) {
    var qualifiers = s.swiss.playoffQualifiers || [];
    
    s.swiss.playoffBracket.rounds.forEach(function(round, roundIdx) {
      round.forEach(function(match, matchIdx) {
        var key = 'swiss-playoff-' + roundIdx + '-' + matchIdx;
        var result = s.results[key];
        
        // Map playoff team indices back to original season team indices
        var homeIdx = typeof match.home === 'number' ? qualifiers[match.home] : null;
        var awayIdx = typeof match.away === 'number' ? qualifiers[match.away] : null;
        
        if(homeIdx != null && awayIdx != null && result) {
          var home = standings[homeIdx];
          var away = standings[awayIdx];
          
          home.P++; away.P++;
          home.GF += result.hg; home.GA += result.ag;
          away.GF += result.ag; away.GA += result.hg;
          
          var stageName = s.swiss.playoffBracket.stageNames[roundIdx] || 'Knockout';
          
          if(result.hg > result.ag) {
            home.W++; home.Pts += 3;
            away.L++;
            // Winner advances to next stage, loser stays at current stage
            if(stageName === 'Final' || stageName === 'Chung kết') {
              home.playoffStage = 'Winner';
              away.playoffStage = 'Runner-up';
            } else if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') {
              home.playoffStage = '3rd Place';
              away.playoffStage = '4th Place';
            } else {
              // Winner gets next stage
              home.playoffStage = s.swiss.playoffBracket.stageNames[roundIdx + 1] || stageName;
              // Loser stays at current stage (only if not set to a better stage already)
              if(!away.playoffStage) {
                away.playoffStage = stageName;
              }
            }
          } else if(result.ag > result.hg) {
            away.W++; away.Pts += 3;
            home.L++;
            // Winner advances to next stage, loser stays at current stage
            if(stageName === 'Final' || stageName === 'Chung kết') {
              away.playoffStage = 'Winner';
              home.playoffStage = 'Runner-up';
            } else if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') {
              away.playoffStage = '3rd Place';
              home.playoffStage = '4th Place';
            } else {
              // Winner gets next stage
              away.playoffStage = s.swiss.playoffBracket.stageNames[roundIdx + 1] || stageName;
              // Loser stays at current stage (only if not set to a better stage already)
              if(!home.playoffStage) {
                home.playoffStage = stageName;
              }
            }
          } else {
            home.D++; home.Pts++;
            away.D++; away.Pts++;
          }
          
          home.GD = home.GF - home.GA;
          away.GD = away.GF - away.GA;
        }
      });
    });
  }
  
  standings.sort(function(a, b) {
    // Sort by playoff stage first
    var stageOrder = ['Winner', 'Runner-up', '3rd Place', '4th Place', 'Semi-finals', 'Quarter-finals'];
    var stageA = a.playoffStage ? stageOrder.indexOf(a.playoffStage) : 999;
    var stageB = b.playoffStage ? stageOrder.indexOf(b.playoffStage) : 999;
    
    // If stage not found in array, indexOf returns -1, set it to a high number
    if(stageA === -1) stageA = 100;
    if(stageB === -1) stageB = 100;
    
    if(stageA !== stageB) return stageA - stageB;
    
    // Then by wins
    if(a.W !== b.W) return b.W - a.W;
    if(a.GD !== b.GD) return b.GD - a.GD;
    return b.GF - a.GF;
  });
  
  var winsToAdvance = s.swiss.winsToAdvance || 3;
  var lossesToEliminate = s.swiss.lossesToEliminate || 3;
  
  standings.forEach(function(row, pos) {
    var tr = document.createElement('tr');
    
    var stage = '';
    var stageBadge = '';
    var rowStyle = '';
    
    // Determine stage based on playoff results or Swiss status
    if(row.playoffStage) {
      stage = row.playoffStage;
      if(stage === 'Winner') {
        stageBadge = '<span style="background: #FFD700; color: #000; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">🏆 Winner</span>';
        rowStyle = ' style="background: rgba(255, 215, 0, 0.2); font-weight: bold;"';
      } else if(stage === 'Runner-up') {
        stageBadge = '<span style="background: #C0C0C0; color: #000; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">🥈 Runner-up</span>';
        rowStyle = ' style="background: rgba(192, 192, 192, 0.2);"';
      } else if(stage === '3rd Place') {
        stageBadge = '<span style="background: #CD7F32; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">🥉 3rd Place</span>';
        rowStyle = ' style="background: rgba(205, 127, 50, 0.2);"';
      } else if(stage === '4th Place') {
        stageBadge = '<span style="background: #8B4513; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">4th Place</span>';
        rowStyle = ' style="background: rgba(139, 69, 19, 0.15);"';
      } else if(stage === 'Semi-finals') {
        stageBadge = '<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">Semi-finals</span>';
        rowStyle = ' style="background: rgba(59, 130, 246, 0.1);"';
      } else if(stage === 'Quarter-finals') {
        stageBadge = '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">Quarter-finals</span>';
        rowStyle = ' style="background: rgba(34, 197, 94, 0.1);"';
      } else {
        stageBadge = '<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">' + stage + '</span>';
        rowStyle = ' style="background: rgba(59, 130, 246, 0.1);"';
      }
    } else if(row.W >= winsToAdvance) {
      stage = 'Qualified';
      stageBadge = '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">✓ Qualified</span>';
      rowStyle = ' style="background: rgba(34, 197, 94, 0.15);"';
    } else if(row.L >= lossesToEliminate) {
      stage = 'Eliminated';
      stageBadge = '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">✗ Eliminated</span>';
      rowStyle = ' style="background: rgba(239, 68, 68, 0.1); opacity: 0.6;"';
    } else {
      var winsLeft = winsToAdvance - row.W;
      var lossesLeft = lossesToEliminate - row.L;

      if(winsLeft === 1 && lossesLeft === 1) {
        stage = 'Decider Match';
        rowStyle = ' style="background: rgba(168, 85, 247, 0.12);"';
        stageBadge = '<span style="background: #a855f7; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">2-2 Decider</span>';
      } else if(winsLeft === 1) {
        stage = 'One Win Away';
        rowStyle = ' style="background: rgba(59, 130, 246, 0.1);"';
        stageBadge = '<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">1 Win To Qualify</span>';
      } else if(lossesLeft === 1) {
        stage = 'One Loss Away';
        rowStyle = ' style="background: rgba(245, 158, 11, 0.12);"';
        stageBadge = '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">1 Loss To Eliminate</span>';
      } else {
        stage = 'Active';
        stageBadge = '<span style="background: #64748b; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">Active</span>';
      }
    }
    
    var logo = s.teamLogos && s.teamLogos[row.idx] ? '<img src="' + s.teamLogos[row.idx] + '" alt="logo"/>' : '';
    var badge = logo ? ('<span class="badge">' + logo + '</span>') : ('<span class="badge" style="background:' + (s.teamColors[row.idx] || '#1b2550') + '"></span>');
    
    var record = row.W + '-' + row.L;
    
    tr.innerHTML = '<td' + rowStyle + '>' + (pos + 1) + '</td>' +
                  '<td' + rowStyle + ' class="team">' + badge + row.team + '</td>' +
                  '<td' + rowStyle + ' style="font-weight: 600;">' + record + '</td>' +
                  '<td' + rowStyle + '>' + row.P + '</td>' +
                  '<td' + rowStyle + '>' + row.W + '</td>' +
                  '<td' + rowStyle + '>' + row.L + '</td>' +
                  '<td' + rowStyle + '>' + row.GF + '</td>' +
                  '<td' + rowStyle + '>' + row.GA + '</td>' +
                  '<td' + rowStyle + '>' + row.GD + '</td>' +
                  '<td' + rowStyle + ' style="text-align: center;">' + stageBadge + '</td>';
    tbody.appendChild(tr);
  });
}

// Render CUP standings table showing tournament progress
function renderCupStandings(s){
  var modeLabel = s.mode === 'cup' ? 'CUP' : s.mode === 'double-elimination' ? 'DOUBLE ELIMINATION' : 'CUP';
  $('seasonTitle').textContent='— '+s.name+' (' + modeLabel + ')';
  $('leagueLogo').style.backgroundImage=s.logo?('url("'+s.logo+'")'):'none';
  
  // Update table header for Cup and Double Elimination modes
  var thead = document.querySelector('#tblStandings thead tr');
  if(thead) {
    thead.innerHTML = '<th class="pos">#</th>' +
                      '<th>Đội</th>' +
                      '<th>P</th><th>W</th><th>D</th><th>L</th>' +
                      '<th>GF</th><th>GA</th><th>GD</th><th>Pts</th>' +
                      '<th>Status</th>';
  }
  
  var tbody=$('standings'); 
  tbody.innerHTML='';
  
  // Create standings based on CUP or Double Elimination results using standard scoring
  var statusMap = {};
  s.teams.forEach(function(team, idx){
    statusMap[idx] = {
      team: team,
      idx: idx,
      status: 'Tham gia',
      round: 'Chưa bắt đầu',
      P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0
    };
  });
  
  // Process results based on mode
  if(s.mode === 'cup' && s.cup && s.cup.rounds) {
    // Check each round to update team status and calculate points
    s.cup.rounds.forEach(function(round, roundIdx){
      round.forEach(function(match, matchIdx){
        var key = 'cup-' + roundIdx + '-' + matchIdx;
      var result = s.results[key];
      
      // Resolve team indices - handle both direct indices and references (winner/loser)
      var homeIdx = null;
      var awayIdx = null;
      
      if(typeof match.home === 'number') {
        homeIdx = match.home;
      } else if(match.home && match.home.isLoser) {
        homeIdx = resolveLoserFromMatch(s, match.home.fromRound, match.home.matchId);
      } else if(match.home && match.home.fromRound != null) {
        // Resolve winner from previous match
        var prevKey = 'cup-' + match.home.fromRound + '-' + match.home.matchId;
        var prevRes = s.results[prevKey];
        if(prevRes && prevRes.hg != null && prevRes.ag != null) {
          var prevMatch = s.cup.rounds[match.home.fromRound][match.home.matchId];
          var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
          var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
          if(prevHomeIdx != null && prevAwayIdx != null) {
            homeIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
          }
        }
      }
      
      if(typeof match.away === 'number') {
        awayIdx = match.away;
      } else if(match.away && match.away.isLoser) {
        awayIdx = resolveLoserFromMatch(s, match.away.fromRound, match.away.matchId);
      } else if(match.away && match.away.fromRound != null) {
        // Resolve winner from previous match
        var prevKey = 'cup-' + match.away.fromRound + '-' + match.away.matchId;
        var prevRes = s.results[prevKey];
        if(prevRes && prevRes.hg != null && prevRes.ag != null) {
          var prevMatch = s.cup.rounds[match.away.fromRound][match.away.matchId];
          var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
          var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
          if(prevHomeIdx != null && prevAwayIdx != null) {
            awayIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
          }
        }
      }
      
      if(result && homeIdx != null && awayIdx != null){
        var hTeam = statusMap[homeIdx];
        var aTeam = statusMap[awayIdx];
        
        if(hTeam && aTeam){
          hTeam.P++; aTeam.P++;
          hTeam.GF += result.hg; hTeam.GA += result.ag;
          aTeam.GF += result.ag; aTeam.GA += result.hg;
          
          if(result.hg > result.ag){
            // Home team wins: 3 points, away team loses: 0 points
            hTeam.W++; aTeam.L++;
            hTeam.Pts += 3; aTeam.Pts += 0;
            // Winner continues - update their current round
            hTeam.round = s.cup.stageNames[roundIdx] + ' (Thắng)';
            // Loser is eliminated - mark with their elimination round
            if(aTeam.status !== 'Bị loại') {
              aTeam.status = 'Bị loại';
              aTeam.round = 'Loại tại ' + s.cup.stageNames[roundIdx];
            }
          } else if(result.ag > result.hg){
            // Away team wins: 3 points, home team loses: 0 points
            aTeam.W++; hTeam.L++;
            aTeam.Pts += 3; hTeam.Pts += 0;
            // Winner continues - update their current round
            aTeam.round = s.cup.stageNames[roundIdx] + ' (Thắng)';
            // Loser is eliminated - mark with their elimination round
            if(hTeam.status !== 'Bị loại') {
              hTeam.status = 'Bị loại';
              hTeam.round = 'Loại tại ' + s.cup.stageNames[roundIdx];
            }
          } else {
            // Draw: both teams get 1 point
            hTeam.D++; aTeam.D++;
            hTeam.Pts += 1; aTeam.Pts += 1;
            hTeam.round = s.cup.stageNames[roundIdx] + ' (Hòa)';
            aTeam.round = s.cup.stageNames[roundIdx] + ' (Hòa)';
          }
        }
      }
    });
  });
  
  // Mark champion if final round is complete
  if(s.cup && s.cup.rounds && s.cup.rounds.length > 0) {
    // Find the final round by stage name, not just the last round (because 3rd place might be after final)
    var finalRoundIdx = -1;
    for(var i = 0; i < s.cup.stageNames.length; i++) {
      if(s.cup.stageNames[i] === 'Chung kết') {
        finalRoundIdx = i;
        break;
      }
    }
    
    if(finalRoundIdx >= 0 && s.cup.rounds[finalRoundIdx]) {
      var finalRound = s.cup.rounds[finalRoundIdx];
      if(finalRound.length > 0) {
        var finalMatch = finalRound[0]; // Final is always the only match in the round
        var finalKey = 'cup-' + finalRoundIdx + '-0';
        var finalResult = s.results[finalKey];
        
        // Resolve team indices for final match
        var finalHomeIdx = typeof finalMatch.home === 'number' ? finalMatch.home : null;
        var finalAwayIdx = typeof finalMatch.away === 'number' ? finalMatch.away : null;
        
        if(finalResult && finalHomeIdx != null && finalAwayIdx != null) {
          if(finalResult.hg > finalResult.ag) {
            statusMap[finalHomeIdx].status = 'Vô địch';
            statusMap[finalHomeIdx].round = s.cup.stageNames[finalRoundIdx];
            statusMap[finalAwayIdx].status = 'Á quân';
            statusMap[finalAwayIdx].round = s.cup.stageNames[finalRoundIdx];
          } else if(finalResult.ag > finalResult.hg) {
            statusMap[finalAwayIdx].status = 'Vô địch';
            statusMap[finalAwayIdx].round = s.cup.stageNames[finalRoundIdx];
            statusMap[finalHomeIdx].status = 'Á quân';
            statusMap[finalHomeIdx].round = s.cup.stageNames[finalRoundIdx];
          }
        }
      }
    }
    
    // Mark 3rd place if that match exists and is complete
    var thirdPlaceRoundIdx = -1;
    for(var i = 0; i < s.cup.stageNames.length; i++) {
      if(s.cup.stageNames[i] === 'Tranh hạng 3') {
        thirdPlaceRoundIdx = i;
        break;
      }
    }
    
    if(thirdPlaceRoundIdx >= 0 && s.cup.rounds[thirdPlaceRoundIdx]) {
      var thirdPlaceRound = s.cup.rounds[thirdPlaceRoundIdx];
      if(thirdPlaceRound.length > 0) {
        var thirdMatch = thirdPlaceRound[0];
        var thirdKey = 'cup-' + thirdPlaceRoundIdx + '-0';
        var thirdResult = s.results[thirdKey];
        
        // Resolve team indices for 3rd place match
        var thirdHomeIdx = null;
        var thirdAwayIdx = null;
        
        if(thirdMatch.home && thirdMatch.home.isLoser) {
          thirdHomeIdx = resolveLoserFromMatch(s, thirdMatch.home.fromRound, thirdMatch.home.matchId);
        }
        if(thirdMatch.away && thirdMatch.away.isLoser) {
          thirdAwayIdx = resolveLoserFromMatch(s, thirdMatch.away.fromRound, thirdMatch.away.matchId);
        }
        
        if(thirdResult && thirdHomeIdx != null && thirdAwayIdx != null) {
          if(thirdResult.hg > thirdResult.ag) {
            statusMap[thirdHomeIdx].status = 'Hạng 3';
            statusMap[thirdHomeIdx].round = s.cup.stageNames[thirdPlaceRoundIdx];
            statusMap[thirdAwayIdx].status = 'Hạng 4';
            statusMap[thirdAwayIdx].round = s.cup.stageNames[thirdPlaceRoundIdx];
          } else if(thirdResult.ag > thirdResult.hg) {
            statusMap[thirdAwayIdx].status = 'Hạng 3';
            statusMap[thirdAwayIdx].round = s.cup.stageNames[thirdPlaceRoundIdx];
            statusMap[thirdHomeIdx].status = 'Hạng 4';
            statusMap[thirdHomeIdx].round = s.cup.stageNames[thirdPlaceRoundIdx];
          }
        }
      }
    }
  }
  
  } else if(s.mode === 'double-elimination' && s.doubleElimination) {
    // Process playoff round first (if exists)
    if(s.doubleElimination.playoffRound) {
      s.doubleElimination.playoffRound.forEach(function(match, matchIdx){
        var key = 'de-playoff-0-' + matchIdx;
        var result = s.results[key];
        if(result && typeof match.home === 'number' && typeof match.away === 'number'){
          var hTeam = statusMap[match.home];
          var aTeam = statusMap[match.away];
          if(hTeam && aTeam){
            hTeam.P++; aTeam.P++;
            hTeam.GF += result.hg; hTeam.GA += result.ag;
            aTeam.GF += result.ag; aTeam.GA += result.hg;
            if(result.hg > result.ag){
              hTeam.W++; aTeam.L++; hTeam.Pts += 3;
              hTeam.round = 'Playoff (Thắng)';
              aTeam.status = 'Bị loại';
              aTeam.round = 'Playoff';
            } else if(result.ag > result.hg){
              aTeam.W++; hTeam.L++; aTeam.Pts += 3;
              aTeam.round = 'Playoff (Thắng)';
              hTeam.status = 'Bị loại';
              hTeam.round = 'Playoff';
            } else {
              hTeam.D++; aTeam.D++; hTeam.Pts += 1; aTeam.Pts += 1;
              hTeam.round = 'Playoff (Hòa)';
              aTeam.round = 'Playoff (Hòa)';
            }
          }
        }
      });
    }
    
    // Process double elimination winners bracket
    if(s.doubleElimination.winnersRounds) {
      s.doubleElimination.winnersRounds.forEach(function(round, roundIdx){
        round.forEach(function(match, matchIdx){
          var key = 'de-winners-' + roundIdx + '-' + matchIdx;
          var result = s.results[key];
          
          // Resolve team indices (could be direct numbers or references)
          var homeIdx = resolveDoubleEliminationTeam(s, match.home);
          var awayIdx = resolveDoubleEliminationTeam(s, match.away);
          
          if(result && homeIdx != null && awayIdx != null){
            var hTeam = statusMap[homeIdx];
            var aTeam = statusMap[awayIdx];
            if(hTeam && aTeam){
              hTeam.P++; aTeam.P++;
              hTeam.GF += result.hg; hTeam.GA += result.ag;
              aTeam.GF += result.ag; aTeam.GA += result.hg;
              if(result.hg > result.ag){
                hTeam.W++; aTeam.L++; hTeam.Pts += 3;
                hTeam.round = s.doubleElimination.winnersNames[roundIdx] + ' (Thắng)';
                aTeam.round = 'Rớt Losers Bracket';
              } else if(result.ag > result.hg){
                aTeam.W++; hTeam.L++; aTeam.Pts += 3;
                aTeam.round = s.doubleElimination.winnersNames[roundIdx] + ' (Thắng)';
                hTeam.round = 'Rớt Losers Bracket';
              } else {
                hTeam.D++; aTeam.D++; hTeam.Pts += 1; aTeam.Pts += 1;
                hTeam.round = s.doubleElimination.winnersNames[roundIdx] + ' (Hòa)';
                aTeam.round = s.doubleElimination.winnersNames[roundIdx] + ' (Hòa)';
              }
            }
          }
        });
      });
    }
    
    // Process losers bracket
    if(s.doubleElimination.losersRounds) {
      var latestLBRoundWithResult = -1;
      var latestLBLoser = null;
      
      s.doubleElimination.losersRounds.forEach(function(round, roundIdx){
        round.forEach(function(match, matchIdx){
          var key = 'de-losers-' + roundIdx + '-' + matchIdx;
          var result = s.results[key];
          
          // Resolve team indices for losers bracket
          var homeIdx = resolveDoubleEliminationTeam(s, match.home);
          var awayIdx = resolveDoubleEliminationTeam(s, match.away);
          
          if(result && homeIdx != null && awayIdx != null){
            var hTeam = statusMap[homeIdx];
            var aTeam = statusMap[awayIdx];
            if(hTeam && aTeam){
              hTeam.P++; aTeam.P++;
              hTeam.GF += result.hg; hTeam.GA += result.ag;
              aTeam.GF += result.ag; aTeam.GA += result.hg;
              if(result.hg > result.ag){
                hTeam.W++; aTeam.L++; hTeam.Pts += 3;
                hTeam.round = s.doubleElimination.losersNames[roundIdx] + ' (Thắng)';
                aTeam.status = 'Bị loại';
                aTeam.round = s.doubleElimination.losersNames[roundIdx];
                // Track latest loser
                if(roundIdx > latestLBRoundWithResult) {
                  latestLBRoundWithResult = roundIdx;
                  latestLBLoser = awayIdx;
                }
              } else if(result.ag > result.hg){
                aTeam.W++; hTeam.L++; aTeam.Pts += 3;
                aTeam.round = s.doubleElimination.losersNames[roundIdx] + ' (Thắng)';
                hTeam.status = 'Bị loại';
                hTeam.round = s.doubleElimination.losersNames[roundIdx];
                // Track latest loser
                if(roundIdx > latestLBRoundWithResult) {
                  latestLBRoundWithResult = roundIdx;
                  latestLBLoser = homeIdx;
                }
              } else {
                hTeam.D++; aTeam.D++; hTeam.Pts += 1; aTeam.Pts += 1;
                hTeam.round = s.doubleElimination.losersNames[roundIdx] + ' (Hòa)';
                aTeam.round = s.doubleElimination.losersNames[roundIdx] + ' (Hòa)';
              }
            }
          }
        });
      });
      
      // Mark the latest LB loser as 3rd place
      if(latestLBLoser != null && statusMap[latestLBLoser]) {
        statusMap[latestLBLoser].round = s.doubleElimination.losersNames[latestLBRoundWithResult] + ' (Hạng 3)';
      }
    }
    
    // Process grand finals
    if(s.doubleElimination.grandFinals) {
      s.doubleElimination.grandFinals.forEach(function(match, matchIdx){
        var key = 'de-grand-final-' + matchIdx;
        var result = s.results[key];
        
        // Resolve team indices for grand finals
        var homeIdx = resolveDoubleEliminationTeam(s, match.home);
        var awayIdx = resolveDoubleEliminationTeam(s, match.away);
        
        if(result && homeIdx != null && awayIdx != null){
          var hTeam = statusMap[homeIdx];
          var aTeam = statusMap[awayIdx];
          if(hTeam && aTeam){
            hTeam.P++; aTeam.P++;
            hTeam.GF += result.hg; hTeam.GA += result.ag;
            aTeam.GF += result.ag; aTeam.GA += result.hg;
            if(result.hg > result.ag){
              hTeam.W++; aTeam.L++; hTeam.Pts += 3;
              hTeam.round = 'Grand Final (Vô địch)';
              aTeam.round = 'Grand Final (Á quân)';
            } else if(result.ag > result.hg){
              aTeam.W++; hTeam.L++; aTeam.Pts += 3;
              aTeam.round = 'Grand Final (Vô địch)';
              hTeam.round = 'Grand Final (Á quân)';
            } else {
              hTeam.D++; aTeam.D++; hTeam.Pts += 1; aTeam.Pts += 1;
              hTeam.round = 'Grand Final (Hòa)';
              aTeam.round = 'Grand Final (Hòa)';
            }
          }
        }
      });
    }
  }
  
  // Sort by status (active teams first), then by points, then by goal difference
  var teams = Object.values(statusMap).sort(function(a, b){
    if(a.status !== b.status){
      if(a.status === 'Bị loại') return 1;
      if(b.status === 'Bị loại') return -1;
    }
    return b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF;
  });
  
  teams.forEach(function(r, idx){
    var tr=document.createElement('tr');
    var logo=s.teamLogos&&s.teamLogos[r.idx]?'<img src="'+s.teamLogos[r.idx]+'" alt="logo"/>':'';
    var badge=logo?('<span class="badge">'+logo+'</span>'):('<span class="badge" style="background:'+(s.teamColors[r.idx]||'#1b2550')+'"></span>');
    
    // Determine status color and display based on achievement
    var statusColor = 'var(--text)';
    var statusDisplay = r.status;
    
    if(r.status === 'Vô địch') {
      statusColor = '#fbbf24'; // Gold color for champion
      statusDisplay = '🏆 ' + r.status;
    } else if(r.status === 'Á quân') {
      statusColor = '#cbd5e1'; // Silver color for runner-up
      statusDisplay = '🥈 ' + r.status;
    } else if(r.status === 'Hạng 3') {
      statusColor = '#fb923c'; // Bronze color for 3rd place
      statusDisplay = '🥉 ' + r.status;
    } else if(r.status === 'Bị loại') {
      statusColor = 'var(--danger)';
      statusDisplay = r.status + ' - ' + r.round;
    } else {
      statusDisplay = r.status + (r.round !== 'Chưa bắt đầu' ? ' - ' + r.round : '');
    }
    
    tr.innerHTML='<td class="pos">'+(idx+1)+'</td>'+
        '<td class="team">'+badge+r.team+'</td>'+
        '<td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.D+'</td><td>'+r.L+'</td>'+
        '<td>'+r.GF+'</td><td>'+r.GA+'</td><td>'+(r.GF-r.GA>=0?'+':'')+(r.GF-r.GA)+'</td>'+
        '<td><strong>'+r.Pts+'</strong></td>'+
        '<td style="color:'+statusColor+';text-align:left;padding-left:8px;font-weight:'+(r.status === 'Vô địch' || r.status === 'Á quân' || r.status === 'Hạng 3' ? 'bold' : 'normal')+'">'+statusDisplay+'</td>';
    tbody.appendChild(tr);
  });
}
    'use strict';
    var STORAGE_KEY='pes-league-v15';
    var THEME_KEY='pes-theme';
  var state={seasons:{},current:null,teamMasterList:[],logoMasterList:[]};
  
  // Default gamepad icon for teams
  var DEFAULT_TEAM_LOGO = 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#60a5fa">
      <path d="M7.5 5.5C5.5 5.5 4 7 4 9v6c0 2 1.5 3.5 3.5 3.5h9c2 0 3.5-1.5 3.5-3.5V9c0-2-1.5-3.5-3.5-3.5h-9zm1 3c.5 0 1 .5 1 1v1h1c.5 0 1 .5 1 1s-.5 1-1 1h-1v1c0 .5-.5 1-1 1s-1-.5-1-1v-1h-1c-.5 0-1-.5-1-1s.5-1 1-1h1v-1c0-.5.5-1 1-1zm8 1c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm-2 3c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1z"/>
    </svg>
  `);
  var homeLink = localStorage.getItem('pesHomeLink') || '';
  var homeLabel = localStorage.getItem('pesHomeLabel') || 'Home';
  var customLinks = JSON.parse(localStorage.getItem('pesCustomLinks') || '[]');
    function setHomeLink(link, label) {
      homeLink = link;
      homeLabel = label || 'Home';
      try { localStorage.setItem('pesHomeLink', link); } catch(e){}
      try { localStorage.setItem('pesHomeLabel', homeLabel); } catch(e){}
      updateCustomLinks();
    }

    function setCustomLinks(links) {
      customLinks = links;
      try { localStorage.setItem('pesCustomLinks', JSON.stringify(links)); } catch(e){}
      updateCustomLinks();
    }

    // Note dialog logic
    function showNoteDialog(idx) {
      window.showNoteDialog = showNoteDialog;
      var notes = JSON.parse(localStorage.getItem('pesNotes') || '[]');
      var note = notes[idx];
      if (!note) return;
      var dlg = document.getElementById('noteDialog');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'noteDialog';
        document.body.appendChild(dlg);
      }
      // Always set dialog content to ensure both fields appear
      dlg.innerHTML = `
        <form id="noteForm" style="min-width:780px;max-width:1350px">
          <h3>Ghi chú: <input id="noteLabelInput" type="text" style="width:70%;font-size:18px;padding:10px 12px" /></h3>
          <div style="margin-bottom:8px;font-size:15px">Nội dung (có thể định dạng HTML):</div>
          <textarea id="noteContentInput" style="width:100%;height:510px;font-size:16px;padding:12px"></textarea>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:18px">
            <button type="button" id="closeNoteBtn" style="font-size:16px;padding:10px 18px">Đóng</button>
            <button type="submit" id="saveNoteBtn" class="primary" style="font-size:16px;padding:10px 18px">Lưu</button>
          </div>
        </form>
      `;
      // Always show dialog, fallback for browsers without <dialog>
      if (typeof dlg.showModal === 'function') { dlg.showModal(); }
      else { dlg.setAttribute('open','open'); dlg.style.display = 'block'; dlg.style.position = 'fixed'; dlg.style.zIndex = 10000; dlg.style.left = '50%'; dlg.style.top = '20%'; dlg.style.transform = 'translate(-50%, 0)'; }

      function bindNoteDialogEvents() {
        var labelInput = dlg.querySelector('#noteLabelInput');
        var contentInput = dlg.querySelector('#noteContentInput');
        var saveBtn = dlg.querySelector('#saveNoteBtn');
        var closeBtn = dlg.querySelector('#closeNoteBtn');
        labelInput.value = note.label;
        contentInput.value = note.content;
        var admin = isAdmin();
        labelInput.disabled = !admin;
        contentInput.disabled = !admin ? true : false;
        saveBtn.style.display = admin ? '' : 'none';
        saveBtn.onclick = null;
        closeBtn.onclick = null;
        dlg.querySelector('#noteForm').onsubmit = null;
        dlg.querySelector('#noteForm').onsubmit = function(e) {
          e.preventDefault();
          if (!isAdmin()) return;
          note.label = labelInput.value;
          note.content = contentInput.value;
          notes[idx] = note;
          localStorage.setItem('pesNotes', JSON.stringify(notes));
          updateCustomLinks();
          if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
        };
        closeBtn.onclick = function() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
        if (admin) contentInput.focus();
      }
      bindNoteDialogEvents();
    }
    window.showNoteDialog = showNoteDialog;
    function updateCustomLinks() {
      var wrap = $('customLinks');
      if (!wrap) return;
      wrap.innerHTML = '';
      // Render note buttons
      var notes = JSON.parse(localStorage.getItem('pesNotes') || '[]');
      notes.forEach(function(note, idx) {
        var btnWrap = document.createElement('span');
        btnWrap.style.display = 'inline-flex';
        btnWrap.style.alignItems = 'center';
        var btn = document.createElement('button');
        btn.className = 'primary';
        btn.textContent = note.label || 'Note';
        btn.title = 'Ghi chú';
        btn.style.marginRight = '2px';
        btn.onclick = function(e) {
          if (typeof window.showNoteDialog === 'function') {
            window.showNoteDialog(idx);
          } else {
            showNoteDialog(idx);
          }
        };
        btnWrap.appendChild(btn);
        if (isAdmin()) {
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.title = 'Xoá ghi chú';
          delBtn.className = 'ghost';
          delBtn.style.marginLeft = '0px';
          delBtn.style.padding = '0 8px';
          delBtn.style.fontSize = '16px';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Xoá ghi chú này?')) {
              notes.splice(idx, 1);
              localStorage.setItem('pesNotes', JSON.stringify(notes));
              updateCustomLinks();
            }
          };
          btnWrap.appendChild(delBtn);
        }
        btnWrap.style.marginRight = '4px';
        wrap.appendChild(btnWrap);
      });
      // Only show Home button if it has a link or a custom label (not default/empty)
      if (homeLink || (homeLabel && homeLabel !== 'Home')) {
        var btnHomeWrap = document.createElement('span');
        btnHomeWrap.style.display = 'inline-flex';
        btnHomeWrap.style.alignItems = 'center';
        var btnHome = document.createElement('button');
        btnHome.id = 'btnHome';
        btnHome.className = homeLink ? 'primary' : 'ghost';
        btnHome.textContent = homeLabel || 'Home';
        btnHome.title = homeLink;
        btnHome.style.marginRight = '2px';
        btnHome.onclick = function(e) {
          if (isAdmin()) {
            var dlg = $('homeLinkDialog');
            $('homeLinkInput').value = homeLink;
            $('homeLabelInput').value = homeLabel;
            if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open','open'); }
          } else if (homeLink) {
            window.location.href = homeLink;
          } else {
            toast('Chưa đặt liên kết Home');
          }
        };
        btnHomeWrap.appendChild(btnHome);
        if (isAdmin()) {
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.title = 'Xoá nút Home';
          delBtn.className = 'ghost';
          delBtn.style.marginLeft = '0px';
          delBtn.style.padding = '0 8px';
          delBtn.style.fontSize = '16px';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Xoá nút Home?')) {
              homeLink = '';
              homeLabel = 'Home';
              try { localStorage.removeItem('pesHomeLink'); } catch(e){}
              try { localStorage.removeItem('pesHomeLabel'); } catch(e){}
              updateCustomLinks();
            }
          };
          btnHomeWrap.appendChild(delBtn);
        }
        btnHomeWrap.style.marginRight = '4px';
        wrap.appendChild(btnHomeWrap);
      }
      // Custom link buttons
      customLinks.forEach(function(link, idx) {
        var btnWrap = document.createElement('span');
        btnWrap.style.display = 'inline-flex';
        btnWrap.style.alignItems = 'center';
        var btn = document.createElement('button');
        btn.className = link.url ? 'primary' : 'ghost';
        btn.textContent = link.label || 'Link';
        btn.title = link.url;
        btn.style.marginRight = '2px';
        btn.onclick = function(e) {
          if (isAdmin()) {
            var dlg = $('homeLinkDialog');
            $('homeLinkInput').value = link.url;
            $('homeLabelInput').value = link.label;
            dlg.setAttribute('data-edit-idx', idx);
            if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open','open'); }
          } else if (link.url) {
            window.location.href = link.url;
          } else {
            toast('Chưa đặt liên kết');
          }
        };
        btnWrap.appendChild(btn);
        if (isAdmin()) {
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.title = 'Xoá liên kết';
          delBtn.className = 'ghost';
          delBtn.style.marginLeft = '0px';
          delBtn.style.padding = '0 8px';
          delBtn.style.fontSize = '16px';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Xoá liên kết này?')) {
              customLinks.splice(idx, 1);
              setCustomLinks(customLinks);
            }
          };
          btnWrap.appendChild(delBtn);
        }
        btnWrap.style.marginRight = '4px';
        wrap.appendChild(btnWrap);
      });
    }
    var standingsMode='overall';

    function $(id){return document.getElementById(id)}
    function uid(){return 's'+Math.random().toString(36).slice(2,9)}
    function isAdmin(){try{return sessionStorage.getItem('pesAdmin')==='1'}catch(e){return false}}
    function ensureAdmin(){
      if(isAdmin()) return true;
      var pw=prompt('Nhập password quản trị:');
      if(pw==='tinhteo123'){
        try{sessionStorage.setItem('pesAdmin','1')}catch(_){}
        showAdmin(true);
        refreshSeasonUI();
        return true;
      }
      alert('Sai password');
      return false;
    }
    function showAdmin(on){[].forEach.call(document.querySelectorAll('.adminOnly'),function(el){el.classList.toggle('hidden',!on)})}
    function toast(msg){var t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){t.classList.remove('show')},1400)}
    function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

    function saveAll(){
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}
      // Trigger debounced push to GitHub if PAT configured
      if(typeof CloudSync !== 'undefined' && CloudSync.hasPAT() && CloudSync.isEnabled()) {
        CloudSync.schedulePush(state);
      }
    }

    // =================== CLOUD SYNC (GitHub Pages) ===================
    var CLOUD_CONFIG = {
      owner: 'hoduytinh',
      repo: 'marvell_pes',
      branch: 'main',
      dataPath: 'data.json'
    };

    var CloudSync = {
      pat: null,
      enabled: true,
      sha: null,
      lastSyncedHash: null,
      pushTimer: null,
      pushInProgress: false,
      pendingState: null,
      status: 'idle',
      statusText: '',

      init: function() {
        try { this.pat = localStorage.getItem('pesGitHubPAT') || null; } catch(_){}
        try { this.enabled = localStorage.getItem('pesCloudSyncEnabled') !== '0'; } catch(_) { this.enabled = true; }
        this.updateUI();
      },

      hasPAT: function() { return !!this.pat; },
      isEnabled: function() { return !!this.enabled; },

      setEnabled: function(on) {
        this.enabled = !!on;
        try {
          localStorage.setItem('pesCloudSyncEnabled', this.enabled ? '1' : '0');
        } catch(_){}
        if(!this.enabled) {
          if(this.pushTimer) {
            clearTimeout(this.pushTimer);
            this.pushTimer = null;
          }
          this.pendingState = null;
        }
        this.updateUI();
      },

      setPAT: function(pat) {
        this.pat = pat ? pat.trim() : null;
        try {
          if(this.pat) localStorage.setItem('pesGitHubPAT', this.pat);
          else localStorage.removeItem('pesGitHubPAT');
        } catch(_){}
        this.updateUI();
      },

      apiUrl: function() {
        return 'https://api.github.com/repos/' + CLOUD_CONFIG.owner + '/' + CLOUD_CONFIG.repo + '/contents/' + CLOUD_CONFIG.dataPath;
      },

      setStatus: function(s, text) {
        this.status = s;
        this.statusText = text || '';
        this.updateUI();
      },

      updateUI: function() {
        var el = document.getElementById('cloudSyncStatus');
        var toggleBtn = document.getElementById('btnCloudSyncToggle');
        if(toggleBtn) {
          toggleBtn.textContent = this.enabled ? 'Sync: ON' : 'Sync: OFF';
          toggleBtn.title = this.enabled
            ? 'Tự động đồng bộ đang bật. Nhấn để tắt.'
            : 'Tự động đồng bộ đang tắt. Nhấn để bật lại.';
        }
        if(!el) return;
        if(!this.enabled) {
          el.textContent = '⏸️ Sync tắt';
          el.style.color = 'var(--muted)';
          el.title = 'Đang tắt tự động đồng bộ lên server';
          return;
        }
        var labels = {
          idle: this.pat ? '☁️ Sẵn sàng' : '☁️ Chưa có PAT',
          loading: '⏳ Đang tải cloud...',
          saving: '⏫ Đang đồng bộ...',
          synced: '✅ Đã sync',
          offline: '⚠️ Offline',
          error: '❌ Lỗi'
        };
        el.textContent = labels[this.status] || this.status;
        var colorMap = {
          synced: '#10b981', loading: '#3b82f6', saving: '#3b82f6',
          offline: '#f59e0b', error: '#dc2626', idle: 'var(--muted)'
        };
        el.style.color = colorMap[this.status] || 'var(--muted)';
        el.title = this.statusText || ('Cloud sync: ' + this.status);
      },

      // Returns Promise<stateObject|null>
      load: function() {
        var self = this;
        self.setStatus('loading');
        var url = self.apiUrl() + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now();
        // Use 'raw' media type to support files > 1 MB (limit is 100 MB)
        var headers = { 'Accept': 'application/vnd.github.raw' };
        if(self.pat) headers['Authorization'] = 'Bearer ' + self.pat;
        return fetch(url, { headers: headers, cache: 'no-store' })
          .then(function(r) {
            if(r.status === 404) {
              self.sha = null;
              self.setStatus('idle', 'data.json chưa tồn tại trên GitHub - sẽ tạo khi admin lưu lần đầu');
              return null;
            }
            if(r.status === 401 || r.status === 403) {
              self.setStatus('error', 'PAT không hợp lệ hoặc thiếu quyền (HTTP ' + r.status + ')');
              return null;
            }
            if(!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
          })
          .then(function(jsonText) {
            if(!jsonText) return null;
            var parsed = JSON.parse(jsonText);
            self.lastSyncedHash = self.hash(jsonText);
            // Fetch sha separately (small request) — needed for future PUTs
            self._refreshSha().finally(function() {
              self.setStatus('synced');
            });
            return parsed;
          })
          .catch(function(err) {
            console.warn('CloudSync.load failed:', err);
            self.setStatus('offline', String(err.message || err));
            return null;
          });
      },

      schedulePush: function(stateRef) {
        var self = this;
        if(!self.pat || !self.enabled) return;
        self.pendingState = stateRef;
        if(self.pushTimer) clearTimeout(self.pushTimer);
        self.pushTimer = setTimeout(function() {
          self.pushTimer = null;
          self.push(self.pendingState);
        }, 2000);
      },

      push: function(stateRef) {
        var self = this;
        if(!self.pat || !self.enabled) return Promise.resolve(false);
        if(!stateRef) return Promise.resolve(false);
        if(self.pushInProgress) {
          // Will be re-pushed via schedulePush after current completes
          self.schedulePush(stateRef);
          return Promise.resolve(false);
        }

        var jsonText = JSON.stringify(stateRef, null, 2);
        var newHash = self.hash(jsonText);
        if(newHash === self.lastSyncedHash) {
          self.setStatus('synced');
          return Promise.resolve(true);
        }

        self.pushInProgress = true;
        self.setStatus('saving');

        var contentBase64;
        try {
          contentBase64 = btoa(unescape(encodeURIComponent(jsonText)));
        } catch(e) {
          self.pushInProgress = false;
          self.setStatus('error', 'Encode error: ' + e.message);
          return Promise.resolve(false);
        }

        var body = {
          message: 'Update data.json ' + new Date().toISOString(),
          content: contentBase64,
          branch: CLOUD_CONFIG.branch
        };
        if(self.sha) body.sha = self.sha;

        return fetch(self.apiUrl(), {
          method: 'PUT',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + self.pat,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        .then(function(r) {
          if(r.status === 409 || r.status === 422) {
            // SHA conflict — refresh sha then retry once
            return self._refreshSha().then(function() {
              self.pushInProgress = false;
              self.schedulePush(stateRef);
              return false;
            });
          }
          if(!r.ok) {
            return r.text().then(function(t) {
              throw new Error('HTTP ' + r.status + ': ' + t.substring(0, 200));
            });
          }
          return r.json().then(function(resp) {
            if(resp && resp.content) self.sha = resp.content.sha;
            self.lastSyncedHash = newHash;
            self.pushInProgress = false;
            self.setStatus('synced');
            return true;
          });
        })
        .catch(function(err) {
          console.error('CloudSync.push failed:', err);
          self.pushInProgress = false;
          self.setStatus('error', String(err.message || err));
          return false;
        });
      },

      _refreshSha: function() {
        var self = this;
        var url = self.apiUrl() + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now();
        var headers = { 'Accept': 'application/vnd.github+json' };
        if(self.pat) headers['Authorization'] = 'Bearer ' + self.pat;
        return fetch(url, { headers: headers, cache: 'no-store' })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) { if(data) self.sha = data.sha; })
          .catch(function(){});
      },

      // Force an immediate push (ignore debounce, ignore hash check)
      pushNow: function(stateRef) {
        if(!this.enabled) return Promise.resolve(false);
        if(this.pushTimer) { clearTimeout(this.pushTimer); this.pushTimer = null; }
        this.lastSyncedHash = null; // force push
        return this.push(stateRef);
      },

      hash: function(s) {
        var h = 0;
        for(var i = 0; i < s.length; i++) {
          h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        }
        return h;
      }
    };

    // =================== LOGO SCANNER (auto-discover logos/ folder) ===================
    // Lists files inside the repository's `logos/` folder via the GitHub
    // Contents API and merges them into state.logoMasterList so that simply
    // pushing an image file into logos/ makes it appear in the Logo Master List.
    var LogoScanner = {
      CACHE_KEY: 'pesLogoScanCache',
      CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
      IMAGE_RE: /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i,
      lastScan: 0,

      apiUrl: function() {
        return 'https://api.github.com/repos/' + CLOUD_CONFIG.owner +
               '/' + CLOUD_CONFIG.repo + '/contents/logos?ref=' +
               encodeURIComponent(CLOUD_CONFIG.branch);
      },

      // Convert a file name like "AC_Milan.png" to display name "AC_Milan"
      nameFromFile: function(filename) {
        return filename.replace(/\.[^.]+$/, '');
      },

      readCache: function() {
        try {
          var raw = localStorage.getItem(this.CACHE_KEY);
          if(!raw) return null;
          var c = JSON.parse(raw);
          if(!c || !c.ts || !Array.isArray(c.items)) return null;
          if(Date.now() - c.ts > this.CACHE_TTL_MS) return null;
          return c.items;
        } catch(_) { return null; }
      },

      writeCache: function(items) {
        try {
          localStorage.setItem(this.CACHE_KEY, JSON.stringify({ ts: Date.now(), items: items }));
        } catch(_) {}
      },

      // Resolve with array of { name, data } entries (data is a relative path like "logos/X.png")
      fetchList: function(useCache) {
        var self = this;
        if(useCache !== false) {
          var cached = self.readCache();
          if(cached) return Promise.resolve(cached);
        }
        var headers = { 'Accept': 'application/vnd.github+json' };
        // Use PAT if available to lift the 60 req/hour anonymous limit
        if(typeof CloudSync !== 'undefined' && CloudSync.pat) {
          headers['Authorization'] = 'Bearer ' + CloudSync.pat;
        }
        return fetch(self.apiUrl(), { headers: headers, cache: 'no-store' })
          .then(function(r) {
            if(r.status === 404) return [];
            if(!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function(list) {
            if(!Array.isArray(list)) return [];
            var items = list
              .filter(function(f) {
                return f && f.type === 'file' && self.IMAGE_RE.test(f.name);
              })
              .map(function(f) {
                return {
                  name: self.nameFromFile(f.name),
                  data: 'logos/' + f.name,
                  source: 'scan'
                };
              });
            self.writeCache(items);
            self.lastScan = Date.now();
            return items;
          })
          .catch(function(err) {
            console.warn('LogoScanner.fetchList failed:', err);
            var cached = self.readCache();
            return cached || [];
          });
      },

      // Merge scanned files into state.logoMasterList. Scan entries take
      // priority over manually-added entries that share the same name (so a
      // new file on disk replaces the cached base64 reference). Stale
      // entries that point at logos/ but no longer exist on disk are pruned.
      mergeInto: function(items) {
        if(!state.logoMasterList) state.logoMasterList = [];
        var scanNames = {};
        items.forEach(function(it) { scanNames[it.name] = true; });

        var byName = {};
        // Keep only manual entries (base64) — drop stale logos/ references
        state.logoMasterList.forEach(function(l) {
          if(!l || !l.name) return;
          var isFileRef = typeof l.data === 'string' && l.data.indexOf('logos/') === 0;
          if(isFileRef) {
            // Only keep if still present in scan (will be overwritten below)
            if(!scanNames[l.name]) return;
          }
          byName[l.name] = l;
        });
        // Scan results overwrite by name
        items.forEach(function(item) {
          byName[item.name] = item;
        });
        var merged = Object.keys(byName).map(function(k) { return byName[k]; });
        merged.sort(function(a, b) {
          return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        });
        state.logoMasterList = merged;
      },

      // Full convenience: fetch + merge. Returns Promise<itemsCount>.
      run: function(useCache) {
        var self = this;
        return self.fetchList(useCache).then(function(items) {
          self.mergeInto(items);
          return items.length;
        });
      }
    };

    // Classify logos by filename prefix: entries whose name starts with
    // "season_" (case-insensitive) are league/season logos; everything else
    // is treated as a team logo. This keeps a single storage list but
    // exposes two independent pickers in the UI.
    function isSeasonLogoEntry(entry) {
      if(!entry || !entry.name) return false;
      return /^season[_\s-]/i.test(entry.name);
    }
    function getTeamLogoOptions() {
      return (state.logoMasterList || []).filter(function(l) { return !isSeasonLogoEntry(l); });
    }
    function getSeasonLogoOptions() {
      return (state.logoMasterList || []).filter(isSeasonLogoEntry);
    }

    // =================== REPO UPLOADER (admin push images to repo) ===================
    // Uploads a binary image to logos/ or photos/ in the GitHub repo via the
    // Contents API. Requires CloudSync.pat. Returns Promise<relativePath>.
    // Falls back to a data URL (base64) when no PAT is configured, so the
    // admin UI still works locally — but those will not persist to other
    // devices until the admin adds a PAT.
    var RepoUploader = {
      sanitize: function(s) {
        if(!s) return 'img';
        s = String(s).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');
        if(s.length > 64) s = s.substring(0, 64);
        return s || 'img';
      },

      extFromMime: function(mime) {
        if(!mime) return 'bin';
        if(/png/.test(mime)) return 'png';
        if(/jpe?g/.test(mime)) return 'jpg';
        if(/gif/.test(mime)) return 'gif';
        if(/webp/.test(mime)) return 'webp';
        if(/svg/.test(mime)) return 'svg';
        if(/bmp/.test(mime)) return 'bmp';
        if(/icon/.test(mime)) return 'ico';
        return 'bin';
      },

      // Read a File/Blob as raw base64 (no data URL prefix).
      readBase64: function(blob) {
        return new Promise(function(resolve, reject) {
          var r = new FileReader();
          r.onload = function() {
            var s = r.result || '';
            var i = s.indexOf(',');
            resolve(i >= 0 ? s.substring(i + 1) : s);
          };
          r.onerror = function() { reject(new Error('Failed to read file')); };
          r.readAsDataURL(blob);
        });
      },

      // Pick a unique filename inside `folder` (avoiding collisions with
      // already-known logoMasterList entries when uploading to logos/).
      pickName: function(baseName, ext, folder) {
        var clean = this.sanitize(baseName);
        var taken = {};
        if(folder === 'logos' && state.logoMasterList) {
          state.logoMasterList.forEach(function(l) {
            if(l && typeof l.data === 'string' && l.data.indexOf('logos/') === 0) {
              taken[l.data] = true;
            }
          });
        }
        var candidate = folder + '/' + clean + '.' + ext;
        if(!taken[candidate]) return candidate;
        for(var i = 2; i < 1000; i++) {
          candidate = folder + '/' + clean + '_' + i + '.' + ext;
          if(!taken[candidate]) return candidate;
        }
        return folder + '/' + clean + '_' + Date.now() + '.' + ext;
      },

      // PUT file to repo. opts: { folder, baseName, message }
      uploadBlob: function(blob, opts) {
        var self = this;
        if(typeof CloudSync === 'undefined' || !CloudSync.pat) {
          // No PAT — fall back to data URL so the UI still works on this
          // device; warn the admin.
          return self.readBase64(blob).then(function(b64) {
            console.warn('RepoUploader: no PAT, falling back to base64 (local only)');
            if(typeof toast === 'function') {
              toast('⚠️ Chưa có GitHub PAT — ảnh chỉ lưu local. Cấu hình PAT để đẩy lên repo.');
            }
            return 'data:' + (blob.type || 'image/png') + ';base64,' + b64;
          });
        }

        var ext  = self.extFromMime(blob.type);
        var path = self.pickName(opts.baseName || 'img', ext, opts.folder || 'logos');
        var msg  = opts.message || ('chore: upload ' + path);

        return self.readBase64(blob).then(function(b64) {
          var url = 'https://api.github.com/repos/' + CLOUD_CONFIG.owner +
                    '/' + CLOUD_CONFIG.repo + '/contents/' + path;
          return fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + CloudSync.pat,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: msg,
              content: b64,
              branch: CLOUD_CONFIG.branch
            })
          }).then(function(r) {
            if(!r.ok) {
              return r.text().then(function(t) {
                throw new Error('GitHub upload failed (HTTP ' + r.status + '): ' + t);
              });
            }
            // Invalidate logo scan cache so next list reflects the new file
            try { localStorage.removeItem(LogoScanner.CACHE_KEY); } catch(_) {}
            return path;
          });
        });
      },

      // Convenience: upload a File from <input type="file">
      uploadFile: function(file, opts) {
        var baseName = opts.baseName;
        if(!baseName && file && file.name) {
          baseName = file.name.replace(/\.[^.]+$/, '');
        }
        return this.uploadBlob(file, { folder: opts.folder, baseName: baseName, message: opts.message });
      },

      // Resize + recompress + upload (for timeline photos).
      // maxWidth defaults to 800px, target size 100KB (matches old resizeImage).
      uploadResizedFile: function(file, opts) {
        var self = this;
        var maxWidth = opts.maxWidth || 800;
        var maxBytes = opts.maxBytes || 100 * 1024;
        return new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
              var w = img.width, h = img.height;
              if(w > maxWidth) { h = h * maxWidth / w; w = maxWidth; }
              var canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);

              // Iteratively reduce quality to stay under maxBytes
              var q = 0.8;
              var blob;
              function tryBlob(cb) { canvas.toBlob(cb, 'image/jpeg', q); }
              function step() {
                tryBlob(function(b) {
                  blob = b;
                  if(!blob) { reject(new Error('Canvas toBlob failed')); return; }
                  if(blob.size > maxBytes && q > 0.2) {
                    q -= 0.1;
                    step();
                  } else {
                    var baseName = opts.baseName || (file && file.name ? file.name.replace(/\.[^.]+$/, '') : 'photo');
                    self.uploadBlob(blob, {
                      folder: opts.folder || 'photos',
                      baseName: baseName,
                      message: opts.message
                    }).then(resolve, reject);
                  }
                });
              }
              step();
            };
            img.onerror = function() { reject(new Error('Image decode failed')); };
            img.src = e.target.result;
          };
          reader.onerror = function() { reject(new Error('File read failed')); };
          reader.readAsDataURL(file);
        });
      }
    };

    function loadAll(){
      // Returns a Promise. New flow:
      //   PRIORITY 1: Try GitHub cloud (data.json) — fresh source of truth
      //   PRIORITY 2: localStorage cache (for offline / first load before cloud responds)
      //   PRIORITY 3: EMBEDDED_DATA (for first-ever bootstrap)
      var loadedFromCloud = false;

      function applyState(obj, source) {
        if(obj && obj.seasons) {
          state = obj;
          console.log('Loaded data from ' + source);
          return true;
        }
        return false;
      }

      function tryLocal() {
        var raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch(_) {}
        if(!raw) return false;
        try {
          var obj = JSON.parse(raw);
          return applyState(obj, 'localStorage');
        } catch(_) { return false; }
      }

      function tryEmbedded() {
        try {
          var txt = $('EMBEDDED_DATA').textContent || '';
          var objE = JSON.parse(txt);
          if(applyState(objE, 'EMBEDDED_DATA fallback')) {
            try { sessionStorage.removeItem('pesAdmin'); } catch(_) {}
            if(objE.homeLink !== undefined) {
              try { localStorage.setItem('pesHomeLink', objE.homeLink); } catch(_){}
              homeLink = objE.homeLink;
            }
            if(objE.homeLabel !== undefined) {
              try { localStorage.setItem('pesHomeLabel', objE.homeLabel); } catch(_){}
              homeLabel = objE.homeLabel;
            }
            if(objE.customLinks !== undefined) {
              try { localStorage.setItem('pesCustomLinks', JSON.stringify(objE.customLinks)); } catch(_){}
              customLinks = objE.customLinks;
            }
            if(objE.pesNotes !== undefined) {
              try { localStorage.setItem('pesNotes', JSON.stringify(objE.pesNotes)); } catch(_){}
            }
            return true;
          }
        } catch(_) {}
        return false;
      }

      // Initialize cloud sync (load PAT from storage)
      CloudSync.init();

      return CloudSync.load().then(function(cloudData) {
        if(cloudData && cloudData.seasons) {
          applyState(cloudData, 'GitHub cloud');
          loadedFromCloud = true;
          // Cache to localStorage for offline access
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_) {}
        } else {
          // Cloud unreachable or empty → try local cache
          if(!tryLocal()) {
            tryEmbedded();
          }
        }

        // Ensure required structures
        if(!state.seasons) state.seasons = {};
        if(!state.teamMasterList) state.teamMasterList = [];
        if(!state.logoMasterList) state.logoMasterList = [];

        var s = activeSeason();
        if(s && (!s.rounds || !s.rounds.length)) {
          s.rounds = generateFixtures(s.teamCount);
        }

        // Only push back on initial load if data came from local/embedded
        // (don't re-push fresh cloud data)
        if(!loadedFromCloud) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_){}
        }
      });
    }
    function activeSeason(){return state.seasons[state.current]}
    
    // Helper function to calculate max team name width
    function getMaxTeamNameWidth(teamNames) {
      if (!teamNames || !teamNames.length) return 150; // Default fallback
      
      var maxWidth = 0;
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      
      teamNames.forEach(function(teamName) {
        var width = ctx.measureText(teamName).width;
        maxWidth = Math.max(maxWidth, width);
      });
      
      return Math.ceil(maxWidth + 8);
    }

    function refreshFromFile(){
      // Force reload data from embedded file, ignoring localStorage
      try{ 
        var embeddedElement = document.getElementById('EMBEDDED_DATA');
        if(!embeddedElement) {
          throw new Error('EMBEDDED_DATA element not found');
        }
        
        var txt = embeddedElement.textContent || embeddedElement.innerHTML || ''; 
        if(!txt.trim()) {
          throw new Error('No data found in EMBEDDED_DATA element');
        }
        
        var objE = JSON.parse(txt); 
        if(!objE || !objE.seasons || Object.keys(objE.seasons).length === 0){ 
          throw new Error('Invalid or empty season data in file');
        }
        
        // Store the current state as backup
        var backupState = JSON.parse(JSON.stringify(state));
        
        // Load new state
        state = objE; 
        console.log('Force refreshed data from file (EMBEDDED_DATA)');
        console.log('Loaded seasons:', Object.keys(state.seasons));
        
        // Clear admin mode when refreshing from file to prevent UI/functionality mismatch
        try { 
          sessionStorage.removeItem('pesAdmin'); 
          console.log('Cleared admin mode during file refresh');
        } catch(e){}
        
        // Restore Note and Link data if available in embedded data
        if(objE.homeLink !== undefined) {
          try { localStorage.setItem('pesHomeLink', objE.homeLink); } catch(e){}
          homeLink = objE.homeLink;
        }
        if(objE.homeLabel !== undefined) {
          try { localStorage.setItem('pesHomeLabel', objE.homeLabel); } catch(e){}
          homeLabel = objE.homeLabel;
        }
        if(objE.customLinks !== undefined) {
          try { localStorage.setItem('pesCustomLinks', JSON.stringify(objE.customLinks)); } catch(e){}
          customLinks = objE.customLinks;
          updateCustomLinks(); // Update the UI
        }
        if(objE.pesNotes !== undefined) {
          try { localStorage.setItem('pesNotes', JSON.stringify(objE.pesNotes)); } catch(e){}
        }
        
        // Ensure teamMasterList and logoMasterList are always initialized
        if(!state.teamMasterList) {
          state.teamMasterList = [];
        }
        if(!state.logoMasterList) {
          state.logoMasterList = [];
        }
        
        // Ensure current season exists
        if(!state.current || !state.seasons[state.current]) {
          var seasonKeys = Object.keys(state.seasons);
          if(seasonKeys.length > 0) {
            state.current = seasonKeys[0];
          }
        }
        
        // Re-render everything
        try {
          refreshAll();
          
          // Save refreshed data to localStorage to make it persistent
          saveAll();
          console.log('Saved refreshed data to localStorage');
          
          // Only show success dialog in admin mode
          if(isAdmin()) {
            alert('✅ Đã tải lại dữ liệu từ file thành công!\n\nSố mùa giải: ' + Object.keys(state.seasons).length);
          }
        } catch(renderError) {
          console.error('Error rendering after refresh:', renderError);
          // Restore backup state if render fails
          state = backupState;
          refreshAll();
          throw new Error('Rendering failed after data load: ' + renderError.message);
        }
        return;
      }catch(e){
        console.error('Error refreshing from file:', e);
        alert('❌ Không thể tải dữ liệu từ file\n\nLỗi: ' + e.message + '\n\nVui lòng kiểm tra:\n• File có chứa dữ liệu hợp lệ\n• Trình duyệt đã tải hoàn chỉnh trang');
      }
    }

    function refreshAll(){
      // Refresh season UI and all rendering
      refreshSeasonUI();
      
      var s = activeSeason();
      if(s) {
        console.log('refreshAll - season mode:', s.mode);
        if(s.mode === 'cup') {
          renderCupBracket(s);
          renderCupStandings(s);
        } else if(s.mode === 'double-elimination') {
          renderDoubleEliminationBracket(s);
          renderCupStandings(s); // Reuse standings for now
        } else if(s.mode === 'tournament') {
          renderTournamentStandings(s);
          renderTournamentGroups(s);
          var roundSelElem = $('roundSel');
          var selectedRound = roundSelElem ? (roundSelElem.value || 'group-0') : 'group-0';
          renderTournamentFixtures(selectedRound);
          renderTournamentKnockoutBracket(s);
        } else if(s.mode === 'legend') {
          renderLegendMode(s);
        } else if(s.mode === 'ranking') {
          renderRankingMode(s);
        } else {
          // League mode - use checkbox-based round selection
          renderStandings();
          renderFixtures(); // Let renderFixtures read from checkboxes
          renderInsights();
          renderSeasonStats();
          try { drawRankChart(); } catch(e) {}
        }
      }
    }
        function makeSeason(name,n,type,has3rdPlace,numGroups,numKnockoutTeams,groupRoundRobin){
      type = type || 'league';
      
      // For legend mode, override team count to 0
      if(type === 'legend') {
        n = 0;
      }
      
      // For ranking mode, override team count to 0
      if(type === 'ranking') {
        n = 0;
      }
      
      var teams=Array.from({length:n},function(_,i){return 'Team '+(i+1)});
      has3rdPlace = has3rdPlace || false;
      numGroups = numGroups || 4;
      numKnockoutTeams = numKnockoutTeams || 8;
      groupRoundRobin = groupRoundRobin || 'double';
      
      var season = {
        name:name,
        logo:null,
        teamCount:n,
        teams:teams,
        teamColors:Array(n).fill('#1b2550'),
        teamLogos:Array(n).fill(DEFAULT_TEAM_LOGO),
        results:{},
        rounds: [],
        settings:{top:4,euro:6,playoff:0,rel:3,h2h:false},
        createdAt: Date.now(),
        mode: type,
        has3rdPlace: has3rdPlace,
        numGroups: numGroups,
        numKnockoutTeams: numKnockoutTeams,
        groupRoundRobin: groupRoundRobin
      };
      
      if(type === 'legend') {
        // Legend mode - timeline with events (uses global state.teamMasterList)
        season.timelines = [];
      } else if(type === 'ranking') {
        // Ranking mode - timeline with events (uses global state.teamMasterList)
        season.timelines = [];
      } else if(type === 'league') {
        season.rounds = generateFixtures(n);
      } else if(type === 'cup') {
        // CUP mode - rounds will be generated by buildCupBracket
      } else if(type === 'double-elimination') {
        // Double Elimination mode - bracket will be generated by buildDoubleEliminationBracket
        if(n < 3) {
          alert('Double Elimination requires minimum 3 teams');
          return null;
        }
      } else if(type === 'tournament') {
        // Tournament mode - create group stage + knockout structure
        var minTeams = numGroups * 2;
        if(n < minTeams) {
          alert('Tournament with ' + numGroups + ' groups requires minimum ' + minTeams + ' teams');
          return null;
        }
        
        // Create groups structure
        season.groups = generateTournamentGroups(teams, n, numGroups, groupRoundRobin);
        season.groupStandings = {};
        season.knockoutBracket = null; // Will be generated after group stage
        season.tournamentPhase = 'group'; // 'group' or 'knockout'
      }
      // Legend mode is now handled earlier in the function (line ~5072)
      
      return season;
    }

    // Generate tournament groups and fixtures for Champions League style format
    function generateTournamentGroups(teams, teamCount, numGroups, groupRoundRobin) {
      numGroups = numGroups || 4;
      groupRoundRobin = groupRoundRobin || 'double';
      var groups = {};
      
      // Shuffle teams for random group assignment
      var shuffledTeams = teams.slice();
      for(var i = shuffledTeams.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffledTeams[i];
        shuffledTeams[i] = shuffledTeams[j];
        shuffledTeams[j] = temp;
      }
      
      // Initialize groups (A, B, C, D, E, F, G, H)
      var groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numGroups);
      for(var g = 0; g < numGroups; g++) {
        groups[groupNames[g]] = {
          name: 'Group ' + groupNames[g],
          teams: [],
          teamIndices: [],
          fixtures: []
        };
      }
      
      // Distribute teams round-robin to groups
      for(var t = 0; t < teamCount; t++) {
        var groupIndex = t % numGroups; // Round-robin distribution
        var groupName = groupNames[groupIndex];
        var originalIndex = teams.indexOf(shuffledTeams[t]);
        
        groups[groupName].teams.push(shuffledTeams[t]);
        groups[groupName].teamIndices.push(originalIndex);
      }
      
      // Generate fixtures for each group based on actual team count in that group
      for(var g = 0; g < numGroups; g++) {
        var groupName = groupNames[g];
        var group = groups[groupName];
        if(group.teams.length >= 2) {
          if(groupRoundRobin === 'single') {
            // Single round robin - each team plays every other team once
            group.fixtures = generateSingleRoundRobin(group.teams.length);
          } else {
            // Double round robin - each team plays every other team twice (home and away)
            group.fixtures = generateFixtures(group.teams.length);
          }
        }
      }
      
      return groups;
    }

    // Generate single round robin fixtures (each team plays once)
    function generateSingleRoundRobin(teamCount) {
      var n = teamCount;
      var hasBye = n % 2 === 1;
      if(hasBye) n += 1;
      
      var idxs = Array.from({length: n}, function(_, i) { return i; });
      var rounds = [];
      var half = n / 2;
      var arr = idxs.slice();
      
      for(var r = 0; r < n - 1; r++) {
        var pairs = [];
        for(var i = 0; i < half; i++) {
          var home = arr[i];
          var away = arr[n - 1 - i];
          if(home < teamCount && away < teamCount) {
            pairs.push({home: home, away: away});
          }
        }
        rounds.push(pairs);
        
        // Rotate (keep first fixed, rotate rest)
        arr = [arr[0]].concat([arr[n - 1]]).concat(arr.slice(1, n - 1));
      }
      
      return rounds;
    }

    // Calculate standings for a specific group in tournament
    function calculateGroupStandings(season, groupName) {
      var group = season.groups[groupName];
      if(!group) return [];
      
      var standings = group.teamIndices.map(function(teamIdx) {
        return {
          idx: teamIdx,
          team: season.teams[teamIdx],
          P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0
        };
      });
      
      // Calculate stats from group fixtures
      group.fixtures.forEach(function(round, roundIdx) {
        round.forEach(function(match, matchIdx) {
          var key = 'group-' + groupName + '-' + roundIdx + '-' + matchIdx;
          var result = season.results[key];
          if(!result) return;
          
          var homeTeamIdx = group.teamIndices[match.home];
          var awayTeamIdx = group.teamIndices[match.away];
          var homeRow = standings.find(function(s) { return s.idx === homeTeamIdx; });
          var awayRow = standings.find(function(s) { return s.idx === awayTeamIdx; });
          
          if(homeRow && awayRow) {
            homeRow.P++; awayRow.P++;
            homeRow.GF += result.hg; homeRow.GA += result.ag;
            awayRow.GF += result.ag; awayRow.GA += result.hg;
            
            if(result.hg > result.ag) {
              homeRow.W++; homeRow.Pts += 3;
              awayRow.L++;
            } else if(result.hg < result.ag) {
              awayRow.W++; awayRow.Pts += 3;
              homeRow.L++;
            } else {
              homeRow.D++; homeRow.Pts += 1;
              awayRow.D++; awayRow.Pts += 1;
            }
            
            homeRow.GD = homeRow.GF - homeRow.GA;
            awayRow.GD = awayRow.GF - awayRow.GA;
          }
        });
      });
      
      // Sort by points, then goal difference, then goals for
      standings.sort(function(a, b) {
        if(a.Pts !== b.Pts) return b.Pts - a.Pts;
        if(a.GD !== b.GD) return b.GD - a.GD;
        return b.GF - a.GF;
      });
      
      return standings;
    }

    // Get qualified teams from all groups with flexible knockout team count
    function getTournamentQualifiers(season) {
      var qualifiers = [];
      var numGroups = season.numGroups || 4;
      var numKnockoutTeams = season.numKnockoutTeams || 8;
      var groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numGroups);
      
      var allStandings = [];
      
      groupNames.forEach(function(groupName) {
        var standings = calculateGroupStandings(season, groupName);
        standings.forEach(function(team, position) {
          allStandings.push({
            teamIdx: team.idx,
            groupName: groupName,
            position: position + 1, // 1-indexed position
            points: team.Pts,
            gd: team.GD,
            gf: team.GF
          });
        });
      });
      
      // Get 1st and 2nd place teams from each group
      var firstPlace = allStandings.filter(function(q) { return q.position === 1; });
      var secondPlace = allStandings.filter(function(q) { return q.position === 2; });
      
      qualifiers = qualifiers.concat(firstPlace, secondPlace);
      
      // If we need more teams to reach numKnockoutTeams, take best 3rd, 4th, 5th place teams
      var needed = numKnockoutTeams - qualifiers.length;
      var position = 3;
      
      while(needed > 0 && position <= 10) {
        var positionTeams = allStandings.filter(function(q) { return q.position === position; });
        // Sort teams by points, GD, GF
        positionTeams.sort(function(a, b) {
          return (b.points - a.points) || (b.gd - a.gd) || (b.gf - a.gf);
        });
        var toAdd = positionTeams.slice(0, needed);
        qualifiers = qualifiers.concat(toAdd);
        needed = numKnockoutTeams - qualifiers.length;
        position++;
      }
      
      return qualifiers.slice(0, numKnockoutTeams);
    }

    // Generate knockout bracket for tournament (flexible team count from group stage)
    function generateTournamentKnockout(season) {
      var qualifiers = getTournamentQualifiers(season);
      var numKnockoutTeams = season.numKnockoutTeams || 8;
      
      if(qualifiers.length < numKnockoutTeams) return null;
      
      // Take only the required number of qualifiers
      qualifiers = qualifiers.slice(0, numKnockoutTeams);
      
      // Map qualifier team indices (0 to numKnockoutTeams-1) to original season indices
      var teamIndexMap = qualifiers.map(function(q) { return q.teamIdx; });
      
      // Use buildCupBracket logic to create flexible knockout bracket
      var knockoutSeason = {
        teamCount: numKnockoutTeams,
        teams: qualifiers.map(function(q) { return season.teams[q.teamIdx]; }),
        has3rdPlace: season.has3rdPlace || false
      };
      
      var cupBracket = buildCupBracket(knockoutSeason);
      if(!cupBracket) return null;
      
      // Remap team indices in all rounds from local (0-N) to original season indices
      var remappedRounds = cupBracket.rounds.map(function(round) {
        return round.map(function(match) {
          var remappedMatch = {};
          
          // Remap home team
          if(typeof match.home === 'number') {
            remappedMatch.home = teamIndexMap[match.home];
          } else {
            remappedMatch.home = match.home; // Keep reference object as-is
          }
          
          // Remap away team
          if(typeof match.away === 'number') {
            remappedMatch.away = teamIndexMap[match.away];
          } else {
            remappedMatch.away = match.away; // Keep reference object as-is
          }
          
          return remappedMatch;
        });
      });
      
      // Create knockout bracket structure
      var bracket = {
        rounds: remappedRounds,
        stageNames: cupBracket.stageNames,
        qualifiers: qualifiers,
        teamIndices: teamIndexMap
      };
      
      return bracket;
    }

    // OLD generateTournamentKnockout code - REPLACED above
    function generateTournamentKnockout_OLD(season) {
      var qualifiers = getTournamentQualifiers(season);
      if(qualifiers.length < 8) return null;
      
      // Take only first 8 qualifiers
      qualifiers = qualifiers.slice(0, 8);
      
      // Create knockout bracket structure (Quarter-finals, Semi-finals, Final)
      var bracket = {
        rounds: [],
        stageNames: ['Quarter-finals', 'Semi-finals', 'Final']
      };
      
      // Quarter-finals: Group winners vs others (try to avoid same group)
      var groupWinners = qualifiers.filter(function(q) { return q.position === 1; });
      var others = qualifiers.filter(function(q) { return q.position !== 1; });
      
      var quarterFinals = [];
      // Pair winners with non-winners from different groups when possible
      for(var i = 0; i < Math.min(groupWinners.length, 4); i++) {
        if(i < groupWinners.length && i < others.length) {
          var winner = groupWinners[i];
          var opponent = others.find(function(r) { return r.groupName !== winner.groupName; });
          if(!opponent) opponent = others[0]; // Fallback if all are from same group
          
          quarterFinals.push({
            home: winner.teamIdx,
            away: opponent.teamIdx
          });
          // Remove the paired opponent from available
          others = others.filter(function(r) { return r !== opponent; });
        }
      }
      
      // Fill remaining quarter-finals if any
      while(quarterFinals.length < 4 && others.length >= 2) {
        quarterFinals.push({
          home: others[0].teamIdx,
          away: others[1].teamIdx
        });
        others = others.slice(2);
      }
      
      // Semi-finals (winners from quarter-finals)
      var semiFinals = [
        {
          home: {fromRound: 0, matchId: 0},
          away: {fromRound: 0, matchId: 1}
        },
        {
          home: {fromRound: 0, matchId: 2},
          away: {fromRound: 0, matchId: 3}
        }
      ];
      
      // Final (winners from semi-finals)
      var finals = [
        {
          home: {fromRound: 1, matchId: 0},
          away: {fromRound: 1, matchId: 1}
        }
      ];
      
      // Add 3rd place match before final if enabled
      if(season.has3rdPlace) {
        var thirdPlace = [
          {
            home: {fromRound: 1, matchId: 0, isLoser: true},
            away: {fromRound: 1, matchId: 1, isLoser: true}
          }
        ];
        bracket.rounds = [quarterFinals, semiFinals, thirdPlace, finals];
        bracket.stageNames = ['Quarter-finals', 'Semi-finals', '3rd Place Match', 'Final'];
      } else {
        bracket.rounds = [quarterFinals, semiFinals, finals];
        bracket.stageNames = ['Quarter-finals', 'Semi-finals', 'Final'];
      }
      
      return bracket;
    }

    function generateFixtures(teamCount){
      var n=teamCount; var hasBye=n%2===1; if(hasBye) n+=1;
      var idxs=Array.from({length:n},function(_,i){return i});
      var rounds=[], half=n/2, arr=idxs.slice();
      for(var r=0;r<n-1;r++){
        var pairs=[];
        for(var i=0;i<half;i++){
          var a=arr[i],b=arr[n-1-i];
          var home=(r%2===0)?a:b, away=(r%2===0)?b:a;
          pairs.push({home:home,away:away});
        }
        rounds.push(pairs);
        arr=[arr[0]].concat(arr.slice(2),[arr[1]]);
      }
      var rounds2=rounds.map(function(rs){return rs.map(function(p){return {home:p.away,away:p.home}})});
      var all=rounds.concat(rounds2).map(function(rs){return rs.filter(function(m){return !(hasBye&&(m.home===n-1||m.away===n-1))})});
      return all;
    }

    function emptyRow(){return {team:'',P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0,form:[],idx:-1}}
    function computeStandingsFor(s,mode,uptoRound){
      var rows=s.teams.map(function(name,i){var r=emptyRow(); r.team=name; r.idx=i; return r});
      var R = (typeof uptoRound==='number')? uptoRound : s.rounds.length-1; R=Math.min(R,s.rounds.length-1);
      for(var r=0;r<=R;r++){
        var ms=s.rounds[r];
        for(var m=0;m<ms.length;m++){
          var key=r+'-'+m; var res=s.results[key]; if(!res) continue;
          var hg=Number(res.hg),ag=Number(res.ag); if(!isFinite(hg)||!isFinite(ag)) continue;
          var hIdx=ms[m].home,aIdx=ms[m].away; var h=rows[hIdx],a=rows[aIdx];
          var countHome=(mode!=='away'),countAway=(mode!=='home');
          if(countHome){h.P++;h.GF+=hg;h.GA+=ag}
          if(countAway){a.P++;a.GF+=ag;a.GA+=hg}
          if(hg>ag){ if(countHome){h.W++;h.Pts+=3;h.form.push('W')} if(countAway){a.L++;a.form.push('L')} }
          else if(hg<ag){ if(countAway){a.W++;a.Pts+=3;a.form.push('W')} if(countHome){h.L++;h.form.push('L')} }
          else { if(countHome){h.D++;h.Pts++;h.form.push('D')} if(countAway){a.D++;a.Pts++;a.form.push('D')} }
        }
      }
      rows.forEach(function(rr){rr.GD=rr.GF-rr.GA});
      rows.sort(function(a,b){
        if(a.Pts !== b.Pts) return b.Pts - a.Pts;
        if(a.GD !== b.GD) return b.GD - a.GD;
        if(a.GF !== b.GF) return b.GF - a.GF;
        return a.team.localeCompare(b.team);
      });
      return rows;
    }

    function lastRoundWithAnyResult(s){
  var last = -1;
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var m=0; m<ms.length; m++){
      if (s.results[r+'-'+m]) { last = r; break; }
    }
  }
  return last;
}

function renderDeltaCell(change, hasPrev){
  if (!hasPrev) return '<td class="delta"><span class="pill same">-</span></td>';
  if (change > 0) return '<td class="delta"><span class="pill up">↑</span></td>';
  if (change < 0) return '<td class="delta"><span class="pill down">↓</span></td>';
  return '<td class="delta"><span class="pill same">-</span></td>';
}
function computeRanksTimeline(s){
      var rounds=s.rounds.length; var timeline=Array.from({length:s.teamCount},function(){return []});
      // Start from round 0 (first round)
      for(var r=0;r<rounds;r++){
        // Check if this round has any results
        var hasResults = false;
        for(var m=0; m<s.rounds[r].length; m++){
          var key = r + '-' + m;
          if(s.results[key] && (s.results[key].hg != null || s.results[key].ag != null)){
            hasResults = true;
            break;
          }
        }
        
        // Only include this round in timeline if it has results
        if(hasResults){
          var rows=computeStandingsFor(s,'overall',r);
          rows.forEach(function(rr,idx){ 
            timeline[rr.idx].push(idx+1);
          });
        }
      }
      return timeline;
    }

    function teamPerMatch(s,idx){
      var P=0,GF=0,GA=0; for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(!res) continue; var hi=ms[m].home,ai=ms[m].away; if(hi===idx){P++;GF+=+res.hg;GA+=+res.ag} else if(ai===idx){P++;GF+=+res.ag;GA+=+res.hg} } } return {P:P,GF:GF,GA:GA,avgGF: P?GF/P:1.2,avgGA:P?GA/P:1.2} }
    function pois(l,k){ if(k<0) return 0; var e=Math.exp(-l); var p=e; for(var i=1;i<=k;i++){ p*=l/i } return p }
    

function matchProbs(s, hi, ai){
  var lam = computeRFExpectedGoals(s, hi, ai);
  var lH = lam.lH, lA = lam.lA;
  var pH = 0, pD = 0, pA = 0;
  for (var x=0; x<=8; x++){
    var px = pois(lH, x);
    for (var y=0; y<=8; y++){
      var py = pois(lA, y);
      var p = px * py;
      if (x > y) pH += p;
      else if (x < y) pA += p;
      else pD += p;
    }
  }
  var sum = pH + pD + pA;
  if (sum > 0){ pH /= sum; pD /= sum; pA /= sum; }
  return { home: pH, draw: pD, away: pA };
}
function fullFormSeq(s,teamIdx){ var out=[]; for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(!res) continue; var home=ms[m].home,away=ms[m].away; if(home===teamIdx){out.push(res.hg>res.ag?'W':(res.hg<res.ag?'L':'D'))} else if(away===teamIdx){out.push(res.ag>res.hg?'W':(res.ag<res.hg?'L':'D'))} } } return out }

    function renderFormCells(seq){
  if(!seq||!seq.length) return '<span class="muted">—</span>';
  return (seq || []).map(function(c){
    var ch = (c==='W' ? 'W' : (c==='D' ? 'D' : 'L'));
    return '<span class="formBox ' + ch + '">' + ch + '</span>';
  }).join('');
}

    function drawRankSparks(teamIdxList){
      var s=activeSeason(); var timeline=computeRanksTimeline(s);
      teamIdxList.forEach(function(idx){
        var canvas=document.querySelector('canvas.spark[data-team="'+idx+'"]'); if(!canvas) return;
        var ctx=canvas.getContext('2d'); var w=canvas.width=canvas.clientWidth; var h=canvas.height=canvas.clientHeight;
        var series=timeline[idx]||[]; if(!series.length){ctx.clearRect(0,0,w,h); return}
        var max=s.teamCount; var X=function(i){return (i/((series.length-1)||1))*w}; var Y=function(rank){return ((rank-1)/(max-1||1))*h};
        ctx.clearRect(0,0,w,h); ctx.beginPath(); ctx.moveTo(0,Y(series[0])); for(var i=1;i<series.length;i++){ctx.lineTo(X(i),Y(series[i]))} ctx.strokeStyle='#60a5fa'; ctx.lineWidth=2; ctx.stroke();
      })
    }

    function renderStandingTracker(){
      var s=activeSeason(); 
      
      // Create team options for all 6 selectors
      for(var selNum = 1; selNum <= 6; selNum++){
        var sel = $('rankTeamSel' + selNum);
        if(!sel) continue;
        
        sel.innerHTML = '';
        
        // Add empty option (default - no team selected)
        var emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Chọn đội --';
        sel.appendChild(emptyOption);
        
        // Add team options sorted alphabetically
        var teamList = s.teams.map(function(t, i) { return {name: t, idx: i}; });
        teamList.sort(function(a, b) { return a.name.localeCompare(b.name); });
        teamList.forEach(function(team){ 
          var o = document.createElement('option'); 
          o.value = String(team.idx); 
          o.textContent = team.name; 
          sel.appendChild(o);
        });
        
        sel.onchange = function(){ drawRankChart() };
      }
      
      drawRankChart();
    }
    function drawRankChart(){
      var s=activeSeason(); 
      var canvas=$('rankChart'); 
      var ctx=canvas.getContext('2d'); 
      var w=canvas.width=canvas.clientWidth; 
      var h=canvas.height=canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      
      // Get selected teams from all 6 selectors
      var selectedTeams = [];
      var colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']; // Blue, Red, Green, Yellow, Purple, Pink
      
      for(var i = 1; i <= 6; i++){
        var sel = $('rankTeamSel' + i);
        if(sel && sel.value !== ''){
          selectedTeams.push({
            idx: Number(sel.value),
            color: colors[i-1]
          });
        }
      }
      
      if(selectedTeams.length === 0){
        ctx.fillStyle='#999'; 
        ctx.fillText('Chọn đội để xem biểu đồ xếp hạng', 10, h/2); 
        return;
      }
      
      var max=s.teamCount; 
      var maxRounds = 0;
      
      // Find the maximum number of rounds across all selected teams
      selectedTeams.forEach(function(team){
        var timeline = computeRanksTimeline(s)[team.idx] || [];
        maxRounds = Math.max(maxRounds, timeline.length);
      });
      
      if(maxRounds === 0){
        ctx.fillStyle='#999'; 
        ctx.fillText('Chưa đủ dữ liệu', 10, h/2); 
        return;
      }
      
      var X=function(i){return 40 + (i/((maxRounds-1)||1))*(w-200)};
      var Y=function(rank){return 20 + ((rank-1)/(max-1||1))*(h-40)};
      
      // Find the latest round with any results
      var latestRoundWithResults = -1;
      for(var r = s.rounds.length - 1; r >= 0; r--){
        var hasResults = false;
        for(var m = 0; m < s.rounds[r].length; m++){
          var key = r + '-' + m;
          if(s.results[key]){
            hasResults = true;
            break;
          }
        }
        if(hasResults){
          latestRoundWithResults = r;
          break;
        }
      }
      
      // Draw grid lines
      ctx.globalAlpha=0.3; 
      ctx.strokeStyle='#6b7280'; 
      for(var r=1;r<=max;r++){ 
        var y=Y(r); 
        ctx.beginPath(); 
        ctx.moveTo(40,y); 
        ctx.lineTo(w-160,y); 
        ctx.stroke();
      } 
      ctx.globalAlpha=1;
      
      // Draw lines for each selected team
      selectedTeams.forEach(function(team){
        var timeline = computeRanksTimeline(s)[team.idx] || [];
        if(timeline.length === 0) return;
        
        ctx.strokeStyle = team.color;
        ctx.fillStyle = team.color;
        ctx.lineWidth = 2;
        
        // Draw line
        ctx.beginPath(); 
        ctx.moveTo(X(0), Y(timeline[0])); 
        for(var i=1; i<timeline.length; i++){ 
          ctx.lineTo(X(i), Y(timeline[i]));
        } 
        ctx.stroke();
        
        // Draw points
        for(var j=0; j<timeline.length; j++){ 
          ctx.beginPath(); 
          ctx.arc(X(j), Y(timeline[j]), 3, 0, Math.PI*2); 
          ctx.fill();
        }
        
        // Draw team name label at the end of the line
        if(timeline.length > 0){
          var lastIndex = timeline.length - 1;
          var labelX = X(lastIndex) + 8;
          var labelY = Y(timeline[lastIndex]) + 4;
          
          // Draw background for better readability
          ctx.font = 'bold 12px system-ui';
          var teamName = s.teams[team.idx];
          var textWidth = ctx.measureText(teamName).width;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(labelX - 2, labelY - 12, textWidth + 4, 16);
          
          // Draw team name
          ctx.fillStyle = team.color;
          ctx.textAlign = 'left';
          ctx.fillText(teamName, labelX, labelY);
        }
      });
      
      // Draw pointer for latest round with results
      if(latestRoundWithResults >= 0 && maxRounds > 0){
        // Count how many rounds with results exist up to latestRoundWithResults
        var pointerIndex = 0;
        for(var r = 0; r <= latestRoundWithResults; r++){
          var hasResults = false;
          for(var m = 0; m < s.rounds[r].length; m++){
            var key = r + '-' + m;
            if(s.results[key] && (s.results[key].hg != null || s.results[key].ag != null)){
              hasResults = true;
              break;
            }
          }
          if(hasResults){
            pointerIndex++;
          }
        }
        // Adjust to 0-based index for the last round with results
        pointerIndex = pointerIndex - 1;
        
        if(pointerIndex >= 0 && pointerIndex < maxRounds){
          var pointerX = X(pointerIndex);
          
          // Draw vertical line
          ctx.strokeStyle = '#ff6b35';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]); // Dashed line
          ctx.beginPath();
          ctx.moveTo(pointerX, 20);
          ctx.lineTo(pointerX, h - 30);
          ctx.stroke();
          ctx.setLineDash([]); // Reset to solid line
          
          // Draw arrow pointer at the bottom
          ctx.fillStyle = '#ff6b35';
          ctx.beginPath();
          ctx.moveTo(pointerX, h - 15);
          ctx.lineTo(pointerX - 5, h - 8);
          ctx.lineTo(pointerX + 5, h - 8);
          ctx.closePath();
          ctx.fill();
          
          // Add label
          ctx.fillStyle = '#ff6b35';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Vòng ' + (latestRoundWithResults + 1), pointerX, h - 25);
          ctx.textAlign = 'left'; // Reset text alignment
          ctx.font = '12px system-ui'; // Reset font
        }
      }
      
      // Draw labels
      ctx.fillStyle='#cbd5e1'; 
      ctx.save(); 
      ctx.rotate(-Math.PI/2); 
      ctx.fillText('Hạng (↓ tốt hơn)', -h+20, 12); 
      ctx.restore();
    }

    // Render tournament standings and structure
    function renderTournamentStandings(s) {
      $('seasonTitle').textContent='— '+s.name+' (TOURNAMENT)';
      $('leagueLogo').style.backgroundImage=s.logo?('url("'+s.logo+'")'):'none';
      
      // Update table header for Tournament mode
      var thead = document.querySelector('#tblStandings thead tr');
      if(thead) {
        thead.innerHTML = '<th class="pos">#</th>' +
                          '<th>Đội</th>' +
                          '<th>P</th><th>W</th><th>D</th><th>L</th>' +
                          '<th>GF</th><th>GA</th><th>GD</th><th>Pts</th>' +
                          '<th style="text-align: center;">Stage</th>';
      }
      
      // Use main standings table for overall tournament standings
      var tbody = $('standings');
      tbody.innerHTML='';
      
      var overallStandings = computeTournamentStandings(s);
      overallStandings.forEach(function(row, pos) {
        var tr = document.createElement('tr');
        var stageColor = '';
        if(row.stage === 'Winner') stageColor = ' style="background: rgba(255, 215, 0, 0.2); font-weight: bold;"';
        else if(row.stage === 'Final') stageColor = ' style="background: rgba(192, 192, 192, 0.2);"';
        else if(row.stage === 'Semi-finals') stageColor = ' style="background: rgba(205, 127, 50, 0.2);"';
        else if(row.stage === 'Quarter-finals') stageColor = ' style="background: rgba(34, 197, 94, 0.1);"';
        
        // Add team logo and badge like in regular standings
        var logo = s.teamLogos && s.teamLogos[row.idx] ? '<img src="' + s.teamLogos[row.idx] + '" alt="logo"/>' : '';
        var badge = logo ? ('<span class="badge">' + logo + '</span>') : ('<span class="badge" style="background:' + (s.teamColors[row.idx] || '#1b2550') + '"></span>');
        
        tr.innerHTML = '<td' + stageColor + '>' + (pos + 1) + '</td>' +
                      '<td' + stageColor + ' class="team">' + badge + row.team + '</td>' +
                      '<td' + stageColor + '>' + row.P + '</td>' +
                      '<td' + stageColor + '>' + row.W + '</td>' +
                      '<td' + stageColor + '>' + row.D + '</td>' +
                      '<td' + stageColor + '>' + row.L + '</td>' +
                      '<td' + stageColor + '>' + row.GF + '</td>' +
                      '<td' + stageColor + '>' + row.GA + '</td>' +
                      '<td' + stageColor + '>' + row.GD + '</td>' +
                      '<td' + stageColor + '>' + row.Pts + '</td>' +
                      '<td' + stageColor + ' style="text-align: center;">' + row.stage + '</td>';
        tbody.appendChild(tr);
      });
      
      // Now render group tables below the main standings in a 2x2 grid
      renderTournamentGroups(s);
    }
    
    // Render tournament group tables in 2x2 grid layout
    function renderTournamentGroups(s) {
      // Find the standings section (first section in main)
      var mainContainer = document.querySelector('main.container');
      var existingGroupsContainer = document.getElementById('tournamentGroups');
      if(existingGroupsContainer) {
        existingGroupsContainer.remove();
      }
      
      var groupsContainer = document.createElement('div');
      groupsContainer.id = 'tournamentGroups';
      groupsContainer.className = 'row';
      groupsContainer.style.cssText = 'margin-top: 20px;';
      
      var groupsSection = document.createElement('section');
      groupsSection.className = 'card grow';
      
      var groupsTitle = document.createElement('h3');
      groupsTitle.textContent = 'Group Stage Tables';
      groupsTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); text-align: center;';
      groupsSection.appendChild(groupsTitle);
      
      // Create grid for groups (max 4 per row)
      var gridContainer = document.createElement('div');
      gridContainer.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 20px;';
      
      var groupNames = Object.keys(s.groups || {});
      groupNames.forEach(function(groupName, index) {
        if(!s.groups[groupName]) return;
        
        var groupCard = document.createElement('div');
        groupCard.className = 'card';
        groupCard.style.cssText = 'border: 1px solid var(--border); border-radius: 12px; padding: 20px; background: var(--card); box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s ease, box-shadow 0.2s ease;';
        groupCard.onmouseenter = function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; };
        groupCard.onmouseleave = function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; };
        
        var groupTitle = document.createElement('h4');
        groupTitle.textContent = 'Group ' + groupName;
        groupTitle.style.cssText = 'margin: 0 0 16px 0; color: var(--accent); text-align: center; font-size: 18px; font-weight: 600; padding: 8px 16px; background: var(--accent-bg); border-radius: 8px;';
        groupCard.appendChild(groupTitle);
        
        var groupTable = document.createElement('table');
        groupTable.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed;';
        
        var thead = document.createElement('thead');
        thead.innerHTML = '<tr>' +
          '<th style="width: 30px; text-align: left; padding: 8px 6px; color: var(--muted); font-size: 11px;">#</th>' +
          '<th style="width: auto; text-align: left; padding: 8px 6px; color: var(--muted); font-size: 11px;">Team</th>' +
          '<th style="width: 28px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">P</th>' +
          '<th style="width: 28px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">W</th>' +
          '<th style="width: 28px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">D</th>' +
          '<th style="width: 28px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">L</th>' +
          '<th style="width: 30px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">GF</th>' +
          '<th style="width: 30px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">GA</th>' +
          '<th style="width: 30px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">GD</th>' +
          '<th style="width: 32px; text-align: center; padding: 8px 4px; color: var(--muted); font-size: 11px;">Pts</th>' +
          '</tr>';
        groupTable.appendChild(thead);
        
        var groupTbody = document.createElement('tbody');
        var standings = calculateGroupStandings(s, groupName);
        standings.forEach(function(row, pos) {
          var tr = document.createElement('tr');
          var qualifier = pos < 2 ? ' style="background: rgba(34, 197, 94, 0.1); font-weight: 500;"' : '';
          
          // Add team logo and badge like in main standings
          var logo = s.teamLogos && s.teamLogos[row.idx] ? '<img src="' + s.teamLogos[row.idx] + '" alt="logo" style="width:16px;height:16px;border-radius:2px;object-fit:cover;margin-right:4px;"/>' : '';
          var badge = logo ? logo : ('<span style="display:inline-block;width:16px;height:16px;border-radius:2px;background:' + (s.teamColors[row.idx] || '#1b2550') + ';margin-right:4px;"></span>');
          
          tr.innerHTML = '<td' + qualifier + ' style="width: 30px; text-align: left; padding: 6px 6px;">' + (pos + 1) + '</td>' +
                        '<td' + qualifier + ' style="width: auto; text-align: left; padding: 6px 6px;">' + badge + row.team + '</td>' +
                        '<td' + qualifier + ' style="width: 28px; text-align: center; padding: 6px 4px;">' + row.P + '</td>' +
                        '<td' + qualifier + ' style="width: 28px; text-align: center; padding: 6px 4px;">' + row.W + '</td>' +
                        '<td' + qualifier + ' style="width: 28px; text-align: center; padding: 6px 4px;">' + row.D + '</td>' +
                        '<td' + qualifier + ' style="width: 28px; text-align: center; padding: 6px 4px;">' + row.L + '</td>' +
                        '<td' + qualifier + ' style="width: 30px; text-align: center; padding: 6px 4px;">' + row.GF + '</td>' +
                        '<td' + qualifier + ' style="width: 30px; text-align: center; padding: 6px 4px;">' + row.GA + '</td>' +
                        '<td' + qualifier + ' style="width: 30px; text-align: center; padding: 6px 4px;">' + row.GD + '</td>' +
                        '<td' + qualifier + ' style="width: 32px; text-align: center; padding: 6px 4px; font-weight: bold;">' + row.Pts + '</td>';
          groupTbody.appendChild(tr);
        });
        groupTable.appendChild(groupTbody);
        groupCard.appendChild(groupTable);
        
        gridContainer.appendChild(groupCard);
      });
      
      groupsSection.appendChild(gridContainer);
      
      // Show status message about knockout stage
      var statusDiv = document.createElement('div');
      if(s.knockoutBracket) {
        statusDiv.style.cssText = 'padding: 12px; background: var(--accent-bg); border-radius: 6px; text-align: center; color: var(--accent); margin-top: 20px;';
        statusDiv.innerHTML = '🏆 Knockout stage has begun! Check the bracket below for knockout matches.';
      } else {
        statusDiv.style.cssText = 'padding: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; text-align: center; color: var(--muted); margin-top: 20px;';
        statusDiv.innerHTML = '⏳ Complete all group stage matches to advance to knockout stage';
      }
      groupsSection.appendChild(statusDiv);
      
      groupsContainer.appendChild(groupsSection);
      
      // Insert after the standings row
      if(mainContainer) {
        var standingsRow = mainContainer.querySelector('.row');
        if(standingsRow && standingsRow.nextSibling) {
          mainContainer.insertBefore(groupsContainer, standingsRow.nextSibling);
        } else if(standingsRow) {
          mainContainer.appendChild(groupsContainer);
        }
      }
    }

    // Create overall tournament standings combining group stage and knockout results
    function computeTournamentStandings(s) {
      var standings = s.teams.map(function(team, idx) {
        return {
          idx: idx,
          team: team,
          P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
          stage: 'Group', // Track which stage they reached
          eliminated: false
        };
      });
      
      // Add group stage results
      var groupNames = Object.keys(s.groups || {});
      groupNames.forEach(function(groupName) {
        if(!s.groups[groupName]) return;
        
        var group = s.groups[groupName];
        group.fixtures.forEach(function(round, roundIdx) {
          round.forEach(function(match, matchIdx) {
            var key = 'group-' + groupName + '-' + roundIdx + '-' + matchIdx;
            var result = s.results[key];
            if(!result) return;
            
            var homeTeamIdx = group.teamIndices[match.home];
            var awayTeamIdx = group.teamIndices[match.away];
            var homeRow = standings.find(function(s) { return s.idx === homeTeamIdx; });
            var awayRow = standings.find(function(s) { return s.idx === awayTeamIdx; });
            
            if(homeRow && awayRow) {
              homeRow.P++; awayRow.P++;
              homeRow.GF += result.hg; homeRow.GA += result.ag;
              awayRow.GF += result.ag; awayRow.GA += result.hg;
              
              if(result.hg > result.ag) {
                homeRow.W++; homeRow.Pts += 3;
                awayRow.L++;
              } else if(result.hg < result.ag) {
                awayRow.W++; awayRow.Pts += 3;
                homeRow.L++;
              } else {
                homeRow.D++; homeRow.Pts += 1;
                awayRow.D++; awayRow.Pts += 1;
              }
              
              homeRow.GD = homeRow.GF - homeRow.GA;
              awayRow.GD = awayRow.GF - awayRow.GA;
            }
          });
        });
      });
      
      // Update stages based on qualification and knockout results
      var qualifiers = getTournamentQualifiers(s);
      var qualifiedIndices = qualifiers.map(function(q) { return q.teamIdx; });
      
      standings.forEach(function(row) {
        if(qualifiedIndices.indexOf(row.idx) === -1) {
          row.stage = 'Group Stage';
          row.eliminated = true;
        } else {
          row.stage = 'Qualified';
        }
      });
      
      // Add knockout stage results and update stages
      if(s.knockoutBracket) {
        s.knockoutBracket.rounds.forEach(function(round, roundIdx) {
          round.forEach(function(match, matchIdx) {
            var key = 'knockout-' + roundIdx + '-' + matchIdx;
            var result = s.results[key];
            
            // Resolve team indices - handle both direct indices and references (winner/loser)
            var homeIdx = null;
            var awayIdx = null;
            
            if(typeof match.home === 'number') {
              homeIdx = match.home;
            } else if(match.home && match.home.isLoser) {
              homeIdx = resolveLoserFromMatch(s, match.home.fromRound, match.home.matchId);
            } else if(match.home && match.home.fromRound != null) {
              // Resolve winner from previous match
              var prevKey = 'knockout-' + match.home.fromRound + '-' + match.home.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = s.knockoutBracket.rounds[match.home.fromRound][match.home.matchId];
                var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
                var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
                if(prevHomeIdx != null && prevAwayIdx != null) {
                  homeIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
                }
              }
            }
            
            if(typeof match.away === 'number') {
              awayIdx = match.away;
            } else if(match.away && match.away.isLoser) {
              awayIdx = resolveLoserFromMatch(s, match.away.fromRound, match.away.matchId);
            } else if(match.away && match.away.fromRound != null) {
              // Resolve winner from previous match
              var prevKey = 'knockout-' + match.away.fromRound + '-' + match.away.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = s.knockoutBracket.rounds[match.away.fromRound][match.away.matchId];
                var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
                var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
                if(prevHomeIdx != null && prevAwayIdx != null) {
                  awayIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
                }
              }
            }
            
            if(!result || homeIdx == null || awayIdx == null) return;
            
            var homeRow = standings.find(function(s) { return s.idx === homeIdx; });
            var awayRow = standings.find(function(s) { return s.idx === awayIdx; });
            
            if(homeRow && awayRow) {
              homeRow.P++; awayRow.P++;
              homeRow.GF += result.hg; homeRow.GA += result.ag;
              awayRow.GF += result.ag; awayRow.GA += result.hg;
              
              var stageName = s.knockoutBracket.stageNames[roundIdx];
              
              if(result.hg > result.ag) {
                homeRow.W++; homeRow.Pts += 3;
                awayRow.L++;
                // Update stages based on stage name
                if(stageName === 'Final' || stageName === 'Chung kết') {
                  homeRow.stage = 'Winner';
                  awayRow.stage = 'Runner-up';
                } else if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') {
                  homeRow.stage = '3rd Place';
                  awayRow.stage = '4th Place';
                } else {
                  homeRow.stage = s.knockoutBracket.stageNames[roundIdx + 1] || stageName;
                  awayRow.stage = stageName;
                }
                awayRow.eliminated = true;
              } else if(result.hg < result.ag) {
                awayRow.W++; awayRow.Pts += 3;
                homeRow.L++;
                // Update stages based on stage name
                if(stageName === 'Final' || stageName === 'Chung kết') {
                  awayRow.stage = 'Winner';
                  homeRow.stage = 'Runner-up';
                } else if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') {
                  awayRow.stage = '3rd Place';
                  homeRow.stage = '4th Place';
                } else {
                  awayRow.stage = s.knockoutBracket.stageNames[roundIdx + 1] || stageName;
                  homeRow.stage = stageName;
                }
                homeRow.eliminated = true;
              } else {
                // Tie - no winner advancement in knockout
                homeRow.D++; homeRow.Pts += 1;
                awayRow.D++; awayRow.Pts += 1;
              }
              
              homeRow.GD = homeRow.GF - homeRow.GA;
              awayRow.GD = awayRow.GF - awayRow.GA;
            }
          });
        });
      }
      
      // Sort by stage reached, then points, then goal difference
      var stageOrder = [
        'Winner', 
        'Runner-up',
        '3rd Place', 'Tranh hạng 3',
        '4th Place',
        'Final', 'Chung kết',
        'Semi-finals', 'Bán kết',
        'Quarter-finals', 'Tứ kết',
        'Vòng 1/8',
        'Vòng 1/16',
        'Vòng 1', 'Vòng 2', 'Vòng 3', 'Vòng 4', 'Vòng 5', 'Vòng 6',
        'Playoff',
        'Qualified', 
        'Group Stage'
      ];
      standings.sort(function(a, b) {
        var stageA = stageOrder.indexOf(a.stage);
        var stageB = stageOrder.indexOf(b.stage);
        // If stage not found in order, put it at the end
        if(stageA === -1) stageA = 9999;
        if(stageB === -1) stageB = 9999;
        if(stageA !== stageB) return stageA - stageB;
        if(a.Pts !== b.Pts) return b.Pts - a.Pts;
        if(a.GD !== b.GD) return b.GD - a.GD;
        return b.GF - a.GF;
      });
      
      return standings;
    }

    // Check if group stage is complete and generate knockout bracket
    function checkAndGenerateKnockout(s) {
      if(s.mode !== 'tournament' || s.knockoutBracket) return;
      
      // Check if all group matches are complete
      var allGroupsComplete = true;
      var groupNames = Object.keys(s.groups || {});
      
      groupNames.forEach(function(groupName) {
        if(!s.groups[groupName]) {
          allGroupsComplete = false;
          return;
        }
        
        var group = s.groups[groupName];
        group.fixtures.forEach(function(round, roundIdx) {
          round.forEach(function(match, matchIdx) {
            var key = 'group-' + groupName + '-' + roundIdx + '-' + matchIdx;
            if(!s.results[key]) {
              allGroupsComplete = false;
            }
          });
        });
      });
      
      if(allGroupsComplete) {
        s.knockoutBracket = generateTournamentKnockout(s);
        s.tournamentPhase = 'knockout';
        saveAll();
        
        // Refresh UI to show the bracket
        refreshSeasonUI();
      }
    }

    // Calculate statistics for Legend mode
    function calculateLegendStats(s) {
      var stats = {
        totalYears: 0,
        totalEvents: 0,
        totalGold: 0,
        totalSilver: 0,
        totalBronze: 0,
        totalChampions: 0,
        championsList: []
      };
      
      if(!s.timelines || s.timelines.length === 0) return stats;
      
      var championsMap = {}; // { teamName: { gold: 0, silver: 0, bronze: 0 } }
      
      stats.totalYears = s.timelines.length;
      
      s.timelines.forEach(function(timeline) {
        if(!timeline.events) return;
        
        stats.totalEvents += timeline.events.length;
        
        timeline.events.forEach(function(event) {
          if(!event.medals) return;
          
          // Count gold medals
          if(event.medals.gold) {
            event.medals.gold.forEach(function(team) {
              if(team && team.trim()) {
                stats.totalGold++;
                if(!championsMap[team]) {
                  championsMap[team] = { gold: 0, silver: 0, bronze: 0 };
                }
                championsMap[team].gold++;
              }
            });
          }
          
          // Count silver medals
          if(event.medals.silver) {
            event.medals.silver.forEach(function(team) {
              if(team && team.trim()) {
                stats.totalSilver++;
                if(!championsMap[team]) {
                  championsMap[team] = { gold: 0, silver: 0, bronze: 0 };
                }
                championsMap[team].silver++;
              }
            });
          }
          
          // Count bronze medals
          if(event.medals.bronze) {
            event.medals.bronze.forEach(function(team) {
              if(team && team.trim()) {
                stats.totalBronze++;
                if(!championsMap[team]) {
                  championsMap[team] = { gold: 0, silver: 0, bronze: 0 };
                }
                championsMap[team].bronze++;
              }
            });
          }
        });
      });
      
      // Convert map to sorted list
      Object.keys(championsMap).forEach(function(teamName) {
        stats.championsList.push({
          name: teamName,
          gold: championsMap[teamName].gold,
          silver: championsMap[teamName].silver,
          bronze: championsMap[teamName].bronze
        });
      });
      
      // Sort by: Points (Gold×3 + Silver×2 + Bronze×1)
      stats.championsList.sort(function(a, b) {
        var pointsA = a.gold * 3 + a.silver * 2 + a.bronze * 1;
        var pointsB = b.gold * 3 + b.silver * 2 + b.bronze * 1;
        if(pointsB !== pointsA) return pointsB - pointsA;
        // If points are equal, sort by gold, then silver, then bronze
        if(b.gold !== a.gold) return b.gold - a.gold;
        if(b.silver !== a.silver) return b.silver - a.silver;
        return b.bronze - a.bronze;
      });
      
      stats.totalChampions = stats.championsList.length;
      
      return stats;
    }

    // Render Legend mode - timeline with events and medals
    function renderLegendMode(s) {
      console.log('renderLegendMode called for season:', s.name, 'mode:', s.mode);
      
      if(!s || !s.timelines) {
        s.timelines = [];
      }
      
      $('seasonTitle').textContent = '— ' + s.name + ' (LEGEND)';
      $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';
      
      // Hide all unnecessary elements - use more specific selectors
      var standingsSection = document.querySelector('main.container section.card.grow');
      if(standingsSection) standingsSection.style.display = 'none';
      
      var fixturesSection = document.querySelector('main.container section.card:has(#fixtures)');
      if(fixturesSection) fixturesSection.style.display = 'none';
      
      var roundSelDiv = document.querySelector('.round-selector');
      if(roundSelDiv) roundSelDiv.style.display = 'none';
      
      // Create main legend container
      var mainContainer = document.querySelector('main.container');
      
      // Remove any existing legend or ranking containers
      var existingLegend = document.getElementById('legendContainer');
      if(existingLegend) existingLegend.remove();
      
      var existingRanking = document.getElementById('rankingModeContainer');
      if(existingRanking) existingRanking.remove();
      
      var legendContainer = document.createElement('div');
      legendContainer.id = 'legendContainer';
      legendContainer.className = 'row';
      legendContainer.style.cssText = 'margin-top: 20px;';
      
      // Calculate statistics
      var stats = calculateLegendStats(s);
      
      // Statistics and Standings row
      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; width: 100%;';
      
      // Summary Statistics Card
      var summaryCard = document.createElement('section');
      summaryCard.className = 'card';
      summaryCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var summaryTitle = document.createElement('h3');
      summaryTitle.textContent = '📊 Statistics';
      summaryTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px;';
      summaryCard.appendChild(summaryTitle);
      
      var statsList = document.createElement('div');
      statsList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
      
      var statItems = [
        { icon: '📅', label: 'Total Years', value: stats.totalYears },
        { icon: '🏅', label: 'Total Events', value: stats.totalEvents },
        { icon: '👑', label: 'Gold Medals', value: stats.totalGold },
        { icon: '🏆', label: 'Silver Medals', value: stats.totalSilver },
        { icon: '🎖️', label: 'Bronze Medals', value: stats.totalBronze },
        { icon: '⭐', label: 'Total Champions', value: stats.totalChampions }
      ];
      
      statItems.forEach(function(item) {
        var statItem = document.createElement('div');
        statItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 8px;';
        
        var labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 500;';
        labelDiv.innerHTML = '<span style="font-size: 20px;">' + item.icon + '</span>' + item.label;
        
        var valueDiv = document.createElement('div');
        valueDiv.textContent = item.value;
        valueDiv.style.cssText = 'font-size: 20px; font-weight: 700; color: var(--accent);';
        
        statItem.appendChild(labelDiv);
        statItem.appendChild(valueDiv);
        statsList.appendChild(statItem);
      });
      
      summaryCard.appendChild(statsList);
      statsRow.appendChild(summaryCard);
      
      // Champions Standings Table
      var standingsCard = document.createElement('section');
      standingsCard.className = 'card';
      standingsCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var standingsTitle = document.createElement('h3');
      standingsTitle.textContent = '🏅 All-Time Champions';
      standingsTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px;';
      standingsCard.appendChild(standingsTitle);
      
      var tableContainer = document.createElement('div');
      tableContainer.style.cssText = 'overflow-x: auto;';
      
      var table = document.createElement('table');
      table.style.cssText = 'width: 100%; border-collapse: collapse;';
      
      // Table header
      var thead = document.createElement('thead');
      thead.innerHTML = '<tr style="background: rgba(59, 130, 246, 0.2);">' +
        '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">#</th>' +
        '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Champion</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">👑</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">🏆</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">🎖️</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Pts</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Total</th>' +
        '</tr>';
      table.appendChild(thead);
      
      // Table body
      var tbody = document.createElement('tbody');
      stats.championsList.forEach(function(champion, idx) {
        var tr = document.createElement('tr');
        
        // Highlight top 3 positions
        var bgColor = '';
        var rankColor = '';
        if(idx === 0) {
          bgColor = 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%);';
          rankColor = 'color: #FFD700; font-weight: 800;';
        } else if(idx === 1) {
          bgColor = 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%);';
          rankColor = 'color: #C0C0C0; font-weight: 800;';
        } else if(idx === 2) {
          bgColor = 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.05) 100%);';
          rankColor = 'color: #CD7F32; font-weight: 800;';
        }
        
        tr.style.cssText = 'border-bottom: 1px solid var(--border); transition: background 0.2s; ' + bgColor;
        var originalBg = tr.style.background;
        tr.onmouseenter = function() { this.style.background = 'rgba(59, 130, 246, 0.1)'; };
        tr.onmouseleave = function() { this.style.background = originalBg; };
        
        var total = champion.gold + champion.silver + champion.bronze;
        var points = champion.gold * 3 + champion.silver * 2 + champion.bronze * 1;
        
        tr.innerHTML = 
          '<td style="padding: 10px; font-weight: 600; ' + rankColor + '">' + (idx + 1) + '</td>' +
          '<td style="padding: 10px; font-weight: 600; font-size: 15px;">' + champion.name + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 16px; color: #FFD700;">' + champion.gold + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 16px; color: #C0C0C0;">' + champion.silver + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 16px; color: #CD7F32;">' + champion.bronze + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 17px; color: var(--accent);">' + points + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 17px; color: var(--muted);">' + total + '</td>';
        
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      
      tableContainer.appendChild(table);
      standingsCard.appendChild(tableContainer);
      statsRow.appendChild(standingsCard);
      
      legendContainer.appendChild(statsRow);
      
      // Create legend section (Hall of Champions) - on separate row below
      var hallSection = document.createElement('div');
      hallSection.style.cssText = 'margin-top: 20px; width: 100%;';
      
      var section = document.createElement('section');
      section.className = 'card grow';
      section.style.cssText = 'padding: 32px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3); width: 100%;';
      
      // Header with Add Timeline button
      var header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--accent);';
      
      var title = document.createElement('h3');
      title.textContent = '🏆 Hall of Champions';
      title.style.cssText = 'margin: 0; color: var(--accent); font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);';
      header.appendChild(title);
      
      if(isAdmin()) {
        var addTimelineBtn = document.createElement('button');
        addTimelineBtn.className = 'primary';
        addTimelineBtn.textContent = '📅 Add Timeline';
        addTimelineBtn.style.cssText = 'padding: 10px 20px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);';
        addTimelineBtn.onclick = function() { addTimeline(s); };
        header.appendChild(addTimelineBtn);
      }
      
      section.appendChild(header);
      
      // Render all timelines (newest first - reverse order)
      var timelinesDiv = document.createElement('div');
      timelinesDiv.id = 'timelinesContainer';
      var reversedTimelines = s.timelines.slice().reverse();
      reversedTimelines.forEach(function(timeline) {
        var originalIndex = s.timelines.indexOf(timeline);
        timelinesDiv.appendChild(renderTimeline(s, timeline, originalIndex));
      });
      
      section.appendChild(timelinesDiv);
      hallSection.appendChild(section);
      legendContainer.appendChild(hallSection);
      mainContainer.appendChild(legendContainer);
    }
    
    function addTimeline(s) {
      var year = prompt('Enter year:');
      if(!year) return;
      
      if(!s.timelines) s.timelines = [];
      s.timelines.push({
        year: year,
        events: [],
        pictures: []
      });
      s.timelines.sort(function(a, b) { return parseInt(a.year) - parseInt(b.year); });
      saveAll();
      renderLegendMode(s);
    }
    
    function renderTimeline(s, timeline, index) {
      var timelineDiv = document.createElement('div');
      timelineDiv.className = 'timeline-box';
      timelineDiv.style.cssText = 'border: 3px solid var(--accent); border-radius: 16px; padding: 28px; margin-bottom: 28px; background: linear-gradient(145deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%); box-shadow: 0 6px 20px rgba(0,0,0,0.25); position: relative; overflow: hidden;';
      
      // Decorative corner accent
      var cornerAccent = document.createElement('div');
      cornerAccent.style.cssText = 'position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: linear-gradient(135deg, var(--accent) 0%, transparent 70%); opacity: 0.1; pointer-events: none;';
      timelineDiv.appendChild(cornerAccent);
      
      // Timeline header
      var headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: relative;';
      
      var yearTitle = document.createElement('h4');
      yearTitle.textContent = timeline.year;
      yearTitle.style.cssText = 'margin: 0; font-size: 48px; font-weight: 900; background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.4)); letter-spacing: 2px; font-family: "Arial Black", sans-serif; position: relative;';
      
      // Add click to rename for admin
      if(isAdmin()) {
        yearTitle.style.cursor = 'pointer';
        yearTitle.title = 'Click to rename';
        yearTitle.onclick = function() {
          var newYear = prompt('Rename timeline:', timeline.year);
          if(newYear && newYear.trim()) {
            timeline.year = newYear.trim();
            saveAll();
            renderLegendMode(s);
          }
        };
      }
      
      // Add decorative underline
      var underline = document.createElement('div');
      underline.style.cssText = 'width: 120px; height: 4px; background: linear-gradient(90deg, #FFD700 0%, var(--accent) 100%); margin-top: 8px; border-radius: 2px; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);';
      
      var yearContainer = document.createElement('div');
      yearContainer.appendChild(yearTitle);
      yearContainer.appendChild(underline);
      headerDiv.appendChild(yearContainer);
      
      if(isAdmin()) {
        var btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 10px;';
        
        var addEventBtn = document.createElement('button');
        addEventBtn.className = 'primary';
        addEventBtn.textContent = '➕ Add Event';
        addEventBtn.style.cssText = 'padding: 8px 16px; font-size: 14px; font-weight: 600;';
        addEventBtn.onclick = function() { addEvent(s, index); };
        btnGroup.appendChild(addEventBtn);
        
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Year';
        deleteBtn.style.cssText = 'background: #dc2626; color: white; padding: 8px 16px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);';
        deleteBtn.onclick = function() {
          if(confirm('Delete timeline for ' + timeline.year + '?')) {
            s.timelines.splice(index, 1);
            saveAll();
            renderLegendMode(s);
          }
        };
        btnGroup.appendChild(deleteBtn);
        
        headerDiv.appendChild(btnGroup);
      }
      
      timelineDiv.appendChild(headerDiv);
      
      // Render events horizontally
      if(!timeline.events) timeline.events = [];
      var eventsContainer = document.createElement('div');
      eventsContainer.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px;';
      timeline.events.forEach(function(event, eventIndex) {
        eventsContainer.appendChild(renderEvent(s, index, event, eventIndex));
      });
      timelineDiv.appendChild(eventsContainer);
      
      // Picture gallery section
      if(!timeline.pictures) timeline.pictures = [];
      
      var pictureSection = document.createElement('div');
      pictureSection.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border);';
      
      if(isAdmin()) {
        var pictureHeader = document.createElement('div');
        pictureHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        
        var pictureTitle = document.createElement('h5');
        pictureTitle.textContent = '📸 Photo Gallery';
        pictureTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: var(--accent);';
        pictureHeader.appendChild(pictureTitle);
        
        var addPictureBtn = document.createElement('button');
        addPictureBtn.textContent = '➕ Add Photo';
        addPictureBtn.className = 'primary';
        addPictureBtn.style.cssText = 'padding: 6px 14px; font-size: 13px; font-weight: 600;';
        addPictureBtn.onclick = function() { addPicture(s, index); };
        pictureHeader.appendChild(addPictureBtn);
        
        pictureSection.appendChild(pictureHeader);
      }
      
      // Picture gallery display
      if(timeline.pictures.length > 0) {
        var galleryDiv = document.createElement('div');
        // If more than 4 pictures, display vertically; otherwise horizontally
        if(timeline.pictures.length > 4) {
          galleryDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 8px 0;';
        } else {
          galleryDiv.style.cssText = 'display: flex; gap: 16px; overflow-x: auto; padding: 8px 0;';
        }
        
        timeline.pictures.forEach(function(pictureUrl, picIndex) {
          var picContainer = renderPictureItem(s, index, pictureUrl, picIndex);
          galleryDiv.appendChild(picContainer);
        });
        
        pictureSection.appendChild(galleryDiv);
      }
      
      timelineDiv.appendChild(pictureSection);
      
      return timelineDiv;
    }
    
    function addPicture(s, timelineIndex) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = function(e) {
        var files = Array.from(e.target.files);
        if(!files.length) return;
        if(!s.timelines[timelineIndex].pictures) s.timelines[timelineIndex].pictures = [];
        var year = s.timelines[timelineIndex].year || ('y' + timelineIndex);
        var done = 0;
        files.forEach(function(file, idx) {
          var baseName = state.current + '_' + year + '_' + (s.timelines[timelineIndex].pictures.length + idx + 1);
          RepoUploader.uploadResizedFile(file, {
            folder: 'photos',
            baseName: baseName,
            message: 'chore: upload timeline photo ' + baseName
          }).then(function(path) {
            s.timelines[timelineIndex].pictures.push(path);
          }).catch(function(err) {
            console.error('Photo upload failed:', err);
            alert('Upload ảnh thất bại: ' + (err && err.message ? err.message : err));
          }).then(function() {
            done++;
            if(done === files.length) {
              saveAll();
              renderLegendMode(s);
            }
          });
        });
      };
      input.click();
    }
    
    function resizeImage(file, maxWidth, callback) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          
          // Calculate new dimensions maintaining aspect ratio
          var width = img.width;
          var height = img.height;
          
          if(width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try to compress to under 100KB
          var quality = 0.8;
          var resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Calculate size (base64 string length * 0.75 gives approximate byte size)
          var sizeInBytes = (resizedDataUrl.length * 0.75);
          var maxSizeBytes = 100 * 1024; // 100KB
          
          // If still too large, reduce quality iteratively
          while(sizeInBytes > maxSizeBytes && quality > 0.1) {
            quality -= 0.1;
            resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = (resizedDataUrl.length * 0.75);
          }
          
          // If still too large after reducing quality, reduce dimensions
          if(sizeInBytes > maxSizeBytes) {
            var scale = Math.sqrt(maxSizeBytes / sizeInBytes);
            canvas.width = Math.floor(width * scale);
            canvas.height = Math.floor(height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          }
          
          callback(resizedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    
    function renderPictureItem(s, timelineIndex, pictureUrl, picIndex) {
      var container = document.createElement('div');
      container.style.cssText = 'position: relative; flex-shrink: 0;';
      
      var img = document.createElement('img');
      img.src = pictureUrl;
      img.style.cssText = 'height: 200px; width: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s;';
      
      // Hover effect
      img.onmouseenter = function() {
        this.style.transform = 'scale(1.05)';
      };
      img.onmouseleave = function() {
        this.style.transform = 'scale(1)';
      };
      
      // Click to view full size
      img.onclick = function() {
        var modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; justify-content: center; align-items: center; cursor: pointer;';
        
        var fullImg = document.createElement('img');
        fullImg.src = pictureUrl;
        fullImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);';
        
        modal.appendChild(fullImg);
        modal.onclick = function() {
          document.body.removeChild(modal);
        };
        
        document.body.appendChild(modal);
      };
      
      container.appendChild(img);
      
      if(isAdmin()) {
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #dc2626; color: white; padding: 4px 8px; font-size: 12px; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);';
        deleteBtn.onclick = function(e) {
          e.stopPropagation();
          if(confirm('Delete this photo?')) {
            s.timelines[timelineIndex].pictures.splice(picIndex, 1);
            saveAll();
            renderLegendMode(s);
          }
        };
        container.appendChild(deleteBtn);
      }
      
      return container;
    }
    
    function addEvent(s, timelineIndex) {
      var eventName = prompt('Enter event name:');
      if(!eventName) return;
      
      if(!s.timelines[timelineIndex].events) s.timelines[timelineIndex].events = [];
      s.timelines[timelineIndex].events.push({
        name: eventName,
        medals: {
          gold: [],
          silver: [],
          bronze: []
        }
      });
      saveAll();
      renderLegendMode(s);
    }
    
    function renderEvent(s, timelineIndex, event, eventIndex) {
      var eventDiv = document.createElement('div');
      eventDiv.style.cssText = 'border: 2px solid var(--border); padding: 20px; background: linear-gradient(135deg, var(--panel) 0%, var(--card) 100%); border-radius: 12px; min-width: 320px; flex: 0 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;';
      
      // Hover effect
      eventDiv.onmouseenter = function() {
        this.style.transform = 'translateY(-4px)';
        this.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      };
      eventDiv.onmouseleave = function() {
        this.style.transform = '';
        this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
      };
      
      // Event name
      var eventHeader = document.createElement('div');
      eventHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg, #FFD700 0%, var(--accent) 50%, #60a5fa 100%) 1; position: relative;';
      
      var eventNameContainer = document.createElement('div');
      eventNameContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
      
      var eventName = document.createElement('div');
      eventName.style.cssText = 'font-weight: 800; font-size: 20px; background: linear-gradient(135deg, #FFD700 0%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-transform: uppercase; letter-spacing: 1px; filter: drop-shadow(0 2px 6px rgba(255, 215, 0, 0.3));';
      eventName.textContent = '🏅 ' + event.name;
      
      // Add click to rename for admin
      if(isAdmin()) {
        eventName.style.cursor = 'pointer';
        eventName.title = 'Click to rename';
        eventName.onclick = function() {
          var newName = prompt('Rename event:', event.name);
          if(newName && newName.trim()) {
            event.name = newName.trim();
            saveAll();
            renderLegendMode(s);
          }
        };
      }
      
      var eventUnderline = document.createElement('div');
      eventUnderline.style.cssText = 'width: 60px; height: 3px; background: linear-gradient(90deg, #FFD700 0%, var(--accent) 100%); border-radius: 2px; box-shadow: 0 1px 4px rgba(255, 215, 0, 0.4);';
      
      eventNameContainer.appendChild(eventName);
      eventNameContainer.appendChild(eventUnderline);
      eventHeader.appendChild(eventNameContainer);
      
      if(isAdmin()) {
        var deleteEventBtn = document.createElement('button');
        deleteEventBtn.textContent = '✕';
        deleteEventBtn.style.cssText = 'background: #dc2626; color: white; padding: 6px 10px; font-size: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;';
        deleteEventBtn.onclick = function() {
          if(confirm('Delete event "' + event.name + '"?')) {
            s.timelines[timelineIndex].events.splice(eventIndex, 1);
            saveAll();
            renderLegendMode(s);
          }
        };
        eventHeader.appendChild(deleteEventBtn);
      }
      
      eventDiv.appendChild(eventHeader);
      
      // Migrate old format to new format if needed
      if(event.gold !== undefined && typeof event.gold === 'string') {
        event.medals = {
          gold: [event.gold],
          silver: [event.silver],
          bronze: [event.bronze]
        };
        delete event.gold;
        delete event.silver;
        delete event.bronze;
      }
      if(!event.medals) {
        event.medals = { gold: [], silver: [], bronze: [] };
      }
      
      // Medal sections - vertical layout, each medal on its own line
      var medalsDiv = document.createElement('div');
      medalsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
      
      // Render gold medals
      var goldMedals = event.medals.gold || [];
      goldMedals.forEach(function(team, teamIndex) {
        var medalItem = renderMedalItem(s, timelineIndex, eventIndex, 'gold', '👑', team, teamIndex);
        medalsDiv.appendChild(medalItem);
      });
      
      // Render silver medals
      var silverMedals = event.medals.silver || [];
      silverMedals.forEach(function(team, teamIndex) {
        var medalItem = renderMedalItem(s, timelineIndex, eventIndex, 'silver', '🏆', team, teamIndex);
        medalsDiv.appendChild(medalItem);
      });
      
      // Render bronze medals
      var bronzeMedals = event.medals.bronze || [];
      bronzeMedals.forEach(function(team, teamIndex) {
        var medalItem = renderMedalItem(s, timelineIndex, eventIndex, 'bronze', '🎖️', team, teamIndex);
        medalsDiv.appendChild(medalItem);
      });
      
      // Add buttons for admin
      if(isAdmin()) {
        var addBtnsDiv = document.createElement('div');
        addBtnsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);';
        
        var addGoldBtn = document.createElement('button');
        addGoldBtn.textContent = '+ 👑';
        addGoldBtn.style.cssText = 'background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #000; padding: 6px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);';
        addGoldBtn.onclick = function() {
          if(!event.medals.gold) event.medals.gold = [];
          event.medals.gold.push('');
          saveAll();
          renderLegendMode(s);
        };
        addBtnsDiv.appendChild(addGoldBtn);
        
        var addSilverBtn = document.createElement('button');
        addSilverBtn.textContent = '+ 🏆';
        addSilverBtn.style.cssText = 'background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%); color: #000; padding: 6px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);';
        addSilverBtn.onclick = function() {
          if(!event.medals.silver) event.medals.silver = [];
          event.medals.silver.push('');
          saveAll();
          renderLegendMode(s);
        };
        addBtnsDiv.appendChild(addSilverBtn);
        
        var addBronzeBtn = document.createElement('button');
        addBronzeBtn.textContent = '+ 🎖️';
        addBronzeBtn.style.cssText = 'background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%); color: #fff; padding: 6px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);';
        addBronzeBtn.onclick = function() {
          if(!event.medals.bronze) event.medals.bronze = [];
          event.medals.bronze.push('');
          saveAll();
          renderLegendMode(s);
        };
        addBtnsDiv.appendChild(addBronzeBtn);
        
        medalsDiv.appendChild(addBtnsDiv);
      }
      
      eventDiv.appendChild(medalsDiv);
      
      return eventDiv;
    }
    
    function renderMedalItem(s, timelineIndex, eventIndex, medalType, emoji, teamName, teamIndex) {
      var itemDiv = document.createElement('div');
      
      // Different styles for each medal type
      var bgColor, borderColor, glowColor;
      if(medalType === 'gold') {
        bgColor = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.05) 100%)';
        borderColor = 'rgba(255, 215, 0, 0.4)';
        glowColor = 'rgba(255, 215, 0, 0.3)';
      } else if(medalType === 'silver') {
        bgColor = 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(168, 168, 168, 0.05) 100%)';
        borderColor = 'rgba(192, 192, 192, 0.4)';
        glowColor = 'rgba(192, 192, 192, 0.3)';
      } else {
        bgColor = 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(184, 115, 51, 0.05) 100%)';
        borderColor = 'rgba(205, 127, 50, 0.4)';
        glowColor = 'rgba(205, 127, 50, 0.3)';
      }
      
      itemDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; background: ' + bgColor + '; padding: 10px 14px; border-radius: 8px; border: 1px solid ' + borderColor + '; box-shadow: 0 2px 8px ' + glowColor + '; transition: all 0.2s;';
      
      // Hover effect
      itemDiv.onmouseenter = function() {
        this.style.transform = 'translateX(4px)';
        this.style.boxShadow = '0 4px 12px ' + glowColor;
      };
      itemDiv.onmouseleave = function() {
        this.style.transform = '';
        this.style.boxShadow = '0 2px 8px ' + glowColor;
      };
      
      // Medal emoji
      var emojiSpan = document.createElement('span');
      emojiSpan.textContent = emoji;
      emojiSpan.style.cssText = 'font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
      itemDiv.appendChild(emojiSpan);
      
      if(isAdmin()) {
        // Team name input with dropdown
        var nameContainer = document.createElement('div');
        nameContainer.style.cssText = 'display: flex; gap: 4px; align-items: center;';
        
        var input = document.createElement('input');
        input.type = 'text';
        input.value = teamName || '';
        input.placeholder = 'Team name...';
        input.style.cssText = 'width: 180px; padding: 6px 12px; border: 2px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); font-size: 15px; font-weight: 500;';
        input.oninput = function() {
          s.timelines[timelineIndex].events[eventIndex].medals[medalType][teamIndex] = this.value;
          saveAll();
        };
        nameContainer.appendChild(input);
        
        // Dropdown button to select from master list
        var dropdownBtn = document.createElement('button');
        dropdownBtn.type = 'button';
        dropdownBtn.textContent = '↓';
        dropdownBtn.className = 'ghost small';
        dropdownBtn.style.cssText = 'padding: 2px 6px; min-width: 24px; background: var(--panel); border: 1px solid var(--border);';
        dropdownBtn.title = 'Select from Team List';
        dropdownBtn.onclick = function() {
          if(!state.teamMasterList || state.teamMasterList.length === 0) {
            alert('Team List is empty. Add teams to Team List first.');
            return;
          }
          
          // Create team selection dialog
          var selectDialog = document.createElement('dialog');
          selectDialog.style.cssText = 'width: 300px; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
          
          selectDialog.innerHTML = 
            '<h4 style="margin: 0 0 16px 0; color: var(--accent);">Select Team</h4>' +
            '<div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
            state.teamMasterList.slice().sort(function(a, b) {
              return a.toLowerCase().localeCompare(b.toLowerCase());
            }).map(function(team) { 
              return '<div class="team-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text);" data-team="' + team + '">' + team + '</div>'; 
            }).join('') +
            '</div>' +
            '<div style="margin-top: 16px; text-align: right;">' +
            '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
            '</div>';
          
          // Add click events
          var teamOptions = selectDialog.querySelectorAll('.team-option');
          teamOptions.forEach(function(option) {
            option.addEventListener('click', function() {
              var selectedTeam = this.getAttribute('data-team');
              input.value = selectedTeam;
              s.timelines[timelineIndex].events[eventIndex].medals[medalType][teamIndex] = selectedTeam;
              saveAll();
              selectDialog.close();
              document.body.removeChild(selectDialog);
            });
            
            option.addEventListener('mouseenter', function() {
              this.style.backgroundColor = 'var(--hover)';
            });
            option.addEventListener('mouseleave', function() {
              this.style.backgroundColor = '';
            });
          });
          
          document.body.appendChild(selectDialog);
          if(typeof selectDialog.showModal === 'function') { 
            selectDialog.showModal(); 
          } else { 
            selectDialog.setAttribute('open', 'open'); 
          }
          
          selectDialog.addEventListener('close', function() {
            if(document.body.contains(selectDialog)) {
              document.body.removeChild(selectDialog);
            }
          });
        };
        nameContainer.appendChild(dropdownBtn);
        
        itemDiv.appendChild(nameContainer);
        
        // Remove button
        var removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = 'background: #dc2626; color: white; padding: 4px 8px; font-size: 13px; font-weight: 700; border: none; border-radius: 5px; cursor: pointer;';
        removeBtn.onclick = function() {
          s.timelines[timelineIndex].events[eventIndex].medals[medalType].splice(teamIndex, 1);
          saveAll();
          renderLegendMode(s);
        };
        itemDiv.appendChild(removeBtn);
      } else {
        // Display only
        var display = document.createElement('span');
        display.textContent = teamName || '—';
        display.style.cssText = 'color: var(--text); font-size: 16px; font-weight: 600;';
        itemDiv.appendChild(display);
      }
      
      return itemDiv;
    }

    // ========== RANKING MODE - START ==========
    // Calculate statistics for Ranking mode
    function calculateRankingStats(s) {
      var stats = {
        totalYears: 0,
        totalEvents: 0,
        totalGold: 0,
        totalSilver: 0,
        totalBronze: 0,
        totalChampions: 0,
        championsList: []
      };
      
      if(!s.timelines || s.timelines.length === 0) return stats;
      
      stats.totalYears = s.timelines.length;
      
      // Calculate total events across all timelines
      s.timelines.forEach(function(timeline) {
        if(timeline.events) {
          stats.totalEvents += timeline.events.length;
        }
      });
      
      // Get the latest timeline (last one in array since they're sorted by year)
      var latestTimeline = s.timelines[s.timelines.length - 1];
      
      if(!latestTimeline || !latestTimeline.events) return stats;
      
      var pointsMap = {}; // { teamName: totalPoints }
      
      // Aggregate points from all events in the latest timeline
      latestTimeline.events.forEach(function(event) {
        if(!event.rankings) return;
        
        event.rankings.forEach(function(ranking) {
          if(!ranking.name || !ranking.name.trim()) return;
          
          var name = ranking.name.trim();
          var totalPts = (ranking.point || 0) * (ranking.rate || 1);
          
          if(!pointsMap[name]) {
            pointsMap[name] = 0;
          }
          pointsMap[name] += totalPts;
        });
      });
      
      // Convert map to sorted list
      Object.keys(pointsMap).forEach(function(teamName) {
        stats.championsList.push({
          name: teamName,
          points: pointsMap[teamName]
        });
      });
      
      // Sort by total points descending
      stats.championsList.sort(function(a, b) {
        if(b.points !== a.points) return b.points - a.points;
        // If points are equal, sort alphabetically
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
      
      stats.totalChampions = stats.championsList.length;
      
      return stats;
    }

    // Render Ranking mode - timeline with events and medals
    function renderRankingMode(s) {
      console.log('renderRankingMode called for season:', s.name, 'mode:', s.mode);
      
      if(!s || !s.timelines) {
        s.timelines = [];
      }
      
      $('seasonTitle').textContent = '— ' + s.name + ' (RANKING)';
      $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';
      
      // Hide all unnecessary elements - use more specific selectors
      var standingsSection = document.querySelector('main.container section.card.grow');
      if(standingsSection) standingsSection.style.display = 'none';
      
      var fixturesSection = document.querySelector('main.container section.card:has(#fixtures)');
      if(fixturesSection) fixturesSection.style.display = 'none';
      
      var roundSelDiv = document.querySelector('.round-selector');
      if(roundSelDiv) roundSelDiv.style.display = 'none';
      
      // Create main ranking container
      var mainContainer = document.querySelector('main.container');
      console.log('mainContainer found:', mainContainer);
      
      // Remove any existing legend or ranking containers
      var existingLegend = document.getElementById('legendContainer');
      if(existingLegend) {
        console.log('Removing existing legendContainer');
        existingLegend.remove();
      }
      
      var existingRanking = document.getElementById('rankingModeContainer');
      if(existingRanking) {
        console.log('Removing existing rankingModeContainer');
        existingRanking.remove();
      }
      
      var rankingContainer = document.createElement('div');
      rankingContainer.id = 'rankingModeContainer';
      rankingContainer.className = 'row';
      rankingContainer.style.cssText = 'margin-top: 20px;';
      console.log('Created rankingModeContainer');
      
      // Calculate statistics
      var stats = calculateRankingStats(s);
      console.log('Stats calculated:', stats);
      
      // Statistics and Standings row
      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display: grid; grid-template-columns: 300px 1fr; gap: 20px; margin-bottom: 20px; width: 100%;';
      
      // Summary Statistics Card
      var summaryCard = document.createElement('section');
      summaryCard.className = 'card';
      summaryCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var summaryTitle = document.createElement('h3');
      summaryTitle.textContent = '📊 Statistics';
      summaryTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px;';
      summaryCard.appendChild(summaryTitle);
      
      var statsList = document.createElement('div');
      statsList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
      
      var statItems = [
        { icon: '📅', label: 'Total Years', value: stats.totalYears },
        { icon: '🏅', label: 'Total Events', value: stats.totalEvents },
        { icon: '⭐', label: 'Total Participants', value: stats.totalChampions }
      ];
      
      statItems.forEach(function(item) {
        var statItem = document.createElement('div');
        statItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 8px;';
        
        var labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 500;';
        labelDiv.innerHTML = '<span style="font-size: 20px;">' + item.icon + '</span>' + item.label;
        
        var valueDiv = document.createElement('div');
        valueDiv.textContent = item.value;
        valueDiv.style.cssText = 'font-size: 20px; font-weight: 700; color: var(--accent);';
        
        statItem.appendChild(labelDiv);
        statItem.appendChild(valueDiv);
        statsList.appendChild(statItem);
      });
      
      summaryCard.appendChild(statsList);
      statsRow.appendChild(summaryCard);
      
      // Champions Standings Table(s) - Split into multiple tables if more than 15 teams
      var standingsCard = document.createElement('section');
      standingsCard.className = 'card';
      standingsCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var standingsTitle = document.createElement('h3');
      standingsTitle.textContent = '🏅 Ranking';
      standingsTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px;';
      standingsCard.appendChild(standingsTitle);
      
      // Create container for multiple tables (side by side)
      var tablesContainer = document.createElement('div');
      tablesContainer.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap;';
      
      // Split championsList into chunks of 15
      var chunkSize = 15;
      var chunks = [];
      for(var i = 0; i < stats.championsList.length; i += chunkSize) {
        chunks.push(stats.championsList.slice(i, i + chunkSize));
      }
      
      // Create a table for each chunk
      chunks.forEach(function(chunk, chunkIndex) {
        var tableWrapper = document.createElement('div');
        tableWrapper.style.cssText = 'flex: 1; min-width: 300px;';
        
        var tableContainer = document.createElement('div');
        tableContainer.style.cssText = 'overflow-x: auto;';
        
        var table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse;';
        
        // Table header
        var thead = document.createElement('thead');
        thead.innerHTML = '<tr style="background: rgba(59, 130, 246, 0.2);">' +
          '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">#</th>' +
          '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Name</th>' +
          '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Pts</th>' +
          '</tr>';
        table.appendChild(thead);
        
        // Table body
        var tbody = document.createElement('tbody');
        chunk.forEach(function(champion, relativeIdx) {
          var idx = chunkIndex * chunkSize + relativeIdx; // Actual index in full list
          var tr = document.createElement('tr');
          
          // Highlight top 3 positions
          var bgColor = '';
          var rankColor = '';
          if(idx === 0) {
            bgColor = 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%);';
            rankColor = 'color: #FFD700; font-weight: 800;';
          } else if(idx === 1) {
            bgColor = 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%);';
            rankColor = 'color: #C0C0C0; font-weight: 800;';
          } else if(idx === 2) {
            bgColor = 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.05) 100%);';
            rankColor = 'color: #CD7F32; font-weight: 800;';
          }
          
          tr.style.cssText = 'border-bottom: 1px solid var(--border); transition: background 0.2s; ' + bgColor;
          var originalBg = tr.style.background;
          tr.onmouseenter = function() { this.style.background = 'rgba(59, 130, 246, 0.1)'; };
          tr.onmouseleave = function() { this.style.background = originalBg; };
          
          tr.innerHTML = 
            '<td style="padding: 10px; font-weight: 600; ' + rankColor + '">' + (idx + 1) + '</td>' +
            '<td style="padding: 10px; font-weight: 600; color: var(--text);">' + champion.name + '</td>' +
            '<td style="padding: 10px; text-align: center; font-weight: 700; color: var(--accent); font-size: 16px;">' + champion.points.toFixed(2) + '</td>';
          
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        tableContainer.appendChild(table);
        tableWrapper.appendChild(tableContainer);
        tablesContainer.appendChild(tableWrapper);
      });
      
      standingsCard.appendChild(tablesContainer);
      statsRow.appendChild(standingsCard);
      
      rankingContainer.appendChild(statsRow);
      
      // Create ranking section (Year) - on separate row below
      var hallSection = document.createElement('div');
      hallSection.style.cssText = 'margin-top: 20px; width: 100%;';
      
      var section = document.createElement('section');
      section.className = 'card grow';
      section.style.cssText = 'padding: 32px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3); width: 100%;';
      
      // Header with Add Timeline button
      var header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--accent);';
      
      var title = document.createElement('h3');
      title.textContent = '🏆 Year';
      title.style.cssText = 'margin: 0; color: var(--accent); font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);';
      header.appendChild(title);
      
      if(isAdmin()) {
        var addTimelineBtn = document.createElement('button');
        addTimelineBtn.className = 'primary';
        addTimelineBtn.textContent = '📅 Add Timeline';
        addTimelineBtn.style.cssText = 'padding: 10px 20px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);';
        addTimelineBtn.onclick = function() { addRankingTimeline(s); };
        header.appendChild(addTimelineBtn);
      }
      
      section.appendChild(header);
      
      // Render all timelines (newest first - reverse order)
      var timelinesDiv = document.createElement('div');
      timelinesDiv.id = 'rankingTimelinesContainer';
      var reversedTimelines = s.timelines.slice().reverse();
      reversedTimelines.forEach(function(timeline) {
        var originalIndex = s.timelines.indexOf(timeline);
        timelinesDiv.appendChild(renderRankingTimeline(s, timeline, originalIndex));
      });
      
      section.appendChild(timelinesDiv);
      hallSection.appendChild(section);
      rankingContainer.appendChild(hallSection);
      console.log('About to append rankingContainer to mainContainer');
      console.log('rankingContainer:', rankingContainer);
      console.log('mainContainer:', mainContainer);
      mainContainer.appendChild(rankingContainer);
      console.log('rankingContainer appended successfully');
    }
    
    function addRankingTimeline(s) {
      var year = prompt('Enter year:');
      if(!year) return;
      
      if(!s.timelines) s.timelines = [];
      
      // Create default event with data from previous timeline
      var defaultEvent = {
        name: 'Ranking',
        rankings: []
      };
      
      // Get data from the previous timeline (before sorting)
      if(s.timelines.length > 0) {
        // Sort timelines to find the latest one
        var sortedTimelines = s.timelines.slice().sort(function(a, b) { 
          return parseInt(a.year) - parseInt(b.year); 
        });
        var previousTimeline = sortedTimelines[sortedTimelines.length - 1];
        
        // Use previous timeline's year as event name
        defaultEvent.name = previousTimeline.year;
        
        // Aggregate points from all events in previous timeline
        var pointsMap = {}; // { teamName: totalPoints }
        
        if(previousTimeline && previousTimeline.events) {
          previousTimeline.events.forEach(function(event) {
            if(!event.rankings) return;
            
            event.rankings.forEach(function(ranking) {
              if(!ranking.name || !ranking.name.trim()) return;
              
              var name = ranking.name.trim();
              var totalPts = (ranking.point || 0) * (ranking.rate || 1);
              
              if(!pointsMap[name]) {
                pointsMap[name] = 0;
              }
              pointsMap[name] += totalPts;
            });
          });
        }
        
        // Convert map to rankings array
        Object.keys(pointsMap).forEach(function(teamName) {
          defaultEvent.rankings.push({
            name: teamName,
            point: pointsMap[teamName],
            rate: 0.5
          });
        });
        
        // Sort by points descending
        defaultEvent.rankings.sort(function(a, b) {
          return b.point - a.point;
        });
      }
      
      s.timelines.push({
        year: year,
        events: [defaultEvent],
        pictures: []
      });
      s.timelines.sort(function(a, b) { return parseInt(a.year) - parseInt(b.year); });
      saveAll();
      renderRankingMode(s);
    }
    
    function renderRankingTimeline(s, timeline, index) {
      var timelineDiv = document.createElement('div');
      timelineDiv.className = 'ranking-timeline-box';
      timelineDiv.style.cssText = 'border: 3px solid var(--accent); border-radius: 16px; padding: 28px; margin-bottom: 28px; background: linear-gradient(145deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%); box-shadow: 0 6px 20px rgba(0,0,0,0.25); position: relative; overflow: hidden;';
      
      // Decorative corner accent
      var cornerAccent = document.createElement('div');
      cornerAccent.style.cssText = 'position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: linear-gradient(135deg, var(--accent) 0%, transparent 70%); opacity: 0.1; pointer-events: none;';
      timelineDiv.appendChild(cornerAccent);
      
      // Timeline header
      var headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: relative;';
      
      var yearTitle = document.createElement('h4');
      yearTitle.textContent = timeline.year;
      yearTitle.style.cssText = 'margin: 0; font-size: 48px; font-weight: 900; background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.4)); letter-spacing: 2px; font-family: "Arial Black", sans-serif; position: relative;';
      
      // Add click to rename for admin
      if(isAdmin()) {
        yearTitle.style.cursor = 'pointer';
        yearTitle.title = 'Click to rename';
        yearTitle.onclick = function() {
          var newYear = prompt('Rename timeline:', timeline.year);
          if(newYear && newYear.trim()) {
            timeline.year = newYear.trim();
            saveAll();
            renderRankingMode(s);
          }
        };
      }
      
      // Add decorative underline
      var underline = document.createElement('div');
      underline.style.cssText = 'width: 120px; height: 4px; background: linear-gradient(90deg, #FFD700 0%, var(--accent) 100%); margin-top: 8px; border-radius: 2px; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);';
      
      var yearContainer = document.createElement('div');
      yearContainer.appendChild(yearTitle);
      yearContainer.appendChild(underline);
      headerDiv.appendChild(yearContainer);
      
      if(isAdmin()) {
        var btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 10px;';
        
        var addEventBtn = document.createElement('button');
        addEventBtn.className = 'primary';
        addEventBtn.textContent = '➕ Add Event';
        addEventBtn.style.cssText = 'padding: 8px 16px; font-size: 14px; font-weight: 600;';
        addEventBtn.onclick = function() { addRankingEvent(s, index); };
        btnGroup.appendChild(addEventBtn);
        
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Year';
        deleteBtn.style.cssText = 'background: #dc2626; color: white; padding: 8px 16px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);';
        deleteBtn.onclick = function() {
          if(confirm('Delete timeline for ' + timeline.year + '?')) {
            s.timelines.splice(index, 1);
            saveAll();
            renderRankingMode(s);
          }
        };
        btnGroup.appendChild(deleteBtn);
        
        headerDiv.appendChild(btnGroup);
      }
      
      timelineDiv.appendChild(headerDiv);
      
      // Render events horizontally
      if(!timeline.events) timeline.events = [];
      var eventsContainer = document.createElement('div');
      eventsContainer.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px;';
      timeline.events.forEach(function(event, eventIndex) {
        eventsContainer.appendChild(renderRankingEvent(s, index, event, eventIndex));
      });
      timelineDiv.appendChild(eventsContainer);
      
      return timelineDiv;
    }
    
    function addRankingPicture(s, timelineIndex) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = function(e) {
        var files = Array.from(e.target.files);
        if(!files.length) return;
        if(!s.timelines[timelineIndex].pictures) s.timelines[timelineIndex].pictures = [];
        var year = s.timelines[timelineIndex].year || ('y' + timelineIndex);
        var done = 0;
        files.forEach(function(file, idx) {
          var baseName = state.current + '_' + year + '_' + (s.timelines[timelineIndex].pictures.length + idx + 1);
          RepoUploader.uploadResizedFile(file, {
            folder: 'photos',
            baseName: baseName,
            message: 'chore: upload ranking photo ' + baseName
          }).then(function(path) {
            s.timelines[timelineIndex].pictures.push(path);
          }).catch(function(err) {
            console.error('Ranking photo upload failed:', err);
            alert('Upload ảnh thất bại: ' + (err && err.message ? err.message : err));
          }).then(function() {
            done++;
            if(done === files.length) {
              saveAll();
              renderRankingMode(s);
            }
          });
        });
      };
      input.click();
    }
    
    function resizeImageForRanking(file, maxWidth, callback) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          
          // Calculate new dimensions maintaining aspect ratio
          var width = img.width;
          var height = img.height;
          
          if(width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try to compress to under 100KB
          var quality = 0.8;
          var resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Calculate size (base64 string length * 0.75 gives approximate byte size)
          var sizeInBytes = (resizedDataUrl.length * 0.75);
          var maxSizeBytes = 100 * 1024; // 100KB
          
          // If still too large, reduce quality iteratively
          while(sizeInBytes > maxSizeBytes && quality > 0.1) {
            quality -= 0.1;
            resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = (resizedDataUrl.length * 0.75);
          }
          
          // If still too large after reducing quality, reduce dimensions
          if(sizeInBytes > maxSizeBytes) {
            var scale = Math.sqrt(maxSizeBytes / sizeInBytes);
            canvas.width = Math.floor(width * scale);
            canvas.height = Math.floor(height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          }
          
          callback(resizedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    
    function renderRankingPictureItem(s, timelineIndex, pictureUrl, picIndex) {
      var container = document.createElement('div');
      container.style.cssText = 'position: relative; flex-shrink: 0;';
      
      var img = document.createElement('img');
      img.src = pictureUrl;
      img.style.cssText = 'height: 200px; width: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s;';
      
      // Hover effect
      img.onmouseenter = function() {
        this.style.transform = 'scale(1.05)';
      };
      img.onmouseleave = function() {
        this.style.transform = 'scale(1)';
      };
      
      // Click to view full size
      img.onclick = function() {
        var modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; justify-content: center; align-items: center; cursor: pointer;';
        
        var fullImg = document.createElement('img');
        fullImg.src = pictureUrl;
        fullImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);';
        
        modal.appendChild(fullImg);
        modal.onclick = function() {
          document.body.removeChild(modal);
        };
        
        document.body.appendChild(modal);
      };
      
      container.appendChild(img);
      
      if(isAdmin()) {
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #dc2626; color: white; padding: 4px 8px; font-size: 12px; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);';
        deleteBtn.onclick = function(e) {
          e.stopPropagation();
          if(confirm('Delete this photo?')) {
            s.timelines[timelineIndex].pictures.splice(picIndex, 1);
            saveAll();
            renderRankingMode(s);
          }
        };
        container.appendChild(deleteBtn);
      }
      
      return container;
    }
    
    function addRankingEvent(s, timelineIndex) {
      var eventName = prompt('Enter event name:');
      if(!eventName) return;
      
      var numRows = prompt('Enter number of rows in ranking table:', '10');
      if(!numRows) return;
      numRows = parseInt(numRows) || 10;
      if(numRows < 1 || numRows > 100) {
        alert('Number of rows must be between 1 and 100');
        return;
      }
      
      var defaultRate = prompt('Enter default rate for all rows:', '1');
      if(defaultRate === null) return;
      defaultRate = parseFloat(defaultRate) || 1;
      
      if(!s.timelines[timelineIndex].events) s.timelines[timelineIndex].events = [];
      
      // Create rankings array with specified number of rows
      var rankings = [];
      for(var i = 0; i < numRows; i++) {
        rankings.push({ name: '', point: 0, rate: defaultRate });
      }
      
      s.timelines[timelineIndex].events.push({
        name: eventName,
        rankings: rankings
      });
      saveAll();
      renderRankingMode(s);
    }
    
    function renderRankingEvent(s, timelineIndex, event, eventIndex) {
      var eventDiv = document.createElement('div');
      eventDiv.style.cssText = 'border: 2px solid var(--border); padding: 20px; background: linear-gradient(135deg, var(--panel) 0%, var(--card) 100%); border-radius: 12px; width: fit-content; box-shadow: 0 4px 16px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;';
      
      // Hover effect
      eventDiv.onmouseenter = function() {
        this.style.transform = 'translateY(-4px)';
        this.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      };
      eventDiv.onmouseleave = function() {
        this.style.transform = '';
        this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
      };
      
      // Event name
      var eventHeader = document.createElement('div');
      eventHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg, #FFD700 0%, var(--accent) 50%, #60a5fa 100%) 1; position: relative;';
      
      var eventNameContainer = document.createElement('div');
      eventNameContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
      
      var eventName = document.createElement('div');
      eventName.style.cssText = 'font-weight: 800; font-size: 20px; background: linear-gradient(135deg, #FFD700 0%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-transform: uppercase; letter-spacing: 1px; filter: drop-shadow(0 2px 6px rgba(255, 215, 0, 0.3));';
      eventName.textContent = '🏅 ' + event.name;
      
      // Add click to rename for admin
      if(isAdmin()) {
        eventName.style.cursor = 'pointer';
        eventName.title = 'Click to rename';
        eventName.onclick = function() {
          var newName = prompt('Rename event:', event.name);
          if(newName && newName.trim()) {
            event.name = newName.trim();
            saveAll();
            renderRankingMode(s);
          }
        };
      }
      
      var eventUnderline = document.createElement('div');
      eventUnderline.style.cssText = 'width: 60px; height: 3px; background: linear-gradient(90deg, #FFD700 0%, var(--accent) 100%); border-radius: 2px; box-shadow: 0 1px 4px rgba(255, 215, 0, 0.4);';
      
      eventNameContainer.appendChild(eventName);
      eventNameContainer.appendChild(eventUnderline);
      eventHeader.appendChild(eventNameContainer);
      
      if(isAdmin()) {
        var deleteEventBtn = document.createElement('button');
        deleteEventBtn.textContent = '✕';
        deleteEventBtn.style.cssText = 'background: #dc2626; color: white; padding: 6px 10px; font-size: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;';
        deleteEventBtn.onclick = function() {
          if(confirm('Delete event "' + event.name + '"?')) {
            s.timelines[timelineIndex].events.splice(eventIndex, 1);
            saveAll();
            renderRankingMode(s);
          }
        };
        eventHeader.appendChild(deleteEventBtn);
      }
      
      eventDiv.appendChild(eventHeader);
      
      // Ensure rankings array exists
      if(!event.rankings) event.rankings = [];
      
      // Create ranking table
      var table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; font-size: 14px; width: auto;';
      
      // Table header
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      headerRow.style.cssText = 'border-bottom: 2px solid var(--accent);';
      
      var headers = ['#', 'Name', 'Point', 'Rate', 'Total'];
      headers.forEach(function(headerText) {
        var th = document.createElement('th');
        th.textContent = headerText;
        th.style.cssText = 'padding: 8px; text-align: left; font-weight: 700; color: var(--accent); white-space: nowrap;';
        if(headerText === '#') th.style.width = '40px';
        if(headerText === 'Name') { 
          th.style.width = 'auto';
          th.style.minWidth = '50px';
          th.style.maxWidth = '300px';
        }
        if(headerText === 'Point' || headerText === 'Rate') {
          th.style.width = '80px';
          th.style.textAlign = 'center';
        }
        if(headerText === 'Total') {
          th.style.width = '90px';
          th.style.textAlign = 'center';
        }
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Table body
      var tbody = document.createElement('tbody');
      event.rankings.forEach(function(ranking, rankIndex) {
        var row = document.createElement('tr');
        row.style.cssText = 'border-bottom: 1px solid var(--border);';
        
        // Rank number
        var rankCell = document.createElement('td');
        rankCell.textContent = (rankIndex + 1);
        rankCell.style.cssText = 'padding: 8px; font-weight: 700; color: var(--accent);';
        row.appendChild(rankCell);
        
        // Name cell
        var nameCell = document.createElement('td');
        nameCell.style.cssText = 'padding: 8px;';
        
        if(isAdmin()) {
          var nameContainer = document.createElement('div');
          nameContainer.style.cssText = 'display: flex; gap: 4px; align-items: center; position: relative;';
          
          var nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.value = ranking.name || '';
          nameInput.placeholder = 'Enter name';
          nameInput.style.cssText = 'flex: 1; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 13px;';
          nameInput.onchange = function() {
            ranking.name = this.value;
            saveAll();
          };
          nameContainer.appendChild(nameInput);
          
          // Add dropdown button
          var dropdownBtn = document.createElement('button');
          dropdownBtn.type = 'button';
          dropdownBtn.textContent = '▼';
          dropdownBtn.style.cssText = 'padding: 4px 8px; background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; font-size: 11px;';
          dropdownBtn.title = 'Select from Team List';
          dropdownBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if(!state.teamMasterList || state.teamMasterList.length === 0) {
              alert('Team List is empty. Add teams to Team List first.');
              return;
            }
            
            // Create team selection dialog
            var selectDialog = document.createElement('dialog');
            selectDialog.style.cssText = 'width: 300px; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
            
            selectDialog.innerHTML = 
              '<h4 style="margin: 0 0 16px 0; color: var(--accent);">Select Team</h4>' +
              '<div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
              state.teamMasterList.slice().sort(function(a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
              }).map(function(team) { 
                return '<div class="team-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text);" data-team="' + team + '">' + team + '</div>'; 
              }).join('') +
              '</div>' +
              '<div style="margin-top: 16px; text-align: right;">' +
              '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
              '</div>';
            
            // Add click events
            var teamOptions = selectDialog.querySelectorAll('.team-option');
            teamOptions.forEach(function(option) {
              option.addEventListener('click', function() {
                var selectedTeam = this.getAttribute('data-team');
                nameInput.value = selectedTeam;
                ranking.name = selectedTeam;
                saveAll();
                selectDialog.close();
                document.body.removeChild(selectDialog);
              });
              
              option.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--hover)';
              });
              option.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
              });
            });
            
            document.body.appendChild(selectDialog);
            if(typeof selectDialog.showModal === 'function') { 
              selectDialog.showModal(); 
            } else { 
              selectDialog.setAttribute('open', 'open'); 
            }
            
            selectDialog.addEventListener('close', function() {
              if(document.body.contains(selectDialog)) {
                document.body.removeChild(selectDialog);
              }
            });
          };
          nameContainer.appendChild(dropdownBtn);
          
          nameCell.appendChild(nameContainer);
        } else {
          nameCell.textContent = ranking.name || '';
        }
        row.appendChild(nameCell);
        
        // Point cell
        var pointCell = document.createElement('td');
        pointCell.style.cssText = 'padding: 8px; text-align: center;';
        
        if(isAdmin()) {
          var pointInput = document.createElement('input');
          pointInput.type = 'number';
          pointInput.value = ranking.point || 0;
          pointInput.style.cssText = 'width: 100%; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 13px;';
          pointInput.onchange = function() {
            ranking.point = parseFloat(this.value) || 0;
            saveAll();
            renderRankingMode(s);
          };
          pointCell.appendChild(pointInput);
        } else {
          pointCell.textContent = (ranking.point || 0).toFixed(2);
        }
        row.appendChild(pointCell);
        
        // Rate cell
        var rateCell = document.createElement('td');
        rateCell.style.cssText = 'padding: 8px; text-align: center;';
        
        if(isAdmin()) {
          var rateInput = document.createElement('input');
          rateInput.type = 'number';
          rateInput.value = ranking.rate || 1;
          rateInput.step = '0.1';
          rateInput.style.cssText = 'width: 100%; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 13px;';
          rateInput.onchange = function() {
            ranking.rate = parseFloat(this.value) || 1;
            saveAll();
            renderRankingMode(s);
          };
          rateCell.appendChild(rateInput);
        } else {
          rateCell.textContent = ranking.rate || 1;
        }
        row.appendChild(rateCell);
        
        // Total cell (calculated)
        var totalCell = document.createElement('td');
        var totalPts = (ranking.point || 0) * (ranking.rate || 1);
        totalCell.textContent = totalPts.toFixed(2);
        totalCell.style.cssText = 'padding: 8px; text-align: center; font-weight: 700; color: var(--accent);';
        row.appendChild(totalCell);
        
        // Delete button for admin
        if(isAdmin()) {
          var deleteCell = document.createElement('td');
          deleteCell.style.cssText = 'padding: 8px;';
          var deleteBtn = document.createElement('button');
          deleteBtn.textContent = '✕';
          deleteBtn.style.cssText = 'background: #dc2626; color: white; padding: 4px 8px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer;';
          deleteBtn.onclick = function() {
            event.rankings.splice(rankIndex, 1);
            saveAll();
            renderRankingMode(s);
          };
          deleteCell.appendChild(deleteBtn);
          row.appendChild(deleteCell);
        }
        
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      eventDiv.appendChild(table);
      
      return eventDiv;
    }
    // ========== RANKING MODE - END ==========

    // Render tournament fixtures - group stage matches and knockout matches
    function renderTournamentFixtures(roundIdx) {
      var s = activeSeason();
      if(!s || s.mode !== 'tournament') return;
      
      var roundSel = $('roundSel'); 
      roundSel.innerHTML = '';
      
      // Add group round options only
      var totalGroupRounds = 0;
      if(s.groups && s.groups.A) {
        totalGroupRounds = s.groups.A.fixtures.length;
        for(var i = 0; i < totalGroupRounds; i++) {
          var opt = document.createElement('option');
          opt.value = 'group-' + i;
          opt.textContent = 'Group Stage - Round ' + (i + 1);
          roundSel.appendChild(opt);
        }
      }
      
      // Set default selection
      var selectedRound = roundIdx || roundSel.options[0]?.value || 'group-0';
      roundSel.value = selectedRound;
      
      // Add change event listener to round selector
      roundSel.removeEventListener('change', handleRoundChange); // Remove old listener
      roundSel.addEventListener('change', handleRoundChange);
      
      function handleRoundChange() {
        renderTournamentFixtures(roundSel.value);
      }
      
      // Setup team filter
      var teamFilter = $('teamFilter'); 
      var prev = teamFilter.value || ''; 
      teamFilter.innerHTML = ''; 
      var any = document.createElement('option'); 
      any.value = ''; 
      any.textContent = '— Tất cả —'; 
      teamFilter.appendChild(any);
      var teamList = s.teams.map(function(t, i) { return {name: t, idx: i}; });
      teamList.sort(function(a, b) { return a.name.localeCompare(b.name); });
      teamList.forEach(function(team) {
        var o = document.createElement('option'); 
        o.value = String(team.idx); 
        o.textContent = team.name; 
        teamFilter.appendChild(o);
      });
      if(prev !== '' && Number(prev) < s.teamCount) teamFilter.value = prev;
      
      var filterTeam = teamFilter.value !== '' ? Number(teamFilter.value) : null; 
      var showOnlyDone = $('onlyDone').checked ? true : false;
      var fixturesDiv = $('fixtures'); 
      fixturesDiv.innerHTML = '';
      
      // Parse selected round - only group stage rounds are available now
      var roundParts = selectedRound.split('-');
      var roundType = roundParts[0]; // Should always be 'group'
      var roundNumber = parseInt(roundParts[1], 10);
      
      if(roundType === 'group') {
        renderGroupStageFixtures(s, roundNumber, filterTeam, showOnlyDone, fixturesDiv);
      }
    }
    
    // Render group stage fixtures for a specific round
    function renderGroupStageFixtures(s, roundNumber, filterTeam, showOnlyDone, fixturesDiv) {
      var groupNames = Object.keys(s.groups || {});
      
      groupNames.forEach(function(groupName) {
        if(!s.groups[groupName] || !s.groups[groupName].fixtures[roundNumber]) return;
        
        var groupDiv = document.createElement('div');
        groupDiv.style.cssText = 'margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; padding: 12px;';
        
        var groupTitle = document.createElement('h4');
        groupTitle.textContent = 'Group ' + groupName + ' - Round ' + (roundNumber + 1);
        groupTitle.style.cssText = 'margin: 0 0 15px 0; color: var(--accent); font-size: 14px; font-weight: 600;';
        groupDiv.appendChild(groupTitle);
        
        var group = s.groups[groupName];
        var roundMatches = group.fixtures[roundNumber];
        
        roundMatches.forEach(function(match, matchIdx) {
          var homeTeamIdx = group.teamIndices[match.home];
          var awayTeamIdx = group.teamIndices[match.away];
          
          // Apply team filter
          if(filterTeam !== null && filterTeam !== homeTeamIdx && filterTeam !== awayTeamIdx) return;
          
          var key = 'group-' + groupName + '-' + roundNumber + '-' + matchIdx;
          var result = s.results[key] || {};
          
          // Apply done filter
          if(showOnlyDone && (result.hg == null || result.ag == null)) return;
          
          var matchEl = createTournamentGroupMatch(s, homeTeamIdx, awayTeamIdx, key, result);
          groupDiv.appendChild(matchEl);
        });
        
        // Only add group div if it has matches
        if(groupDiv.children.length > 1) {
          fixturesDiv.appendChild(groupDiv);
        }
      });
    }
    
    // Render knockout stage fixtures for a specific round
    function renderKnockoutStageFixtures(s, roundNumber, filterTeam, showOnlyDone, fixturesDiv) {
      if(!s.knockoutBracket || !s.knockoutBracket.rounds[roundNumber]) return;
      
      var stageDiv = document.createElement('div');
      stageDiv.style.cssText = 'margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; padding: 12px;';
      
      var stageTitle = document.createElement('h4');
      stageTitle.textContent = s.knockoutBracket.stageNames[roundNumber] || ('Knockout Round ' + (roundNumber + 1));
      stageTitle.style.cssText = 'margin: 0 0 15px 0; color: var(--accent); font-size: 14px; font-weight: 600;';
      stageDiv.appendChild(stageTitle);
      
      var round = s.knockoutBracket.rounds[roundNumber];
      
      round.forEach(function(match, matchIdx) {
        // Apply team filter
        if(filterTeam !== null && 
           typeof match.home === 'number' && typeof match.away === 'number' &&
           filterTeam !== match.home && filterTeam !== match.away) return;
        
        var key = 'knockout-' + roundNumber + '-' + matchIdx;
        var result = s.results[key] || {};
        
        // Apply done filter
        if(showOnlyDone && (result.hg == null || result.ag == null)) return;
        
        var matchEl = createTournamentKnockoutMatch(s, match, key, result, roundNumber, matchIdx);
        stageDiv.appendChild(matchEl);
      });
      
      // Only add stage div if it has matches
      if(stageDiv.children.length > 1) {
        fixturesDiv.appendChild(stageDiv);
      }
    }
    
    // Create group stage match element
    function createTournamentGroupMatch(s, homeTeamIdx, awayTeamIdx, key, result) {
      var el = document.createElement('div');
      el.className = 'tournament-fixture';
      el.setAttribute('data-key', key);
      el.style.cssText = 'display: grid; grid-template-columns: 1fr 50px 20px 50px 1fr; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--card); margin-bottom: 4px; min-height: 32px;';
      
      var vhg = (result.hg == null ? '' : result.hg);
      var vag = (result.ag == null ? '' : result.ag);
      
      var homeTeam = s.teams[homeTeamIdx];
      var awayTeam = s.teams[awayTeamIdx];
      
      // Determine winner/loser classes
      var homeClass = '';
      var awayClass = '';
      var hgVal = parseInt(vhg, 10);
      var agVal = parseInt(vag, 10);
      if(!isNaN(hgVal) && !isNaN(agVal)) {
        if(hgVal > agVal) {
          homeClass = ' bracket-team-winner';
          awayClass = ' bracket-team-loser';
        } else if(agVal > hgVal) {
          awayClass = ' bracket-team-winner';
          homeClass = ' bracket-team-loser';
        }
      }
      
      // Home team cell
      var homeCell = document.createElement('div');
      homeCell.className = homeClass.trim();
      homeCell.style.cssText = 'display: flex; align-items: center; gap: 8px; font-weight: 500;';
      homeCell.innerHTML = `
        ${(s.teamLogos && s.teamLogos[homeTeamIdx])
          ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[homeTeamIdx]+'); background-size: cover; background-position: center;"></span>'
          : '<span class="fixture-logo" style="background:'+(s.teamColors[homeTeamIdx]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
        <span>${homeTeam}</span>
      `;
      
      // Home score
      var homeScore = document.createElement('input');
      homeScore.className = 'scoreH';
      homeScore.type = 'number';
      homeScore.min = '0';
      homeScore.value = vhg;
      homeScore.style.cssText = 'width: 50px; height: 32px; text-align: center; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); font-size: 14px; font-weight: bold;';
      
      // VS divider
      var divider = document.createElement('div');
      divider.textContent = '-';
      divider.style.cssText = 'text-align: center; color: var(--muted); font-weight: bold; font-size: 16px;';
      
      // Away score
      var awayScore = document.createElement('input');
      awayScore.className = 'scoreA';
      awayScore.type = 'number';
      awayScore.min = '0';
      awayScore.value = vag;
      awayScore.style.cssText = 'width: 50px; height: 32px; text-align: center; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); font-size: 14px; font-weight: bold;';
      
      // Away team cell
      var awayCell = document.createElement('div');
      awayCell.className = awayClass.trim();
      awayCell.style.cssText = 'display: flex; align-items: center; gap: 8px; font-weight: 500; justify-content: flex-end; text-align: right;';
      awayCell.innerHTML = `
        <span>${awayTeam}</span>
        ${(s.teamLogos && s.teamLogos[awayTeamIdx])
          ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[awayTeamIdx]+'); background-size: cover; background-position: center;"></span>'
          : '<span class="fixture-logo" style="background:'+(s.teamColors[awayTeamIdx]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
      `;
      
      el.appendChild(homeCell);
      el.appendChild(homeScore);
      el.appendChild(divider);
      el.appendChild(awayScore);
      el.appendChild(awayCell);
      
      var h = homeScore;
      var a = awayScore;
      
      // Admin permissions
      if (isAdmin()) {
        h.removeAttribute('readonly');
        a.removeAttribute('readonly');
        h.disabled = false;
        a.disabled = false;
      } else {
        h.setAttribute('readonly', 'readonly');
        a.setAttribute('readonly', 'readonly');
        h.disabled = true;
        a.disabled = true;
      }
      
      function commit() {
        if(!isAdmin()) {
          toast('Chỉ admin được phép sửa');
          return;
        }
        
        var hg = (h.value === '') ? null : Math.max(0, parseInt(h.value, 10));
        var ag = (a.value === '') ? null : Math.max(0, parseInt(a.value, 10));
        
        if(hg == null || ag == null) {
          delete s.results[key];
        } else {
          s.results[key] = {hg: hg, ag: ag};
        }
        
        saveAll();
        
        // Check if group stage is complete and generate knockout bracket
        checkAndGenerateKnockout(s);
        
        // Update standings and insights
        renderStandings();
        renderInsights();
        renderSeasonStats();
        drawRankChart();
      }
      
      h.addEventListener('change', commit);
      a.addEventListener('change', commit);
      
      return el;
    }
    
    // Create knockout stage match element
    function createTournamentKnockoutMatch(s, match, key, result, roundIdx, matchIdx) {
      var el = document.createElement('div');
      el.className = 'tournament-fixture';
      el.setAttribute('data-key', key);
      el.style.cssText = 'display: grid; grid-template-columns: 1fr 50px 20px 50px 1fr; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--card); margin-bottom: 4px; min-height: 32px;';
      
      if(typeof match.home === 'number' && typeof match.away === 'number') {
        // Teams are determined
        var vhg = (result.hg == null ? '' : result.hg);
        var vag = (result.ag == null ? '' : result.ag);
        
        var homeTeam = s.teams[match.home];
        var awayTeam = s.teams[match.away];
        
        // Determine winner/loser classes
        var homeClass = '';
        var awayClass = '';
        var hgVal = parseInt(vhg, 10);
        var agVal = parseInt(vag, 10);
        if(!isNaN(hgVal) && !isNaN(agVal)) {
          if(hgVal > agVal) {
            homeClass = ' bracket-team-winner';
            awayClass = ' bracket-team-loser';
          } else if(agVal > hgVal) {
            awayClass = ' bracket-team-winner';
            homeClass = ' bracket-team-loser';
          }
        }
        
        // Home team cell
        var homeCell = document.createElement('div');
        homeCell.className = homeClass.trim();
        homeCell.style.cssText = 'display: flex; align-items: center; gap: 8px; font-weight: 500;';
        homeCell.innerHTML = `
          ${(s.teamLogos && s.teamLogos[match.home])
            ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[match.home]+'); background-size: cover; background-position: center;"></span>'
            : '<span class="fixture-logo" style="background:'+(s.teamColors[match.home]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
          <span>${homeTeam}</span>
        `;
        
        // Home score
        var homeScore = document.createElement('input');
        homeScore.className = 'scoreH';
        homeScore.type = 'number';
        homeScore.min = '0';
        homeScore.value = vhg;
        homeScore.style.cssText = 'width: 50px; height: 32px; text-align: center; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); font-size: 14px; font-weight: bold;';
        
        // VS divider
        var divider = document.createElement('div');
        divider.textContent = '-';
        divider.style.cssText = 'text-align: center; color: var(--muted); font-weight: bold; font-size: 16px;';
        
        // Away score
        var awayScore = document.createElement('input');
        awayScore.className = 'scoreA';
        awayScore.type = 'number';
        awayScore.min = '0';
        awayScore.value = vag;
        awayScore.style.cssText = 'width: 50px; height: 32px; text-align: center; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); font-size: 14px; font-weight: bold;';
        
        // Away team cell
        var awayCell = document.createElement('div');
        awayCell.className = awayClass.trim();
        awayCell.style.cssText = 'display: flex; align-items: center; gap: 8px; font-weight: 500; justify-content: flex-end; text-align: right;';
        awayCell.innerHTML = `
          <span>${awayTeam}</span>
          ${(s.teamLogos && s.teamLogos[match.away])
            ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[match.away]+'); background-size: cover; background-position: center;"></span>'
            : '<span class="fixture-logo" style="background:'+(s.teamColors[match.away]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
        `;
        
        el.appendChild(homeCell);
        el.appendChild(homeScore);
        el.appendChild(divider);
        el.appendChild(awayScore);
        el.appendChild(awayCell);
        
        var h = homeScore;
        var a = awayScore;
        
        // Admin permissions
        if (isAdmin()) {
          h.removeAttribute('readonly');
          a.removeAttribute('readonly');
          h.disabled = false;
          a.disabled = false;
        } else {
          h.setAttribute('readonly', 'readonly');
          a.setAttribute('readonly', 'readonly');
          h.disabled = true;
          a.disabled = true;
        }
        
        function commit() {
          if(!isAdmin()) {
            toast('Chỉ admin được phép sửa');
            return;
          }
          
          var hg = (h.value === '') ? null : Math.max(0, parseInt(h.value, 10));
          var ag = (a.value === '') ? null : Math.max(0, parseInt(a.value, 10));
          
          if(hg == null || ag == null) {
            delete s.results[key];
          } else {
            s.results[key] = {hg: hg, ag: ag};
            
            // Advance winner to next round (if not a tie)
            if(hg !== ag && roundIdx + 1 < s.knockoutBracket.rounds.length) {
              var winnerIdx = hg > ag ? match.home : match.away;
              var nextRound = s.knockoutBracket.rounds[roundIdx + 1];
              
              nextRound.forEach(function(nextMatch) {
                if(nextMatch.home && typeof nextMatch.home === 'object' && 
                   nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx) {
                  nextMatch.home = winnerIdx;
                }
                if(nextMatch.away && typeof nextMatch.away === 'object' && 
                   nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx) {
                  nextMatch.away = winnerIdx;
                }
              });
            }
          }
          
          saveAll();
          
          // Update standings and insights
          renderStandings();
          renderInsights();
          renderSeasonStats();
          drawRankChart();
        }
        
        h.addEventListener('change', commit);
        a.addEventListener('change', commit);
        
      } else {
        // Teams not determined yet
        var homeTeam = getTeamNameForMatch(s, match.home);
        var awayTeam = getTeamNameForMatch(s, match.away);
        
        el.style.cssText = 'padding: 20px; border: 1px dashed var(--border); border-radius: 8px; background: var(--card); text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 8px;';
        el.innerHTML = `
          <div style="margin-bottom: 8px;">⏳</div>
          <div style="font-weight: 500;">${homeTeam}</div>
          <div style="margin: 6px 0; font-size: 11px;">vs</div>
          <div style="font-weight: 500;">${awayTeam}</div>
        `;
      }
      
      return el;
    }

    // Render tournament knockout bracket in the dedicated bracket area
    function renderTournamentKnockoutBracket(s) {
      if(!s.knockoutBracket || !s.knockoutBracket.rounds) return;
      
      var container = document.getElementById('cupBracket');
      if(!container) return;
      
      container.innerHTML = '';
      container.className = 'cup-bracket-container';
      
      s.knockoutBracket.rounds.forEach(function(round, roundIdx) {
        var roundDiv = document.createElement('div');
        roundDiv.className = 'cup-round';
        
        var roundTitle = document.createElement('h4');
        roundTitle.className = 'cup-round-title' + 
          (s.knockoutBracket.stageNames[roundIdx] === 'Final' || 
           s.knockoutBracket.stageNames[roundIdx] === 'Chung kết' ? ' final' : '');
        roundTitle.textContent = s.knockoutBracket.stageNames[roundIdx] || ('Round ' + (roundIdx + 1));
        roundDiv.appendChild(roundTitle);
        
        round.forEach(function(match, matchIdx) {
          var key = 'knockout-' + roundIdx + '-' + matchIdx;
          var result = s.results[key] || {};
          
          var homeTeam = getTeamNameForMatch(s, match.home);
          var awayTeam = getTeamNameForMatch(s, match.away);
          
          var shouldShowMatch = true;
          
          if(shouldShowMatch) {
            var el = document.createElement('div');
            el.className = 'fixture cup-match' +
              (s.knockoutBracket.stageNames[roundIdx] === 'Final' || 
               s.knockoutBracket.stageNames[roundIdx] === 'Chung kết' ? ' final' : '') +
              (s.knockoutBracket.stageNames[roundIdx] === '3rd Place Match' ? ' third-place' : '');
            el.setAttribute('data-key', key);
            
            var vhg = (result.hg == null ? '' : result.hg);
            var vag = (result.ag == null ? '' : result.ag);
            
            // Calculate max team name width for consistent sizing (use helper function)
            var maxTeamNameWidth = getMaxTeamNameWidth(s.teams);
            
            // Three-section layout
            var matchRow = document.createElement('div');
            var sectionWidth = maxTeamNameWidth + 24 + 8;
            matchRow.style.cssText = `
              display: grid;
              grid-template-columns: ${sectionWidth}px auto ${sectionWidth}px;
              gap: 12px;
              align-items: center;
              padding: 4px;
            `;
            
            // Resolve team indices - handle both direct indices and references (winner/loser)
            var displayHomeIdx = null;
            var displayAwayIdx = null;
            
            if(typeof match.home === 'number') {
              displayHomeIdx = match.home;
            } else if(match.home && match.home.isLoser) {
              // Resolve loser from previous match
              displayHomeIdx = resolveLoserFromMatch(s, match.home.fromRound, match.home.matchId);
            } else if(match.home && match.home.fromRound != null) {
              // Resolve winner from previous match
              var prevKey = 'knockout-' + match.home.fromRound + '-' + match.home.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = s.knockoutBracket.rounds[match.home.fromRound][match.home.matchId];
                var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
                var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
                if(prevHomeIdx != null && prevAwayIdx != null) {
                  displayHomeIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
                }
              }
            }
            
            if(typeof match.away === 'number') {
              displayAwayIdx = match.away;
            } else if(match.away && match.away.isLoser) {
              // Resolve loser from previous match
              displayAwayIdx = resolveLoserFromMatch(s, match.away.fromRound, match.away.matchId);
            } else if(match.away && match.away.fromRound != null) {
              // Resolve winner from previous match
              var prevKey = 'knockout-' + match.away.fromRound + '-' + match.away.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = s.knockoutBracket.rounds[match.away.fromRound][match.away.matchId];
                var prevHomeIdx = typeof prevMatch.home === 'number' ? prevMatch.home : null;
                var prevAwayIdx = typeof prevMatch.away === 'number' ? prevMatch.away : null;
                if(prevHomeIdx != null && prevAwayIdx != null) {
                  displayAwayIdx = prevRes.hg > prevRes.ag ? prevHomeIdx : prevAwayIdx;
                }
              }
            }
            
            // Home logo
            var homeLogo = document.createElement('div');
            if(displayHomeIdx != null && s.teamLogos && s.teamLogos[displayHomeIdx]) {
              homeLogo.innerHTML = `<img src="${s.teamLogos[displayHomeIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
            } else {
              var homeBg = (displayHomeIdx != null && s.teamColors) ? (s.teamColors[displayHomeIdx] || '#1b2550') : '#1b2550';
              homeLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${homeBg};`;
            }
            
            // Home team name or dropdown (allow editing in first knockout round)
            var homeTeamDisplay;
            if(isAdmin() && roundIdx === 0 && typeof match.home === 'number') {
              homeTeamDisplay = document.createElement('select');
              homeTeamDisplay.className = 'teamHome';
              homeTeamDisplay.style.cssText = `font-size: 12px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); width: ${maxTeamNameWidth}px; box-sizing: border-box; padding: 2px 4px;`;
              s.teams.forEach(function(teamName, teamIdx) {
                var option = document.createElement('option');
                option.value = teamIdx;
                option.textContent = teamName;
                if(teamIdx === match.home) option.selected = true;
                homeTeamDisplay.appendChild(option);
              });
              // Add winner/loser class to dropdown
              var hgVal = parseInt(vhg, 10);
              var agVal = parseInt(vag, 10);
              if(!isNaN(hgVal) && !isNaN(agVal)) {
                if(hgVal > agVal) {
                  homeTeamDisplay.className += ' bracket-team-winner';
                } else if(hgVal < agVal) {
                  homeTeamDisplay.className += ' bracket-team-loser';
                }
              }
            } else {
              homeTeamDisplay = document.createElement('span');
              homeTeamDisplay.textContent = homeTeam;
              homeTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; width: ${maxTeamNameWidth}px; display: inline-block;`;
              // Add winner/loser class
              var hgVal = parseInt(vhg, 10);
              var agVal = parseInt(vag, 10);
              if(!isNaN(hgVal) && !isNaN(agVal)) {
                if(hgVal > agVal) {
                  homeTeamDisplay.className = 'bracket-team-winner';
                } else if(hgVal < agVal) {
                  homeTeamDisplay.className = 'bracket-team-loser';
                }
              }
            }
            
            // Home score
            var homeScore = document.createElement('input');
            homeScore.className = 'scoreH';
            homeScore.type = 'number';
            homeScore.min = '0';
            homeScore.value = vhg;
            homeScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
            
            // Away score
            var awayScore = document.createElement('input');
            awayScore.className = 'scoreA';
            awayScore.type = 'number';
            awayScore.min = '0';
            awayScore.value = vag;
            awayScore.style.cssText = `width: 28px; height: 22px; text-align: center; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); font-size: 11px; font-weight: bold; padding: 0;`;
            
            // Away team name or dropdown (allow editing in first knockout round)
            var awayTeamDisplay;
            if(isAdmin() && roundIdx === 0 && typeof match.away === 'number') {
              awayTeamDisplay = document.createElement('select');
              awayTeamDisplay.className = 'teamAway';
              awayTeamDisplay.style.cssText = `font-size: 12px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); width: ${maxTeamNameWidth}px; box-sizing: border-box; padding: 2px 4px;`;
              s.teams.forEach(function(teamName, teamIdx) {
                var option = document.createElement('option');
                option.value = teamIdx;
                option.textContent = teamName;
                if(teamIdx === match.away) option.selected = true;
                awayTeamDisplay.appendChild(option);
              });
              // Add winner/loser class to dropdown
              if(!isNaN(hgVal) && !isNaN(agVal)) {
                if(agVal > hgVal) {
                  awayTeamDisplay.className += ' bracket-team-winner';
                } else if(agVal < hgVal) {
                  awayTeamDisplay.className += ' bracket-team-loser';
                }
              }
            } else {
              awayTeamDisplay = document.createElement('span');
              awayTeamDisplay.textContent = awayTeam;
              awayTeamDisplay.style.cssText = `font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; width: ${maxTeamNameWidth}px; display: inline-block;`;
              // Add winner/loser class
              if(!isNaN(hgVal) && !isNaN(agVal)) {
                if(agVal > hgVal) {
                  awayTeamDisplay.className = 'bracket-team-winner';
                } else if(agVal < hgVal) {
                  awayTeamDisplay.className = 'bracket-team-loser';
                }
              }
            }
            
            // Away logo
            var awayLogo = document.createElement('div');
            if(displayAwayIdx != null && s.teamLogos && s.teamLogos[displayAwayIdx]) {
              awayLogo.innerHTML = `<img src="${s.teamLogos[displayAwayIdx]}" style="width:20px;height:20px;border-radius:3px;object-fit:cover;">`;
            } else {
              var awayBg = (displayAwayIdx != null && s.teamColors) ? (s.teamColors[displayAwayIdx] || '#1b2550') : '#1b2550';
              awayLogo.style.cssText = `width:20px;height:20px;border-radius:3px;background:${awayBg};`;
            }
            
            // Create home section
            var homeSection = document.createElement('div');
            homeSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-start; width: ${sectionWidth}px;`;
            homeSection.appendChild(homeLogo);
            homeSection.appendChild(homeTeamDisplay);
            
            // Create scores section
            var scoresSection = document.createElement('div');
            scoresSection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: center;`;
            var scoreDash = document.createElement('span');
            scoreDash.textContent = '–';
            scoreDash.style.cssText = `font-weight: bold; font-size: 16px; color: var(--muted); margin: 0 4px;`;
            scoresSection.appendChild(homeScore);
            scoresSection.appendChild(scoreDash);
            scoresSection.appendChild(awayScore);
            
            // Check if both teams are determined (before using in random button)
            var bothTeamsDetermined = (displayHomeIdx != null && displayAwayIdx != null);
            
            // Add random result button for admin
            if(isAdmin() && bothTeamsDetermined) {
              var randomBtn = document.createElement('button');
              randomBtn.textContent = '🎲';
              randomBtn.title = 'Random Result';
              randomBtn.style.cssText = `
                width: 24px; 
                height: 24px; 
                padding: 0; 
                margin-left: 8px;
                border: 1px solid var(--border); 
                border-radius: 4px; 
                background: var(--card); 
                color: var(--text);
                cursor: pointer; 
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
              `;
              randomBtn.addEventListener('mouseenter', function() {
                this.style.background = 'var(--accent)';
                this.style.transform = 'scale(1.1)';
              });
              randomBtn.addEventListener('mouseleave', function() {
                this.style.background = 'var(--card)';
                this.style.transform = 'scale(1)';
              });
              randomBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
                
                // Generate random scores (0-5 range, with varying probabilities)
                var scores = [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5]; // Weighted random
                var homeGoals = scores[Math.floor(Math.random() * scores.length)];
                var awayGoals = scores[Math.floor(Math.random() * scores.length)];
                
                // Ensure it's not a draw (knockout must have winner)
                while(homeGoals === awayGoals) {
                  awayGoals = scores[Math.floor(Math.random() * scores.length)];
                }
                
                homeScore.value = homeGoals;
                awayScore.value = awayGoals;
                
                // Trigger commit
                commit();
              });
              scoresSection.appendChild(randomBtn);
            }
            
            // Create away section
            var awaySection = document.createElement('div');
            awaySection.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: flex-end; width: ${sectionWidth}px;`;
            awaySection.appendChild(awayTeamDisplay);
            awaySection.appendChild(awayLogo);
            
            matchRow.appendChild(homeSection);
            matchRow.appendChild(scoresSection);
            matchRow.appendChild(awaySection);
            el.appendChild(matchRow);
            
            // Admin permissions
            if (isAdmin() && bothTeamsDetermined) {
              homeScore.removeAttribute('readonly');
              awayScore.removeAttribute('readonly');
              homeScore.removeAttribute('disabled');
              awayScore.removeAttribute('disabled');
            } else {
              homeScore.setAttribute('readonly', 'readonly');
              awayScore.setAttribute('readonly', 'readonly');
              homeScore.setAttribute('disabled', 'disabled');
              awayScore.setAttribute('disabled', 'disabled');
            }
            
            function commit() {
              if(!isAdmin()) {
                toast('Chỉ admin được phép sửa');
                return;
              }
              
              // Check if this round is locked (has results and next round has results)
              var isRoundLocked = false;
              if(roundIdx < s.knockoutBracket.rounds.length - 1) {
                // Check if current round is complete
                var currentRoundComplete = s.knockoutBracket.rounds[roundIdx].every(function(m, idx) {
                  var k = 'knockout-' + roundIdx + '-' + idx;
                  return s.results[k] != null;
                });
                
                // Check if any next round has results
                if(currentRoundComplete) {
                  for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < s.knockoutBracket.rounds.length; nextRoundIdx++) {
                    var hasNextRoundResults = s.knockoutBracket.rounds[nextRoundIdx].some(function(m, idx) {
                      var k = 'knockout-' + nextRoundIdx + '-' + idx;
                      return s.results[k] != null;
                    });
                    if(hasNextRoundResults) {
                      isRoundLocked = true;
                      break;
                    }
                  }
                }
              }
              
              // If round is locked and we're trying to change a result, ask for confirmation
              if(isRoundLocked) {
                var existingResult = s.results[key];
                if(existingResult) {
                  var confirmMsg = 'This round is locked because subsequent rounds have results. Changing this will clear dependent matches. Continue?';
                  if(!confirm(confirmMsg)) {
                    // Restore original values
                    homeScore.value = existingResult.hg;
                    awayScore.value = existingResult.ag;
                    return;
                  }
                }
              }
              
              var needsRerender = false;
              
              // Handle team selection changes in first round
              var homeTeamSel = el.querySelector('.teamHome');
              var awayTeamSel = el.querySelector('.teamAway');
              if(homeTeamSel && awayTeamSel && roundIdx === 0) {
                var newHome = parseInt(homeTeamSel.value, 10);
                var newAway = parseInt(awayTeamSel.value, 10);
                if(newHome === newAway) {
                  toast('Không thể chọn cùng một đội cho cả hai bên');
                  homeTeamSel.value = match.home;
                  awayTeamSel.value = match.away;
                  return;
                }
                s.knockoutBracket.rounds[roundIdx][matchIdx].home = newHome;
                s.knockoutBracket.rounds[roundIdx][matchIdx].away = newAway;
                match.home = newHome;
                match.away = newAway;
                needsRerender = true;
              }
              
              var hg = (homeScore.value === '') ? null : Math.max(0, parseInt(homeScore.value, 10));
              var ag = (awayScore.value === '') ? null : Math.max(0, parseInt(awayScore.value, 10));
              
              // Store old winner to detect changes
              var oldResult = s.results[key];
              var oldWinner = null;
              if(oldResult && oldResult.hg != null && oldResult.ag != null) {
                oldWinner = oldResult.hg > oldResult.ag ? match.home : 
                           oldResult.ag > oldResult.hg ? match.away : null;
              }
              
              if(hg == null || ag == null) {
                delete s.results[key];
              } else {
                s.results[key] = {hg: hg, ag: ag};
              }
              
              // Determine new winner and loser
              var newWinner = (hg != null && ag != null) ? 
                             (hg > ag ? match.home : ag > hg ? match.away : null) : null;
              var newLoser = (hg != null && ag != null) ? 
                            (hg > ag ? match.away : ag > hg ? match.home : null) : null;
              
              // Check if winner changed
              var winnerChanged = oldWinner !== newWinner;
              
              // Always propagate winner and loser to next rounds (not just when changed)
              // Check all subsequent rounds, not just immediate next (because 3rd place might be between semi and final)
              for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < s.knockoutBracket.rounds.length; nextRoundIdx++) {
                var nextRound = s.knockoutBracket.rounds[nextRoundIdx];
                
                nextRound.forEach(function(nextMatch) {
                  // Check for WINNER references
                  var homeRefersToWinner = nextMatch.home && typeof nextMatch.home === 'object' && 
                     nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx && !nextMatch.home.isLoser;
                  var awayRefersToWinner = nextMatch.away && typeof nextMatch.away === 'object' && 
                     nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx && !nextMatch.away.isLoser;
                  
                  // Check for LOSER references
                  var homeRefersToLoser = nextMatch.home && typeof nextMatch.home === 'object' && 
                     nextMatch.home.fromRound === roundIdx && nextMatch.home.matchId === matchIdx && nextMatch.home.isLoser === true;
                  var awayRefersToLoser = nextMatch.away && typeof nextMatch.away === 'object' && 
                     nextMatch.away.fromRound === roundIdx && nextMatch.away.matchId === matchIdx && nextMatch.away.isLoser === true;
                  
                  // Also check if the team index already matches (from previous winner)
                  // But make sure we're not updating a slot that's meant for a loser
                  var homeIsOldWinner = typeof nextMatch.home === 'number' && nextMatch.home === oldWinner && !homeRefersToLoser;
                  var awayIsOldWinner = typeof nextMatch.away === 'number' && nextMatch.away === oldWinner && !awayRefersToLoser;
                  
                  // Update winner references
                  if(homeRefersToWinner || homeIsOldWinner) {
                    nextMatch.home = newWinner != null ? newWinner : {fromRound: roundIdx, matchId: matchIdx};
                  }
                  if(awayRefersToWinner || awayIsOldWinner) {
                    nextMatch.away = newWinner != null ? newWinner : {fromRound: roundIdx, matchId: matchIdx};
                  }
                  
                  // Update loser references
                  if(homeRefersToLoser) {
                    nextMatch.home = newLoser != null ? newLoser : {fromRound: roundIdx, matchId: matchIdx, isLoser: true};
                  }
                  if(awayRefersToLoser) {
                    nextMatch.away = newLoser != null ? newLoser : {fromRound: roundIdx, matchId: matchIdx, isLoser: true};
                  }
                });
              }
              
              saveAll();
              
              // Re-render bracket to show updated winner or team changes
              if(needsRerender) {
                setTimeout(function() {
                  renderTournamentKnockoutBracket(s);
                  renderStandings();
                }, 0);
              } else {
                // Always re-render bracket to show updated winner
                setTimeout(function() {
                  renderTournamentKnockoutBracket(s);
                  renderStandings();
                }, 0);
              }
            }
            
            // Attach events
            if(isAdmin() && bothTeamsDetermined) {
              homeScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
              awayScore.addEventListener('focus', function(){ if(this.value === '') this.value = '0'; });
              homeScore.addEventListener('blur', commit);
              awayScore.addEventListener('blur', commit);
              homeScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
              awayScore.addEventListener('keydown', function(e){ if(e.key === 'Enter') { e.preventDefault(); commit(); } });
            }
            if(isAdmin() && roundIdx === 0) {
              var homeTeamSel = el.querySelector('.teamHome');
              var awayTeamSel = el.querySelector('.teamAway');
              if(homeTeamSel) homeTeamSel.addEventListener('change', commit);
              if(awayTeamSel) awayTeamSel.addEventListener('change', commit);
            }
            
            roundDiv.appendChild(el);
          }
        });
        
        container.appendChild(roundDiv);
      });
    }

    // Get team name for match (handles placeholder objects)
    function getTeamNameForMatch(s, teamRef) {
      if(typeof teamRef === 'number') {
        return s.teams[teamRef] || 'Unknown Team';
      } else if(teamRef && typeof teamRef === 'object') {
        if(teamRef.fromRound !== undefined && teamRef.matchId !== undefined) {
          return 'Winner of R' + (teamRef.fromRound + 1) + 'M' + (teamRef.matchId + 1);
        } else if(teamRef.group && teamRef.position !== undefined) {
          return 'Group ' + teamRef.group + ' #' + (teamRef.position + 1);
        }
      }
      return 'TBD';
    }

    // Helper function to call renderFixtures with proper round parameter for tournament vs non-tournament
    function renderFixturesWithRound() {
      var s = activeSeason();
      if(s && s.mode === 'tournament') {
        renderTournamentFixtures($('roundSel').value || 'group-0');
      } else {
        // For league mode, don't pass roundIdx - let renderFixtures use multi-select values
        renderFixtures();
      }
    }

    function renderStandings(){
      var s=activeSeason(); if(!s) return;
      
      // For CUP seasons, show tournament progress instead of league table
      if(s.mode === 'cup'){
        renderCupStandings(s);
        return;
      }
      
      // For Double Elimination seasons, show bracket standings
      if(s.mode === 'double-elimination'){
        renderCupStandings(s); // Reuse for now
        return;
      }
      
      // For Swiss seasons, show Swiss standings
      if(s.mode === 'swiss'){
        renderSwissStandings(s);
        return;
      }
      
      // For TOURNAMENT seasons, show group stage and knockout bracket
      if(s.mode === 'tournament'){
        renderTournamentStandings(s);
        return;
      }
      
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  }
  
  // Restore league table header
  var thead = document.querySelector('#tblStandings thead tr');
  if(thead) {
    thead.innerHTML = '<th class="pos">#</th>' +
                      '<th>Đội</th>' +
                      '<th>P</th><th>W</th><th>D</th><th>L</th>' +
                      '<th>GF</th><th>GA</th><th>GD</th><th>Pts</th>' +
                      '<th>Form</th>' +
                      '<th>Trend</th><th>Δ</th>';
  }
  
$('seasonTitle').textContent='— '+s.name+' (LEAGUE)';
      $('leagueLogo').style.backgroundImage=s.logo?('url("'+s.logo+'")'):'none';
      
      var search=(($('searchTeam').value)||'').toLowerCase();
      var tbody=$('standings'); tbody.innerHTML='';
      var topBand=s.settings.top||4,euroBand=s.settings.euro||6,playoffBand=s.settings.playoff||0,rel=s.settings.rel||3;
      rows.forEach(function(r,idx){
        if(search && r.team.toLowerCase().indexOf(search)===-1) return;
        var isTop=idx<topBand,isEuro=idx>=topBand&&idx<euroBand,isPlayoff=playoffBand>0&&idx>=rows.length-rel-playoffBand&&idx<rows.length-rel,isRel=idx>=rows.length-rel;
        var tr=document.createElement('tr');
        if(isTop) tr.classList.add('band-top'); else if(isEuro) tr.classList.add('band-euro'); else if(isPlayoff) tr.classList.add('band-playoff'); else if(isRel) tr.classList.add('band-rel');
        var logo=s.teamLogos&&s.teamLogos[r.idx]?'<img src="'+s.teamLogos[r.idx]+'" alt="logo"/>':'';
        var badge=logo?('<span class="badge">'+logo+'</span>'):('<span class="badge" style="background:'+(s.teamColors[r.idx]||'#1b2550')+'"></span>');
        var curPos = idx + 1; var prevPos = (typeof prevMap==='object' && prevMap) ? (prevMap[r.idx] || null) : null; var change = (prevPos==null) ? 0 : (prevPos - curPos);
  tr.innerHTML='<td class="pos">'+(idx+1)+'</td>'+
          '<td class="team">'+badge+r.team+'</td>'+
          '<td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.D+'</td><td>'+r.L+'</td>'+
          '<td>'+r.GF+'</td><td>'+r.GA+'</td><td>'+(r.GD>=0?'+':'')+r.GD+'</td><td>'+r.Pts+'</td>'+
          '<td>'+renderFormCells(r.form.slice(-7))+'</td>' + '<td><canvas class="spark" data-team="'+r.idx+'"></canvas></td>' + renderDeltaCell(change, prevPos!=null);
        tr.addEventListener('click',function(){openTeamDialog(r.idx)});
        tbody.appendChild(tr);
      });
      drawRankSparks(rows.map(function(x){return x.idx}))
    }

    

function estimatePredScore(s, m){
  // Use the same lambdas as probabilities and choose the most likely score
  var lam = computeRFExpectedGoals(s, m.home, m.away);
  var lH = lam.lH, lA = lam.lA;

  // Get category probabilities
  var probs = matchProbs(s, m.home, m.away);
  var cat = 'draw';
  if (probs.home >= probs.draw && probs.home >= probs.away) cat = 'home';
  else if (probs.away >= probs.draw && probs.away >= probs.home) cat = 'away';

  var best = {x:1, y:1, p:-1};
  for (var x=0; x<=8; x++){
    var px = pois(lH, x);
    for (var y=0; y<=8; y++){
      var py = pois(lA, y);
      var p = px * py;
      // keep only scorelines consistent with the dominant category
      if ((cat==='home' && x<=y) || (cat==='away' && x>=y) || (cat==='draw' && x!==y)) continue;
      // tie-breaker: prefer lower total goals to avoid wild scores
      if (p > best.p || (Math.abs(p - best.p) < 1e-12 && (x+y) < (best.x+best.y))){
        best = {x:x, y:y, p:p};
      }
    }
  }

  // Fallback: if for some reason no candidate found (unlikely), pick joint-mode
  if (best.p < 0){
    var alt = {x:0, y:0, p:-1};
    for (var X=0; X<=8; X++){
      var pX = pois(lH, X);
      for (var Y=0; Y<=8; Y++){
        var pY = pois(lA, Y);
        var P = pX * pY;
        if (P > alt.p){ alt = {x:X, y:Y, p:P}; }
      }
    }
    best = alt;
  }
  return best.x + '-' + best.y;
}

// Helper functions for season-wide averages (used elsewhere)
function avgGF(idx, lastN){
  var goals = [];
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r+'-'+k;
      var res = s.results[key];
      if (!res) continue;
      var mm = ms[k];
      if (mm.home===idx) goals.push(+res.hg);
      else if (mm.away===idx) goals.push(+res.ag);
    }
  }
  if (goals.length===0) return 1.0; // fallback
  goals = goals.slice(-lastN);
  var sum = goals.reduce((a,b)=>a+b,0);
  return sum / goals.length;
}

function avgGA(idx, lastN){
  var goals = [];
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r+'-'+k;
      var res = s.results[key];
      if (!res) continue;
      var mm = ms[k];
      if (mm.home===idx) goals.push(+res.ag);
      else if (mm.away===idx) goals.push(+res.hg);
    }
  }
  if (goals.length===0) return 1.0;
  goals = goals.slice(-lastN);
  var sum = goals.reduce((a,b)=>a+b,0);
  return sum / goals.length;
}


function getRankMap(s){
  // Use most recent round with any result; fallback to initial order
  var last = (typeof lastRoundWithAnyResult==='function') ? lastRoundWithAnyResult(s) : -1;
  var rows = (typeof computeStandingsFor==='function')
    ? computeStandingsFor(s, 'POINTS', (last>=0? last : s.rounds.length-1))
    : null;
  var map = {};
  if (rows && rows.length){
    rows.forEach(function(r,i){ map[r.idx] = i+1; });
  } else {
    (s.teams||[]).forEach(function(_,i){ map[i]=i+1; });
  }
  return map;
}

function estimatePredScoreSeasonRanked(s, m){
  // season-wide averages
  function teamAvgGF(idx){
    var sum=0, n=0;
    for (var r=0;r<s.rounds.length;r++){
      var ms=s.rounds[r];
      for (var k=0;k<ms.length;k++){
        var key=r+'-'+k, res=s.results[key]; if(!res) continue;
        var mm=ms[k];
        if (mm.home===idx){ sum+=+res.hg; n++; }
        else if (mm.away===idx){ sum+=+res.ag; n++; }
      }
    }
    return n? (sum/n) : 1.0;
  }
  function teamAvgGA(idx){
    var sum=0, n=0;
    for (var r=0;r<s.rounds.length;r++){
      var ms=s.rounds[r];
      for (var k=0;k<ms.length;k++){
        var key=r+'-'+k, res=s.results[key]; if(!res) continue;
        var mm=ms[k];
        if (mm.home===idx){ sum+=+res.ag; n++; }
        else if (mm.away===idx){ sum+=+res.hg; n++; }
      }
    }
    return n? (sum/n) : 1.0;
  }
  var egH = (teamAvgGF(m.home) + teamAvgGA(m.away))/2;
  var egA = (teamAvgGF(m.away) + teamAvgGA(m.home))/2;

  // Home advantage
  // Rank weighting: 3% per rank gap (clamped), applied asymmetrically
  var rankMap = getRankMap(s);
  var rh = rankMap[m.home] || 10, ra = rankMap[m.away] || 10;
  var gap = (ra - rh); // positive => home ranked better
  var factor = 1 + (gap * 0.03);
  if (factor < 0.6) factor = 0.6;
  if (factor > 1.4) factor = 1.4;
  egH *= factor;
  egA /= factor;

  // Clamp and round
  egH = Math.max(0, Math.round(egH));
  egA = Math.max(0, Math.round(egA));
  return egH + '-' + egA;
}


/* ==== PATCH: Helpers for ranked + recent-form probabilities ==== */

function seasonAvgGF(s, idx){
  var sum = 0, n = 0;
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r + '-' + k, res = s.results[key]; if(!res) continue;
      var m = ms[k];
      if (m.home === idx){ sum += (+res.hg); n++; }
      else if (m.away === idx){ sum += (+res.ag); n++; }
    }
  }
  return n ? (sum/n) : 1.0;
}

function seasonAvgGA(s, idx){
  var sum = 0, n = 0;
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r + '-' + k, res = s.results[key]; if(!res) continue;
      var m = ms[k];
      if (m.home === idx){ sum += (+res.ag); n++; }
      else if (m.away === idx){ sum += (+res.hg); n++; }
    }
  }
  return n ? (sum/n) : 1.0;
}

// Recent form score for last N matches (W=3, D=1, L=0) -> points per game (0..3)
function teamRecentPPG(s, idx, lastN){
  var seq = fullFormSeq(s, idx);
  if (!seq.length) return 1.5;
  var last = seq.slice(-lastN);
  var pts = 0;
  for (var i=0; i<last.length; i++){
    pts += (last[i] === 'W' ? 3 : (last[i] === 'D' ? 1 : 0));
  }
  return pts / last.length;
}

/* ==== END Helpers ==== */
/* ==== PATCH: shared lambdas for rank+form (used by matchProbs & pred score) ==== */
function computeRFExpectedGoals(s, hi, ai){
  // Base (season averages)
  var baseH = (seasonAvgGF(s, hi) + seasonAvgGA(s, ai)) / 2;
  var baseA = (seasonAvgGF(s, ai) + seasonAvgGA(s, hi)) / 2;

  // Rank factor
  var rankMap = (typeof getRankMap === 'function') ? getRankMap(s) : getRankMapLatest(s);
  var rH = rankMap[hi] || 10;
  var rA = rankMap[ai] || 10;
  var gap = (rA - rH);
  var fRank = clamp(1 + 0.03 * gap, 0.70, 1.30);

  // Recent form factor (last 5)
  var N = 5;
  var ppgH = teamRecentPPG(s, hi, N);
  var ppgA = teamRecentPPG(s, ai, N);
  var fFormH = clamp(1 + 0.25 * (ppgH - 1.5), 0.85, 1.15);
  var fFormA = clamp(1 + 0.25 * (ppgA - 1.5), 0.85, 1.15);

  var lH = baseH * fRank * fFormH;
  var lA = baseA * (1 / fRank) * fFormA;

  // Clamp
  lH = clamp(lH, 0.15, 4.5);
  lA = clamp(lA, 0.15, 4.5);
  return { lH: lH, lA: lA };
}

function renderFixtures(roundIdx){
      var s=activeSeason(); if(!s) return;
      
      // Handle tournament season type
      if(s.mode === 'tournament') {
        renderTournamentFixtures(roundIdx);
        return;
      }
      
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  }
      // Get selected rounds - support checkbox selection
      var selectedRounds = [];
      
      if (typeof roundIdx === 'number') {
        // Called programmatically with a specific round
        selectedRounds = [roundIdx];
      } else {
        // Get checked checkboxes from round selector
        var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked');
        if (checkboxes.length > 0) {
          checkboxes.forEach(function(cb) {
            selectedRounds.push(Number(cb.value));
          });
        }
        // If nothing selected, don't default to anything - selectedRounds stays empty
      }
      
      // Populate round checkboxes
      var roundCheckboxesDiv = document.getElementById('roundCheckboxes');
      if (roundCheckboxesDiv) {
        roundCheckboxesDiv.innerHTML = '';
        for (var i = 0; i < s.rounds.length; i++) {
          var label = document.createElement('label');
          label.style.cssText = 'display:flex; align-items:center; gap:4px; cursor:pointer; padding:4px; border-radius:4px; background:var(--card);';
          
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = String(i);
          checkbox.className = 'round-checkbox';
          // Check this box if it's in selectedRounds
          if (selectedRounds.indexOf(i) !== -1) {
            checkbox.checked = true;
          }
          // Don't check any by default
          
          var span = document.createElement('span');
          span.textContent = 'V' + (i + 1);
          span.style.fontSize = '12px';
          
          label.appendChild(checkbox);
          label.appendChild(span);
          roundCheckboxesDiv.appendChild(label);
          
          // Add change event listener
          checkbox.addEventListener('change', function() {
            renderFixturesWithRound();
          });
        }
      }
      
      var teamFilter=$('teamFilter'); var prev=teamFilter.value||''; teamFilter.innerHTML=''; var any=document.createElement('option'); any.value=''; any.textContent='— Tất cả —'; teamFilter.appendChild(any);
      var teamList = s.teams.map(function(t, i) { return {name: t, idx: i}; });
      teamList.sort(function(a, b) { return a.name.localeCompare(b.name); });
      teamList.forEach(function(team){var o=document.createElement('option'); o.value=String(team.idx); o.textContent=team.name; teamFilter.appendChild(o)});
      if(prev!=='' && Number(prev)<s.teamCount) teamFilter.value=prev;
      var filterTeam=teamFilter.value!==''?Number(teamFilter.value):null; 
      var showOnlyDone=$('onlyDone').checked?true:false;
      var showOnlyPending=$('onlyPending').checked?true:false;
      var fixturesDiv=$('fixtures'); fixturesDiv.innerHTML='';

      var list=[];
      if(filterTeam!=null){
        for(var ri=0;ri<s.rounds.length;ri++){
          var ms=s.rounds[ri]; for(var mi=0;mi<ms.length;mi++){ var mm=ms[mi]; if(mm.home===filterTeam||mm.away===filterTeam){ list.push({r:ri,idx:mi,m:mm}) } }
        }
      } else {
        // Show fixtures from all selected rounds
        selectedRounds.forEach(function(r) {
          (s.rounds[r]||[]).forEach(function(m,idx){ list.push({r:r,idx:idx,m:m}) });
        });
      }

      // Show message if no rounds selected and no team filter
      if(list.length === 0 && filterTeam === null && selectedRounds.length === 0) {
        fixturesDiv.innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--muted);">' +
          '<p style="font-size:16px; margin:0 0 8px 0;">📋 Chưa chọn vòng nào</p>' +
          '<p style="font-size:13px; margin:0;">Nhấn nút "Chọn vòng" ở trên để chọn vòng đấu cần xem</p>' +
        '</div>';
        return;
      }

      list.forEach(function(item){
        var ri=item.r, idx=item.idx, m=item.m; var key=ri+'-'+idx; var res=s.results[key]||{}; 
        if(showOnlyDone && (res.hg==null||res.ag==null)) return;
        if(showOnlyPending && (res.hg!=null&&res.ag!=null)) return;
        var el=document.createElement('div'); el.className='fixture'; el.setAttribute('data-key',key);
        var vhg=(res.hg==null?'':res.hg), vag=(res.ag==null?'':res.ag);
        var probs=matchProbs(s,m.home,m.away); var pct=function(x){return Math.round(x*100)};
        
        // Determine winner/loser classes
        var homeClass = '';
        var awayClass = '';
        var hgVal = parseInt(vhg, 10);
        var agVal = parseInt(vag, 10);
        if(!isNaN(hgVal) && !isNaN(agVal)) {
          if(hgVal > agVal) {
            homeClass = ' bracket-team-winner';
            awayClass = ' bracket-team-loser';
          } else if(agVal > hgVal) {
            awayClass = ' bracket-team-winner';
            homeClass = ' bracket-team-loser';
          }
        }
        
el.innerHTML = `
  <div class="muted">V${ri+1}-${idx+1}</div>
  <div class="teamCell${homeClass}">
    ${(s.teamLogos && s.teamLogos[m.home])
      ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[m.home]+'); background-size: cover; background-position: center;"></span>'
      : '<span class="fixture-logo" style="background:'+(s.teamColors[m.home]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
    ${s.teams[m.home]}
  </div>
  <input class="scoreH" type="number" min="0" value="${vhg}"/>
  <div style="text-align:center">–</div>
  <input class="scoreA" type="number" min="0" value="${vag}"/>
  <div class="teamCell right${awayClass}">
    ${s.teams[m.away]}
    ${(s.teamLogos && s.teamLogos[m.away])
      ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[m.away]+'); background-size: cover; background-position: center;"></span>'
      : '<span class="fixture-logo" style="background:'+(s.teamColors[m.away]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
  </div>
  <div class="prob">${pct(probs.home)}%-${pct(probs.draw)}%-${pct(probs.away)}%</div>
  <div class="predScore">${estimatePredScore(s, m)}</div>
`;

        var h=el.querySelector('.scoreH'); var a=el.querySelector('.scoreA');
     if (isAdmin()) {
       h.removeAttribute('readonly');
       a.removeAttribute('readonly');
       h.removeAttribute('disabled');
       a.removeAttribute('disabled');
       h.disabled = false;
       a.disabled = false;
       h.style.pointerEvents = 'auto';
       a.style.pointerEvents = 'auto';
     } else {
       h.setAttribute('readonly', 'readonly');
       a.setAttribute('readonly', 'readonly');
       h.setAttribute('disabled', 'disabled');
       a.setAttribute('disabled', 'disabled');
       h.disabled = true;
       a.disabled = true;
       h.style.pointerEvents = 'none';
       a.style.pointerEvents = 'none';
     }
        function commit(){
          if(!isAdmin()){
            toast('Chỉ admin được phép sửa');
            // Do not re-render, just return
            return;
          }
          var hg=(h.value==='')?null:Math.max(0,parseInt(h.value,10));
          var ag=(a.value==='')?null:Math.max(0,parseInt(a.value,10));
          if(hg==null||ag==null){
            delete s.results[key];
          } else {
            s.results[key]={hg:hg,ag:ag};
          }
          saveAll();
          // Update input fields with latest values from s.results
                    if(document.activeElement !== h) {
            h.value = (s.results[key] && s.results[key].hg != null) ? s.results[key].hg : '';
          }
          if(document.activeElement !== a) {
            a.value = (s.results[key] && s.results[key].ag != null) ? s.results[key].ag : '';
          }
          renderStandings();
          renderInsights();
          renderSeasonStats();
          drawRankChart();
          // Only re-render fixtures if the score was actually changed and saved
          // renderFixtures(r); // Remove this line to prevent input disappearing
        }
        h.addEventListener('change',commit); a.addEventListener('change',commit);
        fixturesDiv.appendChild(el);
      })
    }

    function renderInsights(){
      var s=activeSeason(); if(!s) return; 
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  }
var rows=computeStandingsFor(s,'overall'); var ul=$('insights'); ul.innerHTML='';
      if(!rows.length){ ul.innerHTML='<li class="muted">Chưa có dữ liệu</li>'; return }
      var mostGF=rows.slice().sort(function(a,b){return b.GF-a.GF})[0];
      var bestGD=rows.slice().sort(function(a,b){return b.GD-a.GD})[0];
      var leastGA=rows.slice().sort(function(a,b){return a.GA-b.GA})[0];
      ul.innerHTML='<li>Hàng công tốt nhất: <strong>'+mostGF.team+'</strong> ('+mostGF.GF+' GF)</li>'+
                   '<li>Hiệu số tốt nhất: <strong>'+bestGD.team+'</strong> ('+(bestGD.GD>=0?'+':'')+bestGD.GD+')</li>'+
                   '<li>Thủ chắc nhất: <strong>'+leastGA.team+'</strong> ('+leastGA.GA+' GA)</li>'
    }

    function renderSeasonStats(){
      var s=activeSeason(); var ul=$('seasonStats'); if(!s||!ul) return; ul.innerHTML='';
      var rows=computeStandingsFor(s,'overall'); if(!rows.length){ ul.innerHTML='<li class="muted">Chưa có dữ liệu</li>'; return }
      // Form 5 trận tốt nhất
      function formScore(seq){ var sc=0; for(var i=0;i<seq.length;i++){ sc+= (seq[i]==='W'?3:(seq[i]==='D'?1:0)) } return sc }
      var bestForm={team:'',score:-1}; rows.forEach(function(r){ var seq=fullFormSeq(s,r.idx).slice(-5); var sc=formScore(seq); if(sc>bestForm.score){ bestForm={team:r.team,score:sc,seq:seq} } });
      // Chuỗi thắng dài nhất
      function longestRun(seq){ var m=0,c=0; for(var i=0;i<seq.length;i++){ if(seq[i]==='W'){c++; if(c>m) m=c } else c=0 } return m }
      var bestStreak={team:'',len:0}; rows.forEach(function(r){ var seq=fullFormSeq(s,r.idx); var L=longestRun(seq); if(L>bestStreak.len){ bestStreak={team:r.team,len:L} } });
      // Trận nhiều bàn nhất
      var maxGoals=-1, maxLabel='—'; for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(res){ var sum=(+res.hg)+(+res.ag); if(sum>maxGoals){ maxGoals=sum; maxLabel='V'+(r+1)+': '+s.teams[ms[m].home]+' '+res.hg+'–'+res.ag+' '+s.teams[ms[m].away] } } } }
      ul.innerHTML =
        '<li>Form tốt nhất 5 trận: <strong>' + bestForm.team + '</strong> (' + bestForm.score + 'đ)' + (bestForm.seq ? ' <span style="color:#8aa0c5">– ' + bestForm.seq.join(' ') + '</span>' : '') + '</li>' +
        '<li>Chuỗi thắng dài nhất: <strong>' + bestStreak.team + '</strong> (' + bestStreak.len + ' trận)</li>' +
        '<li>Trận nhiều bàn nhất: <strong>' + maxLabel + '</strong></li>';
    }

    function makeMiniRow(){return {team:'',P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}}
    function renderMiniRow(r){ return '<tr><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>'+
      '<tr><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.D+'</td><td>'+r.L+'</td><td>'+r.GF+'</td><td>'+r.GA+'</td><td>'+(r.GD>=0?'+':'')+r.GD+'</td><td>'+r.Pts+'</td></tr>' }
    function splitHomeAwayStats(s,teamIdx){ var home=makeMiniRow(),away=makeMiniRow(); for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(!res) continue; var hi=ms[m].home,ai=ms[m].away; var hg=+res.hg,ag=+res.ag; if(hi===teamIdx){ home.P++;home.GF+=hg;home.GA+=ag; if(hg>ag){home.W++;home.Pts+=3}else if(hg<ag){home.L++}else{home.D++;home.Pts++} } else if(ai===teamIdx){ away.P++;away.GF+=ag;away.GA+=hg; if(ag>hg){away.W++;away.Pts+=3}else if(ag<hg){away.L++}else{away.D++;away.Pts++} } } } home.GD=home.GF-home.GA; away.GD=away.GF-away.GA; return {home:home,away:away} }
    function openTeamDialog(teamIdx){
      var s=activeSeason(); var name=s.teams[teamIdx]; $('teamDialogTitle').textContent=name;
      var seq=fullFormSeq(s,teamIdx); $('teamFormSeq').innerHTML=renderFormCells(seq); $('fullForm').innerHTML=renderFormCells(seq);
      var last10=seq.slice(-10); $('teamLast10').innerHTML=last10.length?renderFormCells(last10):'<span class="muted">—</span>';
      var oppSel=$('h2hOpponent'); oppSel.innerHTML=''; var oppList = s.teams.map(function(n,i){ return {name: n, idx: i}; }).filter(function(t){ return t.idx !== teamIdx; }); oppList.sort(function(a, b) { return a.name.localeCompare(b.name); }); oppList.forEach(function(opp){ var o=document.createElement('option'); o.value=String(opp.idx); o.textContent=opp.name; oppSel.appendChild(o) });
      oppSel.onchange=function(){ renderH2H(teamIdx,Number(oppSel.value)) };
      if(oppSel.options.length>0){ oppSel.value=oppSel.options[0].value; renderH2H(teamIdx,Number(oppSel.value)) }
      var sp=splitHomeAwayStats(s,teamIdx); $('homeStats').innerHTML=renderMiniRow(sp.home); $('awayStats').innerHTML=renderMiniRow(sp.away);
      var dlg=$('teamDialog'); if(dlg && typeof dlg.showModal==='function'){ dlg.showModal() } else { dlg.setAttribute('open','open') }
    }
    function renderH2H(aIdx,bIdx){
      var s=activeSeason(); var list=[]; var W=0,D=0,L=0,GF=0,GA=0;
      for(var r=0;r<s.rounds.length;r++){
        var ms=s.rounds[r];
        for(var m=0;m<ms.length;m++){
          var home=ms[m].home,away=ms[m].away; if(!((home===aIdx&&away===bIdx)||(home===bIdx&&away===aIdx))) continue;
          var key=r+'-'+m,res=s.results[key];
          if(res){ var hg=+res.hg,ag=+res.ag; var aHome=(home===aIdx); var gfor=aHome?hg:ag,gag=aHome?ag:hg; GF+=gfor; GA+=gag; if(gfor>gag) W++; else if(gfor<gag) L++; else D++; list.push('<div class="chip small">V'+(r+1)+': '+s.teams[home]+' '+hg+'–'+ag+' '+s.teams[away]+'</div>') }
          else { list.push('<div class="chip small muted">V'+(r+1)+': '+s.teams[home]+' – '+s.teams[away]+' (chưa đá)</div>') }
        }
      }
      $('h2hSummary').innerHTML='Tổng: <strong>'+W+'–'+D+'–'+L+'</strong> • GF/GA: <strong>'+GF+'/'+GA+'</strong>';
      $('h2hList').innerHTML=list.join('')
    }

    function randPoisson(lambda){var L=Math.exp(-lambda); var k=0,p=1; do{k++;p*=Math.random()}while(p>L); return k-1}
    
function highlightChampionChances(){
  var table = document.getElementById('simTable');
  if (!table) return;
  var rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
  if (rows.length === 0) return;
  // extract % values from column 2 ("Vô địch")
  var data = rows.map(function(r,i){
    var cell = r.cells[1];
    var txt = cell ? (cell.textContent || '').replace('%','').trim() : '0';
    var val = parseFloat(txt); if (!isFinite(val)) val = 0;
    return { idx: i, val: val };
  });
  var sorted = data.slice().sort(function(a,b){ return b.val - a.val; });
  var top4 = sorted.slice(0,4).map(function(x){ return x.idx; });
  var low3 = sorted.slice(-3).map(function(x){ return x.idx; });
  rows.forEach(function(r,i){
    r.style.background = '';
    if (top4.indexOf(i) !== -1){
      r.style.background = 'rgba(34,197,94,0.15)'; // light green
    } else if (low3.indexOf(i) !== -1){
      r.style.background = 'rgba(239,68,68,0.15)'; // light red
    }
  });
}

function runSimulation(N){
      var s=activeSeason(); if(!s) return; 
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  
  try{ highlightChampionChances(); }catch(e){}
}
var win=Array(s.teamCount).fill(0), top4=Array(s.teamCount).fill(0), rel=Array(s.teamCount).fill(0);
      var pct=function(x){return (x*100/N).toFixed(1)+'%'};
      for(var it=0;it<N;it++){
        var tmp=JSON.parse(JSON.stringify(s));
        for(var r=0;r<tmp.rounds.length;r++){
          for(var m=0;m<tmp.rounds[r].length;m++){
            var key=r+'-'+m; if(tmp.results[key]) continue;
            var hg=Math.max(0,Math.round(randPoisson(1.3+Math.random()*0.6)));
            var ag=Math.max(0,Math.round(randPoisson(1.1+Math.random()*0.6)));
            tmp.results[key]={hg:hg,ag:ag};
          }
        }
        var rows=computeStandingsFor(tmp,'overall');
        rows.forEach(function(rr,idx){ if(idx===0) win[rr.idx]++; if(idx<4) top4[rr.idx]++; if(idx>=rows.length-(s.settings.rel||3)) rel[rr.idx]++ })
      }
      var table=$('simTable'); table.innerHTML=''; var head=document.createElement('tr'); head.innerHTML='<th align="left">Đội</th><th>Vô địch</th><th>Top4</th><th>Rớt hạng</th>'; table.appendChild(head);
      s.teams.forEach(function(name,i){ var tr=document.createElement('tr'); tr.innerHTML='<td>'+name+'</td><td>'+pct(win[i])+'</td><td>'+pct(top4[i])+'</td><td>'+pct(rel[i])+'</td>'; table.appendChild(tr) })
    }

    function attachFilterListeners(){
      $('onlyDone').addEventListener('change', renderFixturesWithRound);
      $('onlyPending').addEventListener('change', renderFixturesWithRound);
      $('teamFilter').addEventListener('change', renderFixturesWithRound);
      
      // Round selector toggle button
      var roundSelToggle = document.getElementById('roundSelToggle');
      var roundSelPanel = document.getElementById('roundSelPanel');
      if (roundSelToggle && roundSelPanel) {
        roundSelToggle.addEventListener('click', function() {
          var isVisible = roundSelPanel.style.display !== 'none';
          roundSelPanel.style.display = isVisible ? 'none' : 'block';
          this.textContent = isVisible ? 'Chọn vòng ▼' : 'Chọn vòng ▲';
        });
      }
      
      // Select all/none buttons
      var roundSelAll = document.getElementById('roundSelAll');
      var roundSelNone = document.getElementById('roundSelNone');
      if (roundSelAll) {
        roundSelAll.addEventListener('click', function() {
          var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]');
          checkboxes.forEach(function(cb) { cb.checked = true; });
          renderFixturesWithRound();
        });
      }
      if (roundSelNone) {
        roundSelNone.addEventListener('click', function() {
          var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]');
          checkboxes.forEach(function(cb) { cb.checked = false; });
          renderFixturesWithRound();
        });
      }
      
      $('searchTeam').addEventListener('input',function(){renderStandings()});
      ['tabOverall','tabHome','tabAway'].forEach(function(id){ $(id).addEventListener('click',function(){ standingsMode=(id==='tabHome')?'home':(id==='tabAway')?'away':'overall'; ['tabOverall','tabHome','tabAway'].forEach(function(x){$(x).classList.toggle('primary',x===id)}); renderStandings() }) })
      $('themeSel').addEventListener('change',function(){ applyTheme(this.value,true) });
    }

    function applyTheme(mode, persist){
      var m=mode||localStorage.getItem(THEME_KEY)||'blue';
      if(persist){ try{localStorage.setItem(THEME_KEY,m)}catch(_){}}
      if(m==='dark'){
        document.body.dataset.theme='dark';
        document.body.style.background = '';
        document.documentElement.style.setProperty('--bg','#0b1020');
        document.documentElement.style.setProperty('--panel','#111731');
        document.documentElement.style.setProperty('--text','#e7eeff');
        document.documentElement.style.setProperty('--card','#0f172a');
        document.documentElement.style.setProperty('--accent','#3b82f6');
        document.documentElement.style.setProperty('--border','#223056');
        document.documentElement.style.setProperty('--muted','#8aa0c5');
        document.documentElement.style.setProperty('--hover','#1e2a4a');
        document.documentElement.style.setProperty('--danger','#ef4444');
        document.documentElement.style.setProperty('--warn','#f59e0b');
        document.documentElement.style.setProperty('--ok','#22c55e');
      } else if(m==='white'){
        // Light theme (modern, clean, very light)
        document.body.dataset.theme='light';
        document.body.style.background = '#ffffff';
        document.documentElement.style.setProperty('--bg','#ffffff');
        document.documentElement.style.setProperty('--panel','#fafbfc');
        document.documentElement.style.setProperty('--text','#1a202c');
        document.documentElement.style.setProperty('--card','#f7f9fc');
        document.documentElement.style.setProperty('--accent','#2563eb');
        document.documentElement.style.setProperty('--border','#e2e8f0');
        document.documentElement.style.setProperty('--muted','#64748b');
        document.documentElement.style.setProperty('--hover','#f1f5f9');
        document.documentElement.style.setProperty('--danger','#dc2626');
        document.documentElement.style.setProperty('--warn','#d97706');
        document.documentElement.style.setProperty('--ok','#059669');
      } else if(m==='blue'){
        document.body.dataset.theme='blue';
        document.body.style.background = '';
        document.documentElement.style.setProperty('--bg','#0b1533');
        document.documentElement.style.setProperty('--panel','#0e1b44');
        document.documentElement.style.setProperty('--text','#e7eeff');
        document.documentElement.style.setProperty('--card','#0c1a3b');
        document.documentElement.style.setProperty('--accent','#38bdf8');
        document.documentElement.style.setProperty('--border','#1e3a5f');
        document.documentElement.style.setProperty('--muted','#7ba7d9');
        document.documentElement.style.setProperty('--hover','#1a2f52');
        document.documentElement.style.setProperty('--danger','#ef4444');
        document.documentElement.style.setProperty('--warn','#f59e0b');
        document.documentElement.style.setProperty('--ok','#22c55e');
      }
      var sel=$('themeSel'); if(sel) sel.value=m;
    }

    function initEvents(){
      // Add Note button event
      $('btnAddNote').addEventListener('click', function() {
        if (!isAdmin()) return;
        var notes = JSON.parse(localStorage.getItem('pesNotes') || '[]');
        var label = prompt('Tên ghi chú:', 'Note ' + (notes.length + 1));
        if (!label) return;
        notes.push({ label: label, content: '' });
        localStorage.setItem('pesNotes', JSON.stringify(notes));
        updateCustomLinks();
      });
    // Note dialog logic
    function showNoteDialog(idx) {
      var notes = JSON.parse(localStorage.getItem('pesNotes') || '[]');
      var note = notes[idx];
      if (!note) return;
      var dlg = document.getElementById('noteDialog');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'noteDialog';
        document.body.appendChild(dlg);
      }
      // Always set dialog content to ensure both fields appear
      dlg.innerHTML = `
        <form id="noteForm" style="min-width:510px;max-width:900px">
          <h3>Ghi chú: <input id="noteLabelInput" type="text" style="width:60%" /></h3>
          <div style="margin-bottom:8px">Nội dung (có thể định dạng HTML):</div>
          <textarea id="noteContentInput" style="width:100%;height:270px"></textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button type="button" id="closeNoteBtn">Đóng</button>
            <button type="submit" id="saveNoteBtn" class="primary">Lưu</button>
          </div>
        </form>
      `;
      // Always show dialog, fallback for browsers without <dialog>
      if (typeof dlg.showModal === 'function') { dlg.showModal(); }
      else { dlg.setAttribute('open','open'); dlg.style.display = 'block'; dlg.style.position = 'fixed'; dlg.style.zIndex = 10000; dlg.style.left = '50%'; dlg.style.top = '20%'; dlg.style.transform = 'translate(-50%, 0)'; }

      // Dedicated function to bind events and update fields
      function bindNoteDialogEvents() {
        var labelInput = dlg.querySelector('#noteLabelInput');
        var contentInput = dlg.querySelector('#noteContentInput');
        var saveBtn = dlg.querySelector('#saveNoteBtn');
        var closeBtn = dlg.querySelector('#closeNoteBtn');
        labelInput.value = note.label;
        contentInput.value = note.content;
        var admin = isAdmin();
        labelInput.disabled = !admin;
        contentInput.disabled = !admin ? true : false;
        saveBtn.style.display = admin ? '' : 'none';
        // Remove previous listeners
        saveBtn.onclick = null;
        closeBtn.onclick = null;
        dlg.querySelector('#noteForm').onsubmit = null;
        // Save on submit
        dlg.querySelector('#noteForm').onsubmit = function(e) {
          e.preventDefault();
          if (!isAdmin()) return;
          note.label = labelInput.value;
          note.content = contentInput.value;
          notes[idx] = note;
          localStorage.setItem('pesNotes', JSON.stringify(notes));
          updateCustomLinks();
          if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
        };
        // Close on button click
        closeBtn.onclick = function() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
        // Focus textarea for editing
        if (admin) contentInput.focus();
      }
      bindNoteDialogEvents();
    }
  updateCustomLinks();
      $('btnAddLink').addEventListener('click', function() {
        var dlg = $('homeLinkDialog');
        $('homeLinkInput').value = '';
        $('homeLabelInput').value = '';
        dlg.removeAttribute('data-edit-idx');
        if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open','open'); }
      });
      $('saveHomeLink').addEventListener('click', function() {
        var idx = $('homeLinkDialog').getAttribute('data-edit-idx');
        var url = $('homeLinkInput').value.trim();
        var label = $('homeLabelInput').value.trim();
        if (idx !== null && idx !== '' && !isNaN(idx)) {
          // Edit existing custom link
          customLinks[Number(idx)] = { url: url, label: label };
          setCustomLinks(customLinks);
        } else if (label && url) {
          // Add new custom link
          customLinks.push({ url: url, label: label });
          setCustomLinks(customLinks);
        } else if ($('homeLabelInput').value === homeLabel && $('homeLinkInput').value === homeLink) {
          setHomeLink(url, label);
        } else {
          setHomeLink(url, label);
        }
        $('homeLinkDialog').removeAttribute('data-edit-idx');
      });
      $('btnAdmin').addEventListener('click',function(){
        if(isAdmin()){
          // Toggle admin mode off
          try{sessionStorage.removeItem('pesAdmin');}catch(_){}
          showAdmin(false);
          updateCustomLinks();
          refreshSeasonUI();
        }else{
          if (ensureAdmin()) {
            showAdmin(true);
            updateCustomLinks();
            refreshSeasonUI();
          }
        }
      });
      $('btnCloudSyncToggle').addEventListener('click', function() {
        if(!isAdmin()) { toast('Chỉ admin được phép đổi trạng thái sync'); return; }
        var nextState = !CloudSync.isEnabled();
        CloudSync.setEnabled(nextState);
        if(nextState) {
          toast('Đã bật tự động đồng bộ lên server');
          if(CloudSync.hasPAT()) CloudSync.schedulePush(state);
        } else {
          toast('Đã tắt tự động đồng bộ lên server');
        }
      });
      $('btnNewSeason').addEventListener('click',function(){ 
        if(!ensureAdmin()) return; 
        $('newSeasonName').value=''; 
        $('newSeasonTeams').value=20;
        $('numTournamentGroups').value=4;
        // Initialize option visibility
        var type = $('newSeasonType').value;
        var thirdPlaceDiv = $('thirdPlaceOption');
        var groupsDiv = $('tournamentGroupOption');
        
        if(type === 'cup' || type === 'tournament') {
          thirdPlaceDiv.style.display = 'block';
        } else {
          thirdPlaceDiv.style.display = 'none';
        }
        
        if(type === 'tournament') {
          groupsDiv.style.display = 'block';
        } else {
          groupsDiv.style.display = 'none';
        }
        
        var dlg=$('seasonDialog'); 
        if(dlg && typeof dlg.showModal==='function'){dlg.showModal()} else {dlg.setAttribute('open','open')} 
      });
      
      // Show/hide 3rd place option based on mode
      $('newSeasonType').addEventListener('change', function() {
        var type = this.value;
        var thirdPlaceDiv = $('thirdPlaceOption');
        var groupsDiv = $('tournamentGroupOption');
        var teamCountWrapper = $('teamCountWrapper');
        
        // Hide team count for Legend and Ranking modes
        if(type === 'legend' || type === 'ranking') {
          teamCountWrapper.style.display = 'none';
        } else {
          teamCountWrapper.style.display = 'flex';
        }
        
        if(type === 'cup' || type === 'tournament' || type === 'swiss') {
          thirdPlaceDiv.style.display = 'block';
        } else {
          thirdPlaceDiv.style.display = 'none';
        }
        
        if(type === 'tournament') {
          groupsDiv.style.display = 'block';
        } else {
          groupsDiv.style.display = 'none';
        }
      });
      
      $('createSeasonBtn').addEventListener('click',function(){
        if(!ensureAdmin()) return;
        var name=(($('newSeasonName').value)||'').trim()||'Mùa mới';
        var type = ($('newSeasonType').value || 'league');
        
        console.log('Creating season with type:', type);
        
        // For Legend and Ranking modes, don't need team count
        var n = (type === 'legend' || type === 'ranking') ? 0 : clamp(parseInt($('newSeasonTeams').value,10)||10,3,100);
        
        var has3rdPlace = $('enable3rdPlace').checked;
        var numGroups = type === 'tournament' ? clamp(parseInt($('numTournamentGroups').value,10)||4,2,8) : 4;
        var numKnockoutTeams = type === 'tournament' ? clamp(parseInt($('numKnockoutTeams').value,10)||8,2,32) : 8;
        var groupRoundRobin = 'double'; // default
        if(type === 'tournament') {
          var radioButtons = document.getElementsByName('groupRoundRobin');
          for(var i = 0; i < radioButtons.length; i++) {
            if(radioButtons[i].checked) {
              groupRoundRobin = radioButtons[i].value;
              break;
            }
          }
        }
        
        // Validate team count based on season type
        if(type === 'tournament') {
          var minTeams = numGroups * 2; // At least 2 teams per group
          var maxQualifiers = numGroups * 5; // Max 5 teams per group (1st through 5th)
          if(n < minTeams) {
            alert('Tournament mode with ' + numGroups + ' groups requires at least ' + minTeams + ' teams.');
            return;
          }
          if(numKnockoutTeams > maxQualifiers) {
            alert('With ' + numGroups + ' groups, maximum knockout teams is ' + maxQualifiers + '.');
            return;
          }
        } else if(type === 'cup') {
          if(n < 2) {
            alert('Cup mode requires at least 2 teams.');
            return;
          }
        } else if(type === 'double-elimination') {
          if(n < 4) {
            alert('Double Elimination requires minimum 4 teams');
            return;
          }
        } else if(type === 'swiss') {
          if(n < 8) {
            alert('Swiss System requires at least 8 teams');
            return;
          }
        }
        
        var id=uid();
        var season = makeSeason(name,n,type,has3rdPlace,numGroups,numKnockoutTeams,groupRoundRobin);
        
        console.log('Season created with mode:', season.mode);
        
        season.mode = type;
        season.has3rdPlace = has3rdPlace;
        if(type === 'tournament') {
          season.numGroups = numGroups;
          season.numKnockoutTeams = numKnockoutTeams;
          season.groupRoundRobin = groupRoundRobin;
        }
        if(type === 'legend') {
          season.timelines = []; // Array of timeline years
        }
        var ok = true;
        if(type==='cup' && n>=2){
          season.cup = buildCupBracket(season);
          season.rounds = [];
          if(!season.cup || !season.cup.rounds || !season.cup.rounds.length){
            toast('Không thể tạo bracket CUP.');
            ok = false;
          }
        }
        if(type==='double-elimination' && n>=4){
          season.doubleElimination = buildDoubleEliminationBracket(season);
          season.rounds = [];
          if(!season.doubleElimination){
            toast('Không thể tạo Double Elimination bracket.');
            ok = false;
          }
        }
        if(type==='swiss' && n>=8){
          season.swiss = buildSwissBracket(season);
          season.rounds = [];
          if(!season.swiss){
            toast('Không thể tạo Swiss bracket.');
            ok = false;
          }
        }
        if(ok){
          state.seasons[id]=season;
          state.current=id;
          saveAll();
          refreshAll();
        }
        // Always close dialog after attempt
        var dlg = document.getElementById('seasonDialog');
        if(dlg && typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
      });
      $('btnRenameSeason').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); var name=prompt('Tên mùa:',s.name); if(name){s.name=name.trim(); saveAll(); refreshSeasonUI()} });
      $('btnDeleteSeason').addEventListener('click',function(){ if(!ensureAdmin()) return; if(Object.keys(state.seasons).length<=1){alert('Phải còn ít nhất 1 mùa.'); return} var s=activeSeason(); if(!confirm("Xoá mùa '"+s.name+"'?")) return; delete state.seasons[state.current]; var seasonKeys=Object.keys(state.seasons); state.current=seasonKeys[seasonKeys.length-1]; saveAll(); refreshSeasonUI() });
      
      $('btnReorderSeasons').addEventListener('click',function(){ 
        if(!ensureAdmin()) return; 
        
        // Get current season order
        var seasonOrder = state.seasonOrder || [];
        var seasonIds = Object.keys(state.seasons);
        
        // Add any seasons not in the order array (new seasons)
        seasonIds.forEach(function(id) {
          if (seasonOrder.indexOf(id) === -1) {
            seasonOrder.push(id);
          }
        });
        
        // Remove deleted seasons from order (keep separators which start with 'separator-')
        seasonOrder = seasonOrder.filter(function(id) {
          return id.indexOf('separator-') === 0 || state.seasons[id] != null;
        });
        
        // Populate the reorder list
        var list = $('seasonOrderList');
        list.innerHTML = '';
        
        // Add "Insert Separator" button at top
        var addSeparatorBtn = document.createElement('button');
        addSeparatorBtn.type = 'button';
        addSeparatorBtn.className = 'primary';
        addSeparatorBtn.textContent = '➕ Add Separator Line';
        addSeparatorBtn.style.cssText = 'margin-bottom: 12px; width: 100%;';
        addSeparatorBtn.onclick = function() {
          var separatorId = 'separator-' + Date.now();
          seasonOrder.unshift(separatorId);
          renderSeasonOrderList();
        };
        list.appendChild(addSeparatorBtn);
        
        function renderSeasonOrderList() {
          // Clear list except button
          while(list.children.length > 1) {
            list.removeChild(list.lastChild);
          }
          
          seasonOrder.forEach(function(id, index) {
            // Check if this is a separator
            if(id.indexOf('separator-') === 0) {
              var separatorItem = document.createElement('div');
              separatorItem.className = 'season-separator-item';
              separatorItem.setAttribute('draggable', 'true');
              separatorItem.setAttribute('data-season-id', id);
              separatorItem.style.cssText = 'display: flex; align-items: center; gap: 4px; padding: 2px 4px; background: transparent; border: none; border-bottom: 1px solid var(--accent); margin: 2px 0; cursor: move; height: 12px;';
              
              separatorItem.innerHTML = '<span style="flex: 1; text-align: center; color: var(--accent); font-weight: 400; font-size: 10px; opacity: 0.6;">────</span>' +
                '<button type="button" onclick="event.stopPropagation(); this.parentElement.remove(); seasonOrder.splice(' + index + ', 1);" style="background: #dc2626; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">✕</button>';
              
              setupDragForItem(separatorItem);
              list.appendChild(separatorItem);
              return;
            }
            
            var season = state.seasons[id];
            if (!season) return;
            
            var item = document.createElement('div');
            item.className = 'season-reorder-item';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-season-id', id);
            
            var modeLabel = season.mode === 'cup' ? 'Cup' : 
                           season.mode === 'swiss' ? 'Swiss' : 
                           season.mode === 'double-elimination' ? 'DE' : 
                           season.mode === 'tournament' ? 'Tournament' : 
                           season.mode === 'legend' ? 'Legend' : 'League';
            
            item.innerHTML = '<span class="drag-handle">☰</span>' +
                            '<span class="season-name">' + season.name + '</span>' +
                            '<span class="season-type">' + modeLabel + '</span>';
            
            setupDragForItem(item);
            list.appendChild(item);
          });
        }
        
        function setupDragForItem(item) {
          // Drag event handlers
          item.addEventListener('dragstart', function(e) {
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.innerHTML);
          });
          
          item.addEventListener('dragend', function() {
            item.classList.remove('dragging');
            // Update seasonOrder after drag
            var items = list.querySelectorAll('[data-season-id]');
            seasonOrder = [];
            items.forEach(function(itm) {
              var sid = itm.getAttribute('data-season-id');
              if(sid) seasonOrder.push(sid);
            });
          });
          
          item.addEventListener('dragover', function(e) {
            e.preventDefault();
            var draggingItem = list.querySelector('.dragging');
            if (draggingItem && draggingItem !== item && draggingItem !== addSeparatorBtn) {
              var rect = item.getBoundingClientRect();
              var offset = e.clientY - rect.top;
              if (offset > rect.height / 2) {
                list.insertBefore(draggingItem, item.nextSibling);
              } else {
                list.insertBefore(draggingItem, item);
              }
            }
          });
        }
        
        renderSeasonOrderList();
        
        var dlg = $('reorderSeasonsDialog');
        if(dlg && typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', 'open');
      });
      
      $('btnSaveSeasonOrder').addEventListener('click',function() {
        if(!ensureAdmin()) return;
        
        var list = $('seasonOrderList');
        var items = list.querySelectorAll('[data-season-id]');
        var newOrder = [];
        
        items.forEach(function(item) {
          var id = item.getAttribute('data-season-id');
          if (id) newOrder.push(id);
        });
        
        state.seasonOrder = newOrder;
        saveAll();
        refreshSeasonUI();
        toast('✅ Đã lưu thứ tự mùa giải');
      });
      
      $('seasonSel').addEventListener('change',function(){ state.current=this.value; saveAll(); refreshAll() });
      $('btnTeamCount').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); $('editTeamCount').value=s.teamCount; var dlg=$('teamCountDialog'); if(dlg && typeof dlg.showModal==='function'){dlg.showModal()} else {dlg.setAttribute('open','open')} });
      $('applyTeamCount').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); var n=clamp(parseInt($('editTeamCount').value,10)||s.teamCount,3,30); if(!confirm('Đổi số đội sẽ xoá mọi kết quả. Tiếp tục?')) return; s.teamCount=n; if(s.teams.length<n){ var add=Array.from({length:n-s.teams.length},function(_,i){return 'Team '+(s.teams.length+i+1)}); s.teams=s.teams.concat(add); s.teamColors=s.teamColors.concat(Array(n-s.teamColors.length).fill('#1b2550')); s.teamLogos=s.teamLogos.concat(Array(n-s.teamLogos.length).fill(DEFAULT_TEAM_LOGO)) } else if(s.teams.length>n){ s.teams=s.teams.slice(0,n); s.teamColors=s.teamColors.slice(0,n); s.teamLogos=s.teamLogos.slice(0,n) } s.rounds=generateFixtures(n); s.results={}; saveAll(); refreshSeasonUI() });
      $('btnEditNames').addEventListener('click',function(){ 
        if(!ensureAdmin()) return; 
        var s=activeSeason(); 
        var nameDialog=$('nameDialog'); 
        nameDialog.innerHTML='<form method="dialog"><h3>Team setup (<span id="nameCount"></span>)</h3><div class="grid-names" id="nameGrid"></div><div style="display:flex;justify-content:space-between;margin-top:12px"><div class="muted small">Đặt tên, màu, logo (PNG/JPG 1:1). Click [↓] to select from Team List.</div><div style="display:flex;gap:8px"><button value="cancel">Hủy</button><button id="saveNames" class="primary" value="confirm">Lưu</button></div></div></form>'; 
        nameDialog.querySelector('#nameCount').textContent=s.teamCount+' đội'; 
        var grid=nameDialog.querySelector('#nameGrid'); 
        grid.innerHTML=''; 
        
        s.teams.forEach(function(t,i){ 
          var idx=document.createElement('div'); 
          idx.className='muted'; 
          idx.textContent=String(i+1).padStart(2,'0'); 
          
          var teamNameContainer = document.createElement('div');
          teamNameContainer.style.cssText = 'display: flex; gap: 4px; align-items: center;';
          
          var input=document.createElement('input'); 
          input.type='text'; 
          input.value=t; 
          input.setAttribute('data-idx',i); 
          input.style.cssText = 'flex: 1;';
          
          var teamListBtn = document.createElement('button');
          teamListBtn.type = 'button';
          teamListBtn.textContent = '↓';
          teamListBtn.className = 'ghost small';
          teamListBtn.style.cssText = 'padding: 2px 6px; min-width: 24px;';
          teamListBtn.title = 'Select from Team List';
          teamListBtn.addEventListener('click', function() {
            if(!state.teamMasterList || state.teamMasterList.length === 0) {
              toast('Team List is empty. Add teams to Team List first.');
              return;
            }
            
            // Create team selection dialog instead of dropdown
            var selectDialog = document.createElement('dialog');
            selectDialog.style.cssText = 'width: 300px; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
            
            selectDialog.innerHTML = 
              '<h4 style="margin: 0 0 16px 0; color: var(--accent);">Select Team from Master List</h4>' +
              '<div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
              state.teamMasterList.slice().sort(function(a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
              }).map(function(teamName, idx) { 
                return '<div class="team-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text);" data-team="' + teamName + '">' + teamName + '</div>'; 
              }).join('') +
              '</div>' +
              '<div style="margin-top: 16px; text-align: right;">' +
              '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
              '</div>';
            
            // Add click events for team options
            var teamOptions = selectDialog.querySelectorAll('.team-option');
            teamOptions.forEach(function(option) {
              option.addEventListener('click', function() {
                var selectedTeam = this.getAttribute('data-team');
                input.value = selectedTeam;
                selectDialog.close();
                document.body.removeChild(selectDialog);
              });
              
              // Hover effect
              option.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--hover)';
              });
              option.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
              });
            });
            
            document.body.appendChild(selectDialog);
            if(typeof selectDialog.showModal === 'function') { 
              selectDialog.showModal(); 
            } else { 
              selectDialog.setAttribute('open', 'open'); 
            }
            
            selectDialog.addEventListener('close', function() {
              if(document.body.contains(selectDialog)) {
                document.body.removeChild(selectDialog);
              }
            });
          });
          
          teamNameContainer.appendChild(input);
          teamNameContainer.appendChild(teamListBtn);
          
          var color=document.createElement('input'); 
          color.type='color'; 
          color.value=s.teamColors[i]||'#1b2550'; 
          color.setAttribute('data-idx',i); 
          
          var upBtn=document.createElement('button'); 
          upBtn.type='button'; 
          upBtn.textContent='Logo...'; 
          upBtn.className='ghost small'; 
          upBtn.setAttribute('data-idx',i); 
          
          var file=document.createElement('input'); 
          file.type='file'; 
          file.accept='image/*'; 
          file.style.display='none'; 
          file.setAttribute('data-idx',i); 
          
          upBtn.addEventListener('click',function(){file.click()}); 
          file.addEventListener('change',function(e){ 
            var f=e.target.files&&e.target.files[0]; 
            if(!f) return; 
            var teamName = s.teams[i] || ('Team_' + (i + 1));
            RepoUploader.uploadFile(f, { folder: 'logos', baseName: teamName, message: 'chore: upload team logo ' + teamName })
              .then(function(path) {
                s.teamLogos[i] = path;
                saveAll();
                toast('Đã tải logo cho '+(s.teams[i]||('Team '+(i+1))));
              })
              .catch(function(err) {
                console.error('Team logo upload failed:', err);
                alert('Upload thất bại: ' + (err && err.message ? err.message : err));
              });
          }); 
          
          var logoListBtn = document.createElement('button');
          logoListBtn.type = 'button';
          logoListBtn.textContent = '📋';
          logoListBtn.className = 'ghost small';
          logoListBtn.style.cssText = 'padding: 2px 6px; min-width: 24px; margin-left: 4px;';
          logoListBtn.title = 'Select from Team Logo List';
          logoListBtn.addEventListener('click', function() {
            var teamLogoOptions = getTeamLogoOptions();
            if(teamLogoOptions.length === 0) {
              toast('Team Logo List is empty. Add logos to Logo List first.');
              return;
            }
            
            // Create logo selection dialog
            var selectLogoDialog = document.createElement('dialog');
            selectLogoDialog.style.cssText = 'width: 400px; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
            
            selectLogoDialog.innerHTML = 
              '<h4 style="margin: 0 0 16px 0; color: var(--accent);">Select Team Logo</h4>' +
              '<div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
              teamLogoOptions.slice().sort(function(a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
              }).map(function(logo, idx) { 
                return '<div class="logo-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text); display: flex; align-items: center; gap: 10px;" data-logo-data="' + logo.data + '" data-logo-name="' + logo.name + '">' + 
                  '<img src="' + logo.data + '" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;" />' +
                  '<span>' + logo.name + '</span>' +
                '</div>'; 
              }).join('') +
              '</div>' +
              '<div style="margin-top: 16px; text-align: right;">' +
              '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
              '</div>';
            
            // Add click events for logo options
            var logoOptions = selectLogoDialog.querySelectorAll('.logo-option');
            logoOptions.forEach(function(option) {
              option.addEventListener('click', function() {
                var selectedLogoData = this.getAttribute('data-logo-data');
                var selectedLogoName = this.getAttribute('data-logo-name');
                s.teamLogos[i] = selectedLogoData;
                toast('Selected logo "' + selectedLogoName + '" for ' + (s.teams[i] || ('Team ' + (i + 1))));
                selectLogoDialog.close();
                document.body.removeChild(selectLogoDialog);
              });
              
              // Hover effect
              option.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--hover)';
              });
              option.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
              });
            });
            
            document.body.appendChild(selectLogoDialog);
            if(typeof selectLogoDialog.showModal === 'function') { 
              selectLogoDialog.showModal(); 
            } else { 
              selectLogoDialog.setAttribute('open', 'open'); 
            }
            
            selectLogoDialog.addEventListener('close', function() {
              if(document.body.contains(selectLogoDialog)) {
                document.body.removeChild(selectLogoDialog);
              }
            });
          });
          
          var resetLogoBtn = document.createElement('button');
          resetLogoBtn.type = 'button';
          resetLogoBtn.textContent = '🔄';
          resetLogoBtn.className = 'ghost small';
          resetLogoBtn.style.cssText = 'padding: 2px 6px; min-width: 24px; margin-left: 4px;';
          resetLogoBtn.title = 'Reset to Default Logo';
          resetLogoBtn.addEventListener('click', function() {
            s.teamLogos[i] = DEFAULT_TEAM_LOGO;
            toast('Reset logo to default for ' + (s.teams[i] || ('Team ' + (i + 1))));
          });
          
          var logoContainer = document.createElement('div');
          logoContainer.style.cssText = 'display: flex; gap: 4px; align-items: center;';
          logoContainer.appendChild(upBtn);
          logoContainer.appendChild(logoListBtn);
          logoContainer.appendChild(resetLogoBtn);
          logoContainer.appendChild(file);
          
          grid.appendChild(idx); 
          grid.appendChild(teamNameContainer); 
          grid.appendChild(color); 
          grid.appendChild(logoContainer); 
        }); 
        
        if(typeof nameDialog.showModal==='function'){nameDialog.showModal()} else {nameDialog.setAttribute('open','open')} 
        nameDialog.querySelector('#saveNames').addEventListener('click',function(){ 
          var s=activeSeason(); 
          var inputs=nameDialog.querySelectorAll('input[type="text"]'); 
          inputs.forEach(function(inp){
            var i=Number(inp.getAttribute('data-idx')); 
            s.teams[i]=(inp.value||'').trim()||('Team '+(i+1))
          }); 
          var colors=nameDialog.querySelectorAll('input[type="color"]'); 
          colors.forEach(function(inp){
            var i=Number(inp.getAttribute('data-idx')); 
            s.teamColors[i]=inp.value||'#1b2550'
          }); 
          saveAll(); 
          renderStandings(); 
          renderFixturesWithRound(); 
          renderStandingTracker() 
        }) 
      });
      $('btnSettings').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); $('cfgTop').value=s.settings.top; $('cfgEuro').value=s.settings.euro; $('cfgPlayoff').value=s.settings.playoff||0; $('cfgRel').value=s.settings.rel; $('cfgH2H').checked=!!s.settings.h2h; var dlg=$('settingsDialog'); if(dlg && typeof dlg.showModal==='function'){dlg.showModal()} else {dlg.setAttribute('open','open')} });
      $('btnApplySettings').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); s.settings.top=clamp(parseInt($('cfgTop').value,10)||4,1,10); s.settings.euro=clamp(parseInt($('cfgEuro').value,10)||6,0,10); s.settings.playoff=clamp(parseInt($('cfgPlayoff').value,10)||0,0,8); s.settings.rel=clamp(parseInt($('cfgRel').value,10)||3,1,6); s.settings.h2h=$('cfgH2H').checked?true:false; saveAll(); var legendText='Top '+s.settings.top+' (🔵), '+s.settings.euro+' (🟠)'; if(s.settings.playoff>0){ legendText+=', Playoff ('+s.settings.playoff+', 🟣)'; } legendText+=', rớt hạng ('+s.settings.rel+', 🔴)'; $('bandLegend').textContent=legendText; renderStandings() });
      $('logoFile').addEventListener('change',function(e){
        var file = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
        if(!file) return;
        var s = activeSeason();
        var baseName = 'season_' + RepoUploader.sanitize(s.name || state.current);
        RepoUploader.uploadFile(file, { folder: 'logos', baseName: baseName, message: 'chore: upload season logo' })
          .then(function(path) {
            s.logo = path;
            saveAll();
            refreshSeasonUI();
            if(typeof toast === 'function') toast('✅ Đã tải logo lên repo');
          })
          .catch(function(err) {
            console.error('Season logo upload failed:', err);
            alert('Upload thất bại: ' + (err && err.message ? err.message : err));
          })
          .then(function() { $('logoFile').value = ''; });
      });
      $('btnLogo').addEventListener('click',function(){
        if(!ensureAdmin()) return;
        var s = activeSeason();
        var seasonLogoOptions = getSeasonLogoOptions();

        var dlg = document.createElement('dialog');
        dlg.style.cssText = 'width: 460px; max-width: 92vw; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';

        var listHtml = seasonLogoOptions.length === 0
          ? '<div style="color: var(--muted); padding: 12px; text-align: center;">Chưa có season logo nào. Upload mới hoặc push file <code>season_*</code> vào <code>logos/</code> trên repo.</div>'
          : seasonLogoOptions.slice().sort(function(a, b) {
              return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }).map(function(logo) {
              return '<div class="season-logo-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;" data-logo-data="' + logo.data + '" data-logo-name="' + logo.name + '">' +
                '<img src="' + logo.data + '" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;" />' +
                '<span>' + logo.name + '</span>' +
              '</div>';
            }).join('');

        dlg.innerHTML =
          '<h4 style="margin: 0 0 12px 0; color: var(--accent);">Logo giải đấu</h4>' +
          '<div style="font-size: 12px; color: var(--muted); margin-bottom: 10px;">Chọn từ danh sách Season Logos hoặc upload file mới (sẽ được lưu vào <code>logos/</code> với tiền tố <code>season_</code>).</div>' +
          '<div style="max-height: 260px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' + listHtml + '</div>' +
          '<div style="display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: 14px;">' +
            '<button type="button" id="seasonLogoClearBtn" style="padding: 8px 14px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Xoá logo</button>' +
            '<div style="display: flex; gap: 8px;">' +
              '<button type="button" id="seasonLogoUploadBtn" style="padding: 8px 14px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Upload mới...</button>' +
              '<button type="button" id="seasonLogoCancelBtn" style="padding: 8px 14px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Hủy</button>' +
            '</div>' +
          '</div>';

        document.body.appendChild(dlg);

        function closeDlg(){ try { dlg.close(); } catch(_){} if(document.body.contains(dlg)) document.body.removeChild(dlg); }

        dlg.querySelectorAll('.season-logo-option').forEach(function(opt){
          opt.addEventListener('mouseenter', function(){ this.style.backgroundColor = 'var(--hover)'; });
          opt.addEventListener('mouseleave', function(){ this.style.backgroundColor = ''; });
          opt.addEventListener('click', function(){
            s.logo = this.getAttribute('data-logo-data');
            saveAll();
            refreshSeasonUI && refreshSeasonUI();
            toast('Đã chọn logo "' + this.getAttribute('data-logo-name') + '"');
            closeDlg();
          });
        });

        dlg.querySelector('#seasonLogoUploadBtn').addEventListener('click', function(){
          closeDlg();
          $('logoFile').click();
        });
        dlg.querySelector('#seasonLogoClearBtn').addEventListener('click', function(){
          s.logo = null;
          saveAll();
          refreshSeasonUI && refreshSeasonUI();
          toast('Đã xoá logo giải');
          closeDlg();
        });
        dlg.querySelector('#seasonLogoCancelBtn').addEventListener('click', closeDlg);
        dlg.addEventListener('close', function(){ if(document.body.contains(dlg)) document.body.removeChild(dlg); });

        if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open','open');
      });
      
      // Team List functionality - Editable master team list
      $('btnTeamList').addEventListener('click',function(){ 
        if(!ensureAdmin()) return; 
        showTeamMasterList();
      });
      
      $('btnLogoList').addEventListener('click',function(){ 
        if(!ensureAdmin()) return; 
        showLogoMasterList();
      });
      
      function showTeamMasterList() {
        console.log('showTeamMasterList called');
        
        // Ensure teamMasterList exists
        if(!state.teamMasterList) {
          state.teamMasterList = [];
          console.log('Initialized empty teamMasterList');
        }
        
        // Simple test dialog first
        var teamDialog = document.createElement('dialog');
        teamDialog.style.cssText = 'width: 400px; max-width: 90vw; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
        
        var teamList = state.teamMasterList || [];
        console.log('Team list:', teamList);
        
        teamDialog.innerHTML = 
          '<h3 style="color: var(--accent); margin: 0 0 16px 0;">Team Master List (' + teamList.length + ' teams)</h3>' +
          '<div style="margin: 16px 0;">' +
            '<input type="text" id="newTeamInput" placeholder="Enter team name..." style="width: 200px; padding: 8px; margin-right: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">' +
            '<button type="button" id="addTeamBtn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>' +
          '</div>' +
          '<div id="teamListDisplay" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 8px; margin: 16px 0; background: var(--bg);">' +
            (teamList.length === 0 ? 
              '<div style="color: var(--muted);">No teams added yet</div>' :
              teamList.slice().sort(function(a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
              }).map(function(team, idx) { 
                return '<div style="padding: 4px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">' + 
                  '<span>' + (idx + 1) + '. ' + team + '</span>' + 
                  '<button type="button" onclick="removeTeam(' + teamList.indexOf(team) + ')" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Delete</button>' +
                '</div>'; 
              }).join('')
            ) +
          '</div>' +
          '<div style="text-align: right;">' +
            '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>' +
          '</div>';
        
        console.log('Dialog HTML created');
        
        // Add event listeners
        document.body.appendChild(teamDialog);
        console.log('Dialog added to body');
        
        var addBtn = teamDialog.querySelector('#addTeamBtn');
        var newInput = teamDialog.querySelector('#newTeamInput');
        
        if(addBtn && newInput) {
          addBtn.addEventListener('click', function() {
            console.log('Add button clicked');
            var newTeam = newInput.value.trim();
            console.log('New team:', newTeam);
            
            if(newTeam && !state.teamMasterList.includes(newTeam)) {
              state.teamMasterList.push(newTeam);
              state.teamMasterList.sort();
              saveAll();
              console.log('Team added, updated list:', state.teamMasterList);
              
              // Refresh dialog
              teamDialog.close();
              document.body.removeChild(teamDialog);
              showTeamMasterList();
            } else if(newTeam) {
              alert('Team already exists!');
            }
          });
          
          newInput.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') {
              addBtn.click();
            }
          });
        }
        
        // Show dialog
        try {
          if(typeof teamDialog.showModal === 'function') { 
            teamDialog.showModal(); 
            console.log('Dialog shown with showModal');
          } else { 
            teamDialog.setAttribute('open', 'open'); 
            console.log('Dialog shown with open attribute');
          }
        } catch(e) {
          console.error('Error showing dialog:', e);
          alert('Error showing dialog: ' + e.message);
        }
        
        teamDialog.addEventListener('close', function() {
          console.log('Dialog closing');
          if(document.body.contains(teamDialog)) {
            document.body.removeChild(teamDialog);
          }
        });
        
        // Global function for removing teams
        window.removeTeam = function(index) {
          console.log('Removing team at index:', index);
          var teamName = state.teamMasterList[index];
          
          if (confirm('Are you sure you want to delete "' + teamName + '" from the Team Master List?\n\nThis action cannot be undone.')) {
            state.teamMasterList.splice(index, 1);
            saveAll();
            teamDialog.close();
            document.body.removeChild(teamDialog);
            showTeamMasterList();
          }
        };
      }
      
      function showLogoMasterList() {
        console.log('showLogoMasterList called');
        
        // Ensure logoMasterList exists
        if(!state.logoMasterList) {
          state.logoMasterList = [];
          console.log('Initialized empty logoMasterList');
        }
        
        // Simple test dialog first
        var logoDialog = document.createElement('dialog');
        logoDialog.style.cssText = 'width: 500px; max-width: 90vw; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
        
        var logoList = state.logoMasterList || [];
        console.log('Logo list:', logoList);

        function renderLogoSection(title, sublist) {
          if(sublist.length === 0) {
            return '<div style="margin-bottom: 14px;">' +
              '<div style="font-weight: 600; color: var(--text); margin: 6px 0;">' + title + ' (0)</div>' +
              '<div style="color: var(--muted); padding: 8px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">No logos in this group</div>' +
              '</div>';
          }
          var items = sublist.slice().sort(function(a, b) {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          }).map(function(logo, idx) {
            var isScan = logo.source === 'scan';
            var badge = isScan
              ? '<span title="Tự động scan từ logos/" style="background: #10b981; color: white; font-size: 10px; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">auto</span>'
              : '<span title="Lưu base64 trong data.json (legacy, có thể xóa nếu file đã có trên repo)" style="background: #f59e0b; color: white; font-size: 10px; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">manual</span>';
            var deleteBtn = isScan
              ? '<button type="button" disabled title="Xóa bằng cách remove file trong logos/ trên repo" style="padding: 2px 8px; background: #9ca3af; color: white; border: none; border-radius: 3px; cursor: not-allowed; font-size: 12px;">Delete</button>'
              : '<button type="button" onclick="removeLogo(' + logoList.indexOf(logo) + ')" style="padding: 2px 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Delete</button>';
            return '<div style="padding: 8px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">' +
              '<div style="display: flex; align-items: center; gap: 10px;">' +
                '<img src="' + logo.data + '" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;" />' +
                '<span>' + (idx + 1) + '. ' + logo.name + badge + '</span>' +
              '</div>' +
              deleteBtn +
            '</div>';
          }).join('');
          return '<div style="margin-bottom: 14px;">' +
            '<div style="font-weight: 600; color: var(--text); margin: 6px 0;">' + title + ' (' + sublist.length + ')</div>' +
            '<div style="border: 1px solid var(--border); border-radius: 4px; padding: 8px; background: var(--bg);">' + items + '</div>' +
            '</div>';
        }

        var teamLogos = getTeamLogoOptions();
        var seasonLogos = getSeasonLogoOptions();

        logoDialog.innerHTML = 
          '<h3 style="color: var(--accent); margin: 0 0 8px 0;">Logo Master List (' + logoList.length + ' logos)</h3>' +
          '<div style="background: var(--bg); border: 1px dashed var(--border); border-radius: 6px; padding: 10px 12px; margin: 0 0 12px 0; font-size: 12px; color: var(--muted); line-height: 1.5;">' +
            '<strong style="color: var(--text);">💡 Cách thêm logo mới (khuyến nghị):</strong><br/>' +
            'Push file ảnh vào thư mục <code style="background: var(--card); padding: 1px 5px; border-radius: 3px;">logos/</code> trên GitHub repo. File có tên bắt đầu bằng <code>season_</code> sẽ vào nhóm <b>Season Logos</b>, còn lại vào nhóm <b>Team Logos</b>.' +
            '<div style="margin-top: 6px;"><button type="button" id="rescanLogosBtn" style="padding: 4px 10px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🔄 Quét lại ngay</button></div>' +
          '</div>' +
          '<div style="margin: 12px 0;">' +
            '<input type="file" id="newLogoInput" accept="image/*" style="width: 230px; padding: 8px; margin-right: 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">' +
            '<label style="font-size: 12px; color: var(--muted); margin-right: 8px;"><input type="checkbox" id="newLogoIsSeason" style="vertical-align: middle;"> Season logo</label>' +
            '<button type="button" id="addLogoBtn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Upload to logos/</button>' +
          '</div>' +
          '<div id="logoListDisplay" style="max-height: 360px; overflow-y: auto; padding: 4px 2px; margin: 8px 0;">' +
            renderLogoSection('🛡️ Team Logos', teamLogos) +
            renderLogoSection('🏆 Season Logos', seasonLogos) +
          '</div>' +
          '<div style="text-align: right;">' +
            '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>' +
          '</div>';
        
        console.log('Dialog HTML created');
        
        // Add event listeners
        document.body.appendChild(logoDialog);
        console.log('Dialog added to body');
        
        var addBtn = logoDialog.querySelector('#addLogoBtn');
        var newInput = logoDialog.querySelector('#newLogoInput');
        var rescanBtn = logoDialog.querySelector('#rescanLogosBtn');
        if(rescanBtn) {
          rescanBtn.addEventListener('click', function() {
            rescanBtn.disabled = true;
            rescanBtn.textContent = '⏳ Đang quét...';
            LogoScanner.run(false).then(function(n) {
              saveAll();
              logoDialog.close();
              document.body.removeChild(logoDialog);
              showLogoMasterList();
            }).catch(function(err) {
              rescanBtn.disabled = false;
              rescanBtn.textContent = '🔄 Quét lại ngay';
              alert('Quét logos/ thất bại: ' + (err && err.message ? err.message : err));
            });
          });
        }
        
        if(addBtn && newInput) {
          addBtn.addEventListener('click', function() {
            var file = newInput.files[0];
            if(!file) { alert('Please select a logo file first.'); return; }
            if(!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }

            var fileName = file.name.replace(/\.[^/.]+$/, '');
            var isSeason = !!(logoDialog.querySelector('#newLogoIsSeason') && logoDialog.querySelector('#newLogoIsSeason').checked);
            if(isSeason && !/^season[_\s-]/i.test(fileName)) {
              fileName = 'season_' + fileName;
            }
            addBtn.disabled = true;
            var origText = addBtn.textContent;
            addBtn.textContent = '⏳ Uploading...';

            RepoUploader.uploadFile(file, {
              folder: 'logos',
              baseName: fileName,
              message: 'chore: add logo ' + fileName
            }).then(function(path) {
              // Trigger background rescan so the new file appears as `auto` next time
              LogoScanner.run(false).then(function() {
                saveAll();
                logoDialog.close();
                if(document.body.contains(logoDialog)) document.body.removeChild(logoDialog);
                showLogoMasterList();
              });
            }).catch(function(err) {
              console.error('Logo upload failed:', err);
              alert('Upload thất bại: ' + (err && err.message ? err.message : err));
              addBtn.disabled = false;
              addBtn.textContent = origText;
            });
          });
        }
        
        // Show dialog
        try {
          if(typeof logoDialog.showModal === 'function') { 
            logoDialog.showModal(); 
            console.log('Dialog shown with showModal');
          } else { 
            logoDialog.setAttribute('open', 'open'); 
            console.log('Dialog shown with open attribute');
          }
        } catch(e) {
          console.error('Error showing dialog:', e);
          alert('Error showing dialog: ' + e.message);
        }
        
        logoDialog.addEventListener('close', function() {
          console.log('Dialog closing');
          if(document.body.contains(logoDialog)) {
            document.body.removeChild(logoDialog);
          }
        });
        
        // Global function for removing logos
        window.removeLogo = function(index) {
          console.log('Removing logo at index:', index);
          var logoName = state.logoMasterList[index].name;
          
          if (confirm('Are you sure you want to delete logo "' + logoName + '" from the Logo Master List?\n\nThis action cannot be undone.')) {
            state.logoMasterList.splice(index, 1);
            saveAll();
            logoDialog.close();
            document.body.removeChild(logoDialog);
            showLogoMasterList();
          }
        };
      }
      
      $('btnRndAuto').addEventListener('click',function(){ 
        var s=activeSeason(); 
        
        if(s.mode === 'tournament') {
          // Tournament mode - fill random results for group stage or knockout
          var selectedRound = $('roundSel').value || 'group-0';
          
          if(selectedRound.startsWith('group-')) {
            // Group stage - fill group matches for specific round
            var roundIdx = parseInt(selectedRound.split('-')[1]) || 0;
            if(s.groups) {
              var groupNames = Object.keys(s.groups || {});
              groupNames.forEach(function(groupName) {
                var group = s.groups[groupName];
                if(group && group.fixtures && group.fixtures[roundIdx]) {
                  group.fixtures[roundIdx].forEach(function(match, matchIdx) {
                    var key = 'group-' + groupName + '-' + roundIdx + '-' + matchIdx;
                    if(!s.results[key]) {
                      s.results[key] = {
                        hg: Math.floor(Math.random() * 4),
                        ag: Math.floor(Math.random() * 4)
                      };
                    }
                  });
                }
              });
            }
          } else if(selectedRound.startsWith('knockout-')) {
            // Knockout stage - fill knockout matches for specific round
            var knockoutRoundIdx = parseInt(selectedRound.split('-')[1]) || 0;
            if(s.knockoutBracket && s.knockoutBracket.rounds && s.knockoutBracket.rounds[knockoutRoundIdx]) {
              s.knockoutBracket.rounds[knockoutRoundIdx].forEach(function(match, matchIdx) {
                var key = 'knockout-' + knockoutRoundIdx + '-' + matchIdx;
                if(!s.results[key]) {
                  s.results[key] = {
                    hg: Math.floor(Math.random() * 4),
                    ag: Math.floor(Math.random() * 4)
                  };
                }
              });
            }
          }
          
          // Re-render tournament components
          renderTournamentFixtures(selectedRound);
          renderTournamentStandings(s);
          renderTournamentGroups(s);
          renderTournamentKnockoutBracket(s);
          
        } else {
          // League/Cup mode - support multiple round selection via checkboxes
          var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked');
          var selectedRounds = [];
          checkboxes.forEach(function(cb) {
            selectedRounds.push(Number(cb.value));
          });
          
          if (selectedRounds.length === 0) {
            alert('Vui lòng chọn ít nhất một vòng để điền ngẫu nhiên.');
            return;
          }
          
          selectedRounds.forEach(function(r) {
            s.rounds[r].forEach(function(m,i){ 
              var key = r + '-' + i; 
              if(!s.results[key]) {
                s.results[key] = {
                  hg: Math.floor(Math.random() * 4),
                  ag: Math.floor(Math.random() * 4)
                };
              }
            });
          });
          
          // Re-render league/cup components
          renderFixtures(); 
          renderStandings(); 
          renderInsights(); 
          renderSeasonStats(); 
          drawRankChart();
        }
        
        saveAll(); 
      });
      $('btnRndClear').addEventListener('click',function(){ 
        var s=activeSeason(); 
        var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked');
        var selectedRounds = [];
        checkboxes.forEach(function(cb) {
          selectedRounds.push(Number(cb.value));
        });
        
        if (selectedRounds.length === 0) {
          alert('Vui lòng chọn ít nhất một vòng để xóa.');
          return;
        }
        
        selectedRounds.forEach(function(r) {
          s.rounds[r].forEach(function(m,i){ 
            var key = r + '-' + i; 
            delete s.results[key];
          });
        });
        
        saveAll(); 
        renderFixtures(); 
        renderStandings(); 
        renderInsights(); 
        renderSeasonStats(); 
        drawRankChart();
      });
      $('btnSimulate').addEventListener('click',function(){ runSimulation(200) });
      $('btnExportHTML').addEventListener('click',function(){ 
        if(!ensureAdmin()) return;
        showSeasonExportDialog();
      });
      
      $('btnImportData').addEventListener('click',function(){ 
        if(!ensureAdmin()) return;
        showImportDataDialog();
      });
      

      function showSeasonExportDialog() {
        var exportDialog = document.createElement('dialog');
        exportDialog.style.cssText = 'width: 500px; max-width: 90vw; border: none; border-radius: 12px; padding: 0; background: var(--card); color: var(--text);';
        
        var seasonIds = Object.keys(state.seasons);
        
        // Build list with seasons and separators in order
        var itemList = [];
        if(state.seasonOrder && state.seasonOrder.length > 0) {
          // Use custom order
          state.seasonOrder.forEach(function(id) {
            if(id.indexOf('separator-') === 0) {
              itemList.push({
                id: id,
                type: 'separator'
              });
            } else if(state.seasons[id]) {
              var season = state.seasons[id];
              itemList.push({
                id: id,
                type: 'season',
                name: season.name,
                teamCount: season.teamCount,
                mode: season.mode || 'league'
              });
            }
          });
        } else {
          // Default: just seasons sorted by creation time
          seasonIds.sort(function(a, b) {
            var timeA = state.seasons[a].createdAt || 0;
            var timeB = state.seasons[b].createdAt || 0;
            return timeB - timeA; // Newest first
          }).forEach(function(id) {
            var season = state.seasons[id];
            itemList.push({
              id: id,
              type: 'season',
              name: season.name,
              teamCount: season.teamCount,
              mode: season.mode || 'league'
            });
          });
        }
        
        var seasonCount = itemList.filter(function(item) { return item.type === 'season'; }).length;
        
        exportDialog.innerHTML = 
          '<form method="dialog" style="padding: 20px;">' +
          '<h3 style="margin: 0 0 16px 0; color: var(--accent);">Export Seasons (' + seasonCount + ' total)</h3>' +
          '<div style="margin-bottom: 16px;">' +
            '<label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">' +
              '<input type="checkbox" id="selectAllSeasons" style="transform: scale(1.2);">' +
              '<strong>Select All Seasons</strong>' +
            '</label>' +
            '<label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer; padding: 8px; background: var(--panel); border-radius: 6px;">' +
              '<input type="checkbox" id="includePicturesCheckbox" checked style="transform: scale(1.2);">' +
              '<div>' +
                '<strong>Include Pictures</strong>' +
                '<div style="font-size: 12px; color: var(--muted); margin-top: 2px;">Uncheck to reduce export file size</div>' +
              '</div>' +
            '</label>' +
          '</div>' +
          '<div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; padding: 8px; margin: 16px 0; background: var(--bg);">' +
            itemList.map(function(item) {
              if(item.type === 'separator') {
                return '<label style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; margin: 2px 0; cursor: pointer; background: transparent; border-bottom: 1px solid var(--accent);">' +
                  '<input type="checkbox" class="separator-checkbox" value="' + item.id + '" style="transform: scale(0.9);">' +
                  '<div style="flex: 1; font-size: 10px; color: var(--accent); opacity: 0.6;">────── separator ──────</div>' +
                '</label>';
              } else {
                return '<label style="display: flex; align-items: center; gap: 8px; padding: 8px; margin-bottom: 4px; border-radius: 4px; cursor: pointer; background: var(--card);" onmouseover="this.style.backgroundColor=\'var(--hover)\'" onmouseout="this.style.backgroundColor=\'var(--card)\'">' +
                  '<input type="checkbox" class="season-checkbox" value="' + item.id + '" style="transform: scale(1.1);">' +
                  '<div style="flex: 1;">' +
                    '<div style="font-weight: 500;">' + item.name + '</div>' +
                    '<div style="font-size: 12px; color: var(--muted);">' + item.teamCount + ' teams • ' + (item.mode === 'cup' ? 'Cup' : item.mode === 'tournament' ? 'Tournament' : item.mode === 'legend' ? 'Legend' : 'League') + '</div>' +
                  '</div>' +
                '</label>';
              }
            }).join('') +
          '</div>' +
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">' +
            '<div style="color: var(--muted); font-size: 13px;">Select seasons to include in export</div>' +
            '<div style="display: flex; gap: 8px;">' +
              '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>' +
              '<button type="button" id="exportSelectedBtn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer;">Export Selected</button>' +
            '</div>' +
          '</div></form>';
        
        document.body.appendChild(exportDialog);
        
        // Add event listeners
        var selectAllCheckbox = exportDialog.querySelector('#selectAllSeasons');
        var seasonCheckboxes = exportDialog.querySelectorAll('.season-checkbox');
        var separatorCheckboxes = exportDialog.querySelectorAll('.separator-checkbox');
        var exportBtn = exportDialog.querySelector('#exportSelectedBtn');
        
        // Select all functionality (includes seasons and separators)
        selectAllCheckbox.addEventListener('change', function() {
          seasonCheckboxes.forEach(function(checkbox) {
            checkbox.checked = selectAllCheckbox.checked;
          });
          separatorCheckboxes.forEach(function(checkbox) {
            checkbox.checked = selectAllCheckbox.checked;
          });
          updateExportButton();
        });
        
        // Individual checkbox listeners for seasons
        seasonCheckboxes.forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
            updateExportButton();
            // Update select all checkbox state
            var checkedCount = Array.from(seasonCheckboxes).filter(function(cb) { return cb.checked; }).length;
            selectAllCheckbox.checked = checkedCount === seasonCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < seasonCheckboxes.length;
          });
        });
        
        // Individual checkbox listeners for separators
        separatorCheckboxes.forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
            updateExportButton();
          });
        });
        
        function updateExportButton() {
          var checkedCount = Array.from(seasonCheckboxes).filter(function(cb) { return cb.checked; }).length;
          var separatorCount = Array.from(separatorCheckboxes).filter(function(cb) { return cb.checked; }).length;
          var totalText = checkedCount + ' Season' + (checkedCount === 1 ? '' : 's');
          if(separatorCount > 0) {
            totalText += ' + ' + separatorCount + ' Separator' + (separatorCount === 1 ? '' : 's');
          }
          exportBtn.textContent = checkedCount === 0 ? 'Export Selected' : 'Export ' + totalText;
          exportBtn.disabled = checkedCount === 0;
          exportBtn.style.opacity = checkedCount === 0 ? '0.5' : '1';
        }
        
        // Export button functionality
        exportBtn.addEventListener('click', function() {
          var selectedSeasonIds = Array.from(seasonCheckboxes)
            .filter(function(cb) { return cb.checked; })
            .map(function(cb) { return cb.value; });
          
          var selectedSeparatorIds = Array.from(separatorCheckboxes)
            .filter(function(cb) { return cb.checked; })
            .map(function(cb) { return cb.value; });
          
          if(selectedSeasonIds.length === 0) {
            alert('Please select at least one season to export.');
            return;
          }
          
          var includePictures = exportDialog.querySelector('#includePicturesCheckbox').checked;
          
          // Save export preferences to localStorage
          try {
            localStorage.setItem('exportPreferences', JSON.stringify({
              selectedSeasonIds: selectedSeasonIds,
              selectedSeparatorIds: selectedSeparatorIds,
              includePictures: includePictures
            }));
          } catch(e) {}
          
          exportDialog.close();
          document.body.removeChild(exportDialog);
          performExport(selectedSeasonIds, includePictures, selectedSeparatorIds);
        });
        
        // Load previous export preferences or default to current season
        var savedPrefs = null;
        try {
          var saved = localStorage.getItem('exportPreferences');
          if(saved) {
            savedPrefs = JSON.parse(saved);
          }
        } catch(e) {}
        
        if(savedPrefs) {
          // Restore previous selections
          if(savedPrefs.selectedSeasonIds) {
            savedPrefs.selectedSeasonIds.forEach(function(seasonId) {
              var checkbox = exportDialog.querySelector('.season-checkbox[value="' + seasonId + '"]');
              if(checkbox) {
                checkbox.checked = true;
              }
            });
          }
          if(savedPrefs.selectedSeparatorIds) {
            savedPrefs.selectedSeparatorIds.forEach(function(separatorId) {
              var checkbox = exportDialog.querySelector('.separator-checkbox[value="' + separatorId + '"]');
              if(checkbox) {
                checkbox.checked = true;
              }
            });
          }
          if(typeof savedPrefs.includePictures !== 'undefined') {
            var includePicturesCheckbox = exportDialog.querySelector('#includePicturesCheckbox');
            if(includePicturesCheckbox) {
              includePicturesCheckbox.checked = savedPrefs.includePictures;
            }
          }
          // Update select all checkbox
          var checkedCount = Array.from(seasonCheckboxes).filter(function(cb) { return cb.checked; }).length;
          selectAllCheckbox.checked = checkedCount === seasonCheckboxes.length;
          selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < seasonCheckboxes.length;
        } else {
          // Default: select current season
          var currentSeasonCheckbox = exportDialog.querySelector('.season-checkbox[value="' + state.current + '"]');
          if(currentSeasonCheckbox) {
            currentSeasonCheckbox.checked = true;
          }
        }
        updateExportButton();
        
        // Show dialog
        if(typeof exportDialog.showModal === 'function') { 
          exportDialog.showModal(); 
        } else { 
          exportDialog.setAttribute('open', 'open'); 
        }
        
        exportDialog.addEventListener('close', function() {
          if(document.body.contains(exportDialog)) {
            document.body.removeChild(exportDialog);
          }
        });
      }
      
      function showImportDataDialog() {
        var importDialog = document.createElement('dialog');
        importDialog.style.cssText = 'width: 600px; max-width: 90vw; border: none; border-radius: 12px; padding: 0; background: var(--card); color: var(--text);';
        
        importDialog.innerHTML = 
          '<div style="padding: 20px;">' +
            '<h3 style="margin: 0 0 20px 0; text-align: center; color: var(--accent);">📥 Import Data from File</h3>' +
            '<p style="margin: 0 0 15px 0; color: var(--text-dim); text-align: center;">Select an exported HTML file to import all data</p>' +
            
            '<div style="border: 2px dashed var(--border); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;" id="dropZone">' +
              '<p style="margin: 0 0 10px 0;">📁 Drop HTML file here or click to browse</p>' +
              '<input type="file" id="importFileInput" accept=".html,.htm" style="display: none;">' +
              '<button type="button" id="browseBtn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer;">Browse Files</button>' +
            '</div>' +
            
            '<div id="importPreview" style="display: none; background: var(--bg-lighter); padding: 15px; border-radius: 8px; margin: 15px 0;">' +
              '<h4 style="margin: 0 0 10px 0;">Import Preview:</h4>' +
              '<div id="previewContent"></div>' +
            '</div>' +
            
            '<div style="text-align: center; margin-top: 20px;">' +
              '<button type="button" id="importBtn" disabled style="padding: 10px 20px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px; opacity: 0.5;">Import Data</button>' +
              '<button type="button" id="cancelImportBtn" style="padding: 10px 20px; background: var(--border); color: var(--text); border: none; border-radius: 6px; cursor: pointer;">Cancel</button>' +
            '</div>' +
          '</div>';
          
        document.body.appendChild(importDialog);
        
        var fileInput = importDialog.querySelector('#importFileInput');
        var browseBtn = importDialog.querySelector('#browseBtn');
        var dropZone = importDialog.querySelector('#dropZone');
        var importBtn = importDialog.querySelector('#importBtn');
        var cancelBtn = importDialog.querySelector('#cancelImportBtn');
        var preview = importDialog.querySelector('#importPreview');
        var previewContent = importDialog.querySelector('#previewContent');
        
        var importData = null;
        
        // File input handler
        function handleFile(file) {
          if(!file || !file.name.match(/\.(html?|htm)$/i)) {
            alert('Please select a valid HTML file');
            return;
          }
          
          var reader = new FileReader();
          reader.onload = function(e) {
            try {
              var htmlContent = e.target.result;
              var parser = new DOMParser();
              var doc = parser.parseFromString(htmlContent, 'text/html');
              var embeddedData = doc.getElementById('EMBEDDED_DATA');
              
              if(!embeddedData || !embeddedData.textContent.trim()) {
                alert('No embedded data found in this file. Please select a valid exported HTML file.');
                return;
              }
              
              importData = JSON.parse(embeddedData.textContent);
              
              // Show preview
              var seasonsCount = Object.keys(importData.seasons || {}).length;
              var teamsCount = (importData.teamMasterList || []).length;
              var logosCount = (importData.logoMasterList || []).length;
              var notesCount = (importData.pesNotes || []).length;
              var linksCount = (importData.customLinks || []).length;
              
              previewContent.innerHTML = 
                '<p><strong>File:</strong> ' + file.name + '</p>' +
                '<p><strong>Seasons:</strong> ' + seasonsCount + '</p>' +
                '<p><strong>Team Master List:</strong> ' + teamsCount + ' teams</p>' +
                '<p><strong>Logo Master List:</strong> ' + logosCount + ' logos</p>' +
                '<p><strong>Notes:</strong> ' + notesCount + '</p>' +
                '<p><strong>Custom Links:</strong> ' + linksCount + '</p>' +
                '<p><strong>Home Link:</strong> ' + (importData.homeLink || 'None') + '</p>';
                
              preview.style.display = 'block';
              importBtn.disabled = false;
              importBtn.style.opacity = '1';
              
            } catch(e) {
              alert('Error reading file: ' + e.message);
              console.error('Import error:', e);
            }
          };
          reader.readAsText(file);
        }
        
        // Browse button
        browseBtn.addEventListener('click', function() {
          fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', function(e) {
          if(e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', function(e) {
          e.preventDefault();
          dropZone.style.background = 'var(--accent-dim)';
        });
        
        dropZone.addEventListener('dragleave', function(e) {
          e.preventDefault();
          dropZone.style.background = '';
        });
        
        dropZone.addEventListener('drop', function(e) {
          e.preventDefault();
          dropZone.style.background = '';
          if(e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        });
        
        // Import button
        importBtn.addEventListener('click', function() {
          if(!importData) return;
          
          var confirmMessage = 'Bạn có chắc chắn muốn Import dữ liệu?\n\n' +
                               '⚠️ Hành động này sẽ:\n' +
                               '• Ghi đè toàn bộ dữ liệu hiện tại\n' +
                               '• Thay thế tất cả seasons, teams, logos, notes và links\n' +
                               '• Không thể hoàn tác\n\n' +
                               'Tiếp tục Import?';
                               
          if(confirm(confirmMessage)) {
            performImport(importData);
            importDialog.close();
            document.body.removeChild(importDialog);
          }
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', function() {
          importDialog.close();
          document.body.removeChild(importDialog);
        });
        
        // Show dialog
        if(typeof importDialog.showModal === 'function') { 
          importDialog.showModal(); 
        } else { 
          importDialog.setAttribute('open', 'open'); 
        }
        
        importDialog.addEventListener('close', function() {
          if(document.body.contains(importDialog)) {
            document.body.removeChild(importDialog);
          }
        });
      }
      
      function performImport(importData) {
        try {
          console.log('Starting data import:', importData);
          
          // Import seasons data
          if(importData.seasons) {
            state.seasons = importData.seasons;
          }
          
          // Import current season
          if(importData.current) {
            state.current = importData.current;
          }
          
          // Import team master list
          if(importData.teamMasterList) {
            state.teamMasterList = importData.teamMasterList;
          }
          
          // Import logo master list
          if(importData.logoMasterList) {
            state.logoMasterList = importData.logoMasterList;
          }
          
          // Import localStorage data
          if(importData.homeLink !== undefined) {
            localStorage.setItem('pesHomeLink', importData.homeLink);
          }
          
          if(importData.homeLabel !== undefined) {
            localStorage.setItem('pesHomeLabel', importData.homeLabel);
          }
          
          if(importData.customLinks) {
            localStorage.setItem('pesCustomLinks', JSON.stringify(importData.customLinks));
          }
          
          if(importData.pesNotes) {
            localStorage.setItem('pesNotes', JSON.stringify(importData.pesNotes));
          }
          
          // Save all imported data
          saveAll();
          
          // Refresh UI
          refreshSeasonUI();
          refreshNoteCount();
          updateHomeButton();
          
          console.log('Import completed successfully');
          alert('✅ Import thành công!\n\nTất cả dữ liệu đã được import và lưu.');
          
        } catch(e) {
          console.error('Import failed:', e);
          alert('❌ Import thất bại: ' + e.message);
        }
      }
      
      function performExport(selectedSeasonIds, includePictures, selectedSeparatorIds) {
        try{ 
          console.log('Starting HTML export for seasons:', selectedSeasonIds);
          console.log('Selected separators:', selectedSeparatorIds);
          console.log('Include pictures:', includePictures);
          
          // Create export data with only selected seasons
          var exportData = {
            seasons: {},
            current: state.current,
            teamMasterList: state.teamMasterList || [],
            logoMasterList: state.logoMasterList || [],
            // Include Note and Link data for export
            homeLink: localStorage.getItem('pesHomeLink') || '',
            homeLabel: localStorage.getItem('pesHomeLabel') || 'Home',
            customLinks: JSON.parse(localStorage.getItem('pesCustomLinks') || '[]'),
            pesNotes: JSON.parse(localStorage.getItem('pesNotes') || '[]')
          };
          
          // Include only selected seasons
          selectedSeasonIds.forEach(function(seasonId) {
            if(state.seasons[seasonId]) {
              var seasonCopy = JSON.parse(JSON.stringify(state.seasons[seasonId]));
              
              // Remove pictures from Legend mode if includePictures is false
              if(!includePictures && seasonCopy.mode === 'legend' && seasonCopy.timelines) {
                seasonCopy.timelines.forEach(function(timeline) {
                  if(timeline.pictures) {
                    timeline.pictures = [];
                  }
                });
              }
              
              exportData.seasons[seasonId] = seasonCopy;
            }
          });
          
          // Include season order for selected seasons and separators
          if (state.seasonOrder && state.seasonOrder.length > 0) {
            exportData.seasonOrder = state.seasonOrder.filter(function(id) {
              // Keep selected separators and selected seasons
              return (id.indexOf('separator-') === 0 && selectedSeparatorIds && selectedSeparatorIds.indexOf(id) !== -1) || 
                     selectedSeasonIds.indexOf(id) !== -1;
            });
          }
          
          // If current season is not in selected seasons, set to first selected
          if(!exportData.seasons[exportData.current]) {
            exportData.current = selectedSeasonIds[0];
          }
          
          console.log('Preparing export data...');
          
          // Prepare filename first (before heavy processing)
          var filename = 'marvell-pes-club';
          if(selectedSeasonIds.length === 1) {
            var seasonName = state.seasons[selectedSeasonIds[0]].name.replace(/[^a-zA-Z0-9]/g, '-');
            filename += '-' + seasonName;
          } else {
            filename += '-' + selectedSeasonIds.length + 'seasons';
          }
          filename += '.html';
          
          // Show file picker FIRST (before heavy DOM operations)
          // Try File System Access API for Windows Explorer save dialog
          if ('showSaveFilePicker' in window) {
            try {
              // Prepare showSaveFilePicker options
              var saveOptions = {
                suggestedName: filename,
                types: [
                  {
                    description: 'HTML files',
                    accept: {
                      'text/html': ['.html']
                    }
                  }
                ]
              };
              
              // Try to use the last used file location
              var lastFileHandle = window.pesLastExportFileHandle;
              if (lastFileHandle) {
                try {
                  // Use the same file as startIn to open in same directory
                  saveOptions.startIn = lastFileHandle;
                  console.log('Using previously selected export location');
                } catch(e) {
                  console.log('Could not use stored file location:', e.message);
                }
              }
              
              // Show file picker IMMEDIATELY
              window.showSaveFilePicker(saveOptions).then(function(fileHandle) {
                // NOW do the heavy processing after user selects file
                console.log('File location selected, now processing HTML...');
                processAndSaveHTML(fileHandle, exportData);
              }).catch(function(e) {
                if(e.name === 'AbortError') {
                  console.log('File save cancelled by user');
                } else {
                  console.error('File save error:', e);
                  alert('Error saving file: ' + e.message);
                }
              });
              
              return; // Exit early, processing continues in callback
              
            } catch(e) {
              console.error('showSaveFilePicker not supported or error:', e);
              // Fall through to fallback method
            }
          }
          
          // Fallback for browsers without File System Access API
          processAndSaveFallback(exportData, filename);
          
        } catch(e) {
          console.error('Export error:', e);
          alert('Export failed: ' + e.message);
        }
      }
      
      // Separate function to do heavy processing AFTER file picker
      function processAndSaveHTML(fileHandle, exportData) {
        try {
          console.log('Cloning document...');
          // Create a clean copy of the current HTML
          var htmlDoc = document.cloneNode(true);
          
          // Find the EMBEDDED_DATA element in the cloned document
          var emb = htmlDoc.getElementById('EMBEDDED_DATA'); 
          if(emb){ 
            console.log('Updating embedded data...');
            emb.textContent = JSON.stringify(exportData);
          } else {
            console.warn('EMBEDDED_DATA element not found, creating new one');
            var script = htmlDoc.createElement('script');
            script.type = 'application/json';
            script.id = 'EMBEDDED_DATA';
            script.textContent = JSON.stringify(exportData);
            htmlDoc.head.appendChild(script);
          }
          
          // Get the complete HTML from cloned document
          console.log('Generating HTML...');
          var html = htmlDoc.documentElement.outerHTML; 
          console.log('HTML ready, writing to file...');
          
          // Validate that HTML contains our data
          if(html.indexOf('EMBEDDED_DATA') === -1) {
            throw new Error('EMBEDDED_DATA not found in exported HTML');
          }
          
          var blob = new Blob([html], {type:'text/html;charset=utf-8'}); 
          
          // Save using file handle
          fileHandle.createWritable().then(function(writable) {
            return writable.write(blob).then(function() {
              return writable.close();
            });
          }).then(function() {
            console.log('File saved successfully');
            toast('✅ Exported successfully!');
            
            // Store the file handle for reuse (Chrome will remember the directory)
            try {
              if (fileHandle && fileHandle.kind === 'file') {
                // Just storing the handle reference allows Chrome to remember location
                window.pesLastExportFileHandle = fileHandle;
                console.log('✓ File location saved for next export');
              }
            } catch(e) {
              console.log('Could not save file handle:', e.message);
            }
          }).catch(function(err) {
            if (err.name !== 'AbortError') {
              console.error('Error saving file:', err);
              alert('Error saving file: ' + err.message);
            }
          });
          
        } catch(e) {
          console.error('Error processing HTML:', e);
          alert('Export failed: ' + e.message);
        }
      }
      
      // Fallback function for browsers without File System Access API
      function processAndSaveFallback(exportData, filename) {
        try {
          console.log('Using fallback download method');
          
          // Create a clean copy of the current HTML
          var htmlDoc = document.cloneNode(true);
          
          // Find the EMBEDDED_DATA element
          var emb = htmlDoc.getElementById('EMBEDDED_DATA'); 
          if(emb){ 
            emb.textContent = JSON.stringify(exportData);
          } else {
            var script = htmlDoc.createElement('script');
            script.type = 'application/json';
            script.id = 'EMBEDDED_DATA';
            script.textContent = JSON.stringify(exportData);
            htmlDoc.head.appendChild(script);
          }
          
          var html = htmlDoc.documentElement.outerHTML; 
          var blob = new Blob([html], {type:'text/html;charset=utf-8'}); 
          
          var url = URL.createObjectURL(blob); 
          var a = document.createElement('a'); 
          a.href = url; 
          a.download = filename; 
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click(); 
          document.body.removeChild(a);
          
          setTimeout(function(){
            URL.revokeObjectURL(url);
          }, 100);
          
          console.log('File downloaded as:', filename);
          toast('✅ File exported to Downloads folder!');
          
        } catch(e) {
          console.error('Fallback export error:', e);
          alert('Export failed: ' + e.message);
        }
      }
      
      function showRefreshConfirmationDialog() {
        var currentState = getCurrentStateInfo();
        
        var refreshDialog = document.createElement('dialog');
        refreshDialog.style.cssText = 'width: 600px; max-width: 95vw; border: none; border-radius: 12px; padding: 0; background: var(--card); color: var(--text);';
        
        refreshDialog.innerHTML = 
          '<div style="background: linear-gradient(135deg, var(--accent), #2563eb); color: white; padding: 20px; border-radius: 12px 12px 0 0;">' +
            '<h3 style="margin: 0; display: flex; align-items: center; gap: 10px;"><span style="font-size: 24px;">🔄</span>Refresh from File - Admin Mode</h3>' +
          '</div>' +
          '<div style="padding: 24px;">' +
            '<div style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 20px;">' +
              '<h4 style="margin: 0 0 12px 0; color: var(--accent);">📊 Current State Information</h4>' +
              '<div style="font-family: monospace; font-size: 14px; line-height: 1.6;">' +
                '<strong>Total Seasons:</strong> ' + currentState.totalSeasons + '<br>' +
                '<strong>Current Season:</strong> ' + currentState.currentSeason + '<br>' +
                '<strong>Season Mode:</strong> ' + currentState.currentMode + '<br>' +
                '<strong>Teams in Current Season:</strong> ' + currentState.currentTeamCount + '<br>' +
                '<strong>Team Master List:</strong> ' + currentState.masterListCount + ' teams<br>' +
                '<strong>Data Source:</strong> ' + currentState.dataSource + '<br>' +
                '<strong>Last Action:</strong> ' + currentState.lastAction +
              '</div>' +
            '</div>' +
            '<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">' +
              '<h4 style="margin: 0 0 8px 0; color: #d97706;">⚠️ Warning</h4>' +
              '<p style="margin: 0; color: #92400e;">This action will reload all data from the embedded file, potentially overriding any changes made in browser memory. All unsaved progress will be lost.</p>' +
            '</div>' +
            '<div style="text-align: center; margin-top: 24px;">' +
              '<button type="button" id="confirmRefreshBtn" style="padding: 12px 24px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 12px; font-weight: bold;">Confirm Refresh</button>' +
              '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 12px 24px; background: var(--muted); color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>' +
            '</div>' +
          '</div>';
        
        document.body.appendChild(refreshDialog);
        
        // Confirm button functionality
        var confirmBtn = refreshDialog.querySelector('#confirmRefreshBtn');
        confirmBtn.addEventListener('click', function() {
          // Additional confirmation step for admin safety
          var confirmMessage = 'Bạn có chắc chắn muốn Refresh từ file?\n\n' +
                               '⚠️ Hành động này sẽ:\n' +
                               '• Tải lại toàn bộ dữ liệu từ file\n' +
                               '• Ghi đè lên dữ liệu hiện tại trong trình duyệt\n' +
                               '• Xóa tất cả thay đổi chưa được lưu\n\n' +
                               'Tiếp tục?';
                               
          if(confirm(confirmMessage)) {
            refreshDialog.close();
            document.body.removeChild(refreshDialog);
            refreshFromFile();
          }
        });
        
        // Show dialog
        if(typeof refreshDialog.showModal === 'function') { 
          refreshDialog.showModal(); 
        } else { 
          refreshDialog.setAttribute('open', 'open'); 
        }
        
        refreshDialog.addEventListener('close', function() {
          if(document.body.contains(refreshDialog)) {
            document.body.removeChild(refreshDialog);
          }
        });
      }
      
      function getCurrentStateInfo() {
        var currentSeason = activeSeason();
        return {
          totalSeasons: Object.keys(state.seasons).length,
          currentSeason: state.current || 'None',
          currentMode: currentSeason ? currentSeason.mode : 'Unknown',
          currentTeamCount: currentSeason ? currentSeason.teamCount : 0,
          masterListCount: (state.teamMasterList || []).length,
          dataSource: localStorage.getItem('pesData') ? 'Browser Storage + File' : 'File Only',
          lastAction: new Date().toLocaleString()
        };
      }
      
      $('btnResetSeason').addEventListener('click',function(){ if(!ensureAdmin()) return; if(!confirm('Xoá toàn bộ kết quả của mùa hiện tại?')) return; var s=activeSeason(); s.results={}; saveAll(); refreshSeasonUI() });
    }

    function refreshSeasonUI(){
      var s=activeSeason(); if(!s) return;
      
      // For Legend and Ranking modes, skip standings computation
      var isLegendMode = (s.mode === 'legend');
      var isRankingMode = (s.mode === 'ranking');
      
      var curR, prevR, rows, prevRows, prevMap;
      if(!isLegendMode && !isRankingMode) {
        curR = lastRoundWithAnyResult(s);
        prevR = curR - 1;
        rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
        prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
        prevMap = null;
        if (prevRows) {
          prevMap = {};
          prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
        }
      }
      
var sel=$('seasonSel'); sel.innerHTML=''; 
      // Use custom order if available, otherwise sort by creation timestamp
      var seasonIds;
      if (state.seasonOrder && state.seasonOrder.length > 0) {
        // Use custom order
        seasonIds = state.seasonOrder.slice(); // Clone array
        
        // Add any new seasons not in the order (append at end)
        Object.keys(state.seasons).forEach(function(id) {
          if (seasonIds.indexOf(id) === -1 && id.indexOf('separator-') !== 0) {
            seasonIds.push(id);
          }
        });
        
        // Remove deleted seasons from order (keep separators)
        seasonIds = seasonIds.filter(function(id) {
          return id.indexOf('separator-') === 0 || state.seasons[id] != null;
        });
        
        // Update seasonOrder to reflect current state
        state.seasonOrder = seasonIds;
      } else {
        // Default: sort by creation timestamp (newest first)
        seasonIds = Object.keys(state.seasons).sort(function(a, b) {
          var seasonA = state.seasons[a];
          var seasonB = state.seasons[b];
          // For seasons without createdAt (existing seasons), use 0 as fallback
          var timeA = seasonA.createdAt || 0;
          var timeB = seasonB.createdAt || 0;
          return timeB - timeA; // Newest first (descending order)
        });
      }
      
      seasonIds.forEach(function(id){ 
        // Check if this is a separator
        if(id.indexOf('separator-') === 0) {
          var separator = document.createElement('option');
          separator.disabled = true;
          separator.textContent = '──────';
          separator.style.cssText = 'text-align: left; background: transparent; font-size: 8px; padding: 0; margin: 0; height: 6px; line-height: 6px;';
          sel.appendChild(separator);
          return;
        }
        
        var o=document.createElement('option'); 
        o.value=id; 
        o.textContent=state.seasons[id].name; 
        sel.appendChild(o) 
      }); 
      sel.value=state.current;
      var legendText='Top '+(s.settings.top||4)+' (🔵), '+(s.settings.euro||6)+' (🟠)'; if((s.settings.playoff||0)>0){ legendText+=', Playoff ('+(s.settings.playoff||0)+', 🟣)'; } legendText+=', rớt hạng ('+(s.settings.rel||3)+', 🔴)'; $('bandLegend').textContent=legendText;
      // Only auto-generate rounds for league seasons
      if((!s.rounds||!s.rounds.length) && s.mode!=='cup'){ s.rounds=generateFixtures(s.teamCount) }
      
      // Hide/show sections based on season type
      var isCup = (s.mode === 'cup');
      var isDoubleElimination = (s.mode === 'double-elimination');
      var isTournament = (s.mode === 'tournament');
      var isSwiss = (s.mode === 'swiss');
      var isLegend = (s.mode === 'legend');
      var isRanking = (s.mode === 'ranking');
      
      // Toggle round selector UI based on mode
      var tournamentRoundSel = document.querySelectorAll('.tournamentOnly');
      var leagueRoundSel = document.querySelectorAll('.leagueOnly');
      
      if(isTournament) {
        // Show tournament-style select dropdown, hide league checkboxes
        tournamentRoundSel.forEach(function(el) { el.style.display = ''; });
        leagueRoundSel.forEach(function(el) { el.style.display = 'none'; });
      } else if(isCup || isDoubleElimination || isSwiss || isLegend || isRanking) {
        // Hide both for cup, double-elimination, swiss, legend, and ranking modes
        tournamentRoundSel.forEach(function(el) { el.style.display = 'none'; });
        leagueRoundSel.forEach(function(el) { el.style.display = 'none'; });
      } else {
        // Show league-style checkboxes, hide tournament select
        tournamentRoundSel.forEach(function(el) { el.style.display = 'none'; });
        leagueRoundSel.forEach(function(el) { el.style.display = ''; });
        // Make sure toggle button is visible in league mode
        var toggleBtn = document.getElementById('roundSelToggle');
        if(toggleBtn) toggleBtn.style.display = '';
      }
      
      var fixturesSection = document.querySelector('.row .card.sm'); // Fixtures section
      var chartsSection = document.querySelectorAll('.row')[1]; // Charts section  
      var statsSection = document.querySelectorAll('.row')[2]; // Stats section
      
      // Find the stats row by looking for the simulation table or season stats
      var statsRow = null;
      var allRows = document.querySelectorAll('.row');
      for(var i = 0; i < allRows.length; i++) {
        if(allRows[i].querySelector('#simTable') || allRows[i].querySelector('#seasonStats')) {
          statsRow = allRows[i];
          break;
        }
      }
      
      // More reliable selectors for stats elements
      var simSection = null;
      var seasonStatsSection = null; 
      var insightsSection = null;
      
      try {
        var simTable = document.getElementById('simTable');
        if(simTable) simSection = simTable.closest('.card');
        
        var seasonStats = document.getElementById('seasonStats');
        if(seasonStats) seasonStatsSection = seasonStats.closest('.card');
        
        var insights = document.getElementById('insights');
        if(insights) insightsSection = insights.closest('.card');
      } catch(e) {
        console.error('Error finding stats sections:', e);
      }
      
      if(isCup || isDoubleElimination || isSwiss || isLegend || isRanking){
        // For Cup, Double Elimination, Swiss: show standings but hide other sections
        // For Legend and Ranking: hide standings too
        var standingsSection = document.querySelector('main.container section.card.grow');
        if(standingsSection) {
          if(isLegend || isRanking) {
            standingsSection.style.display = 'none';
          } else {
            standingsSection.style.display = ''; // Show for Cup/Swiss/Double Elimination
          }
        }
        
        // Remove legend container if it exists (for non-Legend modes)
        if(!isLegend) {
          var legendContainer = document.getElementById('legendContainer');
          if(legendContainer) legendContainer.remove();
        }
        
        // Remove ranking container if it exists (for non-Ranking modes)
        if(!isRanking) {
          var rankingModeContainer = document.getElementById('rankingModeContainer');
          if(rankingModeContainer) rankingModeContainer.remove();
        }
        
        if(fixturesSection) fixturesSection.style.display = 'none';
        if(chartsSection) chartsSection.style.display = 'none';
        if(statsSection) statsSection.style.display = 'none';
        if(statsRow) statsRow.style.display = 'none';
        if(simSection) simSection.style.display = 'none';
        if(seasonStatsSection) seasonStatsSection.style.display = 'none';
        if(insightsSection) insightsSection.style.display = 'none';
      } else if(isTournament) {
        // For tournament: show fixtures but hide charts and stats sections
        
        // Remove legend container if it exists
        var legendContainer = document.getElementById('legendContainer');
        if(legendContainer) legendContainer.remove();
        
        // Remove ranking container if it exists
        var rankingModeContainer = document.getElementById('rankingModeContainer');
        if(rankingModeContainer) rankingModeContainer.remove();
        
        if(fixturesSection) fixturesSection.style.display = '';
        if(chartsSection) chartsSection.style.display = 'none';
        if(statsSection) statsSection.style.display = 'none';
        if(statsRow) statsRow.style.display = 'none';
        if(simSection) simSection.style.display = 'none';
        if(seasonStatsSection) seasonStatsSection.style.display = 'none';
        if(insightsSection) insightsSection.style.display = 'none';
        
        // Hide tournament groups container from League mode
        var tournamentGroups = document.getElementById('tournamentGroups');
        if(tournamentGroups) tournamentGroups.remove();
      } else {
        // Show all sections for league
        console.log('Showing league sections...');
        
        // Remove legend container if it exists
        var legendContainer = document.getElementById('legendContainer');
        if(legendContainer) legendContainer.remove();
        
        // Remove ranking container if it exists
        var rankingModeContainer = document.getElementById('rankingModeContainer');
        if(rankingModeContainer) rankingModeContainer.remove();
        
        // Show standings section that Legend mode hides - use specific selector
        var standingsSection = document.querySelector('main.container section.card.grow');
        if(standingsSection) standingsSection.style.display = '';
        
        // Show round selector
        var roundSelDiv = document.querySelector('.round-selector');
        if(roundSelDiv) roundSelDiv.style.display = '';
        
        if(fixturesSection) fixturesSection.style.display = '';
        if(chartsSection) chartsSection.style.display = '';
        if(statsSection) statsSection.style.display = '';
        if(statsRow) {
          statsRow.style.display = '';
          console.log('Showing stats row');
        }
        if(simSection) {
          simSection.style.display = '';
          console.log('Showing sim section');
        }
        if(seasonStatsSection) {
          seasonStatsSection.style.display = '';
          console.log('Showing season stats section');
        }
        if(insightsSection) {
          insightsSection.style.display = '';
          console.log('Showing insights section');
        }
        
        // Hide tournament groups container from League mode
        var tournamentGroups = document.getElementById('tournamentGroups');
        if(tournamentGroups) tournamentGroups.remove();
      }
      
      // Update table headers for tournament mode
      var standingsHeader = document.querySelector('#standings').parentNode.querySelector('thead tr');
      if(isTournament && standingsHeader) {
        // Add Stage column at the end for tournament mode
        standingsHeader.innerHTML = `
          <th class="pos">#</th>
          <th>Đội</th>
          <th>P</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
          <th>Form</th>
          <th>Trend</th><th>Δ</th>
          <th>Stage</th>
        `;
      } else if(standingsHeader) {
        // Regular league headers (without Stage)
        standingsHeader.innerHTML = `
          <th class="pos">#</th>
          <th>Đội</th>
          <th>P</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
          <th>Form</th>
          <th>Trend</th><th>Δ</th>
        `;
      }
      
      // Only render standings and fixtures for non-legend/non-ranking modes
      if(!isLegend && !isRanking) {
        renderStandings(); renderFixturesWithRound(); 
      }
      
      // Render insights, stats, and tracker for league mode only (not tournament, cup, legend, or ranking)
      if(!isTournament && !isCup && !isLegend && !isRanking) {
        console.log('Rendering league mode content...');
        renderInsights(); 
        renderSeasonStats(); 
        renderStandingTracker();
        
        // Force show and populate the simulation table as well
        var simTable = document.getElementById('simTable');
        if(simTable && simTable.innerHTML.trim() === '') {
          console.log('Clearing and preparing simulation table');
          simTable.innerHTML = '';
        }
      } else {
        // Clear content for non-league modes
        var insights = document.getElementById('insights');
        var seasonStats = document.getElementById('seasonStats');
        var simTable = document.getElementById('simTable');
        
        if(insights) insights.innerHTML = '';
        if(seasonStats) seasonStats.innerHTML = '';
        if(simTable) simTable.innerHTML = '';
      }
      // Show bracket for CUP, DOUBLE-ELIMINATION, TOURNAMENT and SWISS seasons
      var s = activeSeason();
      var cupWrap = document.getElementById('cupBracketWrap'), cupHost = document.getElementById('cupBracket');
      var deWrap = document.getElementById('doubleEliminationWrap'), deHost = document.getElementById('doubleEliminationBracket');
      
      // Hide all brackets first
      if(cupWrap) cupWrap.classList.add('hidden');
      if(deWrap) deWrap.classList.add('hidden');
      
      if(s && s.mode==='cup' && s.cup && cupWrap && cupHost){
        cupWrap.classList.remove('hidden');
        cupHost.innerHTML = '';
        renderCupBracket(s);
      } else if(s && s.mode==='double-elimination' && s.doubleElimination && deWrap && deHost){
        deWrap.classList.remove('hidden');
        deHost.innerHTML = '';
        renderDoubleEliminationBracket(s);
      } else if(s && s.mode==='swiss' && s.swiss && cupWrap && cupHost) {
        cupWrap.classList.remove('hidden');
        cupHost.innerHTML = '';
        renderSwissBracket(s);
      } else if(s && s.mode==='tournament' && cupWrap && cupHost) {
        if(s.knockoutBracket) {
          // Show tournament knockout bracket
          cupWrap.classList.remove('hidden');
          cupHost.innerHTML = '';
          renderTournamentKnockoutBracket(s);
        } else {
          // Show message that knockout will be available after group stage
          cupWrap.classList.remove('hidden');
          cupHost.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted); border: 1px dashed var(--border); border-radius: 6px; background: var(--card);">⏳ Complete all group stage matches to unlock knockout bracket</div>';
        }
      } else if(s && s.mode==='legend') {
        // Render Legend mode
        renderLegendMode(s);
      }
      showAdmin(isAdmin());
      applyTheme();
    }
    
    function ensureInitial(){ if(!state.current){ state.current=Object.keys(state.seasons)[0] } var s=activeSeason(); if(s && (!s.rounds||!s.rounds.length)){ s.rounds=generateFixtures(s.teamCount) } saveAll() }

    function init(){ 
      loadAll().then(function() {
        ensureInitial(); 
        refreshAll(); 
        attachFilterListeners(); 
        initEvents();
        wireCloudConfigDialog();

        // Auto-scan logos/ folder and merge into Logo Master List.
        // Use cached result first for instant UI, then refresh in background.
        try {
          LogoScanner.run(true).then(function(n) {
            console.log('LogoScanner (cached) merged', n, 'logos from logos/');
            // Background refresh to pick up newly pushed files
            LogoScanner.run(false).then(function(n2) {
              if(n2 !== n) {
                console.log('LogoScanner (live) merged', n2, 'logos from logos/');
              }
            });
          });
        } catch(e) {
          console.warn('LogoScanner failed to start:', e);
        }

        // Check for auto-refresh after F5
        try {
          var shouldAutoRefresh = sessionStorage.getItem('pesAutoRefresh');
          var wasAdmin = sessionStorage.getItem('pesAutoRefreshAdmin');
          
          if(shouldAutoRefresh === 'true') {
            sessionStorage.removeItem('pesAutoRefresh');
            sessionStorage.removeItem('pesAutoRefreshAdmin');
            setTimeout(function() {
              if(wasAdmin === 'true') {
                if(typeof showRefreshConfirmationDialog === 'function') {
                  showRefreshConfirmationDialog();
                } else {
                  refreshFromFile();
                }
              } else {
                refreshFromFile();
              }
            }, 500);
          }
        } catch(e) {
          console.log('Auto-refresh check failed:', e);
        }
      });
    }

    function wireCloudConfigDialog() {
      var btn = $('btnCloudConfig');
      var dialog = $('cloudConfigDialog');
      if(!btn || !dialog) return;
      var patInput = $('cloudPatInput');
      var saveBtn = $('cloudSaveBtn');
      var clearBtn = $('cloudClearBtn');
      var pushNowBtn = $('cloudPushNowBtn');

      btn.addEventListener('click', function() {
        if(!isAdmin()) { toast('Chỉ admin được phép cấu hình cloud'); return; }
        patInput.value = CloudSync.pat || '';
        if(typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });

      saveBtn.addEventListener('click', function(e) {
        var val = patInput.value.trim();
        CloudSync.setPAT(val);
        if(val) {
          toast('Đã lưu PAT. Đang đồng bộ...');
          CloudSync.load().then(function(cloudData) {
            if(cloudData && cloudData.seasons) {
              // Merge or replace? For now: ask
              if(confirm('Đã tìm thấy data trên cloud. Thay thế dữ liệu local hiện tại bằng dữ liệu cloud?')) {
                state = cloudData;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_){}
                refreshAll();
              }
            } else {
              // No cloud data yet — push current state if sync is enabled
              if(CloudSync.isEnabled()) {
                CloudSync.pushNow(state);
              } else {
                CloudSync.updateUI();
              }
            }
          });
        } else {
          toast('Đã xóa PAT (chế độ chỉ local)');
        }
      });

      clearBtn.addEventListener('click', function() {
        if(confirm('Xóa PAT khỏi trình duyệt? Bạn sẽ không sync lên cloud được nữa cho tới khi nhập lại.')) {
          CloudSync.setPAT(null);
          patInput.value = '';
          toast('Đã xóa PAT');
        }
      });

      pushNowBtn.addEventListener('click', function() {
        var val = patInput.value.trim();
        if(val && val !== CloudSync.pat) CloudSync.setPAT(val);
        if(!CloudSync.hasPAT()) { toast('Cần nhập PAT trước'); return; }
        if(!CloudSync.isEnabled()) { toast('Đang tắt sync. Bật Sync: ON để push.'); return; }
        toast('Đang push lên GitHub...');
        CloudSync.pushNow(state).then(function(ok) {
          if(ok) toast('✅ Push thành công');
          else toast('❌ Push thất bại - xem console');
        });
      });
    }

    // Initialize global variable for export directory persistence
    window.pesLastExportDirHandle = null;

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  })();
