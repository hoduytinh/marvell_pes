// Marvell PES Club - core/events.js (split from app.js; shared global scope, load order set in index.html)
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
          openAdminLogin();
        }
      });
      // Admin login dialog confirm handler
      (function(){
        var dlg=$('adminLoginDialog');
        if(!dlg) return;
        var input=$('adminPassInput'), err=$('adminPassError'), confirmBtn=$('adminPassConfirm');
        function tryLogin(e){
          if(e) e.preventDefault();
          var pw=input ? input.value : '';
          if(pw==='tinhteo123'){
            try{sessionStorage.setItem('pesAdmin','1')}catch(_){}
            if(input) input.value='';
            if(err) err.style.display='none';
            if(typeof dlg.close==='function'){ dlg.close(); } else { dlg.removeAttribute('open'); }
            showAdmin(true);
            updateCustomLinks();
            refreshSeasonUI();
          }else{
            if(err) err.style.display='block';
            if(input){ input.focus(); input.select(); }
          }
        }
        if(confirmBtn) confirmBtn.addEventListener('click', tryLogin);
        if(input) input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ tryLogin(e); } });
      })();
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
        var chessSwissDiv = $('chessSwissOption');
        
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
        if(chessSwissDiv) chessSwissDiv.style.display = (type === 'chess-swiss') ? 'block' : 'none';
        
        var dlg=$('seasonDialog'); 
        if(dlg && typeof dlg.showModal==='function'){dlg.showModal()} else {dlg.setAttribute('open','open')} 
      });
      
      // Show/hide 3rd place option based on mode
      $('newSeasonType').addEventListener('change', function() {
        var type = this.value;
        var thirdPlaceDiv = $('thirdPlaceOption');
        var groupsDiv = $('tournamentGroupOption');
        var teamCountWrapper = $('teamCountWrapper');
        var chessSwissDiv = $('chessSwissOption');
        
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
        if(chessSwissDiv) chessSwissDiv.style.display = (type === 'chess-swiss') ? 'block' : 'none';
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
        } else if(type === 'chess-swiss') {
          if(n < 2) {
            alert('Chess-Swiss yêu cầu tối thiểu 2 đội.');
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
        if(type==='chess-swiss' && n>=2){
          var csRounds = clamp(parseInt($('numChessSwissRounds').value,10)||5,1,20);
          season.numChessSwissRounds = csRounds;
          season.chessSwiss = buildChessSwiss(season, csRounds);
          season.rounds = [];
          if(!season.chessSwiss){
            toast('Không thể tạo lịch Chess-Swiss.');
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
                           season.mode === 'chess-swiss' ? 'Chess-Swiss' : 
                           season.mode === 'double-elimination' ? 'DE' : 
                           season.mode === 'tournament' ? 'Tournament' : 
                           season.mode === 'legend' ? 'Legend' : 'League';
            
            item.innerHTML = '<span class="drag-handle">☰</span>' +
                            '<span class="season-name">' + escapeHtml(season.name) + '</span>' +
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
        nameDialog.innerHTML='<form method="dialog"><h3>Team setup (<span id="nameCount"></span>)</h3><div class="grid-names" id="nameGrid"></div><div style="display:flex;justify-content:space-between;margin-top:12px"><div class="muted small">Đặt tên, màu, logo (PNG/JPG 1:1). Bấm [↓] để chọn từ danh sách đội.</div><div style="display:flex;gap:8px"><button value="cancel">Hủy</button><button id="saveNames" class="primary" value="confirm">Lưu</button></div></div></form>'; 
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
              '<h4 style="margin: 0 0 12px 0; color: var(--accent);">Select Team from Master List</h4>' +
              '<input type="text" class="team-search" placeholder="🔍 Tìm theo tên..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);" />' +
              '<div class="team-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
              state.teamMasterList.slice().sort(function(a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
              }).map(function(teamName, idx) { 
                return '<div class="team-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text);" data-team="' + teamName + '">' + teamName + '</div>'; 
              }).join('') +
              '<div class="team-empty" style="padding: 12px; text-align: center; color: var(--muted); display: none;">Không tìm thấy đội nào</div>' +
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
            
            // Live search filter: ignore case, strip diacritics, keep only
            // alphanumeric characters before comparing.
            var teamSearchInput = selectDialog.querySelector('.team-search');
            var teamEmptyMsg = selectDialog.querySelector('.team-empty');
            teamSearchInput.addEventListener('input', function() {
              var q = normalizeSearch(this.value);
              var visibleCount = 0;
              teamOptions.forEach(function(option) {
                var match = normalizeSearch(option.getAttribute('data-team')).indexOf(q) !== -1;
                option.style.display = match ? '' : 'none';
                if(match) visibleCount++;
              });
              teamEmptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
            });
            
            document.body.appendChild(selectDialog);
            if(typeof selectDialog.showModal === 'function') { 
              selectDialog.showModal(); 
            } else { 
              selectDialog.setAttribute('open', 'open'); 
            }
            setTimeout(function(){ teamSearchInput.focus(); }, 50);
            
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
              '<h4 style="margin: 0 0 12px 0; color: var(--accent);">Select Team Logo</h4>' +
              '<input type="text" class="logo-search" placeholder="🔍 Tìm theo tên..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);" />' +
              '<div class="logo-list" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
              teamLogoOptions.slice().sort(function(a, b) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
              }).map(function(logo, idx) { 
                return '<div class="logo-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text); display: flex; align-items: center; gap: 10px;" data-logo-data="' + logo.data + '" data-logo-name="' + logo.name + '">' + 
                  '<img src="' + logo.data + '" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;" />' +
                  '<span>' + logo.name + '</span>' +
                '</div>'; 
              }).join('') +
              '<div class="logo-empty" style="padding: 12px; text-align: center; color: var(--muted); display: none;">Không tìm thấy logo nào</div>' +
              '</div>' +
              '<div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">' +
              '<button type="button" class="logo-reset-btn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Reset về mặc định</button>' +
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
            
            // Reset to default logo
            var resetBtn = selectLogoDialog.querySelector('.logo-reset-btn');
            if(resetBtn) {
              resetBtn.addEventListener('click', function() {
                s.teamLogos[i] = DEFAULT_TEAM_LOGO;
                saveAll();
                toast('Reset logo to default for ' + (s.teams[i] || ('Team ' + (i + 1))));
                selectLogoDialog.close();
                document.body.removeChild(selectLogoDialog);
              });
            }
            
            // Live search filter: ignore case, strip diacritics, keep only
            // alphanumeric characters before comparing.
            var logoSearchInput = selectLogoDialog.querySelector('.logo-search');
            var logoEmptyMsg = selectLogoDialog.querySelector('.logo-empty');
            logoSearchInput.addEventListener('input', function() {
              var q = normalizeSearch(this.value);
              var visibleCount = 0;
              logoOptions.forEach(function(option) {
                var match = normalizeSearch(option.getAttribute('data-logo-name')).indexOf(q) !== -1;
                option.style.display = match ? '' : 'none';
                if(match) visibleCount++;
              });
              logoEmptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
            });
            
            document.body.appendChild(selectLogoDialog);
            if(typeof selectLogoDialog.showModal === 'function') { 
              selectLogoDialog.showModal(); 
            } else { 
              selectLogoDialog.setAttribute('open', 'open'); 
            }
            setTimeout(function(){ logoSearchInput.focus(); }, 50);
            
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
      $('btnSettings').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); $('cfgTop').value=s.settings.top; $('cfgEuro').value=s.settings.euro; $('cfgPlayoff').value=s.settings.playoff||0; $('cfgRel').value=s.settings.rel; $('cfgH2H').checked=!!s.settings.h2h; $('cfgEnableRegen').checked=s.settings.enableRegen!==false; $('cfgEnableRegenWrap').style.display=(s.mode==='swiss'||s.mode==='chess-swiss') ? '' : 'none'; var dlg=$('settingsDialog'); if(dlg && typeof dlg.showModal==='function'){dlg.showModal()} else {dlg.setAttribute('open','open')} });
      $('btnApplySettings').addEventListener('click',function(){ if(!ensureAdmin()) return; var s=activeSeason(); s.settings.top=clamp(parseInt($('cfgTop').value,10)||4,1,10); s.settings.euro=clamp(parseInt($('cfgEuro').value,10)||6,0,10); s.settings.playoff=clamp(parseInt($('cfgPlayoff').value,10)||0,0,8); s.settings.rel=clamp(parseInt($('cfgRel').value,10)||3,1,6); s.settings.h2h=$('cfgH2H').checked?true:false; s.settings.enableRegen=$('cfgEnableRegen').checked?true:false; saveAll(); var legendText='Top '+s.settings.top+' (🔵), '+s.settings.euro+' (🟠)'; if(s.settings.playoff>0){ legendText+=', Playoff ('+s.settings.playoff+', 🟣)'; } legendText+=', rớt hạng ('+s.settings.rel+', 🔴)'; $('bandLegend').textContent=legendText; refreshSeasonUI() });
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
          '<div class="season-logo-list" style="max-height: 260px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' + listHtml + '</div>' +
          '<div style="display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: 14px;">' +
            '<button type="button" id="seasonLogoClearBtn" style="padding: 8px 14px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Xoá logo</button>' +
            '<div style="display: flex; gap: 8px;">' +
              '<button type="button" id="seasonLogoUploadBtn" style="padding: 8px 14px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Upload mới...</button>' +
              '<button type="button" id="seasonLogoCancelBtn" style="padding: 8px 14px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Hủy</button>' +
            '</div>' +
          '</div>';

        document.body.appendChild(dlg);
        if(seasonLogoOptions.length > 0) {
          addListSearch(dlg.querySelector('.season-logo-list'), '.season-logo-option', function(el) { return el.getAttribute('data-logo-name'); });
        }

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
                return '<div class="tml-item" data-name="' + String(team).replace(/"/g, '&quot;') + '" style="padding: 4px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">' + 
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
        if(teamList.length > 0) {
          addListSearch(teamDialog.querySelector('#teamListDisplay'), '.tml-item', function(el) { return el.getAttribute('data-name'); }, { autofocus: false });
        }
        
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
            return '<div class="lml-item" data-name="' + String(logo.name).replace(/"/g, '&quot;') + '" style="padding: 8px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">' +
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
        if(teamLogos.length + seasonLogos.length > 0) {
          addListSearch(logoDialog.querySelector('#logoListDisplay'), '.lml-item', function(el) { return el.getAttribute('data-name'); }, { autofocus: false });
        }
        
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
        
        if(s.mode === 'chess-swiss') {
          // Chess-Swiss: random the selected rounds' matches
          var cs = s.chessSwiss;
          var csCheckboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked');
          var csRounds = [];
          csCheckboxes.forEach(function(cb){ csRounds.push(Number(cb.value)); });
          if(csRounds.length === 0 && cs.rounds.length > 0) csRounds = [cs.rounds.length - 1];
          if(csRounds.length === 0){ alert('Vui lòng chọn ít nhất một vòng để điền ngẫu nhiên.'); return; }
          csRounds.sort(function(a,b){ return a - b; });
          var csMinRound = csRounds[0];
          var csScoresPool = [0,0,1,1,1,2,2,2,3,3,4];
          csRounds.forEach(function(r){
            var rd = cs.rounds[r];
            if(!rd || !rd.matches) return;
            rd.matches.forEach(function(m, mi){
              if(cs.byeIndex != null && (m.home === cs.byeIndex || m.away === cs.byeIndex)) return;
              s.results['cswiss-' + r + '-' + mi] = {
                hg: csScoresPool[Math.floor(Math.random()*csScoresPool.length)],
                ag: csScoresPool[Math.floor(Math.random()*csScoresPool.length)]
              };
            });
          });
          // Pairings of rounds after the first edited one may change → clear them
          if(cs.rounds.length > csMinRound + 1){
            for(var rr = csMinRound + 1; rr < cs.rounds.length; rr++){
              var nrd = cs.rounds[rr];
              if(nrd && nrd.matches) nrd.matches.forEach(function(_, mi){ delete s.results['cswiss-' + rr + '-' + mi]; });
            }
            cs.rounds.length = csMinRound + 1;
          }
          checkAndGenerateNextChessSwiss(s);
          saveAll();
          refreshChessSwiss(s);
          return;
        }
        
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
        
        if(s.mode === 'chess-swiss') {
          var cs = s.chessSwiss;
          selectedRounds.sort(function(a,b){ return a - b; });
          var csMin = selectedRounds[0];
          selectedRounds.forEach(function(r){
            var rd = cs.rounds[r];
            if(!rd || !rd.matches) return;
            rd.matches.forEach(function(m, mi){
              if(cs.byeIndex != null && (m.home === cs.byeIndex || m.away === cs.byeIndex)) return; // keep BYE auto-win
              delete s.results['cswiss-' + r + '-' + mi];
            });
          });
          // Clearing changes later pairings → drop subsequent rounds
          if(cs.rounds.length > csMin + 1){
            for(var rr = csMin + 1; rr < cs.rounds.length; rr++){
              var nrd = cs.rounds[rr];
              if(nrd && nrd.matches) nrd.matches.forEach(function(_, mi){ delete s.results['cswiss-' + rr + '-' + mi]; });
            }
            cs.rounds.length = csMin + 1;
          }
          checkAndGenerateNextChessSwiss(s);
          saveAll();
          refreshChessSwiss(s);
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
      $('btnSimulate').addEventListener('click',function(){
        var s = activeSeason();
        if(s && s.mode === 'chess-swiss'){ runChessSwissSimulation(s, 300); return; }
        runSimulation(200);
      });
      $('btnExportHTML').addEventListener('click',function(){ 
        if(!ensureAdmin()) return;
        showSeasonExportDialog();
      });
      
      $('btnImportData').addEventListener('click',function(){ 
        if(!ensureAdmin()) return;
        showImportDataDialog();
      });
      
      $('btnBackupData').addEventListener('click',function(){ 
        if(!ensureAdmin()) return;
        showBackupDataDialog();
      });
      
      // Header dropdown menus: keep only one open, close on outside click,
      // and close the menu after an action button inside it is clicked.
      document.addEventListener('click', function(e){
        var openTarget = e.target.closest ? e.target.closest('header details.hmenu') : null;
        document.querySelectorAll('header details.hmenu[open]').forEach(function(d){
          if(d !== openTarget) d.removeAttribute('open');
        });
        var actionBtn = e.target.closest ? e.target.closest('.hmenu-panel button') : null;
        if(actionBtn){
          var dd = actionBtn.closest('details.hmenu');
          if(dd) dd.removeAttribute('open');
        }
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
                    '<div style="font-size: 12px; color: var(--muted);">' + item.teamCount + ' teams • ' + (item.mode === 'cup' ? 'Cup' : item.mode === 'tournament' ? 'Tournament' : item.mode === 'swiss' ? 'Swiss' : item.mode === 'chess-swiss' ? 'Chess-Swiss' : item.mode === 'legend' ? 'Legend' : 'League') + '</div>' +
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
          migrateState(state);
          
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
      
      // =================== DATA BACKUP (SNAPSHOTS) ===================
      // Snapshot blobs are stored in IndexedDB (large quota, hundreds of MB) instead
      // of localStorage (~5MB), because the full state with base64 images is several MB.
      // Only small metadata is kept in localStorage for a quick listing.
      var BACKUP_INDEX_KEY = 'pesBackupIndex';
      var BACKUP_EXTRA_KEYS = ['pesHomeLink', 'pesHomeLabel', 'pesCustomLinks', 'pesNotes'];
      var MAX_BACKUPS = 3;
      var BACKUP_DB_NAME = 'pesBackupDB';
      var BACKUP_STORE = 'snapshots';
      
      function openBackupDB() {
        return new Promise(function(resolve, reject) {
          if(!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }
          var req = indexedDB.open(BACKUP_DB_NAME, 1);
          req.onupgradeneeded = function() {
            var db = req.result;
            if(!db.objectStoreNames.contains(BACKUP_STORE)) {
              db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
            }
          };
          req.onsuccess = function() { resolve(req.result); };
          req.onerror = function() { reject(req.error || new Error('Cannot open backup DB')); };
        });
      }
      
      function backupDBPut(record) {
        return openBackupDB().then(function(db) {
          return new Promise(function(resolve, reject) {
            var tx = db.transaction(BACKUP_STORE, 'readwrite');
            tx.objectStore(BACKUP_STORE).put(record);
            tx.oncomplete = function() { db.close(); resolve(); };
            tx.onerror = function() { db.close(); reject(tx.error); };
            tx.onabort = function() { db.close(); reject(tx.error || new Error('quota')); };
          });
        });
      }
      
      function backupDBGet(id) {
        return openBackupDB().then(function(db) {
          return new Promise(function(resolve, reject) {
            var tx = db.transaction(BACKUP_STORE, 'readonly');
            var r = tx.objectStore(BACKUP_STORE).get(id);
            r.onsuccess = function() { db.close(); resolve(r.result || null); };
            r.onerror = function() { db.close(); reject(r.error); };
          });
        });
      }
      
      function backupDBDelete(id) {
        return openBackupDB().then(function(db) {
          return new Promise(function(resolve, reject) {
            var tx = db.transaction(BACKUP_STORE, 'readwrite');
            tx.objectStore(BACKUP_STORE).delete(id);
            tx.oncomplete = function() { db.close(); resolve(); };
            tx.onerror = function() { db.close(); reject(tx.error); };
          });
        });
      }
      
      function loadBackupIndex() {
        try {
          var raw = localStorage.getItem(BACKUP_INDEX_KEY);
          var arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr : [];
        } catch(_) { return []; }
      }
      
      function saveBackupIndex(idx) {
        try { localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(idx)); } catch(_) {}
      }
      
      function buildBackupSnapshot() {
        var extras = {};
        BACKUP_EXTRA_KEYS.forEach(function(k) {
          try { var v = localStorage.getItem(k); if(v !== null) extras[k] = v; } catch(_) {}
        });
        return {
          version: 1,
          createdAt: Date.now(),
          state: JSON.parse(JSON.stringify(state)),
          extras: extras
        };
      }
      
      // Returns a Promise<{ok, reason?, id?}>.
      function createBackup() {
        var idx = loadBackupIndex();
        if(idx.length >= MAX_BACKUPS) {
          return Promise.resolve({ ok: false, reason: 'max' });
        }
        var snap = buildBackupSnapshot();
        var id = 'bk_' + snap.createdAt + '_' + Math.random().toString(36).slice(2, 7);
        var json = JSON.stringify(snap);
        return backupDBPut({ id: id, json: json }).then(function() {
          idx.push({
            id: id,
            createdAt: snap.createdAt,
            seasons: Object.keys((snap.state && snap.state.seasons) || {}).length,
            teams: ((snap.state && snap.state.teamMasterList) || []).length,
            sizeKB: Math.round(json.length / 1024)
          });
          saveBackupIndex(idx);
          return { ok: true, id: id };
        }).catch(function(e) {
          var quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message || e)));
          return { ok: false, reason: quota ? 'quota' : 'error', error: e };
        });
      }
      
      // Returns a Promise.
      function deleteBackup(id) {
        var idx = loadBackupIndex().filter(function(b) { return b.id !== id; });
        saveBackupIndex(idx);
        return backupDBDelete(id).catch(function(){});
      }
      
      // Returns a Promise<boolean>.
      function restoreBackup(id) {
        return backupDBGet(id).then(function(rec) {
          if(!rec || !rec.json) return false;
          var snap;
          try { snap = JSON.parse(rec.json); } catch(_) { return false; }
          if(!snap || !snap.state) return false;
          
          // Replace the entire contents of `state` in place (preserve the reference).
          Object.keys(state).forEach(function(k) { delete state[k]; });
          Object.keys(snap.state).forEach(function(k) { state[k] = snap.state[k]; });
          migrateState(state);
          
          // Restore content-related localStorage keys.
          var extras = snap.extras || {};
          BACKUP_EXTRA_KEYS.forEach(function(k) {
            try {
              if(extras[k] !== undefined) localStorage.setItem(k, extras[k]);
              else localStorage.removeItem(k);
            } catch(_) {}
          });
          
          saveAll();
          refreshSeasonUI();
          refreshNoteCount();
          updateHomeButton();
          return true;
        }).catch(function() { return false; });
      }
      
      function showBackupDataDialog() {
        var dialog = document.createElement('dialog');
        dialog.style.cssText = 'width: 560px; max-width: 92vw; border: none; border-radius: 12px; padding: 0; background: var(--card); color: var(--text);';
        document.body.appendChild(dialog);
        
        function fmtDate(ts) {
          try { return new Date(ts).toLocaleString('vi-VN'); } catch(_) { return String(ts); }
        }
        
        function render() {
          var idx = loadBackupIndex().slice().sort(function(a, b) { return b.createdAt - a.createdAt; });
          var atMax = idx.length >= MAX_BACKUPS;
          
          var listHtml = idx.length === 0
            ? '<div style="text-align:center; color: var(--muted); padding: 24px;">Chưa có bản backup nào.</div>'
            : idx.map(function(b) {
                return '<div style="display:flex; align-items:center; gap:12px; padding:12px; margin-bottom:8px; background: var(--bg); border:1px solid var(--border); border-radius:8px;">' +
                  '<div style="flex:1; min-width:0;">' +
                    '<div style="font-weight:600;">🗂️ ' + fmtDate(b.createdAt) + '</div>' +
                    '<div style="font-size:12px; color: var(--muted); margin-top:2px;">' + (b.seasons || 0) + ' mùa • ' + (b.teams || 0) + ' team • ' + (b.sizeKB || 0) + ' KB</div>' +
                  '</div>' +
                  '<button type="button" class="restore-bk" data-id="' + b.id + '" style="padding:6px 12px; background: var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer; white-space:nowrap;">↩️ Restore</button>' +
                  '<button type="button" class="delete-bk" data-id="' + b.id + '" style="padding:6px 12px; background:#c0392b; color:#fff; border:none; border-radius:6px; cursor:pointer; white-space:nowrap;">🗑️ Delete</button>' +
                '</div>';
              }).join('');
          
          dialog.innerHTML =
            '<div style="padding: 20px;">' +
              '<h3 style="margin:0 0 6px 0; color: var(--accent);">💾 Backup Data</h3>' +
              '<p style="margin:0 0 16px 0; color: var(--muted); font-size:13px;">Snapshot toàn bộ dữ liệu hệ thống (tối đa ' + MAX_BACKUPS + ' bản). Đã dùng ' + idx.length + '/' + MAX_BACKUPS + '.</p>' +
              '<div style="margin-bottom:16px;">' + listHtml + '</div>' +
              '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">' +
                '<button type="button" id="createBackupBtn" ' + (atMax ? 'disabled' : '') + ' style="padding:10px 16px; background:' + (atMax ? 'var(--muted)' : 'var(--accent)') + '; color:#fff; border:none; border-radius:6px; cursor:' + (atMax ? 'not-allowed' : 'pointer') + '; opacity:' + (atMax ? '0.6' : '1') + ';">➕ Tạo backup mới</button>' +
                '<button type="button" id="closeBackupBtn" style="padding:10px 16px; background: var(--border); color: var(--text); border:none; border-radius:6px; cursor:pointer;">Đóng</button>' +
              '</div>' +
              (atMax ? '<div style="margin-top:10px; font-size:12px; color: var(--muted);">Đã đạt tối đa ' + MAX_BACKUPS + ' bản. Hãy xoá một bản để tạo mới.</div>' : '') +
            '</div>';
          
          var createBtn = dialog.querySelector('#createBackupBtn');
          if(createBtn) createBtn.addEventListener('click', function() {
            createBtn.disabled = true;
            createBtn.textContent = '⏳ Đang tạo...';
            createBackup().then(function(res) {
              if(res.ok) {
                toast('Đã tạo backup');
              } else if(res.reason === 'max') {
                alert('Đã đạt tối đa ' + MAX_BACKUPS + ' bản backup. Hãy xoá một bản trước.');
              } else if(res.reason === 'quota') {
                alert('❌ Không đủ dung lượng trình duyệt để lưu backup. Hãy xoá bớt backup cũ.');
              } else {
                alert('❌ Tạo backup thất bại.');
              }
              render();
            });
          });
          
          dialog.querySelector('#closeBackupBtn').addEventListener('click', function() {
            dialog.close();
          });
          
          dialog.querySelectorAll('.restore-bk').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var id = btn.getAttribute('data-id');
              if(confirm('Khôi phục bản backup này?\n\n⚠️ Toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu trong backup (và đồng bộ lên cloud nếu đang bật). Không thể hoàn tác.')) {
                btn.disabled = true;
                btn.textContent = '⏳...';
                restoreBackup(id).then(function(ok) {
                  if(ok) {
                    alert('✅ Khôi phục thành công!');
                    dialog.close();
                  } else {
                    alert('❌ Khôi phục thất bại: không đọc được dữ liệu backup.');
                    render();
                  }
                });
              }
            });
          });
          
          dialog.querySelectorAll('.delete-bk').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var id = btn.getAttribute('data-id');
              if(confirm('Xoá bản backup này? Không thể hoàn tác.')) {
                deleteBackup(id).then(function() {
                  toast('Đã xoá backup');
                  render();
                });
              }
            });
          });
        }
        
        render();
        
        if(typeof dialog.showModal === 'function') { dialog.showModal(); }
        else { dialog.setAttribute('open', 'open'); }
        
        dialog.addEventListener('close', function() {
          if(document.body.contains(dialog)) document.body.removeChild(dialog);
        });
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
