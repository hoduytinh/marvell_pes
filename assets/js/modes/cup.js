// Marvell PES Club - modes/cup.js (split from app.js; shared global scope, load order set in index.html)
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

// Render horizontal CUP bracket with simple column layout
function renderCupBracket(s, customHost){
  var host = customHost || document.getElementById('cupBracket');
  if(!host || !s.cup) return;
  
  var rerenderCup = function() { renderCupBracket(s, customHost); };
  var listHost = prepareBracketHost(host, 'cup-bracket-container', rerenderCup);
  if(!listHost) {
    renderKnockoutTree(host, s, {
      rounds: s.cup.rounds,
      names: s.cup.stageNames,
      keyFor: function(r, m) { return 'cup-' + r + '-' + m; },
      mapIdx: function(n) { return n; },
      label: function(ref) { return getTeamNameForMatch(s, ref); },
      code: function(r, m) { return (r + 1) + '-' + (m + 1); },
      rerender: rerenderCup
    });
    return;
  }
  host = listHost;
  
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
    
    var medal = r.status==='Vô địch'?' 🏆':r.status==='Á quân'?' 🥈':r.status==='Hạng 3'?' 🥉':'';
    tr.innerHTML='<td class="pos">'+(idx+1)+'</td>'+
        '<td class="team">'+badge+escapeHtml(r.team)+medal+'</td>'+
        '<td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.D+'</td><td>'+r.L+'</td>'+
        '<td>'+r.GF+'</td><td>'+r.GA+'</td><td>'+(r.GF-r.GA>=0?'+':'')+(r.GF-r.GA)+'</td>'+
        '<td><strong>'+r.Pts+'</strong></td>'+
        '<td style="color:'+statusColor+';text-align:left;padding-left:8px;font-weight:'+(r.status === 'Vô địch' || r.status === 'Á quân' || r.status === 'Hạng 3' ? 'bold' : 'normal')+'">'+statusDisplay+'</td>';
    tbody.appendChild(tr);
  });
}

    // Get team name for match (handles placeholder objects)
    function getTeamNameForMatch(s, teamRef) {
      if(typeof teamRef === 'number') {
        return s.teams[teamRef] || 'Unknown Team';
      } else if(teamRef && typeof teamRef === 'object') {
        if(teamRef.fromRound !== undefined && teamRef.matchId !== undefined) {
          return (teamRef.isLoser ? 'Loser of R' : 'Winner of R') + (teamRef.fromRound + 1) + 'M' + (teamRef.matchId + 1);
        } else if(teamRef.group && teamRef.position !== undefined) {
          return 'Group ' + teamRef.group + ' #' + (teamRef.position + 1);
        }
      }
      return 'TBD';
    }
