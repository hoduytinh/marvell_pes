(function(){
  'use strict';

  var STORAGE_KEY = 'pes-league-v15';
  var VISIBLE_TEAMS_KEY = 'teoVisibleTeams';
  var THEME_KEY = 'pes-theme';

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

  function loadWidgetTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'blue'; }
    catch(_) { return 'blue'; }
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

      // Swiss playoff bracket is built from the qualifiers sub-list, so the
      // resolved indices reference playoffQualifiers, not season.teams directly.
      var playoffQualifiers = season.swiss.playoffQualifiers || [];

      for(var pr = 0; pr < playoff.rounds.length; pr++) {
        var pRound = playoff.rounds[pr] || [];
        for(var pm = 0; pm < pRound.length; pm++) {
          var pMatch = pRound[pm] || {};
          var pHomeQual = playoffResolve(pMatch.home);
          var pAwayQual = playoffResolve(pMatch.away);
          if(typeof pHomeQual !== 'number' || typeof pAwayQual !== 'number') continue;
          var pHomeIdx = playoffQualifiers[pHomeQual];
          var pAwayIdx = playoffQualifiers[pAwayQual];
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

  function getTeamTrophies(state, teamName) {
    var trophies = []; // { year, eventName, medal }
    if(!state || !state.seasons) return trophies;
    var nameLower = String(teamName).toLowerCase();
    Object.keys(state.seasons).forEach(function(sk) {
      var s = state.seasons[sk];
      if(!s || s.mode !== 'legend' || !Array.isArray(s.timelines)) return;
      s.timelines.forEach(function(timeline) {
        if(!timeline || !Array.isArray(timeline.events)) return;
        timeline.events.forEach(function(event) {
          if(!event || !event.medals) return;
          var eName = event.name || event.title || '';
          var year = timeline.year || '';
          ['gold','silver','bronze'].forEach(function(medal) {
            var list = event.medals[medal];
            if(!Array.isArray(list)) return;
            list.forEach(function(t) {
              if(String(t || '').toLowerCase() === nameLower) {
                trophies.push({ year: year, eventName: eName, medal: medal });
              }
            });
          });
        });
      });
    });
    trophies.sort(function(a, b) {
      return String(b.year).localeCompare(String(a.year));
    });
    return trophies;
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
      matches: details,
      trophies: getTeamTrophies(state, teamName)
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
      '#teoFab,#teoPanel{--teo-bg1:#f7fbff;--teo-bg2:#eef6ff;--teo-bg3:#e8f3ff;--teo-text:#0f172a;--teo-border:rgba(14,116,144,.22);--teo-head1:rgba(186,230,253,.8);--teo-head2:rgba(187,247,208,.75);--teo-head-text:#0b3a66;--teo-desc-bg:rgba(186,230,253,.65);--teo-desc-border:rgba(56,189,248,.45);--teo-desc-text:#164e63;--teo-label:#0c4a6e;--teo-control-bg:#ffffff;--teo-control-border:#93c5fd;--teo-control-text:#0f172a;--teo-result-bg1:#ffffff;--teo-result-bg2:#f4f9ff;--teo-result-border:rgba(125,211,252,.55);--teo-muted:#475569;--teo-pill1:rgba(74,222,128,.2);--teo-pill2:rgba(56,189,248,.22);--teo-pill-border:rgba(56,189,248,.4);--teo-section:#0369a1;--teo-section-border:rgba(100,116,139,.4);--teo-summary-border:rgba(125,211,252,.55);--teo-summary-alt:rgba(186,230,253,.25);--teo-summary-head:rgba(125,211,252,.45);--teo-fab1:#14b8a6;--teo-fab2:#38bdf8;--teo-fab-shadow:rgba(56,189,248,.35);--teo-run1:#22c55e;--teo-run2:#06b6d4;--teo-run-shadow:rgba(34,197,94,.24);--teo-capture1:#f59e0b;--teo-capture2:#f97316}',
      '#teoPanel[data-theme="dark"],#teoFab[data-theme="dark"]{--teo-bg1:#081120;--teo-bg2:#0d1730;--teo-bg3:#132142;--teo-text:#e7eeff;--teo-border:rgba(59,130,246,.22);--teo-head1:rgba(30,64,175,.42);--teo-head2:rgba(8,145,178,.34);--teo-head-text:#f8fbff;--teo-desc-bg:rgba(29,78,216,.18);--teo-desc-border:rgba(96,165,250,.28);--teo-desc-text:#c7d5f5;--teo-label:#9fd2ff;--teo-control-bg:#0b1530;--teo-control-border:#2a466d;--teo-control-text:#eaf1ff;--teo-result-bg1:#0b1327;--teo-result-bg2:#101a31;--teo-result-border:rgba(71,85,105,.6);--teo-muted:#9fb2d6;--teo-pill1:rgba(34,197,94,.14);--teo-pill2:rgba(14,165,233,.14);--teo-pill-border:rgba(125,211,252,.35);--teo-section:#7dd3fc;--teo-section-border:rgba(148,163,184,.35);--teo-summary-border:rgba(148,163,184,.28);--teo-summary-alt:rgba(148,163,184,.08);--teo-summary-head:rgba(14,165,233,.22);--teo-fab1:#0f766e;--teo-fab2:#0ea5e9;--teo-fab-shadow:rgba(0,0,0,.35);--teo-run1:#16a34a;--teo-run2:#06b6d4;--teo-run-shadow:rgba(6,182,212,.24);--teo-capture1:#f59e0b;--teo-capture2:#ea580c}',
      '#teoPanel[data-theme="blue"],#teoFab[data-theme="blue"]{--teo-bg1:#eaf4ff;--teo-bg2:#dbeafe;--teo-bg3:#d7ebff;--teo-text:#102544;--teo-border:rgba(30,58,95,.22);--teo-head1:rgba(125,211,252,.72);--teo-head2:rgba(96,165,250,.42);--teo-head-text:#10386b;--teo-desc-bg:rgba(186,230,253,.72);--teo-desc-border:rgba(56,189,248,.45);--teo-desc-text:#164e63;--teo-label:#0c4a6e;--teo-control-bg:#ffffff;--teo-control-border:#93c5fd;--teo-control-text:#102544;--teo-result-bg1:#ffffff;--teo-result-bg2:#eff6ff;--teo-result-border:rgba(96,165,250,.45);--teo-muted:#47627f;--teo-pill1:rgba(59,130,246,.16);--teo-pill2:rgba(56,189,248,.2);--teo-pill-border:rgba(56,189,248,.35);--teo-section:#0369a1;--teo-section-border:rgba(59,130,246,.26);--teo-summary-border:rgba(96,165,250,.4);--teo-summary-alt:rgba(191,219,254,.35);--teo-summary-head:rgba(147,197,253,.45);--teo-fab1:#0ea5e9;--teo-fab2:#2563eb;--teo-fab-shadow:rgba(37,99,235,.28);--teo-run1:#0284c7;--teo-run2:#22c55e;--teo-run-shadow:rgba(14,165,233,.22);--teo-capture1:#f59e0b;--teo-capture2:#fb7185}',
      '#teoFab{position:fixed;right:18px;bottom:18px;z-index:9999;border:none;background:linear-gradient(135deg,var(--teo-fab1),var(--teo-fab2));color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;font-size:14px;letter-spacing:.2px;cursor:pointer;box-shadow:0 10px 24px var(--teo-fab-shadow)}',
      '#teoPanel{position:fixed;right:18px;bottom:76px;z-index:9999;width:520px;max-width:calc(100vw - 24px);max-height:78vh;overflow:hidden;background:linear-gradient(160deg,var(--teo-bg1) 0%,var(--teo-bg2) 45%,var(--teo-bg3) 100%);color:var(--teo-text);border:1px solid var(--teo-border);border-radius:16px;box-shadow:0 24px 50px rgba(2,132,199,.22);display:none}',
      '#teoPanel.open{display:block;animation:teoPop .16s ease-out}',
      '@keyframes teoPop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#teoHead{display:flex;justify-content:center;align-items:center;padding:14px 16px;border-bottom:1px solid var(--teo-border);background:linear-gradient(90deg,var(--teo-head1),var(--teo-head2))}',
      '#teoHead strong{font-size:15px;color:var(--teo-head-text)}',
      '#teoBody{padding:14px 16px;overflow:auto;max-height:calc(78vh - 62px)}',
      '#teoTopRow{display:block}',
      '#teoFunctionDesc{font-size:12px;color:var(--teo-desc-text);margin:8px 0 8px;background:var(--teo-desc-bg);border:1px solid var(--teo-desc-border);padding:8px 10px;border-radius:10px}',
      '#teoTeamsRow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:end}',
      '#teoTeamsRow .teo-field{min-width:0}',
      '#teoTeamsRow .teo-field label{margin-top:0}',
      '#teoPanel label{display:block;margin:10px 0 5px;font-size:12px;font-weight:700;color:var(--teo-label);text-transform:uppercase;letter-spacing:.4px}',
      '#teoPanel select,#teoPanel button{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--teo-control-border);background:var(--teo-control-bg);color:var(--teo-control-text)}',
      '#teoPanel select:focus,#teoPanel button:focus{outline:2px solid rgba(56,189,248,.45);outline-offset:1px}',
      '#teoPanel .teo-hidden{display:none}',
      '#teoActionsRow{display:flex;gap:8px;margin-top:12px;align-items:stretch}',
      '#teoActionsRow #teoRunBtn{flex:1;margin-top:0}',
      '#teoActionsRow #teoCaptureBtn{flex:0 0 auto;width:auto;padding-left:14px;padding-right:14px;margin-top:0;white-space:nowrap}',
      '#teoRunBtn{background:linear-gradient(135deg,var(--teo-run1),var(--teo-run2));border-color:var(--teo-run1);color:#ffffff;font-weight:800;cursor:pointer;box-shadow:0 8px 18px var(--teo-run-shadow)}',

      '#teoResult{margin-top:14px;padding:12px;background:linear-gradient(180deg,var(--teo-result-bg1),var(--teo-result-bg2));border:1px solid var(--teo-result-border);border-radius:12px;max-height:46vh;overflow:auto;font-size:13px;line-height:1.5}',
      '#teoResult .muted{color:var(--teo-muted)}',
      '#teoResult ul{padding-left:18px;margin:8px 0 0}',
      '#teoResult .teo-title{font-size:14px;font-weight:800;color:var(--teo-text);margin-bottom:8px}',
      '#teoResult .teo-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 10px}',
      '#teoResult .teo-pill{background:linear-gradient(160deg,var(--teo-pill1),var(--teo-pill2));border:1px solid var(--teo-pill-border);border-radius:10px;padding:7px 8px}',
      '#teoResult .teo-pill b{color:var(--teo-text)}',
      '#teoResult .teo-section{margin-top:10px;padding-top:8px;border-top:1px dashed var(--teo-section-border)}',
      '#teoResult .teo-section h5{margin:0 0 6px 0;color:var(--teo-section);font-size:12px;text-transform:uppercase;letter-spacing:.4px}',
      '#teoResult .teo-summary{list-style:none;padding:0;margin:6px 0 0;border:1px solid var(--teo-summary-border);border-radius:10px;overflow:hidden}',
      '#teoResult .teo-summary li{display:grid;grid-template-columns:1.55fr .55fr 1fr .9fr .7fr .7fr;gap:8px;align-items:center;padding:7px 10px}',
      '#teoResult .teo-summary li:nth-child(even){background:var(--teo-summary-alt)}',
      '#teoResult .teo-summary .teo-summary-head{background:var(--teo-summary-head);font-size:11px;font-weight:800;letter-spacing:.3px;text-transform:uppercase}',
      '#teoResult .teo-summary .name{font-weight:700;color:var(--teo-text)}',
      '#teoResult .teo-summary.teo-mode-summary .name{text-transform:uppercase;letter-spacing:.3px}',
      '#teoResult .teo-summary .num{text-align:right;font-variant-numeric:tabular-nums}',
      '#teoResult .teo-history li{margin-bottom:4px}',
      '#teoResult .teo-trophies{list-style:none;padding:0;margin:6px 0 8px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
      '#teoResult .teo-trophies li{background:var(--teo-summary-alt);border:1px solid var(--teo-summary-border);border-radius:8px;padding:5px 8px;font-size:12px;line-height:1.4}',
      '#teoResult .teo-trophies .trophy-year{display:block;font-size:10px;color:var(--teo-muted);margin-top:2px}',
      '#teoCaptureBtn{margin-top:8px;background:linear-gradient(135deg,var(--teo-capture1),var(--teo-capture2));border-color:var(--teo-capture2);color:#fff;font-weight:700;cursor:pointer}',
      '#teoAdminWrap{margin-top:10px;padding:10px;border:1px solid var(--teo-desc-border);border-radius:10px;background:var(--teo-desc-bg)}',
      '#teoAdminWrap h6{margin:0 0 8px 0;font-size:12px;color:var(--teo-label);text-transform:uppercase;letter-spacing:.4px}',
      '#teoTeamManageBtn{background:linear-gradient(135deg,var(--teo-fab1),var(--teo-fab2));color:#fff;border-color:var(--teo-fab2);font-weight:700}',
      '#teoTeamManager{margin-top:8px;padding-top:8px;border-top:1px dashed var(--teo-section-border)}',
      '#teoTeamManager .actions{display:flex;gap:8px;margin-bottom:8px}',
      '#teoTeamManager .actions button{flex:1;padding:7px 8px;font-size:12px}',
      '#teoTeamChecklist{max-height:180px;overflow:auto;background:var(--teo-control-bg);border:1px solid var(--teo-control-border);border-radius:8px;padding:8px}',
      '#teoTeamChecklist label{display:flex;align-items:center;gap:8px;margin:4px 0;color:var(--teo-text);font-size:13px;font-weight:500;text-transform:none;letter-spacing:0}',
      '#teoTeamManager .status{font-size:12px;color:var(--teo-label);margin-top:6px}',
      '@media (max-width: 700px){#teoFab{right:12px;bottom:12px}#teoPanel{right:12px;bottom:62px;width:calc(100vw - 16px);max-height:82vh}#teoBody{max-height:calc(82vh - 62px)}#teoResult{max-height:44vh}#teoResult .teo-metrics{grid-template-columns:1fr}#teoResult .teo-summary li{grid-template-columns:1.2fr .5fr .85fr .85fr .65fr .65fr;padding:7px 8px;gap:6px;font-size:12px}}',
      '@media (max-width: 480px){#teoTopRow{grid-template-columns:1fr}#teoTeamsRow{grid-template-columns:1fr}}'
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
      '<div id="teoTopRow">' +
        '<div class="teo-field">' +
          '<label for="teoFunction">Chức năng</label>' +
          '<select id="teoFunction">' +
            '<option value="profile">Hồ sơ cá nhân</option>' +
            '<option value="h2h">Lịch sử đối đầu</option>' +
          '</select>' +
        '</div>' +
      '</div>',
      '<div id="teoFunctionDesc">Tổng hợp toàn bộ thành tích, thống kê theo mùa và chế độ thi đấu.</div>',
      '<div id="teoTeamsRow">' +
        '<div class="teo-field" id="teoTeamAField">' +
          '<label for="teoTeamA" id="teoTeamALabel">Team A</label>' +
          '<select id="teoTeamA"></select>' +
        '</div>' +
        '<div class="teo-field" id="teoTeamBField">' +
          '<label for="teoTeamB" id="teoTeamBLabel">Team B</label>' +
          '<select id="teoTeamB"></select>' +
        '</div>' +
      '</div>',
      '<div id="teoActionsRow">' +
        '<button id="teoRunBtn" type="button">Kiểm tra đối đầu</button>' +
        '<button id="teoCaptureBtn" type="button" class="teo-hidden">📸 Capture</button>' +
      '</div>',
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
    var teamAFieldEl = document.getElementById('teoTeamAField');
    var teamALabelEl = document.getElementById('teoTeamALabel');
    var teamAEl = document.getElementById('teoTeamA');
    var teamBFieldEl = document.getElementById('teoTeamBField');
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

      var latest = sortMatchesNewest(summary.matches).slice(0, 5);
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
        '<div class="teo-section"><h5>5 trận gần nhất</h5></div>',
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
        var ay = parseSeasonYear(a);
        var by = parseSeasonYear(b);
        if(by !== ay) return by - ay;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      var seasonRows = buildSummaryRows(summary.bySeason, seasonKeys);

      var latest = sortMatchesNewest(summary.matches).slice(0, 5);
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
        '<div class="teo-section"><h5>Danh Hiệu</h5></div>',
        summary.trophies.length
          ? '<ul class="teo-trophies">' + summary.trophies.map(function(t) {
              var icon = t.medal === 'gold' ? '🥇' : t.medal === 'silver' ? '🥈' : '🥉';
              return '<li>' + icon + ' ' + t.eventName + (t.year ? '<span class="trophy-year">' + t.year + '</span>' : '') + '</li>';
            }).join('') + '</ul>'
          : '<div class="muted" style="margin:4px 0 8px">Chưa có danh hiệu nào.</div>',
        '<div class="teo-section"><h5>Tổng hợp theo chế độ</h5></div>',
        '<ul class="teo-summary teo-mode-summary">' + modeRows + '</ul>',
        '<div class="teo-section"><h5>Tổng hợp theo mùa</h5></div>',
        '<ul class="teo-summary">' + seasonRows + '</ul>',
        '<div class="teo-section"><h5>5 trận gần nhất</h5></div>',
        '<ul class="teo-history">' + latestRows + '</ul>'
      ].join('');
      setCaptureEnabled(true);
    }

    function applyFunctionUI() {
      var fn = fnEl.value;
      if(fn === 'profile') {
        fnDescEl.textContent = 'Tổng hợp toàn bộ thành tích, thống kê theo mùa và chế độ thi đấu.';
        teamALabelEl.textContent = 'Team';
        teamAFieldEl.classList.remove('teo-hidden');
        teamBFieldEl.classList.add('teo-hidden');
        runBtn.textContent = 'Xem thông tin team';
        resultEl.innerHTML = '<span class="muted">Chọn 1 team và bấm Xem thông tin team.</span>';
        setCaptureEnabled(false);
      } else {
        fnDescEl.textContent = 'So sánh kết quả tất cả các trận giữa 2 team trong toàn bộ dữ liệu.';
        teamALabelEl.textContent = 'Team A';
        teamAFieldEl.classList.remove('teo-hidden');
        teamBFieldEl.classList.remove('teo-hidden');
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
