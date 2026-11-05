// Marvell PES Club - modes/ranking.js (split from app.js; shared global scope, load order set in index.html)
    // ========== RANKING MODE - START ==========
    // Calculate statistics for Ranking mode
    function calculateRankingStats(s) {
      var stats = {
        totalYears: 0,
        totalEvents: 0,
        totalGold: 0,
        totalSilver: 0,
        totalBronze: 0,
        totalChampions: 0,
        championsList: []
      };
      
      if(!s.timelines || s.timelines.length === 0) return stats;
      
      stats.totalYears = s.timelines.length;
      
      // Calculate total events across all timelines
      s.timelines.forEach(function(timeline) {
        if(timeline.events) {
          stats.totalEvents += timeline.events.length;
        }
      });
      
      // Get the latest timeline (last one in array since they're sorted by year)
      var latestTimeline = s.timelines[s.timelines.length - 1];
      
      if(!latestTimeline || !latestTimeline.events) return stats;
      
      var pointsMap = {}; // { teamName: totalPoints }
      
      // Aggregate points from all events in the latest timeline
      latestTimeline.events.forEach(function(event) {
        if(!event.rankings) return;
        
        event.rankings.forEach(function(ranking) {
          if(!ranking.name || !ranking.name.trim()) return;
          
          var name = ranking.name.trim();
          var totalPts = (ranking.point || 0) * (ranking.rate || 1);
          
          if(!pointsMap[name]) {
            pointsMap[name] = 0;
          }
          pointsMap[name] += totalPts;
        });
      });
      
      // Convert map to sorted list
      Object.keys(pointsMap).forEach(function(teamName) {
        stats.championsList.push({
          name: teamName,
          points: pointsMap[teamName]
        });
      });
      
      // Sort by total points descending
      stats.championsList.sort(function(a, b) {
        if(b.points !== a.points) return b.points - a.points;
        // If points are equal, sort alphabetically
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
      
      // Admin can hide teams that no longer participate (s.rankingHidden)
      stats.allParticipants = stats.championsList.slice();
      var hiddenSet = getRankingHiddenSet(s);
      stats.championsList = stats.championsList.filter(function(c) { return !hiddenSet[c.name]; });
      stats.hiddenCount = stats.allParticipants.length - stats.championsList.length;
      
      stats.totalChampions = stats.championsList.length;
      
      return stats;
    }

    function getRankingHiddenSet(s) {
      var set = Object.create(null);
      (s.rankingHidden || []).forEach(function(n) { if(n) set[String(n).trim()] = true; });
      return set;
    }

    // Admin dialog: tick which participants are shown in the Ranking table
    function openRankingVisibilityDialog(s, participants) {
      if(!participants || participants.length === 0) {
        alert('No participants in the latest timeline yet.');
        return;
      }
      var hiddenSet = getRankingHiddenSet(s);
      var sorted = participants.slice().sort(function(a, b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      var dlg = document.createElement('dialog');
      dlg.style.cssText = 'width: 420px; max-width: 92vw; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';

      var title = document.createElement('h4');
      title.textContent = '👥 Select teams shown in Ranking';
      title.style.cssText = 'margin: 0 0 8px 0; color: var(--accent);';
      dlg.appendChild(title);

      var hint = document.createElement('div');
      hint.textContent = 'Unchecked teams are hidden from the Ranking table. Event data in Year is kept.';
      hint.style.cssText = 'font-size: 12px; color: var(--muted); margin-bottom: 10px;';
      dlg.appendChild(hint);

      var actions = document.createElement('div');
      actions.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
      var btnAll = document.createElement('button');
      btnAll.type = 'button';
      btnAll.textContent = 'Chọn tất cả';
      var btnNone = document.createElement('button');
      btnNone.type = 'button';
      btnNone.textContent = 'Bỏ tất cả';
      var counter = document.createElement('span');
      counter.style.cssText = 'margin-left: auto; font-size: 12px; color: var(--muted);';
      actions.appendChild(btnAll);
      actions.appendChild(btnNone);
      actions.appendChild(counter);

      var list = document.createElement('div');
      list.style.cssText = 'max-height: 320px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);';
      sorted.forEach(function(p) {
        var label = document.createElement('label');
        label.className = 'rank-vis-item';
        label.setAttribute('data-name', p.name);
        label.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--border); cursor: pointer;';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !hiddenSet[p.name];
        cb.addEventListener('change', updateCounter);
        var nameSpan = document.createElement('span');
        nameSpan.textContent = p.name;
        nameSpan.style.cssText = 'flex: 1;';
        var ptsSpan = document.createElement('span');
        ptsSpan.textContent = p.points.toFixed(2);
        ptsSpan.style.cssText = 'color: var(--muted); font-size: 12px;';
        label.appendChild(cb);
        label.appendChild(nameSpan);
        label.appendChild(ptsSpan);
        list.appendChild(label);
      });
      dlg.appendChild(actions);
      dlg.appendChild(list);

      var footer = document.createElement('div');
      footer.style.cssText = 'margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;';
      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.textContent = 'Hủy';
      var btnSave = document.createElement('button');
      btnSave.type = 'button';
      btnSave.className = 'primary';
      btnSave.textContent = 'Lưu';
      footer.appendChild(btnCancel);
      footer.appendChild(btnSave);
      dlg.appendChild(footer);

      function allBoxes() { return Array.prototype.slice.call(list.querySelectorAll('.rank-vis-item input[type="checkbox"]')); }
      function visibleBoxes() {
        return allBoxes().filter(function(cb) { return !cb.closest('.rank-vis-item').classList.contains('ls-hidden'); });
      }
      function updateCounter() {
        var boxes = allBoxes();
        var shown = boxes.filter(function(cb) { return cb.checked; }).length;
        counter.textContent = shown + ' / ' + boxes.length;
      }
      // Select/Deselect all apply to the currently filtered (visible) rows
      btnAll.onclick = function() { visibleBoxes().forEach(function(cb) { cb.checked = true; }); updateCounter(); };
      btnNone.onclick = function() { visibleBoxes().forEach(function(cb) { cb.checked = false; }); updateCounter(); };
      btnCancel.onclick = function() { dlg.close(); };
      btnSave.onclick = function() {
        // Keep previously hidden names that are not in the current list
        var currentNames = Object.create(null);
        sorted.forEach(function(p) { currentNames[p.name] = true; });
        var hidden = (s.rankingHidden || []).filter(function(n) { return !currentNames[String(n).trim()]; });
        var shownCount = 0;
        list.querySelectorAll('.rank-vis-item').forEach(function(item) {
          if(item.querySelector('input').checked) shownCount++;
          else hidden.push(item.getAttribute('data-name'));
        });
        s.rankingHidden = hidden;
        saveAll();
        dlg.close();
        renderRankingMode(s);
        toast('Ranking: ' + shownCount + ' / ' + sorted.length + ' teams shown');
      };
      dlg.addEventListener('close', function() { if(dlg.parentNode) dlg.parentNode.removeChild(dlg); });

      updateCounter();
      document.body.appendChild(dlg);
      addListSearch(list, '.rank-vis-item', function(el) { return el.getAttribute('data-name'); });
      if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
    }

    // Render Ranking mode - timeline with events and medals
    function renderRankingMode(s) {
      console.log('renderRankingMode called for season:', s.name, 'mode:', s.mode);
      
      if(!s || !s.timelines) {
        s.timelines = [];
      }
      
      $('seasonTitle').textContent = '— ' + s.name + ' (RANKING)';
      $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';
      
      // Hide all unnecessary elements - use more specific selectors
      var standingsSection = document.querySelector('main.container section.card.grow');
      if(standingsSection) standingsSection.style.display = 'none';
      
      var fixturesSection = document.querySelector('main.container section.card:has(#fixtures)');
      if(fixturesSection) fixturesSection.style.display = 'none';
      
      var roundSelDiv = document.querySelector('.round-selector');
      if(roundSelDiv) roundSelDiv.style.display = 'none';
      
      // Create main ranking container
      var mainContainer = document.querySelector('main.container');
      console.log('mainContainer found:', mainContainer);
      
      // Remove any existing legend or ranking containers
      var existingLegend = document.getElementById('legendContainer');
      if(existingLegend) {
        console.log('Removing existing legendContainer');
        existingLegend.remove();
      }
      
      var existingRanking = document.getElementById('rankingModeContainer');
      if(existingRanking) {
        console.log('Removing existing rankingModeContainer');
        existingRanking.remove();
      }
      
      var rankingContainer = document.createElement('div');
      rankingContainer.id = 'rankingModeContainer';
      rankingContainer.className = 'row';
      rankingContainer.style.cssText = 'margin-top: 20px;';
      console.log('Created rankingModeContainer');
      
      // Calculate statistics
      var stats = calculateRankingStats(s);
      console.log('Stats calculated:', stats);
      
      // Statistics and Standings row
      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display: grid; grid-template-columns: 300px 1fr; gap: 20px; margin-bottom: 20px; width: 100%;';
      
      // Summary Statistics Card
      var summaryCard = document.createElement('section');
      summaryCard.className = 'card';
      summaryCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var summaryTitle = document.createElement('h3');
      summaryTitle.textContent = '📊 Statistics';
      summaryTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px;';
      summaryCard.appendChild(summaryTitle);
      
      var statsList = document.createElement('div');
      statsList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
      
      var statItems = [
        { icon: '📅', label: 'Total Years', value: stats.totalYears },
        { icon: '🏅', label: 'Total Events', value: stats.totalEvents },
        { icon: '⭐', label: 'Total Participants', value: stats.totalChampions }
      ];
      
      statItems.forEach(function(item) {
        var statItem = document.createElement('div');
        statItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 8px;';
        
        var labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 500;';
        labelDiv.innerHTML = '<span style="font-size: 20px;">' + item.icon + '</span>' + item.label;
        
        var valueDiv = document.createElement('div');
        valueDiv.textContent = item.value;
        valueDiv.style.cssText = 'font-size: 20px; font-weight: 700; color: var(--accent);';
        
        statItem.appendChild(labelDiv);
        statItem.appendChild(valueDiv);
        statsList.appendChild(statItem);
      });
      
      summaryCard.appendChild(statsList);
      statsRow.appendChild(summaryCard);
      
      // Champions Standings Table(s) - Split into multiple tables if more than 15 teams
      var standingsCard = document.createElement('section');
      standingsCard.className = 'card';
      standingsCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var standingsTitle = document.createElement('h3');
      standingsTitle.textContent = '🏅 Ranking';
      standingsTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px; display: flex; align-items: center; gap: 12px;';
      if(isAdmin()) {
        var visBtn = document.createElement('button');
        visBtn.type = 'button';
        visBtn.textContent = '👥 Select teams' + (stats.hiddenCount ? ' (' + stats.hiddenCount + ' hidden)' : '');
        visBtn.title = 'Tick which teams are shown in the Ranking table';
        visBtn.style.cssText = 'margin-left: auto; padding: 6px 12px; font-size: 13px; font-weight: 600;';
        visBtn.onclick = function() { openRankingVisibilityDialog(s, stats.allParticipants); };
        standingsTitle.appendChild(visBtn);
      }
      standingsCard.appendChild(standingsTitle);
      
      // Create container for multiple tables (side by side)
      var tablesContainer = document.createElement('div');
      tablesContainer.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap;';
      
      // Split championsList into chunks of 15
      var chunkSize = 15;
      var chunks = [];
      for(var i = 0; i < stats.championsList.length; i += chunkSize) {
        chunks.push(stats.championsList.slice(i, i + chunkSize));
      }
      
      // Create a table for each chunk
      chunks.forEach(function(chunk, chunkIndex) {
        var tableWrapper = document.createElement('div');
        tableWrapper.style.cssText = 'flex: 1; min-width: 300px;';
        
        var tableContainer = document.createElement('div');
        tableContainer.style.cssText = 'overflow-x: auto;';
        
        var table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse;';
        
        // Table header
        var thead = document.createElement('thead');
        thead.innerHTML = '<tr style="background: rgba(59, 130, 246, 0.2);">' +
          '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">#</th>' +
          '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Name</th>' +
          '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Pts</th>' +
          '</tr>';
        table.appendChild(thead);
        
        // Table body
        var tbody = document.createElement('tbody');
        chunk.forEach(function(champion, relativeIdx) {
          var idx = chunkIndex * chunkSize + relativeIdx; // Actual index in full list
          var tr = document.createElement('tr');
          
          // Highlight top 3 positions
          var bgColor = '';
          var rankColor = '';
          if(idx === 0) {
            bgColor = 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%);';
            rankColor = 'color: #FFD700; font-weight: 800;';
          } else if(idx === 1) {
            bgColor = 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%);';
            rankColor = 'color: #C0C0C0; font-weight: 800;';
          } else if(idx === 2) {
            bgColor = 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.05) 100%);';
            rankColor = 'color: #CD7F32; font-weight: 800;';
          }
          
          tr.style.cssText = 'border-bottom: 1px solid var(--border); transition: background 0.2s; ' + bgColor;
          var originalBg = tr.style.background;
          tr.onmouseenter = function() { this.style.background = 'rgba(59, 130, 246, 0.1)'; };
          tr.onmouseleave = function() { this.style.background = originalBg; };
          
          tr.innerHTML = 
            '<td style="padding: 10px; font-weight: 600; ' + rankColor + '">' + (idx + 1) + '</td>' +
            '<td style="padding: 10px; font-weight: 600; color: var(--text);">' + champion.name + '</td>' +
            '<td style="padding: 10px; text-align: center; font-weight: 700; color: var(--accent); font-size: 16px;">' + champion.points.toFixed(2) + '</td>';
          
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        tableContainer.appendChild(table);
        tableWrapper.appendChild(tableContainer);
        tablesContainer.appendChild(tableWrapper);
      });
      
      standingsCard.appendChild(tablesContainer);
      statsRow.appendChild(standingsCard);
      
      rankingContainer.appendChild(statsRow);
      
      // Create ranking section (Year) - on separate row below
      var hallSection = document.createElement('div');
      hallSection.style.cssText = 'margin-top: 20px; width: 100%;';
      
      var section = document.createElement('section');
      section.className = 'card grow';
      section.style.cssText = 'padding: 32px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3); width: 100%;';
      
      // Header with Add Timeline button
      var header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--accent);';
      
      var title = document.createElement('h3');
      title.textContent = '🏆 Year';
      title.style.cssText = 'margin: 0; color: var(--accent); font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);';
      header.appendChild(title);
      
      if(isAdmin()) {
        var addTimelineBtn = document.createElement('button');
        addTimelineBtn.className = 'primary';
        addTimelineBtn.textContent = '📅 Add Timeline';
        addTimelineBtn.style.cssText = 'padding: 10px 20px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);';
        addTimelineBtn.onclick = function() { addRankingTimeline(s); };
        header.appendChild(addTimelineBtn);
      }
      
      section.appendChild(header);
      
      // Render all timelines (newest first - reverse order)
      var timelinesDiv = document.createElement('div');
      timelinesDiv.id = 'rankingTimelinesContainer';
      var reversedTimelines = s.timelines.slice().reverse();
      reversedTimelines.forEach(function(timeline) {
        var originalIndex = s.timelines.indexOf(timeline);
        timelinesDiv.appendChild(renderRankingTimeline(s, timeline, originalIndex));
      });
      
      section.appendChild(timelinesDiv);
      hallSection.appendChild(section);
      rankingContainer.appendChild(hallSection);
      console.log('About to append rankingContainer to mainContainer');
      console.log('rankingContainer:', rankingContainer);
      console.log('mainContainer:', mainContainer);
      mainContainer.appendChild(rankingContainer);
      console.log('rankingContainer appended successfully');
    }
    
    function addRankingTimeline(s) {
      var year = prompt('Enter year:');
      if(!year) return;
      
      if(!s.timelines) s.timelines = [];
      
      // Create default event with data from previous timeline
      var defaultEvent = {
        name: 'Ranking',
        rankings: []
      };
      
      // Get data from the previous timeline (before sorting)
      if(s.timelines.length > 0) {
        // Sort timelines to find the latest one
        var sortedTimelines = s.timelines.slice().sort(function(a, b) { 
          return parseInt(a.year) - parseInt(b.year); 
        });
        var previousTimeline = sortedTimelines[sortedTimelines.length - 1];
        
        // Use previous timeline's year as event name
        defaultEvent.name = previousTimeline.year;
        
        // Aggregate points from all events in previous timeline
        var pointsMap = {}; // { teamName: totalPoints }
        
        if(previousTimeline && previousTimeline.events) {
          previousTimeline.events.forEach(function(event) {
            if(!event.rankings) return;
            
            event.rankings.forEach(function(ranking) {
              if(!ranking.name || !ranking.name.trim()) return;
              
              var name = ranking.name.trim();
              var totalPts = (ranking.point || 0) * (ranking.rate || 1);
              
              if(!pointsMap[name]) {
                pointsMap[name] = 0;
              }
              pointsMap[name] += totalPts;
            });
          });
        }
        
        // Convert map to rankings array
        Object.keys(pointsMap).forEach(function(teamName) {
          defaultEvent.rankings.push({
            name: teamName,
            point: pointsMap[teamName],
            rate: 0.5
          });
        });
        
        // Sort by points descending
        defaultEvent.rankings.sort(function(a, b) {
          return b.point - a.point;
        });
      }
      
      s.timelines.push({
        year: year,
        events: [defaultEvent],
        pictures: []
      });
      s.timelines.sort(function(a, b) { return parseInt(a.year) - parseInt(b.year); });
      saveAll();
      renderRankingMode(s);
    }
    
    function renderRankingTimeline(s, timeline, index) {
      var timelineDiv = document.createElement('div');
      timelineDiv.className = 'ranking-timeline-box';
      timelineDiv.style.cssText = 'border: 3px solid var(--accent); border-radius: 16px; padding: 28px; margin-bottom: 28px; background: linear-gradient(145deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%); box-shadow: 0 6px 20px rgba(0,0,0,0.25); position: relative; overflow: hidden;';
      
      // Decorative corner accent
      var cornerAccent = document.createElement('div');
      cornerAccent.style.cssText = 'position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: linear-gradient(135deg, var(--accent) 0%, transparent 70%); opacity: 0.1; pointer-events: none;';
      timelineDiv.appendChild(cornerAccent);
      
      // Timeline header
      var headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: relative;';
      
      var yearTitle = document.createElement('h4');
      yearTitle.textContent = timeline.year;
      yearTitle.style.cssText = 'margin: 0; font-size: 48px; font-weight: 900; background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.4)); letter-spacing: 2px; font-family: "Arial Black", sans-serif; position: relative;';
      
      // Add click to rename for admin
      if(isAdmin()) {
        yearTitle.style.cursor = 'pointer';
        yearTitle.title = 'Click to rename';
        yearTitle.onclick = function() {
          var newYear = prompt('Rename timeline:', timeline.year);
          if(newYear && newYear.trim()) {
            timeline.year = newYear.trim();
            saveAll();
            renderRankingMode(s);
          }
        };
      }
      
      // Add decorative underline
      var underline = document.createElement('div');
      underline.style.cssText = 'width: 120px; height: 4px; background: linear-gradient(90deg, #FFD700 0%, var(--accent) 100%); margin-top: 8px; border-radius: 2px; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);';
      
      var yearContainer = document.createElement('div');
      yearContainer.appendChild(yearTitle);
      yearContainer.appendChild(underline);
      headerDiv.appendChild(yearContainer);
      
      if(isAdmin()) {
        var btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 10px;';
        
        var addEventBtn = document.createElement('button');
        addEventBtn.className = 'primary';
        addEventBtn.textContent = '➕ Add Event';
        addEventBtn.style.cssText = 'padding: 8px 16px; font-size: 14px; font-weight: 600;';
        addEventBtn.onclick = function() { addRankingEvent(s, index); };
        btnGroup.appendChild(addEventBtn);
        
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Year';
        deleteBtn.style.cssText = 'background: #dc2626; color: white; padding: 8px 16px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);';
        deleteBtn.onclick = function() {
          if(confirm('Delete timeline for ' + timeline.year + '?')) {
            s.timelines.splice(index, 1);
            saveAll();
            renderRankingMode(s);
          }
        };
        btnGroup.appendChild(deleteBtn);
        
        headerDiv.appendChild(btnGroup);
      }
      
      timelineDiv.appendChild(headerDiv);
      
      // Render events horizontally
      if(!timeline.events) timeline.events = [];
      var eventsContainer = document.createElement('div');
      eventsContainer.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px;';
      timeline.events.forEach(function(event, eventIndex) {
        eventsContainer.appendChild(renderRankingEvent(s, index, event, eventIndex));
      });
      timelineDiv.appendChild(eventsContainer);
      
      return timelineDiv;
    }
    
    function addRankingPicture(s, timelineIndex) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = function(e) {
        var files = Array.from(e.target.files);
        if(!files.length) return;
        if(!s.timelines[timelineIndex].pictures) s.timelines[timelineIndex].pictures = [];
        var year = s.timelines[timelineIndex].year || ('y' + timelineIndex);
        var done = 0;
        files.forEach(function(file, idx) {
          var baseName = state.current + '_' + year + '_' + (s.timelines[timelineIndex].pictures.length + idx + 1);
          RepoUploader.uploadResizedFile(file, {
            folder: 'photos',
            baseName: baseName,
            message: 'chore: upload ranking photo ' + baseName
          }).then(function(path) {
            s.timelines[timelineIndex].pictures.push(path);
          }).catch(function(err) {
            console.error('Ranking photo upload failed:', err);
            alert('Upload ảnh thất bại: ' + (err && err.message ? err.message : err));
          }).then(function() {
            done++;
            if(done === files.length) {
              saveAll();
              renderRankingMode(s);
            }
          });
        });
      };
      input.click();
    }
    
    function resizeImageForRanking(file, maxWidth, callback) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          
          // Calculate new dimensions maintaining aspect ratio
          var width = img.width;
          var height = img.height;
          
          if(width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try to compress to under 100KB
          var quality = 0.8;
          var resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Calculate size (base64 string length * 0.75 gives approximate byte size)
          var sizeInBytes = (resizedDataUrl.length * 0.75);
          var maxSizeBytes = 100 * 1024; // 100KB
          
          // If still too large, reduce quality iteratively
          while(sizeInBytes > maxSizeBytes && quality > 0.1) {
            quality -= 0.1;
            resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = (resizedDataUrl.length * 0.75);
          }
          
          // If still too large after reducing quality, reduce dimensions
          if(sizeInBytes > maxSizeBytes) {
            var scale = Math.sqrt(maxSizeBytes / sizeInBytes);
            canvas.width = Math.floor(width * scale);
            canvas.height = Math.floor(height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          }
          
          callback(resizedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    
    function renderRankingPictureItem(s, timelineIndex, pictureUrl, picIndex) {
      var container = document.createElement('div');
      container.style.cssText = 'position: relative; flex-shrink: 0;';
      
      var img = document.createElement('img');
      img.src = pictureUrl;
      img.style.cssText = 'height: 200px; width: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s;';
      
      // Hover effect
      img.onmouseenter = function() {
        this.style.transform = 'scale(1.05)';
      };
      img.onmouseleave = function() {
        this.style.transform = 'scale(1)';
      };
      
      // Click to view full size
      img.onclick = function() {
        var modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; justify-content: center; align-items: center; cursor: pointer;';
        
        var fullImg = document.createElement('img');
        fullImg.src = pictureUrl;
        fullImg.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);';
        
        modal.appendChild(fullImg);
        modal.onclick = function() {
          document.body.removeChild(modal);
        };
        
        document.body.appendChild(modal);
      };
      
      container.appendChild(img);
      
      if(isAdmin()) {
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #dc2626; color: white; padding: 4px 8px; font-size: 12px; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);';
        deleteBtn.onclick = function(e) {
          e.stopPropagation();
          if(confirm('Delete this photo?')) {
            s.timelines[timelineIndex].pictures.splice(picIndex, 1);
            saveAll();
            renderRankingMode(s);
          }
        };
        container.appendChild(deleteBtn);
      }
      
      return container;
    }
    
    function addRankingEvent(s, timelineIndex) {
      var eventName = prompt('Enter event name:');
      if(!eventName) return;
      
      var numRows = prompt('Enter number of rows in ranking table:', '10');
      if(!numRows) return;
      numRows = parseInt(numRows) || 10;
      if(numRows < 1 || numRows > 100) {
        alert('Number of rows must be between 1 and 100');
        return;
      }
      
      var defaultRate = prompt('Enter default rate for all rows:', '1');
      if(defaultRate === null) return;
      defaultRate = parseFloat(defaultRate) || 1;
      
      if(!s.timelines[timelineIndex].events) s.timelines[timelineIndex].events = [];
      
      // Create rankings array with specified number of rows
      var rankings = [];
      for(var i = 0; i < numRows; i++) {
        rankings.push({ name: '', point: 0, rate: defaultRate });
      }
      
      s.timelines[timelineIndex].events.push({
        name: eventName,
        rankings: rankings
      });
      saveAll();
      renderRankingMode(s);
    }
    
    function renderRankingEvent(s, timelineIndex, event, eventIndex) {
      var eventDiv = document.createElement('div');
      eventDiv.style.cssText = 'border: 2px solid var(--border); padding: 20px; background: linear-gradient(135deg, var(--panel) 0%, var(--card) 100%); border-radius: 12px; width: fit-content; box-shadow: 0 4px 16px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;';
      
      // Hover effect
      eventDiv.onmouseenter = function() {
        this.style.transform = 'translateY(-4px)';
        this.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      };
      eventDiv.onmouseleave = function() {
        this.style.transform = '';
        this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
      };
      
      // Event name
      var eventHeader = document.createElement('div');
      eventHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg, #FFD700 0%, var(--accent) 50%, #60a5fa 100%) 1; position: relative;';
      
      var eventNameContainer = document.createElement('div');
      eventNameContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
      
      var eventName = document.createElement('div');
      eventName.style.cssText = 'font-weight: 800; font-size: 20px; background: linear-gradient(135deg, #FFD700 0%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-transform: uppercase; letter-spacing: 1px; filter: drop-shadow(0 2px 6px rgba(255, 215, 0, 0.3));';
      eventName.textContent = '🏅 ' + event.name;
      
      // Add click to rename for admin
      if(isAdmin()) {
        eventName.style.cursor = 'pointer';
        eventName.title = 'Click to rename';
        eventName.onclick = function() {
          var newName = prompt('Rename event:', event.name);
          if(newName && newName.trim()) {
            event.name = newName.trim();
            saveAll();
            renderRankingMode(s);
          }
        };
      }
      
      var eventUnderline = document.createElement('div');
      eventUnderline.style.cssText = 'width: 60px; height: 3px; background: linear-gradient(90deg, #FFD700 0%, var(--accent) 100%); border-radius: 2px; box-shadow: 0 1px 4px rgba(255, 215, 0, 0.4);';
      
      eventNameContainer.appendChild(eventName);
      eventNameContainer.appendChild(eventUnderline);
      eventHeader.appendChild(eventNameContainer);
      
      if(isAdmin()) {
        var deleteEventBtn = document.createElement('button');
        deleteEventBtn.textContent = '✕';
        deleteEventBtn.style.cssText = 'background: #dc2626; color: white; padding: 6px 10px; font-size: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;';
        deleteEventBtn.onclick = function() {
          if(confirm('Delete event "' + event.name + '"?')) {
            s.timelines[timelineIndex].events.splice(eventIndex, 1);
            saveAll();
            renderRankingMode(s);
          }
        };
        eventHeader.appendChild(deleteEventBtn);
      }
      
      eventDiv.appendChild(eventHeader);
      
      // Ensure rankings array exists
      if(!event.rankings) event.rankings = [];
      
      // Create ranking table
      var table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; font-size: 14px; width: auto;';
      
      // Table header
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      headerRow.style.cssText = 'border-bottom: 2px solid var(--accent);';
      
      var headers = ['#', 'Name', 'Point', 'Rate', 'Total'];
      headers.forEach(function(headerText) {
        var th = document.createElement('th');
        th.textContent = headerText;
        th.style.cssText = 'padding: 8px; text-align: left; font-weight: 700; color: var(--accent); white-space: nowrap;';
        if(headerText === '#') th.style.width = '40px';
        if(headerText === 'Name') { 
          th.style.width = 'auto';
          th.style.minWidth = '50px';
          th.style.maxWidth = '300px';
        }
        if(headerText === 'Point' || headerText === 'Rate') {
          th.style.width = '80px';
          th.style.textAlign = 'center';
        }
        if(headerText === 'Total') {
          th.style.width = '90px';
          th.style.textAlign = 'center';
        }
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Table body
      var tbody = document.createElement('tbody');
      event.rankings.forEach(function(ranking, rankIndex) {
        var row = document.createElement('tr');
        row.style.cssText = 'border-bottom: 1px solid var(--border);';
        
        // Rank number
        var rankCell = document.createElement('td');
        rankCell.textContent = (rankIndex + 1);
        rankCell.style.cssText = 'padding: 8px; font-weight: 700; color: var(--accent);';
        row.appendChild(rankCell);
        
        // Name cell
        var nameCell = document.createElement('td');
        nameCell.style.cssText = 'padding: 8px;';
        
        if(isAdmin()) {
          var nameContainer = document.createElement('div');
          nameContainer.style.cssText = 'display: flex; gap: 4px; align-items: center; position: relative;';
          
          var nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.value = ranking.name || '';
          nameInput.placeholder = 'Enter name';
          nameInput.style.cssText = 'flex: 1; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 13px;';
          nameInput.onchange = function() {
            ranking.name = this.value;
            saveAll();
          };
          nameContainer.appendChild(nameInput);
          
          // Add dropdown button
          var dropdownBtn = document.createElement('button');
          dropdownBtn.type = 'button';
          dropdownBtn.textContent = '▼';
          dropdownBtn.style.cssText = 'padding: 4px 8px; background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; font-size: 11px;';
          dropdownBtn.title = 'Select from Team List';
          dropdownBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if(!state.teamMasterList || state.teamMasterList.length === 0) {
              alert('Team List is empty. Add teams to Team List first.');
              return;
            }
            
            // Create team selection dialog
            var selectDialog = document.createElement('dialog');
            selectDialog.style.cssText = 'width: 300px; border: none; border-radius: 8px; padding: 20px; background: var(--card); color: var(--text);';
            
            selectDialog.innerHTML = 
              '<h4 style="margin: 0 0 16px 0; color: var(--accent);">Select Team</h4>' +
              '<div class="team-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; background: var(--bg);">' +
              state.teamMasterList.slice().sort(function(a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
              }).map(function(team) { 
                return '<div class="team-option" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); color: var(--text);" data-team="' + team + '">' + team + '</div>'; 
              }).join('') +
              '</div>' +
              '<div style="margin-top: 16px; text-align: right;">' +
              '<button type="button" onclick="this.closest(\'dialog\').close()" style="padding: 8px 16px; background: var(--muted); color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
              '</div>';
            
            // Add click events
            var teamOptions = selectDialog.querySelectorAll('.team-option');
            teamOptions.forEach(function(option) {
              option.addEventListener('click', function() {
                var selectedTeam = this.getAttribute('data-team');
                nameInput.value = selectedTeam;
                ranking.name = selectedTeam;
                saveAll();
                selectDialog.close();
                document.body.removeChild(selectDialog);
              });
              
              option.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--hover)';
              });
              option.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
              });
            });
            
            document.body.appendChild(selectDialog);
            addListSearch(selectDialog.querySelector('.team-list'), '.team-option', function(el) { return el.getAttribute('data-team'); });
            if(typeof selectDialog.showModal === 'function') { 
              selectDialog.showModal(); 
            } else { 
              selectDialog.setAttribute('open', 'open'); 
            }
            
            selectDialog.addEventListener('close', function() {
              if(document.body.contains(selectDialog)) {
                document.body.removeChild(selectDialog);
              }
            });
          };
          nameContainer.appendChild(dropdownBtn);
          
          nameCell.appendChild(nameContainer);
        } else {
          nameCell.textContent = ranking.name || '';
        }
        row.appendChild(nameCell);
        
        // Point cell
        var pointCell = document.createElement('td');
        pointCell.style.cssText = 'padding: 8px; text-align: center;';
        
        if(isAdmin()) {
          var pointInput = document.createElement('input');
          pointInput.type = 'number';
          pointInput.value = ranking.point || 0;
          pointInput.style.cssText = 'width: 100%; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 13px;';
          pointInput.onchange = function() {
            ranking.point = parseFloat(this.value) || 0;
            saveAll();
            renderRankingMode(s);
          };
          pointCell.appendChild(pointInput);
        } else {
          pointCell.textContent = (ranking.point || 0).toFixed(2);
        }
        row.appendChild(pointCell);
        
        // Rate cell
        var rateCell = document.createElement('td');
        rateCell.style.cssText = 'padding: 8px; text-align: center;';
        
        if(isAdmin()) {
          var rateInput = document.createElement('input');
          rateInput.type = 'number';
          rateInput.value = ranking.rate || 1;
          rateInput.step = '0.1';
          rateInput.style.cssText = 'width: 100%; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 13px;';
          rateInput.onchange = function() {
            ranking.rate = parseFloat(this.value) || 1;
            saveAll();
            renderRankingMode(s);
          };
          rateCell.appendChild(rateInput);
        } else {
          rateCell.textContent = ranking.rate || 1;
        }
        row.appendChild(rateCell);
        
        // Total cell (calculated)
        var totalCell = document.createElement('td');
        var totalPts = (ranking.point || 0) * (ranking.rate || 1);
        totalCell.textContent = totalPts.toFixed(2);
        totalCell.style.cssText = 'padding: 8px; text-align: center; font-weight: 700; color: var(--accent);';
        row.appendChild(totalCell);
        
        // Delete button for admin
        if(isAdmin()) {
          var deleteCell = document.createElement('td');
          deleteCell.style.cssText = 'padding: 8px;';
          var deleteBtn = document.createElement('button');
          deleteBtn.textContent = '✕';
          deleteBtn.style.cssText = 'background: #dc2626; color: white; padding: 4px 8px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer;';
          deleteBtn.onclick = function() {
            event.rankings.splice(rankIndex, 1);
            saveAll();
            renderRankingMode(s);
          };
          deleteCell.appendChild(deleteBtn);
          row.appendChild(deleteCell);
        }
        
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      eventDiv.appendChild(table);
      
      return eventDiv;
    }
