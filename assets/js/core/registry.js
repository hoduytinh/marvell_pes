// Marvell PES Club - core/registry.js
// Mode registry: one place describing how each season format is laid out and rendered.
// core/render.js dispatches through getModeDef(s) instead of long if/else chains.
//
// Fields:
//   roundSelector  'league' (checkbox picker) | 'tournament' (select) | 'none'
//   standings      show the standings card
//   fixtures       show the fixtures card
//   extras         show charts / stats / simulation / insights rows
//   leagueExtras   run league insights + season stats + tracker in refreshSeasonUI
//   autoRounds     auto-generate round-robin rounds when a season has none
//   stageColumn    add the "Stage" column to the standings header
//   bracket        has a bracket area (enables the "Bracket" view tab)
//   refresh(s)          full render used by refreshAll()
//   standingsFn(s)      custom standings renderer (null = league table)
//   fixturesFn(s)       fixtures renderer used by renderFixturesWithRound()
//   bracketFn(s, ui)    bracket/extra area renderer used by refreshSeasonUI()
var PES_MODES = {
  'league': {
    label: 'League',
    roundSelector: 'league', standings: true, fixtures: true, extras: true,
    leagueExtras: true, autoRounds: true, stageColumn: false, bracket: false,
    refresh: function(s){
      renderStandings();
      renderFixtures();
      renderInsights();
      renderSeasonStats();
      try { drawRankChart(); } catch(e) {}
    },
    standingsFn: null,
    fixturesFn: function(s){ renderFixtures(); },
    bracketFn: null
  },
  'cup': {
    label: 'Knock-out',
    roundSelector: 'none', standings: true, fixtures: false, extras: false,
    leagueExtras: false, autoRounds: false, stageColumn: false, bracket: true,
    refresh: function(s){ renderCupBracket(s); renderCupStandings(s); },
    standingsFn: function(s){ renderCupStandings(s); },
    fixturesFn: function(s){ renderFixtures(); },
    bracketFn: function(s, ui){
      if(s.cup && ui.cupWrap && ui.cupHost){
        ui.cupWrap.classList.remove('hidden');
        ui.cupHost.innerHTML = '';
        renderCupBracket(s);
      }
    }
  },
  'double-elimination': {
    label: 'Double Elimination',
    roundSelector: 'none', standings: true, fixtures: false, extras: false,
    leagueExtras: true, autoRounds: true, stageColumn: false, bracket: true,
    refresh: function(s){ renderDoubleEliminationBracket(s); renderCupStandings(s); },
    standingsFn: function(s){ renderCupStandings(s); },
    fixturesFn: function(s){ renderFixtures(); },
    bracketFn: function(s, ui){
      if(s.doubleElimination && ui.deWrap && ui.deHost){
        ui.deWrap.classList.remove('hidden');
        ui.deHost.innerHTML = '';
        renderDoubleEliminationBracket(s);
      }
    }
  },
  'swiss': {
    label: 'Swiss System',
    roundSelector: 'none', standings: true, fixtures: false, extras: false,
    leagueExtras: true, autoRounds: true, stageColumn: false, bracket: true,
    refresh: function(s){ PES_MODES['league'].refresh(s); },
    standingsFn: function(s){ renderSwissStandings(s); },
    fixturesFn: function(s){ renderFixtures(); },
    bracketFn: function(s, ui){
      if(s.swiss && ui.cupWrap && ui.cupHost){
        ui.cupWrap.classList.remove('hidden');
        ui.cupHost.innerHTML = '';
        renderSwissBracket(s);
      }
    }
  },
  'chess-swiss': {
    label: 'Chess-Swiss',
    roundSelector: 'league', standings: true, fixtures: true, extras: true,
    leagueExtras: false, autoRounds: false, stageColumn: false, bracket: false,
    refresh: function(s){ refreshChessSwiss(s); },
    standingsFn: function(s){ renderChessSwissStandings(s); },
    fixturesFn: function(s){ renderChessSwissFixtures(s); },
    bracketFn: function(s, ui){
      if(ui.cupHost) ui.cupHost.innerHTML = '';
    }
  },
  'tournament': {
    label: 'Tournament',
    roundSelector: 'tournament', standings: true, fixtures: true, extras: false,
    leagueExtras: false, autoRounds: true, stageColumn: true, bracket: true,
    refresh: function(s){
      renderTournamentStandings(s);
      renderTournamentGroups(s);
      var roundSelElem = $('roundSel');
      renderTournamentFixtures(roundSelElem ? (roundSelElem.value || 'group-0') : 'group-0');
      renderTournamentKnockoutBracket(s);
    },
    standingsFn: function(s){ renderTournamentStandings(s); },
    fixturesFn: function(s){ renderTournamentFixtures($('roundSel').value || 'group-0'); },
    bracketFn: function(s, ui){
      if(!ui.cupWrap || !ui.cupHost) return;
      ui.cupWrap.classList.remove('hidden');
      if(s.knockoutBracket){
        ui.cupHost.innerHTML = '';
        renderTournamentKnockoutBracket(s);
      } else {
        ui.cupHost.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted); border: 1px dashed var(--border); border-radius: 6px; background: var(--card);">⏳ Complete all group stage matches to unlock knockout bracket</div>';
      }
    }
  },
  'legend': {
    label: 'Legend',
    roundSelector: 'none', standings: false, fixtures: false, extras: false,
    leagueExtras: false, autoRounds: true, stageColumn: false, bracket: false,
    refresh: function(s){ renderLegendMode(s); },
    standingsFn: null,
    fixturesFn: function(s){ renderFixtures(); },
    bracketFn: function(s){ renderLegendMode(s); }
  },
  'ranking': {
    label: 'Ranking',
    roundSelector: 'none', standings: false, fixtures: false, extras: false,
    leagueExtras: false, autoRounds: true, stageColumn: false, bracket: false,
    refresh: function(s){ renderRankingMode(s); },
    standingsFn: null,
    fixturesFn: function(s){ renderFixtures(); },
    bracketFn: null
  }
};

// Unknown / missing mode falls back to league (older seasons have no `mode`).
function getModeDef(s){
  return (s && PES_MODES[s.mode]) || PES_MODES['league'];
}
