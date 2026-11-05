// Marvell PES Club - modes/swiss.js (split from app.js; shared global scope, load order set in index.html)
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
    if(isAdmin() && !round.isPrePlayoff && s.settings && s.settings.enableRegen !== false) {
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

    // Admin-only: Regenerate the knock-out bracket from current Swiss standings
    if(isAdmin() && s.settings && s.settings.enableRegen !== false) {
      var playoffRegenBtn = document.createElement('button');
      playoffRegenBtn.textContent = '🔄 Regenerate';
      playoffRegenBtn.title = 'Tạo lại nhánh knock-out theo thứ hạng Swiss hiện tại (sẽ xóa toàn bộ kết quả vòng knock-out)';
      playoffRegenBtn.style.cssText = 'display: block; margin: 0 auto 16px auto; padding: 4px 10px; font-size: 11px; border: 1px solid #FFD700; border-radius: 4px; background: var(--card); color: var(--text); cursor: pointer; font-weight: 600; transition: all 0.2s;';
      playoffRegenBtn.addEventListener('mouseenter', function() {
        this.style.background = '#FFD700';
        this.style.color = '#000';
      });
      playoffRegenBtn.addEventListener('mouseleave', function() {
        this.style.background = 'var(--card)';
        this.style.color = 'var(--text)';
      });
      playoffRegenBtn.addEventListener('click', function() {
        if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
        var msg = 'Tạo lại nhánh knock-out theo thứ hạng Swiss hiện tại?\n\n' +
                 'Lưu ý: TẤT CẢ kết quả của vòng knock-out sẽ bị xóa.';
        if(!confirm(msg)) return;
        regenerateSwissPlayoffs(s);
        saveAll();
      });
      playoffContainer.appendChild(playoffRegenBtn);
    }

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
  
  var qualifiers = s.swiss.playoffQualifiers || [];
  
  var rerenderSwiss = function() { renderSwissBracket(s); };
  var listContainer = prepareBracketHost(container, 'cup-bracket-container', rerenderSwiss);
  if(!listContainer) {
    renderKnockoutTree(container, s, {
      rounds: playoffBracket.rounds,
      names: playoffBracket.stageNames || [],
      keyFor: function(r, m) { return 'swiss-playoff-' + r + '-' + m; },
      mapIdx: function(n) { return qualifiers[n] != null ? qualifiers[n] : null; },
      label: function(ref) { return (ref && typeof ref === 'object') ? getTeamNameForMatch(s, ref) : 'TBD'; },
      code: function(r, m) { return (r + 1) + '-' + (m + 1); },
      rerender: rerenderSwiss
    });
    return;
  }
  container = listContainer;
  
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
function generateSwissPlayoffs(s, randomize) {
  if(!s.swiss || s.swiss.playoffBracket) return;
  
  var swiss = s.swiss;
  var qualifiedTeams = swiss.qualified || [];
  
  // If not enough teams qualified yet, return
  if(qualifiedTeams.length < swiss.teamsToAdvance) return;
  
  // Calculate final records for sorting
  var teamRecords = qualifiedTeams.map(function(teamIdx) {
    var record = { idx: teamIdx, wins: 0, losses: 0, gf: 0, ga: 0 };
    
    swiss.rounds.forEach(function(round, r) {
      // Pre-Swiss playoff is only a qualifier gate and must not affect Swiss seeding
      if(!round.matches || round.isPrePlayoff) return;
      
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
  
  // Sort qualified teams by Swiss strength:
  // 1) higher wins, 2) fewer losses (3-0 above 3-1 above 3-2), 3) GD, 4) GF
  teamRecords.sort(function(a, b) {
    if(a.wins !== b.wins) return b.wins - a.wins;
    if(a.losses !== b.losses) return a.losses - b.losses;
    var gdA = a.gf - a.ga;
    var gdB = b.gf - b.ga;
    if(gdA !== gdB) return gdB - gdA;
    return b.gf - a.gf;
  });

  // When regenerating, shuffle teams that share the SAME record (wins+losses)
  // so each draw differs while keeping seeding constraints intact
  // (3-0 tier above 3-2 tier, top seeds on opposite bracket halves).
  if(randomize) {
    var g = 0;
    while(g < teamRecords.length) {
      var h = g + 1;
      while(h < teamRecords.length &&
            teamRecords[h].wins === teamRecords[g].wins &&
            teamRecords[h].losses === teamRecords[g].losses) h++;
      for(var k = h - 1; k > g; k--) {
        var rnd = g + Math.floor(Math.random() * (k - g + 1));
        var tmp = teamRecords[k];
        teamRecords[k] = teamRecords[rnd];
        teamRecords[rnd] = tmp;
      }
      g = h;
    }
  }

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

// Regenerate the knock-out (playoff) bracket from current Swiss standings
function regenerateSwissPlayoffs(s) {
  if(!s.swiss) return;
  var swiss = s.swiss;

  // Clear any existing knock-out results
  if(swiss.playoffBracket && swiss.playoffBracket.rounds) {
    swiss.playoffBracket.rounds.forEach(function(pRound, pRoundIdx) {
      if(pRound) {
        pRound.forEach(function(match, matchIdx) {
          delete s.results['playoff-' + pRoundIdx + '-' + matchIdx];
          delete s.results['swiss-playoff-' + pRoundIdx + '-' + matchIdx];
        });
      }
    });
  }

  // Reset bracket so generateSwissPlayoffs can rebuild it from scratch
  swiss.playoffBracket = null;
  swiss.playoffQualifiers = null;
  swiss.phase = 'swiss';

  // Rebuild knock-out bracket using current Swiss seeding (randomized draw)
  generateSwissPlayoffs(s, true);

  renderSwissBracket(s);
  renderSwissStandings(s);
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
    var playoffBracket = s.swiss.playoffBracket;

    function normalizeStageLabel(stageName) {
      if(stageName === 'Final' || stageName === 'Chung kết') return 'Final';
      if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') return '3rd Place Match';
      if(stageName === 'Semi-finals' || stageName === 'Bán kết') return 'Semi-finals';
      if(stageName === 'Quarter-finals' || stageName === 'Tứ kết') return 'Quarter-finals';
      return stageName || 'Knockout';
    }

    // Find where winner/loser of a specific match goes in later rounds.
    function resolveNextPlayoffStages(fromRoundIdx, fromMatchIdx) {
      var winnerStage = null;
      var loserStage = null;

      for(var nr = fromRoundIdx + 1; nr < playoffBracket.rounds.length; nr++) {
        var nextRound = playoffBracket.rounds[nr];
        var nextStage = normalizeStageLabel(playoffBracket.stageNames[nr]);
        for(var nm = 0; nm < nextRound.length; nm++) {
          var nextMatch = nextRound[nm];
          var refs = [nextMatch.home, nextMatch.away];
          for(var ri = 0; ri < refs.length; ri++) {
            var ref = refs[ri];
            if(!ref || typeof ref !== 'object') continue;
            if(ref.fromRound === fromRoundIdx && ref.matchId === fromMatchIdx) {
              if(ref.isLoser === true) loserStage = nextStage;
              else winnerStage = nextStage;
            }
          }
        }
      }

      return {
        winnerStage: winnerStage,
        loserStage: loserStage
      };
    }
    
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
          
          var stageName = normalizeStageLabel(playoffBracket.stageNames[roundIdx]);
          var nextStages = resolveNextPlayoffStages(roundIdx, matchIdx);
          
          if(result.hg > result.ag) {
            home.W++; home.Pts += 3;
            away.L++;
            // Winner advances to next stage, loser stays at current stage
            if(stageName === 'Final') {
              home.playoffStage = 'Winner';
              away.playoffStage = 'Runner-up';
            } else if(stageName === '3rd Place Match') {
              home.playoffStage = '3rd Place';
              away.playoffStage = '4th Place';
            } else {
              // Respect actual bracket routing (winner to final, loser to 3rd-place when configured).
              home.playoffStage = nextStages.winnerStage || stageName;
              away.playoffStage = nextStages.loserStage || stageName;
            }
          } else if(result.ag > result.hg) {
            away.W++; away.Pts += 3;
            home.L++;
            // Winner advances to next stage, loser stays at current stage
            if(stageName === 'Final') {
              away.playoffStage = 'Winner';
              home.playoffStage = 'Runner-up';
            } else if(stageName === '3rd Place Match') {
              away.playoffStage = '3rd Place';
              home.playoffStage = '4th Place';
            } else {
              // Respect actual bracket routing (winner to final, loser to 3rd-place when configured).
              away.playoffStage = nextStages.winnerStage || stageName;
              home.playoffStage = nextStages.loserStage || stageName;
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
    var stageOrder = ['Winner', 'Runner-up', '3rd Place', '4th Place', 'Final', '3rd Place Match', 'Semi-finals', 'Quarter-finals'];
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
    var medal = row.playoffStage==='Winner'?' 🏆':row.playoffStage==='Runner-up'?' 🥈':row.playoffStage==='3rd Place'?' 🥉':'';
    
    tr.innerHTML = '<td' + rowStyle + '>' + (pos + 1) + '</td>' +
                  '<td' + rowStyle + ' class="team">' + badge + escapeHtml(row.team) + medal + '</td>' +
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
