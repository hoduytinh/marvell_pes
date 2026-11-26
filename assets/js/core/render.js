// Marvell PES Club - core/render.js (split from app.js; shared global scope, load order set in index.html)
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
        migrateState(state);
        console.log('Force refreshed data from file (EMBEDDED_DATA)');
        console.log('Loaded seasons:', Object.keys(state.seasons));
        
        // Clear admin mode when refreshing from file to prevent UI/functionality mismatch
        authLogout(true);
        
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
      if(s) getModeDef(s).refresh(s);
    }

    // Render fixtures with the mode-specific renderer (league reads the round checkboxes itself)
    function renderFixturesWithRound() {
      var s = activeSeason();
      getModeDef(s).fixturesFn(s);
    }

    function renderStandings(){
      var s=activeSeason(); if(!s) return;
      
      // Non-league formats provide their own standings renderer
      var def = getModeDef(s);
      if(def.standingsFn){ def.standingsFn(s); return; }
      
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
      var leagueFinished = (s.rounds && s.rounds.length>0 && s.rounds.every(function(rd, ri){ return rd.every(function(m, mi){ return s.results[ri+'-'+mi]; }); })) || !!s.forceEnded || !!s.locked;
      rows.forEach(function(r,idx){
        if(search && r.team.toLowerCase().indexOf(search)===-1) return;
        var isTop=idx<topBand,isEuro=idx>=topBand&&idx<euroBand,isPlayoff=playoffBand>0&&idx>=rows.length-rel-playoffBand&&idx<rows.length-rel,isRel=idx>=rows.length-rel;
        var tr=document.createElement('tr');
        if(isTop) tr.classList.add('band-top'); else if(isEuro) tr.classList.add('band-euro'); else if(isPlayoff) tr.classList.add('band-playoff'); else if(isRel) tr.classList.add('band-rel');
        if(leagueFinished && idx===0) tr.classList.add('band-champion');
        var medal = leagueFinished ? (idx===0?' 🏆':idx===1?' 🥈':idx===2?' 🥉':'') : '';
        var logo=s.teamLogos&&s.teamLogos[r.idx]?'<img src="'+s.teamLogos[r.idx]+'" alt="logo"/>':'';
        var badge=logo?('<span class="badge">'+logo+'</span>'):('<span class="badge" style="background:'+(s.teamColors[r.idx]||'#1b2550')+'"></span>');
        var curPos = idx + 1; var prevPos = (typeof prevMap==='object' && prevMap) ? (prevMap[r.idx] || null) : null; var change = (prevPos==null) ? 0 : (prevPos - curPos);
  tr.innerHTML='<td class="pos">'+(idx+1)+'</td>'+
          '<td class="team">'+badge+escapeHtml(r.team)+medal+'</td>'+
          '<td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.D+'</td><td>'+r.L+'</td>'+
          '<td>'+r.GF+'</td><td>'+r.GA+'</td><td>'+(r.GD>=0?'+':'')+r.GD+'</td><td>'+r.Pts+'</td>'+
          '<td>'+renderFormCells(r.form.slice(-7))+'</td>' + '<td><canvas class="spark" data-team="'+r.idx+'"></canvas></td>' + renderDeltaCell(change, prevPos!=null);
        tr.addEventListener('click',function(){openTeamDialog(r.idx)});
        tbody.appendChild(tr);
      });
      drawRankSparks(rows.map(function(x){return x.idx}))
    }

    // Old manual Hall of Legend / PES Ranking seasons (features removed) stay in the data, hidden from the list
    function pesIsSpecialSeason(s){ return !!s && (s.mode === 'legend' || s.mode === 'ranking'); }

    // #seasonSel always shows the current season (also on the Dashboard); picking another season leaves the Dashboard.
    function pesSeasonSelSync(){
      var sel = $('seasonSel');
      if(sel) sel.value = state.current;
    }

    // Season list status: 'done' (ended/locked/complete), 'live' (has results), 'idle' (not started)
    var PES_SEASON_ICON = { done: '🏁', live: '🟢', idle: '⚪' };
    function pesSeasonStatus(s){
      if(s.locked || s.forceEnded) return 'done';
      try { if(typeof careerSeasonFinishes === 'function' && careerSeasonFinishes(s)) return 'done'; } catch(e){}
      var res = s.results || {};
      for(var k in res){ var r = res[k]; if(r && !r.bye && r.hg != null && r.hg !== '') return 'live'; }
      return 'idle';
    }

    function refreshSeasonUI(){
      var s=activeSeason(); if(!s) return;
      
var sel=$('seasonSel'); sel.innerHTML=''; 
      // Use custom order if available, otherwise sort by creation timestamp
      var seasonIds;
      if (state.seasonOrder && state.seasonOrder.length > 0) {
        // Use custom order
        seasonIds = state.seasonOrder.slice(); // Clone array
        
        // Seasons not in the order yet are new -> put them at the top
        var newIds = Object.keys(state.seasons).filter(function(id) {
          return seasonIds.indexOf(id) === -1 && id.indexOf('separator-') !== 0;
        }).sort(function(a, b) { return (state.seasons[b].createdAt || 0) - (state.seasons[a].createdAt || 0); });
        seasonIds = newIds.concat(seasonIds);
        
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

      // Old Legend/Ranking seasons and manual separators are not listed
      var listIds = seasonIds.filter(function(id){
        return id.indexOf('separator-') !== 0 && !pesIsSpecialSeason(state.seasons[id]);
      });
      if(pesIsSpecialSeason(s) && listIds.length){
        state.current = listIds[0];
        s = activeSeason();
      }

      // One <optgroup> per season year (newest year first, custom order kept inside a year);
      // seasons without a year go to a last "Khác" group.
      var byYear = {}, years = [];
      listIds.forEach(function(id){
        var y = typeof seasonYearOf === 'function' ? seasonYearOf(state.seasons[id]) : '';
        if(!byYear[y]){ byYear[y] = []; years.push(y); }
        byYear[y].push(id);
      });
      years.sort(function(a, b){ return !a ? 1 : !b ? -1 : (+b) - (+a); });
      var L2 = function(vi, en){ return typeof crL === 'function' ? crL(vi, en) : vi; };
      years.forEach(function(y){
        var grp = document.createElement('optgroup');
        grp.label = y ? '📅 ' + y : (typeof crL === 'function' ? crL('Khác', 'Other') : 'Khác');
        byYear[y].forEach(function(id){
          var o = document.createElement('option');
          var st = pesSeasonStatus(state.seasons[id]);
          o.value = id;
          o.textContent = PES_SEASON_ICON[st] + ' ' + state.seasons[id].name;
          o.title = st === 'done' ? L2('Đã kết thúc', 'Ended') : st === 'live' ? L2('Đang diễn ra', 'In progress') : L2('Chưa bắt đầu', 'Not started');
          o.setAttribute('data-status', st);
          grp.appendChild(o);
        });
        sel.appendChild(grp);
      });
      sel.value=state.current;
      pesSeasonSelSync();
      var legendText='Top '+(s.settings.top||4)+' (🔵), '+(s.settings.euro||6)+' (🟠)'; if((s.settings.playoff||0)>0){ legendText+=', Playoff ('+(s.settings.playoff||0)+', 🟣)'; } legendText+=', rớt hạng ('+(s.settings.rel||3)+', 🔴)'; $('bandLegend').textContent=legendText;
      var def = getModeDef(s);
      var isChessSwiss = (s.mode === 'chess-swiss');

      // Auto-generate round-robin rounds only for formats that use them
      if((!s.rounds||!s.rounds.length) && def.autoRounds){ s.rounds=generateFixtures(s.teamCount) }
      
      // Toggle round selector UI based on mode
      document.querySelectorAll('.tournamentOnly').forEach(function(el) { el.style.display = def.roundSelector === 'tournament' ? '' : 'none'; });
      document.querySelectorAll('.leagueOnly').forEach(function(el) { el.style.display = def.roundSelector === 'league' ? '' : 'none'; });
      if(def.roundSelector === 'league') {
        var toggleBtn = document.getElementById('roundSelToggle');
        if(toggleBtn) toggleBtn.style.display = '';
      }
      
      var fixturesSection = document.querySelector('[data-sec="fixtures"]');
      var chartsSection = $('chartsRow');
      var statsRow = $('statsRow');
      var statsSection = null;
      
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
      
      // Containers owned by one mode are removed when another season is shown
      // (renderTournamentGroups() re-creates #tournamentGroups for tournament seasons)
      var tournamentGroups = document.getElementById('tournamentGroups');
      if(tournamentGroups) tournamentGroups.remove();

      // Show/hide layout sections according to the mode definition
      var standingsSection = document.querySelector('main.container section.card.grow');
      if(standingsSection) standingsSection.style.display = def.standings ? '' : 'none';
      if(fixturesSection) fixturesSection.style.display = def.fixtures ? '' : 'none';
      var extrasDisplay = def.extras ? '' : 'none';
      [chartsSection, statsSection, statsRow, simSection, seasonStatsSection, insightsSection].forEach(function(el){
        if(el) el.style.display = extrasDisplay;
      });
      
      // Update table headers for tournament mode
      var standingsHeader = document.querySelector('#standings').parentNode.querySelector('thead tr');
      if(def.stageColumn && standingsHeader) {
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
      
      // Legend and Ranking render their own containers instead of standings/fixtures
      if(def.standings) {
        renderStandings(); renderFixturesWithRound(); 
      }
      
      // League-style insights, stats and tracker
      if(def.leagueExtras) {
        renderInsights(); 
        renderSeasonStats(); 
        renderStandingTracker();
        
        // Force show and populate the simulation table as well
        var simTable = document.getElementById('simTable');
        if(simTable && simTable.innerHTML.trim() === '') {
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
      // Chess-swiss League-style extras (charts, insights, season stats)
      if(isChessSwiss) {
        var csS = activeSeason();
        if(csS && csS.chessSwiss){
          var simLbl = document.getElementById('simProbLabel');
          if(simLbl) simLbl.textContent = 'Xác suất (Vô địch / Top 3 / Nửa trên)';
          try { renderChessSwissStandingTracker(csS); } catch(e) {}
          try { renderChessSwissInsights(csS); } catch(e) {}
          try { renderChessSwissSeasonStats(csS); } catch(e) {}
        }
      } else {
        var simLbl2 = document.getElementById('simProbLabel');
        if(simLbl2) simLbl2.textContent = 'Xác suất (Vô địch / Top4 / Rớt hạng)';
      }
      // Bracket area: hide both hosts, then let the mode render into its own
      s = activeSeason();
      var ui = {
        cupWrap: document.getElementById('cupBracketWrap'), cupHost: document.getElementById('cupBracket'),
        deWrap: document.getElementById('doubleEliminationWrap'), deHost: document.getElementById('doubleEliminationBracket')
      };
      if(ui.cupWrap) ui.cupWrap.classList.add('hidden');
      if(ui.deWrap) ui.deWrap.classList.add('hidden');
      if(s) {
        var bdef = getModeDef(s);
        if(bdef.bracketFn) bdef.bracketFn(s, ui);
      }
      renderViewTabs(s);
      renderSeasonOverview(s);
      if(typeof ssRenderBoard === 'function') ssRenderBoard(s);
      showAdmin(isAdminUser());
      if(typeof seasonMetaUI === 'function') seasonMetaUI(s);
      applyTheme();
    }
