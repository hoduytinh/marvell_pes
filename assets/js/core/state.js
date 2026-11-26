// Marvell PES Club - core/state.js (split from app.js; shared global scope, load order set in index.html)
    var STORAGE_KEY=systemStorageKey(PES_SYSTEM_ID);
    var THEME_KEY='pes-theme';
  var state={seasons:{},current:null,teamMasterList:[],logoMasterList:[]};
  
  // Default team logo — dùng file ảnh trong repo để dễ thay đổi sau này.
  var DEFAULT_TEAM_LOGO = 'logos/Default.jpg';

  // Ensure every team without a manually chosen logo uses the default logo.
  // Also upgrades previous baked-in defaults (gamepad / PS monogram SVG) to the new one.
  function isAutoDefaultLogo(val){
    if(!val || typeof val !== 'string') return false;
    if(val === DEFAULT_TEAM_LOGO) return true;
    var m = val.match(/^data:image\/svg\+xml;base64,(.*)$/);
    if(!m) return false;
    try {
      var svg = atob(m[1]);
      // Old auto defaults: gamepad icon (#60a5fa) or PlayStation "PS" monogram (#003791).
      return svg.indexOf('#60a5fa') !== -1 || svg.indexOf('#003791') !== -1;
    } catch(_) { return false; }
  }
  function normalizeTeamLogos(st){
    if(!st || !st.seasons) return;
    Object.keys(st.seasons).forEach(function(key){
      var se = st.seasons[key];
      if(!se) return;
      var count = (se.teams && se.teams.length) || se.teamCount || 0;
      if(!Array.isArray(se.teamLogos)) se.teamLogos = [];
      for(var i=0;i<count;i++){
        if(!se.teamLogos[i] || isAutoDefaultLogo(se.teamLogos[i])) se.teamLogos[i] = DEFAULT_TEAM_LOGO;
      }
    });
  }

  // Data schema version. Bump when the stored shape changes and add a step in migrateState().
  var SCHEMA_VERSION = 1;

  // Bring any loaded state (cloud / localStorage / embedded / import / backup) up to the
  // current shape. Idempotent: safe to run on already-migrated data.
  function migrateState(st){
    if(!st || typeof st !== 'object') return st;
    if(!st.seasons || typeof st.seasons !== 'object') st.seasons = {};
    if(!Array.isArray(st.teamMasterList)) st.teamMasterList = [];
    if(!Array.isArray(st.logoMasterList)) st.logoMasterList = [];
    // v0 -> v1: guarantee the per-season fields that renderers access without guards
    Object.keys(st.seasons).forEach(function(key){
      var se = st.seasons[key];
      if(!se || typeof se !== 'object') return;
      if(!se.results || typeof se.results !== 'object') se.results = {};
      if(!se.settings || typeof se.settings !== 'object') se.settings = {top:4,euro:6,playoff:0,rel:3,h2h:false,enableRegen:false};
      if(!Array.isArray(se.teams)) se.teams = [];
      if(!Array.isArray(se.teamColors)) se.teamColors = [];
      fillKnockoutGames(se, !st.koAutoTagged);
    });
    // One-time: games filled before the `auto` flag existed were tagged above. Later games typed in
    // by hand (🎮 editor, no auto flag) are never re-tagged, even if they are all 1-0.
    if(!st.koAutoTagged){ st.koAutoTagged = 1; koGamesFilled++; }
    // The old manual Hall of Legend (mode 'legend' seasons) was removed: keep its photos as the
    // auto Hall's state.hallPhotos[year]. The old seasons stay in the data, hidden from the list.
    if(!st.hallPhotos || typeof st.hallPhotos !== 'object'){
      var hp = {};
      Object.keys(st.seasons).forEach(function(key){
        var se = st.seasons[key];
        if(!se || se.mode !== 'legend' || !Array.isArray(se.timelines)) return;
        se.timelines.forEach(function(tl){
          var y = String((tl && tl.year) || '').trim();
          ((tl && tl.pictures) || []).forEach(function(p){
            if(!p || !y) return;
            var a = hp[y] || (hp[y] = []);
            if(a.indexOf(p) === -1) a.push(p);
          });
        });
      });
      st.hallPhotos = hp;
    }
    normalizeTeamLogos(st);
    st.schemaVersion = SCHEMA_VERSION;
    return st;
  }

  // Knock-out series are Bo3/Bo5: a series result without per-game scores gets one 1-0 game per
  // game won (winner's and loser's games alternate, winner first, so the winner takes the last game).
  // Only fills when games are missing or don't add up to the series (see careerGamesOf).
  // Generated games carry auto:1 so goal-shape stats (clean sheets, 1-goal wins, scorelines) skip them.
  var KO_RESULT_PREFIXES = ['cup-', 'knockout-', 'knockoutB-', 'swiss-playoff-', 'de-'];
  var koGamesFilled = 0;
  function fillKnockoutGames(se, tagLegacy){
    Object.keys(se.results).forEach(function(key){
      if(!KO_RESULT_PREFIXES.some(function(p){ return key.indexOf(p) === 0; })) return;
      var r = se.results[key];
      if(!r || typeof r !== 'object' || r.hg === '' || r.ag === '' || r.hg == null || r.ag == null) return;
      var h = +r.hg, a = +r.ag;
      if(!isFinite(h) || !isFinite(a) || h < 0 || a < 0 || h % 1 || a % 1 || h + a === 0 || h + a > 5 || h > 3 || a > 3) return;
      if(Array.isArray(r.games) && r.games.length){
        var sh = 0, sa = 0;
        r.games.forEach(function(g){
          if(!g) return;
          var gh = +g.h, ga = +g.a;
          if(gh > ga || (gh === ga && g.p === 'h')) sh++; else if(ga > gh || (gh === ga && g.p === 'a')) sa++;
        });
        if(sh === h && sa === a){
          // Older auto-filled series (before the `auto` flag): all 1-0 games in the generated order
          if(tagLegacy && !r.games.some(function(g){ return g.auto; }) && r.games.every(function(g, i){
            var homeGame = !(i % 2) || i >= 2 * Math.min(h, a) ? h >= a : h < a;
            return +g.h === (homeGame ? 1 : 0) && +g.a === (homeGame ? 0 : 1) && !g.p;
          })) r.games.forEach(function(g){ g.auto = 1; });
          return;
        }
      }
      var homeWins = h >= a, w = homeWins ? h : a, l = homeWins ? a : h, games = [];
      for(var i = 0; i < w; i++){
        games.push(homeWins ? {h:1, a:0, auto:1} : {h:0, a:1, auto:1});
        if(i < l) games.push(homeWins ? {h:0, a:1, auto:1} : {h:1, a:0, auto:1});
      }
      r.games = games;
      koGamesFilled++;
    });
  }
    var standingsMode='overall';

    function saveAll(){
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}
      if(typeof scheduleOverviewRefresh === 'function') scheduleOverviewRefresh();
      // Trigger debounced push to GitHub if PAT configured
      if(typeof CloudSync !== 'undefined' && CloudSync.canPush()) {
        CloudSync.schedulePush(state);
      }
    }

    // Bridge for Teo widget: shared "visible teams" config stored in state so it
    // syncs to all users via cloud (instead of being a per-browser localStorage override).
    window.pesGetTeoVisibleTeams = function(){
      return Array.isArray(state.teoVisibleTeams) ? state.teoVisibleTeams.slice() : null;
    };
    window.pesSetTeoVisibleTeams = function(list){
      if(Array.isArray(list) && list.length){ state.teoVisibleTeams = list.slice(); }
      else { delete state.teoVisibleTeams; }
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(_){}
      // Đẩy NGAY lên cloud (không chờ debounce 2s) để tránh mất cấu hình khi
      // đóng tab sớm hoặc bị reload ghi đè. Chỉ được khi có PAT + sync bật.
      var cloudSync = (typeof CloudSync !== 'undefined' && CloudSync.canPush());
      if(cloudSync){ try{ CloudSync.push(state); }catch(_){ CloudSync.schedulePush(state); } }
      return { savedLocal: true, cloudSync: cloudSync };
    };
    // Cho widget biết trạng thái cloud sync (có đẩy được lên server cho mọi người không)
    window.pesCloudSyncActive = function(){
      return (typeof CloudSync !== 'undefined' && CloudSync.canPush());
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
          migrateState(state);
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
            if(PES_SYSTEM_ID === DEFAULT_SYSTEM_ID) authLogout(true);
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
        settings:{top:4,euro:6,playoff:0,rel:3,h2h:false,enableRegen:false},
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
      } else if(type === 'chess-swiss') {
        // Chess-Swiss mode - rounds will be generated by buildChessSwiss
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
