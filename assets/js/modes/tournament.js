// Marvell PES Club - modes/tournament.js (split from app.js; shared global scope, load order set in index.html)
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
      
      // Sort by points, then goal difference, then goals for.
      standings.sort(function(a, b) {
        if(a.Pts !== b.Pts) return b.Pts - a.Pts;
        if(a.GD !== b.GD) return b.GD - a.GD;
        return b.GF - a.GF;
      });

      // If head-to-head tiebreak is enabled, reorder teams that are level on
      // points using only the matches played between the tied teams.
      if(season.settings && season.settings.h2h) {
        standings = applyGroupH2HTiebreak(standings, season, group, groupName);
      }
      
      return standings;
    }

    // Collect head-to-head results between two teams within a group, from teamA's
    // perspective: [{ gfA, gaA }, ...].
    function getGroupPairResults(season, group, groupName, teamIdxA, teamIdxB) {
      var results = [];
      group.fixtures.forEach(function(round, roundIdx) {
        round.forEach(function(match, matchIdx) {
          var homeTeamIdx = group.teamIndices[match.home];
          var awayTeamIdx = group.teamIndices[match.away];
          var involvesPair =
            (homeTeamIdx === teamIdxA && awayTeamIdx === teamIdxB) ||
            (homeTeamIdx === teamIdxB && awayTeamIdx === teamIdxA);
          if(!involvesPair) return;
          var key = 'group-' + groupName + '-' + roundIdx + '-' + matchIdx;
          var result = season.results[key];
          if(!result || result.hg == null || result.ag == null) return;
          if(homeTeamIdx === teamIdxA) {
            results.push({ gfA: Number(result.hg), gaA: Number(result.ag) });
          } else {
            results.push({ gfA: Number(result.ag), gaA: Number(result.hg) });
          }
        });
      });
      return results;
    }

    // Head-to-head mini-league tiebreaker. Reorders groups of teams that are level
    // on points using only matches BETWEEN those tied teams (H2H Pts -> H2H GD ->
    // H2H GF), then falls back to overall GD -> GF -> name.
    function applyGroupH2HTiebreak(standings, season, group, groupName) {
      function h2hStatsFor(tiedRows) {
        var stats = {};
        tiedRows.forEach(function(r) { stats[r.idx] = { Pts: 0, GD: 0, GF: 0 }; });
        for(var i = 0; i < tiedRows.length; i++) {
          for(var j = i + 1; j < tiedRows.length; j++) {
            var a = tiedRows[i], b = tiedRows[j];
            var pairResults = getGroupPairResults(season, group, groupName, a.idx, b.idx);
            pairResults.forEach(function(m) {
              stats[a.idx].GF += m.gfA; stats[a.idx].GD += (m.gfA - m.gaA);
              stats[b.idx].GF += m.gaA; stats[b.idx].GD += (m.gaA - m.gfA);
              if(m.gfA > m.gaA) { stats[a.idx].Pts += 3; }
              else if(m.gfA < m.gaA) { stats[b.idx].Pts += 3; }
              else { stats[a.idx].Pts += 1; stats[b.idx].Pts += 1; }
            });
          }
        }
        return stats;
      }

      var out = [];
      var i = 0;
      while(i < standings.length) {
        var j = i + 1;
        while(j < standings.length && standings[j].Pts === standings[i].Pts) j++;
        var tied = standings.slice(i, j);
        if(tied.length > 1) {
          var hstats = h2hStatsFor(tied);
          tied.sort(function(a, b) {
            var ha = hstats[a.idx], hb = hstats[b.idx];
            if(ha.Pts !== hb.Pts) return hb.Pts - ha.Pts;
            if(ha.GD !== hb.GD) return hb.GD - ha.GD;
            if(ha.GF !== hb.GF) return hb.GF - ha.GF;
            if(a.GD !== b.GD) return b.GD - a.GD;
            if(a.GF !== b.GF) return b.GF - a.GF;
            return a.team.localeCompare(b.team);
          });
        }
        out = out.concat(tied);
        i = j;
      }
      return out;
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
      
      // Serie A/B: one ranked list (group position, then Pts/GD/GF) so the best
      // 1st/2nd (or 3rd) placed teams fill Serie A and the next ones Serie B.
      if(isSerieAB(season)) {
        allStandings.sort(function(a, b) {
          return (a.position - b.position) || (b.points - a.points) || (b.gd - a.gd) || (b.gf - a.gf);
        });
        return allStandings.slice(0, season.numSerieA + season.numSerieA / 2);
      }
      
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

    // Returns true only when every group match has a recorded result.
    function isGroupStageComplete(season) {
      if(!season || !season.groups) return false;
      var groupNames = Object.keys(season.groups);
      if(!groupNames.length) return false;
      for(var gi = 0; gi < groupNames.length; gi++) {
        var group = season.groups[groupNames[gi]];
        if(!group || !group.fixtures) return false;
        for(var r = 0; r < group.fixtures.length; r++) {
          for(var m = 0; m < group.fixtures[r].length; m++) {
            var key = 'group-' + groupNames[gi] + '-' + r + '-' + m;
            var res = season.results[key];
            if(!res || res.hg == null || res.ag == null) return false;
          }
        }
      }
      return true;
    }

    // Reorder qualifiers into a World Cup-style knockout bracket using standard
    // tournament seeding. Stronger qualifiers (group winners first, then by
    // points/GD/GF) are spread across the bracket slots like a real seeded draw
    // (1 vs N, 2 in opposite half, etc.) so two group winners can never meet in
    // the first round. A final pass swaps slots to avoid same-group round-1 ties.
    // Works for any power-of-two knockout size (8, 16, 32...) and any group
    // count, including odd group counts and brackets that include 3rd-place teams.
    function seedTournamentBracket(qualifiers, numGroups) {
      var n = qualifiers.length;
      if(n < 2) return qualifiers.slice();
      // Standard seeding only defined for power-of-two sizes; otherwise keep order.
      if((n & (n - 1)) !== 0) return qualifiers.slice();
      
      // 1) Rank qualifiers into seeds: group rank first (1st > 2nd > 3rd...),
      //    then by points, goal difference, goals for. seeds[0] is the strongest.
      var seeds = qualifiers.slice().sort(function(a, b) {
        return (a.position - b.position)
            || (b.points - a.points)
            || (b.gd - a.gd)
            || (b.gf - a.gf);
      });
      
      // 2) Build the standard seeding slot order (1-indexed seed numbers).
      //    Pairs (order[0],order[1]), (order[2],order[3])... are the round-1 ties.
      var order = [1, 2];
      var rounds = Math.round(Math.log(n) / Math.log(2));
      for(var r = 1; r < rounds; r++) {
        var next = [];
        var sum = order.length * 2 + 1;
        for(var i = 0; i < order.length; i++) {
          next.push(order[i]);
          next.push(sum - order[i]);
        }
        order = next;
      }
      
      // 3) Place each seed into its bracket slot.
      var arranged = order.map(function(seedNum) { return seeds[seedNum - 1]; });
      
      // 4) Resolve same-group first-round matchups by swapping slots when safe.
      function sameGroup(a, b) { return a && b && a.groupName === b.groupName; }
      for(var p = 0; p < n; p += 2) {
        if(!sameGroup(arranged[p], arranged[p + 1])) continue;
        for(var j = 0; j < n; j++) {
          if(j === p || j === p + 1) continue;
          var partner = (j % 2 === 0) ? j + 1 : j - 1; // round-1 partner of slot j
          var newPairA = arranged[j];           // moves into slot p+1
          var newPairB = arranged[p + 1];        // moves into slot j
          if(!sameGroup(arranged[p], newPairA) && !sameGroup(arranged[partner], newPairB)) {
            var tmp = arranged[p + 1];
            arranged[p + 1] = arranged[j];
            arranged[j] = tmp;
            break;
          }
        }
      }
      
      return arranged;
    }

    // ===== Serie A/B knock-out format =====
    // Serie A: numSerieA teams (power of 2), normal knock-out.
    // Serie B: numSerieA/2 teams wait; each Serie B round-1 match = waiting team
    // vs the loser of Serie A round-1 match `fromA`. Stored as
    // s.knockoutBracket.serieB, results keyed 'knockoutB-{r}-{m}'.
    function isSerieAB(season) {
      return !!season && season.knockoutFormat === 'serieAB' && season.numSerieA >= 2;
    }
    
    function getSerieB(s) {
      return (s && s.knockoutBracket && s.knockoutBracket.serieB && s.knockoutBracket.serieB.rounds) ? s.knockoutBracket.serieB : null;
    }
    
    function serieBLoserRef(aMatchIdx) {
      return {fromRound: 0, matchId: aMatchIdx, isLoser: true, series: 'A'};
    }
    
    // Fill Serie B round-1 away slots with the actual Serie A round-1 losers
    // (or back to a placeholder while that Serie A match has no result).
    function syncSerieBEntrants(s) {
      var B = getSerieB(s);
      if(!B || !B.rounds[0]) return;
      B.rounds[0].forEach(function(match) {
        if(match.fromA == null) return;
        var loser = resolveLoserFromMatch(s, 0, match.fromA);
        match.away = (loser != null) ? loser : serieBLoserRef(match.fromA);
      });
    }
    
    function buildSerieBBracket(season, qualifiersB, arrangedA) {
      var nB = qualifiersB.length;
      if(nB < 1 || arrangedA.length !== nB * 2) return null;
      var waiting = seedTournamentBracket(qualifiersB, season.numGroups || 4);
      
      // Serie B match j: waiting[j] vs loser of Serie A match src[j]. Avoid
      // same-group meetings by swapping Serie A sources where possible.
      var src = waiting.map(function(_, j) { return j; });
      function clash(j, aj) {
        var g = waiting[j].groupName;
        return arrangedA[2 * aj].groupName === g || arrangedA[2 * aj + 1].groupName === g;
      }
      for(var j = 0; j < nB; j++) {
        if(!clash(j, src[j])) continue;
        for(var k = 0; k < nB; k++) {
          if(k !== j && !clash(j, src[k]) && !clash(k, src[j])) {
            var t = src[j]; src[j] = src[k]; src[k] = t;
            break;
          }
        }
      }
      
      var cup = buildCupBracket({ teams: new Array(nB * 2).fill(''), has3rdPlace: false });
      if(!cup || !cup.rounds.length) return null;
      var rounds = cup.rounds.map(function(round, r) {
        return round.map(function(match, m) {
          if(r === 0) return { home: waiting[m].teamIdx, away: serieBLoserRef(src[m]), fromA: src[m] };
          return { home: match.home, away: match.away };
        });
      });
      return {
        rounds: rounds,
        stageNames: cup.stageNames.map(function(n) { return 'Serie B - ' + n; }),
        qualifiers: waiting,
        teamIndices: waiting.map(function(q) { return q.teamIdx; })
      };
    }

    // Generate knockout bracket for tournament (flexible team count from group stage)
    function generateTournamentKnockout(season) {
      var qualifiers = getTournamentQualifiers(season);
      var numKnockoutTeams = season.numKnockoutTeams || 8;
      var qualifiersB = null;
      
      if(isSerieAB(season)) {
        numKnockoutTeams = season.numSerieA;
        if(qualifiers.length < numKnockoutTeams + numKnockoutTeams / 2) return null;
        qualifiersB = qualifiers.slice(numKnockoutTeams, numKnockoutTeams + numKnockoutTeams / 2);
      }
      
      if(qualifiers.length < numKnockoutTeams) return null;
      
      // Take only the required number of qualifiers
      qualifiers = qualifiers.slice(0, numKnockoutTeams);
      
      // Apply World Cup-style cross-group seeding so two group winners never meet
      // in the first round, and same-group teams stay in opposite halves.
      qualifiers = seedTournamentBracket(qualifiers, season.numGroups || 4);
      
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
        teamIndices: teamIndexMap,
        seedVersion: 3
      };
      
      if(qualifiersB) {
        bracket.serieB = buildSerieBBracket(season, qualifiersB, qualifiers);
        if(!bracket.serieB) return null;
      }
      
      return bracket;
    }

    // Render tournament standings and structure
    function renderTournamentStandings(s) {
      $('seasonTitle').textContent='— '+s.name+' (TOURNAMENT)';
      $('leagueLogo').style.backgroundImage=s.logo?('url("'+s.logo+'")'):'none';
      
      // Self-heal: generate/regenerate the knockout bracket if the group stage is
      // complete and no knockout match has been played yet (applies correct seeding).
      checkAndGenerateKnockout(s);
      
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
        var medal = row.stage==='Winner'?' 🏆':row.stage==='Runner-up'?' 🥈':(row.stage==='3rd Place'||row.stage==='Tranh hạng 3')?' 🥉':row.stage==='Serie B Winner'?' 🏅':'';
        
        tr.innerHTML = '<td' + stageColor + '>' + (pos + 1) + '</td>' +
                      '<td' + stageColor + ' class="team">' + badge + escapeHtml(row.team) + medal + '</td>' +
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
      groupsContainer.setAttribute('data-sec', 'standings');
      groupsContainer.style.cssText = 'margin-top: 20px;';
      
      var groupsSection = document.createElement('section');
      groupsSection.className = 'card grow';
      
      var groupsTitle = document.createElement('h3');
      groupsTitle.textContent = 'Group Stage Tables';
      groupsTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); text-align: center;';
      groupsSection.appendChild(groupsTitle);
      
      // Create grid for groups (max 4 per row)
      var gridContainer = document.createElement('div');
      gridContainer.className = 'groups-grid';
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
                        '<td' + qualifier + ' style="width: auto; text-align: left; padding: 6px 6px;">' + badge + escapeHtml(row.team) + '</td>' +
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
      // Only decide qualification AFTER the group stage is fully played, so the
      // Stage column doesn't show predicted/placeholder results beforehand.
      var groupStageDone = isGroupStageComplete(s);
      var serieAB = isSerieAB(s);
      if(groupStageDone) {
        var qualifiers = getTournamentQualifiers(s);
        var qualifiedIndices = qualifiers.map(function(q) { return q.teamIdx; });
        var serieBIndices = [];
        if(serieAB) {
          var qB = getSerieB(s);
          serieBIndices = qB ? qB.teamIndices : qualifiedIndices.slice(s.numSerieA);
        }
        
        standings.forEach(function(row) {
          if(qualifiedIndices.indexOf(row.idx) === -1) {
            row.stage = 'Group Stage';
            row.eliminated = true;
          } else if(serieAB) {
            row.stage = serieBIndices.indexOf(row.idx) !== -1 ? 'Serie B' : 'Serie A';
          } else {
            row.stage = 'Qualified';
          }
        });
      } else {
        // Group stage still in progress: keep everyone neutral (no qualification yet).
        standings.forEach(function(row) {
          row.stage = 'Group Stage';
          row.eliminated = false;
        });
      }
      
      // Add knockout stage results and update stages
      function addKnockoutStats(kb, KP, isB) {
        kb.rounds.forEach(function(round, roundIdx) {
          round.forEach(function(match, matchIdx) {
            var key = KP + roundIdx + '-' + matchIdx;
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
              var prevKey = KP + match.home.fromRound + '-' + match.home.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = kb.rounds[match.home.fromRound][match.home.matchId];
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
              var prevKey = KP + match.away.fromRound + '-' + match.away.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = kb.rounds[match.away.fromRound][match.away.matchId];
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
              
              var stageName = kb.stageNames[roundIdx];
              var isLastRound = roundIdx === kb.rounds.length - 1;
              // Serie A/B: losing a Serie A round-1 match means dropping to Serie B
              var dropsToB = serieAB && !isB && roundIdx === 0;
              var loserStage = dropsToB ? 'Serie B' : stageName;
              
              if(result.hg > result.ag) {
                homeRow.W++; homeRow.Pts += 3;
                awayRow.L++;
                // Update stages based on stage name
                if(isB && isLastRound) {
                  homeRow.stage = 'Serie B Winner';
                  awayRow.stage = 'Serie B Runner-up';
                } else if(stageName === 'Final' || stageName === 'Chung kết') {
                  homeRow.stage = 'Winner';
                  awayRow.stage = 'Runner-up';
                } else if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') {
                  homeRow.stage = '3rd Place';
                  awayRow.stage = '4th Place';
                } else {
                  homeRow.stage = kb.stageNames[roundIdx + 1] || stageName;
                  awayRow.stage = loserStage;
                }
                awayRow.eliminated = !dropsToB;
              } else if(result.hg < result.ag) {
                awayRow.W++; awayRow.Pts += 3;
                homeRow.L++;
                // Update stages based on stage name
                if(isB && isLastRound) {
                  awayRow.stage = 'Serie B Winner';
                  homeRow.stage = 'Serie B Runner-up';
                } else if(stageName === 'Final' || stageName === 'Chung kết') {
                  awayRow.stage = 'Winner';
                  homeRow.stage = 'Runner-up';
                } else if(stageName === '3rd Place Match' || stageName === 'Tranh hạng 3') {
                  awayRow.stage = '3rd Place';
                  homeRow.stage = '4th Place';
                } else {
                  awayRow.stage = kb.stageNames[roundIdx + 1] || stageName;
                  homeRow.stage = loserStage;
                }
                homeRow.eliminated = !dropsToB;
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
      
      if(s.knockoutBracket && s.knockoutBracket.rounds) {
        addKnockoutStats(s.knockoutBracket, 'knockout-', false);
        var serieB = getSerieB(s);
        if(serieB) {
          syncSerieBEntrants(s);
          addKnockoutStats(serieB, 'knockoutB-', true);
        }
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
        'Serie A'
      ];
      if(serieAB) {
        var bNames = (getSerieB(s) || {stageNames: []}).stageNames.slice().reverse();
        stageOrder = stageOrder.concat(['Serie B Winner', 'Serie B Runner-up'], bNames, ['Serie B']);
      }
      stageOrder = stageOrder.concat(['Qualified', 'Group Stage']);
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
      if(s.mode !== 'tournament') return;
      
      // Has any knockout match already been played?
      var hasKnockoutResult = false;
      if(s.knockoutBracket && s.knockoutBracket.rounds) {
        for(var r = 0; r < s.knockoutBracket.rounds.length && !hasKnockoutResult; r++) {
          for(var m = 0; m < s.knockoutBracket.rounds[r].length; m++) {
            if(s.results['knockout-' + r + '-' + m]) { hasKnockoutResult = true; break; }
          }
        }
      }
      
      // If a bracket already exists and a knockout match has been played, never
      // rebuild it (that would discard played results / seeding decisions).
      if(s.knockoutBracket && hasKnockoutResult) return;
      
      // If a bracket already exists with the current seeding version and no
      // knockout match played yet, it's already correct — nothing to do.
      // (This guard prevents an infinite regenerate/refresh loop on render.)
      if(s.knockoutBracket && s.knockoutBracket.seedVersion === 3) return;
      
      // Check if all group matches are complete
      var allGroupsComplete = true;
      var groupNames = Object.keys(s.groups || {});
      if(!groupNames.length) allGroupsComplete = false;
      
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
        // Generate (or regenerate, when no knockout match has been played yet) the
        // bracket so the corrected World Cup seeding is applied.
        s.knockoutBracket = generateTournamentKnockout(s);
        s.tournamentPhase = 'knockout';
        saveAll();
        
        // Refresh UI to show the bracket
        refreshSeasonUI();
      }
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
      var showOnlyDone = $('onlyDone') && $('onlyDone').checked ? true : false;
      var showOnlyPending = $('onlyPending') && $('onlyPending').checked ? true : false;
      var fixturesDiv = $('fixtures'); 
      fixturesDiv.innerHTML = '';
      
      // When a team filter is active, show that team's matches across ALL rounds
      // (giống league mode) thay vì chỉ vòng đang chọn.
      if(filterTeam !== null) {
        for(var gr = 0; gr < totalGroupRounds; gr++) {
          renderGroupStageFixtures(s, gr, filterTeam, showOnlyDone, fixturesDiv, showOnlyPending);
        }
        return;
      }
      
      // Parse selected round - only group stage rounds are available now
      var roundParts = selectedRound.split('-');
      var roundType = roundParts[0]; // Should always be 'group'
      var roundNumber = parseInt(roundParts[1], 10);
      
      if(roundType === 'group') {
        renderGroupStageFixtures(s, roundNumber, filterTeam, showOnlyDone, fixturesDiv, showOnlyPending);
      }
    }
    
    // Render group stage fixtures for a specific round
    function renderGroupStageFixtures(s, roundNumber, filterTeam, showOnlyDone, fixturesDiv, showOnlyPending) {
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
          var isDone = !(result.hg == null || result.ag == null);
          
          // Apply done/pending filters
          if(showOnlyDone && !isDone) return;
          if(showOnlyPending && isDone) return;
          
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
      
      var rerenderKO = function() { renderTournamentKnockoutBracket(s); };
      var serieB = getSerieB(s);
      if(serieB) syncSerieBEntrants(s);
      var labelA = function(ref) { return getTeamNameForMatch(s, ref); };
      var labelB = function(ref) {
        if(ref && typeof ref === 'object' && !ref.series && ref.fromRound != null) {
          return (ref.isLoser ? 'Loser' : 'Winner') + ' of B-R' + (ref.fromRound + 1) + 'M' + (ref.matchId + 1);
        }
        return getTeamNameForMatch(s, ref);
      };
      var sectionTitle = function(host, text, before) {
        var h = document.createElement('h3');
        h.className = 'serie-ab-title';
        h.style.cssText = 'margin: 16px 0 8px; font-size: 16px;';
        h.textContent = text;
        host.insertBefore(h, before || null);
      };
      
      var listContainer = prepareBracketHost(container, 'cup-bracket-container', rerenderKO);
      if(!listContainer) {
        var treeA = container;
        if(serieB) {
          sectionTitle(container, '🏆 Serie A');
          treeA = document.createElement('div');
          container.appendChild(treeA);
        }
        renderKnockoutTree(treeA, s, {
          rounds: s.knockoutBracket.rounds,
          names: s.knockoutBracket.stageNames || [],
          keyFor: function(r, m) { return 'knockout-' + r + '-' + m; },
          mapIdx: function(n) { return n; },
          label: labelA,
          code: function(r, m) { return 'R' + (r + 1) + 'M' + (m + 1); },
          rerender: rerenderKO
        });
        if(serieB) {
          sectionTitle(container, '🏅 Serie B');
          var treeB = document.createElement('div');
          container.appendChild(treeB);
          renderKnockoutTree(treeB, s, {
            rounds: serieB.rounds,
            names: serieB.stageNames || [],
            keyFor: function(r, m) { return 'knockoutB-' + r + '-' + m; },
            mapIdx: function(n) { return n; },
            label: labelB,
            code: function(r, m) { return 'B-R' + (r + 1) + 'M' + (m + 1); },
            rerender: rerenderKO
          });
        }
        return;
      }
      
      if(!serieB) {
        renderTournamentKOList(s, s.knockoutBracket, 'knockout-', listContainer, {label: labelA, editHome: true, editAway: true});
        return;
      }
      // Serie A/B: two stacked list sections
      var parent = listContainer.parentNode;
      sectionTitle(parent, '🏆 Serie A', listContainer);
      renderTournamentKOList(s, s.knockoutBracket, 'knockout-', listContainer, {label: labelA, editHome: true, editAway: true});
      sectionTitle(parent, '🏅 Serie B');
      var listB = document.createElement('div');
      listB.className = listContainer.className;
      parent.appendChild(listB);
      renderTournamentKOList(s, serieB, 'knockoutB-', listB, {label: labelB, editHome: true, editAway: false});
    }
    
    // List view of one knock-out bracket. kb = bracket object, KP = result key prefix.
    function renderTournamentKOList(s, kb, KP, container, opt) {
      var isFinalStage = function(r) {
        var n = kb.stageNames[r];
        return n === 'Final' || n === 'Chung kết' || (KP !== 'knockout-' && r === kb.rounds.length - 1);
      };
      kb.rounds.forEach(function(round, roundIdx) {
        var roundDiv = document.createElement('div');
        roundDiv.className = 'cup-round';
        
        var roundTitle = document.createElement('h4');
        roundTitle.className = 'cup-round-title' + (isFinalStage(roundIdx) ? ' final' : '');
        roundTitle.textContent = kb.stageNames[roundIdx] || ('Round ' + (roundIdx + 1));
        roundDiv.appendChild(roundTitle);
        
        round.forEach(function(match, matchIdx) {
          var key = KP + roundIdx + '-' + matchIdx;
          var result = s.results[key] || {};
          
          var homeTeam = opt.label(match.home);
          var awayTeam = opt.label(match.away);
          
          var shouldShowMatch = true;
          
          if(shouldShowMatch) {
            var el = document.createElement('div');
            el.className = 'fixture cup-match' +
              (isFinalStage(roundIdx) ? ' final' : '') +
              (kb.stageNames[roundIdx] === '3rd Place Match' ? ' third-place' : '');
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
              var prevKey = KP + match.home.fromRound + '-' + match.home.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = kb.rounds[match.home.fromRound][match.home.matchId];
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
              var prevKey = KP + match.away.fromRound + '-' + match.away.matchId;
              var prevRes = s.results[prevKey];
              if(prevRes && prevRes.hg != null && prevRes.ag != null) {
                var prevMatch = kb.rounds[match.away.fromRound][match.away.matchId];
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
            if(isAdmin() && opt.editHome && roundIdx === 0 && typeof match.home === 'number') {
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
            if(isAdmin() && opt.editAway && roundIdx === 0 && typeof match.away === 'number') {
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
              if(roundIdx < kb.rounds.length - 1) {
                // Check if current round is complete
                var currentRoundComplete = kb.rounds[roundIdx].every(function(m, idx) {
                  var k = KP + roundIdx + '-' + idx;
                  return s.results[k] != null;
                });
                
                // Check if any next round has results
                if(currentRoundComplete) {
                  for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < kb.rounds.length; nextRoundIdx++) {
                    var hasNextRoundResults = kb.rounds[nextRoundIdx].some(function(m, idx) {
                      var k = KP + nextRoundIdx + '-' + idx;
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
              if((homeTeamSel || awayTeamSel) && roundIdx === 0) {
                var newHome = homeTeamSel ? parseInt(homeTeamSel.value, 10) : match.home;
                var newAway = awayTeamSel ? parseInt(awayTeamSel.value, 10) : match.away;
                if(newHome === newAway) {
                  toast('Không thể chọn cùng một đội cho cả hai bên');
                  if(homeTeamSel) homeTeamSel.value = match.home;
                  if(awayTeamSel) awayTeamSel.value = match.away;
                  return;
                }
                kb.rounds[roundIdx][matchIdx].home = newHome;
                kb.rounds[roundIdx][matchIdx].away = newAway;
                match.home = newHome;
                match.away = newAway;
                needsRerender = true;
              }
              
              var hg = (homeScore.value === '') ? null : Math.max(0, parseInt(homeScore.value, 10));
              var ag = (awayScore.value === '') ? null : Math.max(0, parseInt(awayScore.value, 10));
              // Only one side entered: wait for the other instead of clearing/re-rendering
              if((hg == null) !== (ag == null) && !needsRerender) return;
              
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
              for(var nextRoundIdx = roundIdx + 1; nextRoundIdx < kb.rounds.length; nextRoundIdx++) {
                var nextRound = kb.rounds[nextRoundIdx];
                
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
