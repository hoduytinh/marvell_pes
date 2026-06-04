(function(){
  'use strict';

  var STORAGE_KEY = 'pes-league-v15';
  var VISIBLE_TEAMS_KEY = 'teoVisibleTeams';

  function isAdminSession() {
    try { return sessionStorage.getItem('pesAdmin') === '1'; }
    catch(_) { return false; }
  }

  function parseSeasonYear(seasonName) {
    var m = String(seasonName || '').match(/(19|20)\d{2}/);
    return m ? Number(m[0]) : -1;
  }

  function parseStageOrder(stage) {
    var txt = String(stage || '');
    var m = txt.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  function sortMatchesNewest(matches) {
    return (matches || []).slice().sort(function(a, b) {
      var ay = parseSeasonYear(a.seasonName);
      var by = parseSeasonYear(b.seasonName);
      if(by !== ay) return by - ay;

      var as = parseStageOrder(a.stage);
      var bs = parseStageOrder(b.stage);
      if(bs !== as) return bs - as;

      return (b._seq || 0) - (a._seq || 0);
    });
  }

  function loadVisibleTeamsSet() {
    try {
      var raw = localStorage.getItem(VISIBLE_TEAMS_KEY);
      if(!raw) return null;
      var arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return null;
      var set = Object.create(null);
      arr.forEach(function(name) { set[String(name).toLowerCase()] = true; });
      return set;
    } catch(_) {
      return null;
    }
  }

  function saveVisibleTeams(list) {
    try {
      localStorage.setItem(VISIBLE_TEAMS_KEY, JSON.stringify(list || []));
    } catch(_) {}
  }

  function clearVisibleTeamsFilter() {
    try { localStorage.removeItem(VISIBLE_TEAMS_KEY); } catch(_) {}
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Teo] Cannot load state:', e);
      return null;
    }
  }

  function uniqSorted(arr) {
    var seen = Object.create(null);
    var out = [];
    arr.forEach(function(v) {
      var k = (v || '').trim();
      if(!k) return;
      var lk = k.toLowerCase();
      if(seen[lk]) return;
      seen[lk] = true;
      out.push(k);
    });
    out.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    return out;
  }

  function getAllTeamNames(state) {
    var names = [];
    if(!state || !state.seasons) return names;
    Object.keys(state.seasons).forEach(function(sk) {
      var s = state.seasons[sk];
      if(!s) return;
      if(Array.isArray(s.teams)) names = names.concat(s.teams);
      if(Array.isArray(state.teamMasterList)) names = names.concat(state.teamMasterList);
    });
    return uniqSorted(names);
  }

  function getVisibleTeamNames(state) {
    var all = getAllTeamNames(state);
    var selectedSet = loadVisibleTeamsSet();
    if(!selectedSet) return all;
    var filtered = all.filter(function(name) { return !!selectedSet[String(name).toLowerCase()]; });
    return filtered.length ? filtered : all;
  }

  function pickResult(results, key) {
    if(!results || !key) return null;
    var r = results[key];
    if(!r) return null;
    if(r.hg == null || r.ag == null) return null;
    return { hg: Number(r.hg), ag: Number(r.ag) };
  }

  function buildTeamResolver(season, getMatch, getKey) {
    var memo = Object.create(null);

    function resolve(teamRef) {
      if(typeof teamRef === 'number') return teamRef;
      if(!teamRef || typeof teamRef !== 'object') return null;

      var baseRound = (typeof teamRef.fromRound === 'number')
        ? teamRef.fromRound
        : ((typeof teamRef.loserFromRound === 'number') ? teamRef.loserFromRound : null);
      if(baseRound == null || typeof teamRef.matchId !== 'number') return null;

      var bracket = teamRef.bracket || '';
      var loserFlag = (teamRef.loserFromRound != null) ? 'L' : 'W';
      var memoKey = baseRound + '|' + teamRef.matchId + '|' + bracket + '|' + loserFlag;
      if(Object.prototype.hasOwnProperty.call(memo, memoKey)) return memo[memoKey];

      var sourceMatch = getMatch(baseRound, teamRef.matchId, teamRef.bracket);
      var sourceKey = getKey(baseRound, teamRef.matchId, teamRef.bracket);
      var sourceResult = pickResult(season.results, sourceKey);
      if(!sourceMatch || !sourceResult) {
        memo[memoKey] = null;
        return null;
      }

      var homeIdx = resolve(sourceMatch.home);
      var awayIdx = resolve(sourceMatch.away);
      if(homeIdx == null || awayIdx == null || sourceResult.hg === sourceResult.ag) {
        memo[memoKey] = null;
        return null;
      }

      var winner = sourceResult.hg > sourceResult.ag ? homeIdx : awayIdx;
      var loser = winner === homeIdx ? awayIdx : homeIdx;
      var resolved = (teamRef.loserFromRound != null) ? loser : winner;
      memo[memoKey] = resolved;
      return resolved;
    }

    return resolve;
  }

  function addFromRoundArray(season, options, out) {
    var rounds = options.rounds;
    var keyBuilder = options.keyBuilder;
    var stageLabel = options.stageLabel;
    var resolveTeam = options.resolveTeam;
    if(!Array.isArray(rounds)) return;

    for(var r = 0; r < rounds.length; r++) {
      var round = rounds[r];
      if(!Array.isArray(round)) continue;
      for(var m = 0; m < round.length; m++) {
        var match = round[m] || {};
        var homeIdx = resolveTeam ? resolveTeam(match.home) : match.home;
        var awayIdx = resolveTeam ? resolveTeam(match.away) : match.away;
        if(typeof homeIdx !== 'number' || typeof awayIdx !== 'number') continue;
        if(!Array.isArray(season.teams)) continue;
        if(!season.teams[homeIdx] || !season.teams[awayIdx]) continue;

        var key = keyBuilder(r, m, match);
        var result = pickResult(season.results, key);
        if(!result) continue;

        out.push({
          seasonName: season.name || '(Unnamed)',
          mode: season.mode || 'league',
          stage: stageLabel(r),
          home: season.teams[homeIdx],
          away: season.teams[awayIdx],
          hg: result.hg,
          ag: result.ag
        });
      }
    }
  }

  function addFromSwiss(season, out) {
    if(!season || !season.swiss) return;

    var swissRounds = season.swiss.rounds || [];
    var swissResolve = buildTeamResolver(
      season,
      function(fromRound, matchId) {
        var round = swissRounds[fromRound];
        if(!round || !Array.isArray(round.matches)) return null;
        return round.matches[matchId] || null;
      },
      function(fromRound, matchId) {
        return 'swiss-' + fromRound + '-' + matchId;
      }
    );

    for(var r = 0; r < swissRounds.length; r++) {
      var round = swissRounds[r] || {};
      var matches = round.matches || [];
      for(var m = 0; m < matches.length; m++) {
        var match = matches[m] || {};
        var homeIdx = swissResolve(match.home);
        var awayIdx = swissResolve(match.away);
        if(typeof homeIdx !== 'number' || typeof awayIdx !== 'number') continue;
        if(!Array.isArray(season.teams)) continue;
        if(!season.teams[homeIdx] || !season.teams[awayIdx]) continue;

        var key = 'swiss-' + r + '-' + m;
        var result = pickResult(season.results, key);
        if(!result) continue;

        out.push({
          seasonName: season.name || '(Unnamed)',
          mode: season.mode || 'swiss',
          stage: 'Swiss Round ' + (r + 1),
          home: season.teams[homeIdx],
          away: season.teams[awayIdx],
          hg: result.hg,
          ag: result.ag
        });
      }
    }

    var playoff = season.swiss.playoffBracket;
    if(playoff && Array.isArray(playoff.rounds)) {
      var playoffResolve = buildTeamResolver(
        season,
        function(fromRound, matchId) {
          var pRound = playoff.rounds[fromRound];
          if(!Array.isArray(pRound)) return null;
          return pRound[matchId] || null;
        },
        function(fromRound, matchId) {
          return 'swiss-playoff-' + fromRound + '-' + matchId;
        }
      );

      for(var pr = 0; pr < playoff.rounds.length; pr++) {
        var pRound = playoff.rounds[pr] || [];
        for(var pm = 0; pm < pRound.length; pm++) {
          var pMatch = pRound[pm] || {};
          var pHomeIdx = playoffResolve(pMatch.home);
          var pAwayIdx = playoffResolve(pMatch.away);
          if(typeof pHomeIdx !== 'number' || typeof pAwayIdx !== 'number') continue;
          if(!Array.isArray(season.teams)) continue;
          if(!season.teams[pHomeIdx] || !season.teams[pAwayIdx]) continue;

          var pKey = 'swiss-playoff-' + pr + '-' + pm;
          var pResult = pickResult(season.results, pKey);
          if(!pResult) continue;

          out.push({
            seasonName: season.name || '(Unnamed)',
            mode: season.mode || 'swiss',
            stage: 'Swiss Playoff Round ' + (pr + 1),
            home: season.teams[pHomeIdx],
            away: season.teams[pAwayIdx],
            hg: pResult.hg,
            ag: pResult.ag
          });
        }
      }
    }
  }

  function addFromDoubleElimination(season, out) {
    if(!season || !season.doubleElimination) return;
    var de = season.doubleElimination;

    var deResolve = buildTeamResolver(
      season,
      function(fromRound, matchId, bracket) {
        if(fromRound === -1 && Array.isArray(de.playoffRound)) return de.playoffRound[matchId] || null;
        if(bracket === 'losers') {
          var lr = de.losersRounds && de.losersRounds[fromRound];
          return Array.isArray(lr) ? (lr[matchId] || null) : null;
        }
        var wr = de.winnersRounds && de.winnersRounds[fromRound];
        return Array.isArray(wr) ? (wr[matchId] || null) : null;
      },
      function(fromRound, matchId, bracket) {
        if(fromRound === -1) return 'de-playoff-0-' + matchId;
        return (bracket === 'losers' ? 'de-losers-' : 'de-winners-') + fromRound + '-' + matchId;
      }
    );

    if(Array.isArray(de.playoffRound)) {
      addFromRoundArray(season, {
        rounds: [de.playoffRound],
        keyBuilder: function(_r, m) { return 'de-playoff-0-' + m; },
        stageLabel: function() { return 'DE Playoff'; },
        resolveTeam: deResolve
      }, out);
    }

    addFromRoundArray(season, {
      rounds: de.winnersRounds,
      keyBuilder: function(r, m) { return 'de-winners-' + r + '-' + m; },
      stageLabel: function(r) { return 'DE Winners R' + (r + 1); },
      resolveTeam: deResolve
    }, out);

    addFromRoundArray(season, {
      rounds: de.losersRounds,
      keyBuilder: function(r, m) { return 'de-losers-' + r + '-' + m; },
      stageLabel: function(r) { return 'DE Losers R' + (r + 1); },
      resolveTeam: deResolve
    }, out);

    if(Array.isArray(de.grandFinal)) {
      addFromRoundArray(season, {
        rounds: [de.grandFinal],
        keyBuilder: function(_r, m) { return 'de-grand-final-' + m; },
        stageLabel: function() { return 'DE Grand Final'; },
        resolveTeam: deResolve
      }, out);
    }
  }

  function addFromTournament(season, out) {
    if(!season || !season.groups) return;
    var groups = season.groups;

    Object.keys(groups).forEach(function(groupName) {
      var group = groups[groupName] || {};
      var fixtures = group.fixtures || [];
      var teamIndices = group.teamIndices || [];

      for(var r = 0; r < fixtures.length; r++) {
        var round = fixtures[r] || [];
        for(var m = 0; m < round.length; m++) {
          var match = round[m] || {};
          if(typeof match.home !== 'number' || typeof match.away !== 'number') continue;
          var homeIdx = teamIndices[match.home];
          var awayIdx = teamIndices[match.away];
          if(typeof homeIdx !== 'number' || typeof awayIdx !== 'number') continue;
          if(!Array.isArray(season.teams)) continue;
          if(!season.teams[homeIdx] || !season.teams[awayIdx]) continue;

          var key = 'group-' + groupName + '-' + r + '-' + m;
          var result = pickResult(season.results, key);
          if(!result) continue;

          out.push({
            seasonName: season.name || '(Unnamed)',
            mode: season.mode || 'tournament',
            stage: 'Group ' + groupName + ' R' + (r + 1),
            home: season.teams[homeIdx],
            away: season.teams[awayIdx],
            hg: result.hg,
            ag: result.ag
          });
        }
      }
    });

    if(season.knockoutBracket && Array.isArray(season.knockoutBracket.rounds)) {
      var knockoutRounds = season.knockoutBracket.rounds;
      var knockoutResolve = buildTeamResolver(
        season,
        function(fromRound, matchId) {
          var round = knockoutRounds[fromRound];
          if(!Array.isArray(round)) return null;
          return round[matchId] || null;
        },
        function(fromRound, matchId) {
          return 'knockout-' + fromRound + '-' + matchId;
        }
      );

      addFromRoundArray(season, {
        rounds: knockoutRounds,
        keyBuilder: function(r, m) { return 'knockout-' + r + '-' + m; },
        stageLabel: function(r) { return 'Knockout R' + (r + 1); },
        resolveTeam: knockoutResolve
      }, out);
    }
  }

  function collectAllPlayedMatches(state) {
    var out = [];
    if(!state || !state.seasons) return out;

    Object.keys(state.seasons).forEach(function(sk) {
      var season = state.seasons[sk];
      if(!season || !season.results) return;

      addFromRoundArray(season, {
        rounds: season.rounds,
        keyBuilder: function(r, m) { return r + '-' + m; },
        stageLabel: function(r) { return 'League Round ' + (r + 1); }
      }, out);

      if(season.cup && Array.isArray(season.cup.rounds)) {
        var cupRounds = season.cup.rounds;
        var cupResolve = buildTeamResolver(
          season,
          function(fromRound, matchId) {
            var round = cupRounds[fromRound];
            if(!Array.isArray(round)) return null;
            return round[matchId] || null;
          },
          function(fromRound, matchId) {
            return 'cup-' + fromRound + '-' + matchId;
          }
        );

        addFromRoundArray(season, {
          rounds: cupRounds,
          keyBuilder: function(r, m) { return 'cup-' + r + '-' + m; },
          stageLabel: function(r) { return 'Cup Round ' + (r + 1); },
          resolveTeam: cupResolve
        }, out);
      }

      addFromDoubleElimination(season, out);
      addFromSwiss(season, out);
      addFromTournament(season, out);
    });

    return out;
  }

  function analyzeHeadToHead(state, teamA, teamB) {
    var all = collectAllPlayedMatches(state);
    var filtered = [];
    var seq = 0;

    var W = 0, D = 0, L = 0;
    var gf = 0, ga = 0;

    all.forEach(function(m) {
      var isDirect = (m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA);
      if(!isDirect) return;

      var aGoals = (m.home === teamA) ? m.hg : m.ag;
      var bGoals = (m.home === teamA) ? m.ag : m.hg;

      gf += aGoals;
      ga += bGoals;

      if(aGoals > bGoals) W++;
      else if(aGoals < bGoals) L++;
      else D++;

      filtered.push({
        seasonName: m.seasonName,
        mode: m.mode,
        stage: m.stage,
        score: teamA + ' ' + aGoals + '-' + bGoals + ' ' + teamB,
        _seq: seq++
      });
    });

    return {
      teamA: teamA,
      teamB: teamB,
      total: filtered.length,
      W: W,
      D: D,
      L: L,
      GF: gf,
      GA: ga,
      matches: filtered
    };
  }

  function analyzeTeamProfile(state, teamName) {
    var all = collectAllPlayedMatches(state);
    var details = [];
    var seq = 0;
    var byMode = {};
    var bySeason = {};

    var total = 0;
    var W = 0, D = 0, L = 0;
    var GF = 0, GA = 0, Pts = 0;

    all.forEach(function(m) {
      var involved = (m.home === teamName || m.away === teamName);
      if(!involved) return;

      var isHome = m.home === teamName;
      var myGoals = isHome ? m.hg : m.ag;
      var oppGoals = isHome ? m.ag : m.hg;
      var oppName = isHome ? m.away : m.home;

      var rs;
      if(myGoals > oppGoals) {
        rs = 'W';
        W++;
        Pts += 3;
      } else if(myGoals < oppGoals) {
        rs = 'L';
        L++;
      } else {
        rs = 'D';
        D++;
        Pts += 1;
      }

      total++;
      GF += myGoals;
      GA += oppGoals;

      var modeKey = m.mode || 'unknown';
      var seasonKey = m.seasonName || '(Unnamed)';

      if(!byMode[modeKey]) byMode[modeKey] = { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };
      if(!bySeason[seasonKey]) bySeason[seasonKey] = { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };

      [byMode[modeKey], bySeason[seasonKey]].forEach(function(x) {
        x.P++;
        x.GF += myGoals;
        x.GA += oppGoals;
        if(rs === 'W') { x.W++; x.Pts += 3; }
        else if(rs === 'L') { x.L++; }
        else { x.D++; x.Pts += 1; }
      });

      details.push({
        seasonName: seasonKey,
        mode: modeKey,
        stage: m.stage,
        opponent: oppName,
        result: rs,
        score: teamName + ' ' + myGoals + '-' + oppGoals + ' ' + oppName,
        _seq: seq++
      });
    });

    return {
      team: teamName,
      total: total,
      W: W,
      D: D,
      L: L,
      GF: GF,
      GA: GA,
      GD: GF - GA,
      Pts: Pts,
      byMode: byMode,
      bySeason: bySeason,
      matches: details
    };
  }

  function createEl(tag, className, html) {
    var el = document.createElement(tag);
    if(className) el.className = className;
    if(html != null) el.innerHTML = html;
    return el;
  }

  function ensureStyles() {
    if(document.getElementById('teo-widget-style')) return;
    var style = document.createElement('style');
    style.id = 'teo-widget-style';
    style.textContent = [
      '#teoFab{position:fixed;right:18px;bottom:18px;z-index:9999;border:none;background:linear-gradient(135deg,#14b8a6,#38bdf8);color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;font-size:14px;letter-spacing:.2px;cursor:pointer;box-shadow:0 10px 24px rgba(56,189,248,.35)}',
      '#teoPanel{position:fixed;right:18px;bottom:76px;z-index:9999;width:520px;max-width:calc(100vw - 24px);max-height:78vh;overflow:hidden;background:linear-gradient(160deg,#f7fbff 0%,#eef6ff 45%,#e8f3ff 100%);color:#0f172a;border:1px solid rgba(14,116,144,.22);border-radius:16px;box-shadow:0 24px 50px rgba(2,132,199,.22);display:none}',
      '#teoPanel.open{display:block;animation:teoPop .16s ease-out}',
      '@keyframes teoPop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#teoHead{display:flex;justify-content:center;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(14,116,144,.2);background:linear-gradient(90deg,rgba(186,230,253,.8),rgba(187,247,208,.75))}',
      '#teoHead strong{font-size:15px;color:#0b3a66}',
      '#teoBody{padding:14px 16px;overflow:auto;max-height:calc(78vh - 62px)}',
      '#teoFunctionDesc{font-size:12px;color:#164e63;margin:8px 0 8px;background:rgba(186,230,253,.65);border:1px solid rgba(56,189,248,.45);padding:8px 10px;border-radius:10px}',
      '#teoPanel label{display:block;margin:10px 0 5px;font-size:12px;font-weight:700;color:#0c4a6e;text-transform:uppercase;letter-spacing:.4px}',
      '#teoPanel select,#teoPanel button{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #93c5fd;background:#ffffff;color:#0f172a}',
      '#teoPanel select:focus,#teoPanel button:focus{outline:2px solid rgba(56,189,248,.45);outline-offset:1px}',
      '#teoPanel .teo-hidden{display:none}',
      '#teoRunBtn{margin-top:12px;background:linear-gradient(135deg,#22c55e,#06b6d4);border-color:#22c55e;color:#ffffff;font-weight:800;cursor:pointer;box-shadow:0 8px 18px rgba(34,197,94,.24)}',
      '#teoResult{margin-top:14px;padding:12px;background:linear-gradient(180deg,#ffffff,#f4f9ff);border:1px solid rgba(125,211,252,.55);border-radius:12px;max-height:46vh;overflow:auto;font-size:13px;line-height:1.5}',
      '#teoResult .muted{color:#475569}',
      '#teoResult ul{padding-left:18px;margin:8px 0 0}',
      '#teoResult .teo-title{font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px}',
      '#teoResult .teo-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 10px}',
      '#teoResult .teo-pill{background:linear-gradient(160deg,rgba(74,222,128,.2),rgba(56,189,248,.22));border:1px solid rgba(56,189,248,.4);border-radius:10px;padding:7px 8px}',
      '#teoResult .teo-pill b{color:#0f172a}',
      '#teoResult .teo-section{margin-top:10px;padding-top:8px;border-top:1px dashed rgba(100,116,139,.4)}',
      '#teoResult .teo-section h5{margin:0 0 6px 0;color:#0369a1;font-size:12px;text-transform:uppercase;letter-spacing:.4px}',
      '#teoResult .teo-summary{list-style:none;padding:0;margin:6px 0 0;border:1px solid rgba(125,211,252,.55);border-radius:10px;overflow:hidden}',
      '#teoResult .teo-summary li{display:grid;grid-template-columns:1.55fr .55fr 1fr .9fr .7fr .7fr;gap:8px;align-items:center;padding:7px 10px}',
      '#teoResult .teo-summary li:nth-child(even){background:rgba(186,230,253,.25)}',
      '#teoResult .teo-summary .teo-summary-head{background:rgba(125,211,252,.45);font-size:11px;font-weight:800;letter-spacing:.3px;text-transform:uppercase}',
      '#teoResult .teo-summary .name{font-weight:700;color:#0f172a}',
      '#teoResult .teo-summary .num{text-align:right;font-variant-numeric:tabular-nums}',
      '#teoResult .teo-history li{margin-bottom:4px}',
      '#teoCaptureBtn{margin-top:8px;background:linear-gradient(135deg,#f59e0b,#f97316);border-color:#f97316;color:#fff;font-weight:700;cursor:pointer}',
      '#teoAdminWrap{margin-top:10px;padding:10px;border:1px solid rgba(56,189,248,.45);border-radius:10px;background:rgba(186,230,253,.28)}',
      '#teoAdminWrap h6{margin:0 0 8px 0;font-size:12px;color:#0c4a6e;text-transform:uppercase;letter-spacing:.4px}',
      '#teoTeamManageBtn{background:#0ea5e9;color:#fff;border-color:#0284c7;font-weight:700}',
      '#teoTeamManager{margin-top:8px;padding-top:8px;border-top:1px dashed rgba(14,116,144,.4)}',
      '#teoTeamManager .actions{display:flex;gap:8px;margin-bottom:8px}',
      '#teoTeamManager .actions button{flex:1;padding:7px 8px;font-size:12px}',
      '#teoTeamChecklist{max-height:180px;overflow:auto;background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:8px}',
      '#teoTeamChecklist label{display:flex;align-items:center;gap:8px;margin:4px 0;color:#0f172a;font-size:13px;font-weight:500;text-transform:none;letter-spacing:0}',
      '#teoTeamManager .status{font-size:12px;color:#0c4a6e;margin-top:6px}',
      '@media (max-width: 700px){#teoFab{right:12px;bottom:12px}#teoPanel{right:12px;bottom:62px;width:calc(100vw - 16px);max-height:82vh}#teoBody{max-height:calc(82vh - 62px)}#teoResult{max-height:44vh}#teoResult .teo-metrics{grid-template-columns:1fr}#teoResult .teo-summary li{grid-template-columns:1.2fr .5fr .85fr .85fr .65fr .65fr;padding:7px 8px;gap:6px;font-size:12px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function mountTeo() {
    if(document.getElementById('teoFab')) return;

    ensureStyles();

    var fab = createEl('button', '', 'Tèo Robot');
    fab.id = 'teoFab';

    var panel = createEl('div');
    panel.id = 'teoPanel';

    var head = createEl('div');
    head.id = 'teoHead';
    head.appendChild(createEl('strong', '', 'Tèo Robot'));

    var body = createEl('div');
    body.id = 'teoBody';
    body.innerHTML = [
      '<label for="teoFunction">Chức năng</label>',
      '<select id="teoFunction">' +
        '<option value="h2h">#1 - Lịch sử đối đầu 2 team</option>' +
        '<option value="profile">#2 - Thông tin cá nhân 1 team</option>' +
      '</select>',
      '<div id="teoFunctionDesc">Chức năng #1: Kiểm tra lịch sử đối đầu của 2 team (toàn bộ dữ liệu).</div>',
      '<label for="teoTeamA" id="teoTeamALabel">Team A</label>',
      '<select id="teoTeamA"></select>',
      '<label for="teoTeamB" id="teoTeamBLabel">Team B</label>',
      '<select id="teoTeamB"></select>',
      '<button id="teoRunBtn" type="button">Kiểm tra đối đầu</button>',
      '<button id="teoCaptureBtn" type="button" class="teo-hidden">📸 Chụp tổng hợp vào clipboard</button>',
      '<div id="teoAdminWrap" class="teo-hidden">' +
        '<h6>Tùy chỉnh Admin</h6>' +
        '<button id="teoTeamManageBtn" type="button">Chọn team hiển thị trong danh sách</button>' +
        '<div id="teoTeamManager" class="teo-hidden">' +
          '<div class="actions">' +
            '<button id="teoSelectAllTeamsBtn" type="button">Chọn tất cả</button>' +
            '<button id="teoClearAllTeamsBtn" type="button">Bỏ tất cả</button>' +
          '</div>' +
          '<div id="teoTeamChecklist"></div>' +
          '<div class="actions" style="margin-top:8px;">' +
            '<button id="teoSaveVisibleTeamsBtn" type="button">Lưu danh sách</button>' +
            '<button id="teoResetVisibleTeamsBtn" type="button">Reset mặc định</button>' +
          '</div>' +
          '<div id="teoTeamManagerStatus" class="status"></div>' +
        '</div>' +
      '</div>',
      '<div id="teoResult"><span class="muted">Chọn 2 team và bấm Kiểm tra đối đầu.</span></div>'
    ].join('');

    panel.appendChild(head);
    panel.appendChild(body);
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var fnEl = document.getElementById('teoFunction');
    var fnDescEl = document.getElementById('teoFunctionDesc');
    var teamALabelEl = document.getElementById('teoTeamALabel');
    var teamAEl = document.getElementById('teoTeamA');
    var teamBEl = document.getElementById('teoTeamB');
    var teamBLabelEl = document.getElementById('teoTeamBLabel');
    var runBtn = document.getElementById('teoRunBtn');
    var captureBtn = document.getElementById('teoCaptureBtn');
    var adminWrapEl = document.getElementById('teoAdminWrap');
    var teamManageBtnEl = document.getElementById('teoTeamManageBtn');
    var teamManagerEl = document.getElementById('teoTeamManager');
    var teamChecklistEl = document.getElementById('teoTeamChecklist');
    var selectAllTeamsBtnEl = document.getElementById('teoSelectAllTeamsBtn');
    var clearAllTeamsBtnEl = document.getElementById('teoClearAllTeamsBtn');
    var saveVisibleTeamsBtnEl = document.getElementById('teoSaveVisibleTeamsBtn');
    var resetVisibleTeamsBtnEl = document.getElementById('teoResetVisibleTeamsBtn');
    var teamManagerStatusEl = document.getElementById('teoTeamManagerStatus');
    var resultEl = document.getElementById('teoResult');
    var hasSummary = false;

    function setCaptureEnabled(on) {
      hasSummary = !!on;
      captureBtn.classList.toggle('teo-hidden', !on);
    }

    function setTeamManagerStatus(msg) {
      teamManagerStatusEl.textContent = msg || '';
    }

    function getVisibleSelection(allTeams) {
      var selectedSet = loadVisibleTeamsSet();
      if(!selectedSet) {
        return allTeams.reduce(function(acc, t) { acc[String(t).toLowerCase()] = true; return acc; }, Object.create(null));
      }
      return selectedSet;
    }

    function renderAdminState() {
      adminWrapEl.classList.toggle('teo-hidden', !isAdminSession());
    }

    function renderTeamManager() {
      var state = loadState();
      var allTeams = getAllTeamNames(state);
      var selectedSet = getVisibleSelection(allTeams);

      if(!allTeams.length) {
        teamChecklistEl.innerHTML = '<div class="muted">Chưa có dữ liệu team.</div>';
        return;
      }

      teamChecklistEl.innerHTML = allTeams.map(function(team, i) {
        var checked = !!selectedSet[String(team).toLowerCase()] ? 'checked' : '';
        return '<label><input type="checkbox" class="teo-team-cb" data-team="' + team.replace(/"/g, '&quot;') + '" ' + checked + '/><span>' + (i + 1) + '. ' + team + '</span></label>';
      }).join('');

      setTeamManagerStatus('Đang chọn ' + Object.keys(selectedSet).length + ' / ' + allTeams.length + ' team hiển thị.');
    }

    function collectCheckedTeams() {
      var nodes = teamChecklistEl.querySelectorAll('.teo-team-cb');
      var out = [];
      nodes.forEach(function(node) {
        if(node.checked) out.push(node.getAttribute('data-team'));
      });
      return out;
    }

    function loadHtml2CanvasLib() {
      if(window.html2canvas) return Promise.resolve(window.html2canvas);
      return new Promise(function(resolve, reject) {
        var existing = document.getElementById('teo-html2canvas-lib');
        if(existing) {
          existing.addEventListener('load', function() { resolve(window.html2canvas); }, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        var script = document.createElement('script');
        script.id = 'teo-html2canvas-lib';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.async = true;
        script.onload = function() { resolve(window.html2canvas); };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    function copyCanvasToClipboard(canvas) {
      return new Promise(function(resolve, reject) {
        if(!canvas || !canvas.toBlob) { reject(new Error('Canvas không hợp lệ')); return; }
        canvas.toBlob(function(blob) {
          if(!blob) { reject(new Error('Không tạo được ảnh')); return; }

          if(navigator.clipboard && window.ClipboardItem) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
              .then(resolve)
              .catch(reject);
            return;
          }

          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'teo-summary.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          reject(new Error('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Đã tải file PNG xuống máy.'));
        }, 'image/png');
      });
    }

    function captureSummaryToClipboard() {
      if(!hasSummary) {
        resultEl.innerHTML = '<span class="muted">Chưa có summary để chụp.</span>';
        return;
      }

      captureBtn.disabled = true;
      var oldText = captureBtn.textContent;
      captureBtn.textContent = 'Đang chụp...';

      var oldMaxHeight = resultEl.style.maxHeight;
      var oldOverflow = resultEl.style.overflow;
      resultEl.style.maxHeight = 'none';
      resultEl.style.overflow = 'visible';

      loadHtml2CanvasLib()
        .then(function(html2canvas) {
          return html2canvas(resultEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        })
        .then(copyCanvasToClipboard)
        .then(function() {
          captureBtn.textContent = '✅ Đã copy vào clipboard';
          setTimeout(function() { captureBtn.textContent = oldText; }, 1300);
        })
        .catch(function(err) {
          captureBtn.textContent = oldText;
          alert(err && err.message ? err.message : 'Chụp summary thất bại.');
        })
        .finally(function() {
          resultEl.style.maxHeight = oldMaxHeight;
          resultEl.style.overflow = oldOverflow;
          captureBtn.disabled = false;
        });
    }

    function renderTeamOptions() {
      var state = loadState();
      var teams = getVisibleTeamNames(state);

      if(teams.length === 0) {
        teamAEl.innerHTML = '<option value="">(không có dữ liệu team)</option>';
        teamBEl.innerHTML = '<option value="">(không có dữ liệu team)</option>';
        return;
      }

      var options = teams.map(function(t) { return '<option value="' + t.replace(/"/g, '&quot;') + '">' + t + '</option>'; }).join('');
      teamAEl.innerHTML = options;
      teamBEl.innerHTML = options;

      if(teams.length > 1) teamBEl.selectedIndex = 1;
    }

    function renderH2HResult(summary) {
      if(summary.total === 0) {
        resultEl.innerHTML = '<div class="teo-title">Không tìm thấy trận đấu nào</div>' +
          '<div class="muted" style="margin-top:4px;">' + summary.teamA + ' và ' + summary.teamB + ' chưa gặp nhau trong dữ liệu hiện tại.</div>';
        setCaptureEnabled(false);
        return;
      }

      var latest = sortMatchesNewest(summary.matches).slice(0, 10);
      var wr = summary.total ? ((summary.W * 100 / summary.total).toFixed(1) + '%') : '0.0%';
      resultEl.innerHTML = [
        '<div class="teo-title">Đối đầu trực tiếp: ' + summary.teamA + ' vs ' + summary.teamB + '</div>',
        '<div class="teo-metrics">',
          '<div class="teo-pill">Tổng trận<br><b>' + summary.total + '</b></div>',
          '<div class="teo-pill">W-D-L<br><b>' + summary.W + '-' + summary.D + '-' + summary.L + '</b></div>',
          '<div class="teo-pill">Bàn thắng / Bàn thua<br><b>' + summary.GF + ' / ' + summary.GA + '</b></div>',
          '<div class="teo-pill">Hiệu số<br><b>' + (summary.GF - summary.GA) + '</b></div>',
          '<div class="teo-pill">Win Rate (' + summary.teamA + ')<br><b>' + wr + '</b></div>',
        '</div>',
        '<div class="teo-section"><h5>10 trận gần nhất (mới đến cũ)</h5></div>',
        '<ul class="teo-history">' + latest.map(function(m) {
          return '<li><span class="muted">[' + m.seasonName + ' | ' + m.stage + ']</span> ' + m.score + '</li>';
        }).join('') + '</ul>'
      ].join('');
      setCaptureEnabled(true);
    }

    function renderProfileResult(summary) {
      if(summary.total === 0) {
        resultEl.innerHTML = '<div class="teo-title">Không có dữ liệu trận đấu</div>' +
          '<div class="muted" style="margin-top:4px;">Chưa tìm thấy trận nào của ' + summary.team + ' trong dữ liệu hiện tại.</div>';
        setCaptureEnabled(false);
        return;
      }

      function buildSummaryRows(obj, sortedKeys) {
        var rows = [
          '<li class="teo-summary-head">' +
            '<span>Tên</span>' +
            '<span class="num">P</span>' +
            '<span class="num">W-D-L</span>' +
            '<span class="num">GF/GA</span>' +
            '<span class="num">WR</span>' +
            '<span class="num">Pts</span>' +
          '</li>'
        ];
        sortedKeys.forEach(function(key) {
          var x = obj[key];
          var wr = x.P ? ((x.W * 100 / x.P).toFixed(1) + '%') : '0.0%';
          rows.push(
            '<li>' +
              '<span class="name">' + key + '</span>' +
              '<span class="num">' + x.P + '</span>' +
              '<span class="num">' + x.W + '-' + x.D + '-' + x.L + '</span>' +
              '<span class="num">' + x.GF + '/' + x.GA + '</span>' +
              '<span class="num">' + wr + '</span>' +
              '<span class="num">' + x.Pts + '</span>' +
            '</li>'
          );
        });
        return rows.join('');
      }

      var modeKeys = Object.keys(summary.byMode).sort();
      var modeRows = buildSummaryRows(summary.byMode, modeKeys);

      var seasonKeys = Object.keys(summary.bySeason).sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      var seasonRows = buildSummaryRows(summary.bySeason, seasonKeys);

      var latest = sortMatchesNewest(summary.matches).slice(0, 10);
      var latestRows = latest.map(function(m) {
        return '<li><span class="muted">[' + m.seasonName + ' | ' + m.stage + ' | ' + m.result + ']</span> ' + m.score + '</li>';
      }).join('');
      var profileWr = summary.total ? ((summary.W * 100 / summary.total).toFixed(1) + '%') : '0.0%';

      resultEl.innerHTML = [
        '<div class="teo-title">Hồ sơ team: ' + summary.team + '</div>',
        '<div class="teo-metrics">',
          '<div class="teo-pill">Tổng trận<br><b>' + summary.total + '</b></div>',
          '<div class="teo-pill">W-D-L<br><b>' + summary.W + '-' + summary.D + '-' + summary.L + '</b></div>',
          '<div class="teo-pill">GF/GA/GD<br><b>' + summary.GF + '/' + summary.GA + '/' + summary.GD + '</b></div>',
          '<div class="teo-pill">Điểm (3-1-0)<br><b>' + summary.Pts + '</b></div>',
          '<div class="teo-pill">Win Rate<br><b>' + profileWr + '</b></div>',
        '</div>',
        '<div class="teo-section"><h5>Tổng hợp theo chế độ</h5></div>',
        '<ul class="teo-summary">' + modeRows + '</ul>',
        '<div class="teo-section"><h5>Tổng hợp theo mùa</h5></div>',
        '<ul class="teo-summary">' + seasonRows + '</ul>',
        '<div class="teo-section"><h5>10 trận gần nhất (mới đến cũ)</h5></div>',
        '<ul class="teo-history">' + latestRows + '</ul>'
      ].join('');
      setCaptureEnabled(true);
    }

    function applyFunctionUI() {
      var fn = fnEl.value;
      if(fn === 'profile') {
        fnDescEl.textContent = 'Chức năng #2: Kiểm tra thông tin cá nhân 1 team, truy xuất toàn bộ dữ liệu và tổng hợp.';
        teamALabelEl.textContent = 'Team';
        teamBLabelEl.classList.add('teo-hidden');
        teamBEl.classList.add('teo-hidden');
        runBtn.textContent = 'Xem thông tin team';
        resultEl.innerHTML = '<span class="muted">Chọn 1 team và bấm Xem thông tin team.</span>';
        setCaptureEnabled(false);
      } else {
        fnDescEl.textContent = 'Chức năng #1: Kiểm tra lịch sử đối đầu của 2 team (toàn bộ dữ liệu).';
        teamALabelEl.textContent = 'Team A';
        teamBLabelEl.classList.remove('teo-hidden');
        teamBEl.classList.remove('teo-hidden');
        runBtn.textContent = 'Kiểm tra đối đầu';
        resultEl.innerHTML = '<span class="muted">Chọn 2 team và bấm Kiểm tra đối đầu.</span>';
        setCaptureEnabled(false);
      }
    }

    fab.addEventListener('click', function() {
      panel.classList.toggle('open');
      if(panel.classList.contains('open')) {
        renderAdminState();
        renderTeamOptions();
        applyFunctionUI();
      }
    });

    captureBtn.addEventListener('click', function() {
      captureSummaryToClipboard();
    });

    teamManageBtnEl.addEventListener('click', function() {
      teamManagerEl.classList.toggle('teo-hidden');
      if(!teamManagerEl.classList.contains('teo-hidden')) renderTeamManager();
    });

    selectAllTeamsBtnEl.addEventListener('click', function() {
      teamChecklistEl.querySelectorAll('.teo-team-cb').forEach(function(cb) { cb.checked = true; });
      setTeamManagerStatus('Đã chọn tất cả team. Nhấn Lưu danh sách để áp dụng.');
    });

    clearAllTeamsBtnEl.addEventListener('click', function() {
      teamChecklistEl.querySelectorAll('.teo-team-cb').forEach(function(cb) { cb.checked = false; });
      setTeamManagerStatus('Đã bỏ tất cả team. Nhấn Lưu danh sách để áp dụng.');
    });

    saveVisibleTeamsBtnEl.addEventListener('click', function() {
      var selected = collectCheckedTeams();
      if(!selected.length) {
        setTeamManagerStatus('Cần chọn ít nhất 1 team để hiển thị.');
        return;
      }
      saveVisibleTeams(selected);
      renderTeamOptions();
      setTeamManagerStatus('Đã lưu: ' + selected.length + ' team hiển thị.');
    });

    resetVisibleTeamsBtnEl.addEventListener('click', function() {
      clearVisibleTeamsFilter();
      renderTeamOptions();
      renderTeamManager();
      setTeamManagerStatus('Đã reset về mặc định (hiển thị tất cả team).');
    });

    fnEl.addEventListener('change', function() {
      applyFunctionUI();
    });

    runBtn.addEventListener('click', function() {
      var state = loadState();
      if(!state || !state.seasons) {
        resultEl.innerHTML = '<span class="muted">Không đọc được dữ liệu mùa giải.</span>';
        setCaptureEnabled(false);
        return;
      }

      var fn = fnEl.value;
      var a = teamAEl.value;
      var b = teamBEl.value;

      if(fn === 'profile') {
        if(!a) {
          resultEl.innerHTML = '<span class="muted">Vui lòng chọn team.</span>';
          setCaptureEnabled(false);
          return;
        }
        renderProfileResult(analyzeTeamProfile(state, a));
        return;
      }

      if(!a || !b) {
        resultEl.innerHTML = '<span class="muted">Vui lòng chọn đủ 2 team.</span>';
        setCaptureEnabled(false);
        return;
      }
      if(a === b) {
        resultEl.innerHTML = '<span class="muted">Vui lòng chọn 2 team khác nhau.</span>';
        setCaptureEnabled(false);
        return;
      }

      renderH2HResult(analyzeHeadToHead(state, a, b));
    });

    renderAdminState();
    applyFunctionUI();
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTeo);
  } else {
    mountTeo();
  }
})();
