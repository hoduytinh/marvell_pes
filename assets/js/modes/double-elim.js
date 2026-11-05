// Marvell PES Club - modes/double-elim.js (split from app.js; shared global scope, load order set in index.html)
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
  
  var losersBuilt = deBuildLosersBracket(winnersRounds);
  losersRounds = losersBuilt.losersRounds;
  losersNames = losersBuilt.losersNames;
  
  return {
    seeds: ids,
    playoffRound: playoffRound,
    playoffName: playoffName,
    winnersRounds: winnersRounds,
    winnersNames: winnersNames,
    losersRounds: losersRounds,
    losersNames: losersNames,
    grandFinals: losersBuilt.grandFinals,
    bracketVersion: DE_BRACKET_VERSION
  };
}

// Builds the Losers Bracket (+ Grand Final match) pairing from an EXISTING
// Winners Bracket structure. Extracted so it can be re-run standalone (by
// checkAndFixDoubleEliminationBracket) to self-heal a stale losers-bracket
// pairing algorithm WITHOUT touching/discarding the Winners Bracket — which
// may contain admin-customized Round-1 pairings.
function deBuildLosersBracket(winnersRounds) {
  var numWinnerRounds = winnersRounds.length;
  var numLoserRounds = 2 * numWinnerRounds - 1;
  var losersRounds = [];
  var losersNames = [];
  var loserRoundIdx = 0;
  
  // First round of losers: losers from WB Round 1.
  // Any two WB Round-1 losers come from DIFFERENT R1 matches, so pairing them
  // adjacently (loser(m0) vs loser(m1), loser(m2) vs loser(m3), ...) can never
  // itself be a rematch — none of these teams have played each other yet.
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
      // Odd rounds: previous LB winners play against new losers from WB.
      // IMPORTANT: LB round (loserRoundIdx-1) match m and WB round
      // wbRoundToLose match m are built from the EXACT SAME "family" of
      // original bracket slots (e.g. LB Round-1 match 0 = losers of WB R1
      // matches 0&1, and WB Round-2 match 0 = winners of those SAME WB R1
      // matches 0&1). Pairing them at the same index m would very likely put
      // a team back against someone it already faced (the "cùng nhánh"
      // rematch the user reported: WB R2 loser landing on the exact LB
      // survivor from its own bracket half). So we pair LB match m against
      // WB match (m XOR 1) instead — i.e. swap within adjacent pairs
      // (0<->1, 2<->3, ...) — which always crosses to a DIFFERENT, so-far
      // untouched family. Falls back to same-index when the WB round has an
      // odd/1 match count (e.g. the WB Final's lone loser) since there is no
      // other match to cross with at that point.
      var wbRoundToLose = Math.floor(lr / 2) + 1;
      if(wbRoundToLose < winnersRounds.length) {
        var numMatches = Math.max(
          losersRounds[loserRoundIdx - 1] ? losersRounds[loserRoundIdx - 1].length : 0,
          winnersRounds[wbRoundToLose] ? winnersRounds[wbRoundToLose].length : 0
        );
        var wbMatchCount = winnersRounds[wbRoundToLose] ? winnersRounds[wbRoundToLose].length : 0;
        var canCross = wbMatchCount >= 2 && wbMatchCount % 2 === 0;
        
        for(var m = 0; m < numMatches; m++) {
          var wbMatchId = canCross ? (m % 2 === 0 ? m + 1 : m - 1) : m;
          loserRound.push({
            home: {fromRound: loserRoundIdx - 1, matchId: m, bracket: 'losers'},
            away: {fromRound: wbRoundToLose, matchId: wbMatchId, bracket: 'winners', position: 'loser'},
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
  
  return { losersRounds: losersRounds, losersNames: losersNames, grandFinals: grandFinals };
}

// Bump when buildDoubleEliminationBracket's PAIRING LOGIC changes (not when
// only display/labels change), so checkAndFixDoubleEliminationBracket can
// self-heal brackets generated by an older, buggy version — but ONLY when
// safe to do so (see that function).
var DE_BRACKET_VERSION = 2; // v2: LB round pairing crosses WB-round "families" (fixes same-branch rematches beyond LB Round 1)

// Self-heal a double-elimination bracket that was generated by an older,
// buggy pairing algorithm. Mirrors checkAndGenerateKnockout's pattern: only
// regenerate when it's provably safe — i.e. no Losers Bracket or Grand Final
// match has a recorded result yet. Rebuilds ONLY losersRounds/losersNames/
// grandFinals via deBuildLosersBracket(de.winnersRounds) — the EXISTING
// Winners Bracket (which may contain admin-customized Round-1 pairings) is
// left completely untouched, so no WB result or manual pairing is lost.
function checkAndFixDoubleEliminationBracket(s) {
  if(s.mode !== 'double-elimination' || !s.doubleElimination) return;
  var de = s.doubleElimination;
  if(de.bracketVersion === DE_BRACKET_VERSION) return;
  
  var hasLbOrFinalResult = false;
  if(de.losersRounds) {
    for(var r = 0; r < de.losersRounds.length && !hasLbOrFinalResult; r++) {
      for(var m = 0; m < de.losersRounds[r].length; m++) {
        if(s.results['de-losers-' + r + '-' + m]) { hasLbOrFinalResult = true; break; }
      }
    }
  }
  if(!hasLbOrFinalResult && s.results['de-grand-final-0']) hasLbOrFinalResult = true;
  
  if(hasLbOrFinalResult) { de.bracketVersion = DE_BRACKET_VERSION; saveAll(); return; } // not safe to re-pair — just mark as seen so we stop checking every render
  
  var rebuilt = deBuildLosersBracket(de.winnersRounds);
  de.losersRounds = rebuilt.losersRounds;
  de.losersNames = rebuilt.losersNames;
  de.grandFinals = rebuilt.grandFinals;
  de.bracketVersion = DE_BRACKET_VERSION;
  saveAll();
}

// Render Double Elimination bracket with winners and losers brackets
function renderDoubleEliminationBracket(s){
  var host = document.getElementById('doubleEliminationBracket');
  if(!host || !s.doubleElimination) return;
  
  // Self-heal #1: upgrade a losers-bracket built by an older, buggy pairing
  // version (only when no LB/Grand-Final result exists yet — safe to re-pair).
  checkAndFixDoubleEliminationBracket(s);
  
  // Self-heal #2: if any losers-bracket round's pairing has become a rematch of
  // an already-played match (can happen because LB slot assignment depends on
  // WHO wins earlier rounds, which isn't known until results come in), try to
  // permute that round's pairings to avoid it, before rendering.
  deAutoAvoidRematches(s);
  
  host.innerHTML = '';
  
  renderBracketViewToggle(host, function() { renderDoubleEliminationBracket(s); });
  if(getBracketView() === 'tree') {
    renderDoubleEliminationTree(s, host);
    return;
  }
  
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
          
          // Manual pairing adjustment (round > 0 only; Round 1 already has team dropdowns)
          var canManualSwap = isAdmin() && roundIdx > 0 && match.bracket !== 'grand-final' && round.length > 1 && !s.results[key];
          if(canManualSwap && homeIdx != null) {
            var swapHomeBtn = document.createElement('button');
            swapHomeBtn.type = 'button';
            swapHomeBtn.textContent = '🔀';
            swapHomeBtn.title = 'Đổi cặp đấu thủ công';
            swapHomeBtn.style.cssText = 'width:18px;height:18px;padding:0;margin-left:2px;border:1px solid var(--border);border-radius:3px;background:var(--card);color:var(--text);cursor:pointer;font-size:10px;line-height:1;flex:none;';
            swapHomeBtn.addEventListener('click', function(e){
              e.preventDefault();
              openDeSwapDialog(s, match.bracket, roundIdx, matchIdx, 'home', round);
            });
            homeSection.appendChild(swapHomeBtn);
          }
          
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
          if(canManualSwap && awayIdx != null) {
            var swapAwayBtn = document.createElement('button');
            swapAwayBtn.type = 'button';
            swapAwayBtn.textContent = '🔀';
            swapAwayBtn.title = 'Đổi cặp đấu thủ công';
            swapAwayBtn.style.cssText = 'width:18px;height:18px;padding:0;margin-right:2px;border:1px solid var(--border);border-radius:3px;background:var(--card);color:var(--text);cursor:pointer;font-size:10px;line-height:1;flex:none;';
            swapAwayBtn.addEventListener('click', function(e){
              e.preventDefault();
              openDeSwapDialog(s, match.bracket, roundIdx, matchIdx, 'away', round);
            });
            awaySection.appendChild(swapAwayBtn);
          }
          awaySection.appendChild(awayTeamDisplay);
          awaySection.appendChild(awayLogo);
          
          matchRow.appendChild(homeSection);
          matchRow.appendChild(scoresSection);
          matchRow.appendChild(awaySection);
          el.appendChild(matchRow);
          
          // Rematch warning: flag if these two teams have already faced each other
          // (Grand Final is exempt - a rematch there is expected/allowed)
          if(match.bracket !== 'grand-final' && !s.results[key] && homeIdx != null && awayIdx != null) {
            if(deHasPlayedBefore(s, homeIdx, awayIdx, match.bracket, roundIdx, matchIdx)) {
              var rematchWarn = document.createElement('div');
              rematchWarn.textContent = '⚠️ Hai đội đã từng gặp nhau trước đó';
              rematchWarn.style.cssText = 'text-align:center; color:#e74c3c; font-size:11px; padding:2px 4px 4px;';
              el.appendChild(rematchWarn);
            }
          }
          
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

// Build a set of "已played" pairs (team indices) from ALL completed double-elimination
// matches (playoff + winners + losers), so we can detect if two teams already met.
// Grand Final is intentionally EXCLUDED: two teams ARE allowed to meet again there.
// Pass excludeBracket/excludeRoundIdx/excludeMatchIdx to skip a specific slot (e.g. the
// match currently being checked/edited) so it doesn't count against itself.
function deGetPlayedPairs(s, excludeBracket, excludeRoundIdx, excludeMatchIdx) {
  var pairs = {};
  var de = s.doubleElimination;
  if(!de) return pairs;
  function scan(rounds, bracketName) {
    if(!rounds) return;
    rounds.forEach(function(round, rIdx) {
      round.forEach(function(m, mIdx) {
        if(bracketName === excludeBracket && rIdx === excludeRoundIdx && mIdx === excludeMatchIdx) return;
        var key = 'de-' + bracketName + '-' + rIdx + '-' + mIdx;
        var res = s.results[key];
        if(!res || res.hg == null || res.ag == null) return;
        var h = resolveDoubleEliminationTeam(s, m.home);
        var a = resolveDoubleEliminationTeam(s, m.away);
        if(h == null || a == null) return;
        pairs[Math.min(h, a) + '-' + Math.max(h, a)] = true;
      });
    });
  }
  if(de.playoffRound) scan([de.playoffRound], 'playoff');
  scan(de.winnersRounds, 'winners');
  scan(de.losersRounds, 'losers');
  return pairs;
}

// Returns true if teamA and teamB have already faced each other in a previous
// (non grand-final) double-elimination match.
function deHasPlayedBefore(s, teamA, teamB, excludeBracket, excludeRoundIdx, excludeMatchIdx) {
  if(teamA == null || teamB == null || teamA === teamB) return false;
  var pairs = deGetPlayedPairs(s, excludeBracket, excludeRoundIdx, excludeMatchIdx);
  return !!pairs[Math.min(teamA, teamB) + '-' + Math.max(teamA, teamB)];
}

// Given two equal-length arrays of resolved team indices (leftIdxs paired by
// position with rightIdxs), find a permutation of rightIdxs such that NO pair
// (leftIdxs[i], rightIdxs[perm[i]]) has played before. Prefers keeping each
// item in its original slot (tries identity mapping first) to minimize
// unnecessary churn. Returns an array of indices into rightIdxs (the new
// order), or null if no fully rematch-free assignment exists.
function deFindNoRematchAssignment(s, leftIdxs, rightIdxs) {
  var n = leftIdxs.length;
  var usedRight = new Array(n).fill(false);
  var assignment = new Array(n).fill(-1);
  function candidateOrder(i) {
    // Try original slot i first, then the rest in order
    var order = [i];
    for(var j = 0; j < n; j++) { if(j !== i) order.push(j); }
    return order;
  }
  function backtrack(i) {
    if(i === n) return true;
    var order = candidateOrder(i);
    for(var k = 0; k < order.length; k++) {
      var j = order[k];
      if(usedRight[j]) continue;
      if(deHasPlayedBefore(s, leftIdxs[i], rightIdxs[j])) continue;
      usedRight[j] = true;
      assignment[i] = j;
      if(backtrack(i + 1)) return true;
      usedRight[j] = false;
      assignment[i] = -1;
    }
    return false;
  }
  if(backtrack(0)) return assignment;
  return null;
}

// Self-heal a single losers-bracket round: if all its matches are resolvable
// (both sides known) and none has a result yet, check whether any pairing in
// the round is a rematch of an already-completed match. If so, try to find an
// alternative assignment (permuting who plays whom WITHIN the round, since all
// "away" slots in a given LB round share the same source type — either
// "new WB loser" or "previous LB round survivor") that eliminates the rematch.
// Returns true if the round's pairings were changed.
function deAutoAvoidRematchesInRound(s, bracket, roundIdx) {
  var rounds = s.doubleElimination && s.doubleElimination[bracket + 'Rounds'];
  if(!rounds || !rounds[roundIdx]) return false;
  var round = rounds[roundIdx];
  if(round.length < 2) return false; // nothing to permute against

  // Don't touch a round where any match already has a recorded result.
  for(var i = 0; i < round.length; i++) {
    if(s.results['de-' + bracket + '-' + roundIdx + '-' + i]) return false;
  }

  var homeIdxs = [], awayIdxs = [];
  for(var i = 0; i < round.length; i++) {
    var h = resolveDoubleEliminationTeam(s, round[i].home);
    var a = resolveDoubleEliminationTeam(s, round[i].away);
    if(h == null || a == null) return false; // not all resolved yet
    homeIdxs.push(h);
    awayIdxs.push(a);
  }

  var hasConflict = false;
  for(var i = 0; i < round.length; i++) {
    if(deHasPlayedBefore(s, homeIdxs[i], awayIdxs[i])) { hasConflict = true; break; }
  }
  if(!hasConflict) return false;

  var assignment = deFindNoRematchAssignment(s, homeIdxs, awayIdxs);
  if(!assignment) return false; // impossible to fully avoid — leave as-is (UI warning + manual swap remain available)

  var newAways = assignment.map(function(j) { return round[j].away; });
  var changed = false;
  for(var i = 0; i < round.length; i++) {
    if(round[i].away !== newAways[i]) changed = true;
    round[i].away = newAways[i];
  }
  return changed;
}

// Runs deAutoAvoidRematchesInRound over every losers-bracket round (self-heal,
// same pattern as checkAndGenerateKnockout). Persists via saveAll() if any
// round's pairing was adjusted. Safe to call on every render — idempotent
// once no conflicts remain.
function deAutoAvoidRematches(s) {
  var de = s.doubleElimination;
  if(!de || !de.losersRounds) return;
  var anyChanged = false;
  for(var r = 0; r < de.losersRounds.length; r++) {
    if(deAutoAvoidRematchesInRound(s, 'losers', r)) anyChanged = true;
  }
  if(anyChanged) saveAll();
}

// Manual pairing adjustment: lets an admin swap the team currently occupying
// (bracket, roundIdx, matchIdx, side) with any OTHER not-yet-played slot in the
// SAME round + bracket. This is the escape hatch for when the automatic
// anti-rematch / branch-separation logic still produces a bad pairing.
function openDeSwapDialog(s, bracket, roundIdx, matchIdx, side, round) {
  if(!isAdmin()) { toast('Chỉ admin được phép sửa'); return; }
  var currentMatch = round[matchIdx];
  var currentKey = 'de-' + bracket + '-' + roundIdx + '-' + matchIdx;
  if(s.results[currentKey]) {
    toast('Trận này đã có kết quả — hãy xoá kết quả trước khi đổi cặp thủ công');
    return;
  }
  var currentTeamIdx = resolveDoubleEliminationTeam(s, currentMatch[side]);
  var currentTeamName = currentTeamIdx != null ? (s.teams[currentTeamIdx] || ('Team ' + (currentTeamIdx + 1))) : getTeamNameForDoubleElimination(s, currentMatch[side]);

  var candidates = [];
  round.forEach(function(m, mIdx) {
    if(mIdx === matchIdx) return;
    var mKey = 'de-' + bracket + '-' + roundIdx + '-' + mIdx;
    if(s.results[mKey]) return; // don't disturb already-played matches
    ['home', 'away'].forEach(function(sd) {
      var idx = resolveDoubleEliminationTeam(s, m[sd]);
      if(idx == null) return;
      candidates.push({ matchIdx: mIdx, side: sd, teamIdx: idx, teamName: s.teams[idx] || ('Team ' + (idx + 1)) });
    });
  });

  if(candidates.length === 0) { toast('Không có đối thủ nào khác để đổi trong vòng này'); return; }

  var dlg = document.createElement('dialog');
  dlg.style.cssText = 'width:320px; max-width:90vw; border:none; border-radius:8px; padding:20px; background:var(--card); color:var(--text);';
  dlg.innerHTML =
    '<h4 style="margin:0 0 12px 0; color:var(--accent);">🔀 Đổi cặp đấu thủ công</h4>' +
    '<div style="margin-bottom:12px; font-size:13px;">Đội hiện tại: <b>' + (currentTeamName || 'TBD') + '</b><br>Chọn đội muốn đổi vào vị trí này:</div>' +
    '<div class="de-swap-list" style="max-height:240px; overflow-y:auto; border:1px solid var(--border); border-radius:4px; background:var(--bg);">' +
    candidates.map(function(c, i) {
      return '<div class="de-swap-option" data-i="' + i + '" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border);">' +
        c.teamName + ' <span style="color:var(--muted); font-size:11px;">(Trận ' + (c.matchIdx + 1) + ' - ' + (c.side === 'home' ? 'Đội nhà' : 'Đội khách') + ')</span></div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:16px; text-align:right;">' +
    '<button type="button" class="de-swap-cancel" style="padding:8px 16px; background:var(--muted); color:white; border:none; border-radius:4px; cursor:pointer;">Huỷ</button>' +
    '</div>';

  document.body.appendChild(dlg);
  addListSearch(dlg.querySelector('.de-swap-list'), '.de-swap-option', function(el) {
    return candidates[parseInt(el.getAttribute('data-i'), 10)].teamName;
  });

  dlg.querySelectorAll('.de-swap-option').forEach(function(el) {
    el.addEventListener('mouseenter', function() { this.style.background = 'var(--hover)'; });
    el.addEventListener('mouseleave', function() { this.style.background = ''; });
    el.addEventListener('click', function() {
      var c = candidates[parseInt(this.getAttribute('data-i'), 10)];
      var otherMatch = round[c.matchIdx];
      var tmp = currentMatch[side];
      currentMatch[side] = otherMatch[c.side];
      otherMatch[c.side] = tmp;
      saveAll();
      if(typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
      toast('Đã đổi cặp đấu');
      renderDoubleEliminationBracket(s);
      renderCupStandings(s);
    });
  });
  dlg.querySelector('.de-swap-cancel').addEventListener('click', function() {
    if(typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  });
  dlg.addEventListener('close', function() {
    if(dlg.parentNode) document.body.removeChild(dlg);
  });

  if(typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open', 'open'); }
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
