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

    // Render Ranking mode: KPIs, latest-year standings (podium + columns), per-year event tables.
    // Shared lg* helpers live in legend.js (loaded before this file).
    function renderRankingMode(s) {
      if(!s) return;
      if(!s.timelines) s.timelines = [];
      var host = lgPrepHost(s, 'RANKING');
      if(!host) return;
      var st = calculateRankingStats(s), admin = isAdmin(), list = st.championsList;
      var latest = s.timelines[s.timelines.length - 1];
      var max = list.length ? list[0].points : 0;
      var pts = function(c){ return lgNum(c.points); };

      var html = lgKpis([
        { icon: '📅', v: st.totalYears, l: lgL('Năm', 'Years') },
        { icon: '🏅', v: st.totalEvents, l: lgL('Giải đấu', 'Events') },
        { icon: '👥', v: st.totalChampions + (admin && st.hiddenCount ? ' <small>(+' + st.hiddenCount + ' ' + lgE(lgL('ẩn', 'hidden')) + ')</small>' : ''), l: lgL('Người tham gia', 'Participants') },
        { icon: '⭐', v: list.length ? pts(list[0]) : '—', l: lgL('Điểm cao nhất', 'Top points') }
      ]);

      html += '<section class="lg-card"><div class="lg-head"><h3>🏅 ' + lgE(lgL('Bảng xếp hạng', 'Ranking')) + (latest ? ' <span class="lg-year-badge sm">' + lgE(latest.year) + '</span>' : '') + '</h3>' +
        '<small>' + lgE(lgL('Tổng điểm = Điểm × Hệ số, cộng dồn các giải của năm mới nhất', 'Total = Point × Rate, summed over the latest year')) + '</small>' +
        (admin ? '<span class="lg-head-acts">' + lgBtn('visibility', '👥 ' + lgE(lgL('Chọn đội hiển thị', 'Select teams')) + (st.hiddenCount ? ' (' + st.hiddenCount + ')' : ''), null, '', lgL('Chọn đội hiển thị trong bảng xếp hạng', 'Tick which teams are shown in the Ranking table')) + '</span>' : '') + '</div>' +
        (list.length ? lgPodium(list, function(c){ return pts(c) + ' <small>' + lgE(lgL('điểm', 'pts')) + '</small>'; }) +
          '<ol class="lg-rank-cols">' + list.map(function(c, i){
            return '<li' + (i < 3 ? ' class="lg-top' + (i + 1) + '"' : '') + '><span class="lg-rk">' + (i + 1) + '</span><span class="lg-rank-n">' + lgName(c.name) + '</span>' + lgBar(c.points, max, pts(c)) + '</li>';
          }).join('') + '</ol>'
          : '<div class="lg-empty">' + lgE(lgL('Chưa có dữ liệu xếp hạng.', 'No ranking data yet.')) + '</div>') + '</section>';

      var years = s.timelines.map(function(tl, ti){ return { tl: tl, ti: ti }; }).reverse();
      html += '<section class="lg-card"><div class="lg-head"><h3>📆 ' + lgE(lgL('Theo năm', 'By year')) + '</h3><small>' + years.length + ' ' + lgE(lgL('năm', 'years')) + '</small>' +
        (admin ? '<span class="lg-head-acts">' + lgBtn('addYear', '＋ ' + lgE(lgL('Thêm năm', 'Add year')), null, 'primary') + '</span>' : '') + '</div>' +
        (years.length ? '<div class="lg-years">' + years.map(function(y, pos){ return rankingYearHtml(s, y.tl, y.ti, pos, admin); }).join('') + '</div>'
          : '<div class="lg-empty">' + lgE(lgL('Chưa có năm nào.', 'No years yet.')) + '</div>') + '</section>';

      var root = document.createElement('div');
      root.id = 'rankingModeContainer';
      root.className = 'lg-wrap';
      root.innerHTML = html;
      var rr = function(){ saveAll(); renderRankingMode(s); };
      var T = function(a){ return s.timelines[a.ti]; };
      var E = function(a){ return T(a).events[a.ei]; };
      var R = function(a){ return E(a).rankings[a.ri]; };
      lgBind(root, s, {
        visibility: function(){ openRankingVisibilityDialog(s, st.allParticipants); },
        addYear: function(){ addRankingTimeline(s); },
        renameYear: function(a){ var v = prompt('Rename timeline:', T(a).year); if(v && v.trim()){ T(a).year = v.trim(); rr(); } },
        delYear: function(a){ if(confirm('Delete timeline for ' + T(a).year + '?')){ s.timelines.splice(a.ti, 1); rr(); } },
        addEvent: function(a){ addRankingEvent(s, a.ti); },
        renameEvent: function(a){ var v = prompt('Rename event:', E(a).name); if(v && v.trim()){ E(a).name = v.trim(); rr(); } },
        delEvent: function(a){ if(confirm('Delete event "' + E(a).name + '"?')){ T(a).events.splice(a.ei, 1); rr(); } },
        setName: function(a, el){ R(a).name = el.value; rr(); },
        pickName: function(a){ lgPickTeam(function(t){ R(a).name = t; rr(); }); },
        setPoint: function(a, el){ R(a).point = parseFloat(el.value) || 0; rr(); },
        setRate: function(a, el){ R(a).rate = parseFloat(el.value) || 1; rr(); },
        delRow: function(a){ E(a).rankings.splice(a.ri, 1); rr(); },
        delPhoto: function(a){ if(confirm('Delete this photo?')){ T(a).pictures.splice(a.pi, 1); rr(); } },
        photo: function(a, el){ lgOpenPhoto(el.getAttribute('src')); }
      });
      host.appendChild(root);
    }

    function rankingYearHtml(s, tl, ti, pos, admin){
      var evs = tl.events || [];
      var head = '<summary class="lg-year-head"><span class="lg-year-badge">' + lgE(tl.year) + '</span>' +
        '<span class="lg-year-meta">' + evs.length + ' ' + lgE(lgL('giải', 'events')) + '</span><span class="lg-year-champs"></span>' +
        (admin ? '<span class="lg-acts">' + lgBtn('renameYear', '✏️', { ti: ti }, 'icon', lgL('Đổi tên năm', 'Rename year')) +
          lgBtn('addEvent', '＋ ' + lgE(lgL('Giải', 'Event')), { ti: ti }) +
          lgBtn('delYear', '🗑', { ti: ti }, 'icon danger', lgL('Xóa năm', 'Delete year')) + '</span>' : '') +
        '<span class="lg-chev">▾</span></summary>';
      var events = evs.map(function(ev, ei){
        var rows = (ev.rankings || []).map(function(r, ri){
          var o = { ti: ti, ei: ei, ri: ri }, total = (r.point || 0) * (r.rate || 1);
          return '<tr><td><span class="lg-rk">' + (ri + 1) + '</span></td>' + (admin
            ? '<td class="lg-l"><div class="lg-namecell"><input class="lg-in no-i18n" type="text" value="' + lgE(r.name || '') + '" placeholder="' + lgE(lgL('Nhập tên', 'Enter name')) + '" data-lg-in="setName"' + lgA(o) + '>' +
              lgBtn('pickName', '▾', o, 'icon', lgL('Chọn từ danh sách đội', 'Pick from Team List')) + '</div></td>' +
              '<td><input class="lg-in lg-num" type="number" value="' + lgE(r.point || 0) + '" data-lg-in="setPoint"' + lgA(o) + '></td>' +
              '<td><input class="lg-in lg-num" type="number" step="0.1" value="' + lgE(r.rate || 1) + '" data-lg-in="setRate"' + lgA(o) + '></td>'
            : '<td class="lg-l lg-n">' + lgName(r.name) + '</td><td>' + lgNum(r.point) + '</td><td class="muted">×' + lgNum(r.rate || 1) + '</td>') +
            '<td class="lg-total">' + lgNum(total) + '</td>' + (admin ? '<td>' + lgBtn('delRow', '✕', o, 'icon danger') + '</td>' : '') + '</tr>';
        }).join('');
        return '<div class="lg-event"><div class="lg-event-head"><span class="lg-event-name no-i18n">' + lgE(ev.name) + '</span>' +
          '<small class="muted">' + (ev.rankings || []).length + '</small>' +
          (admin ? lgBtn('renameEvent', '✏️', { ti: ti, ei: ei }, 'icon', lgL('Đổi tên giải', 'Rename event')) + lgBtn('delEvent', '✕', { ti: ti, ei: ei }, 'icon danger', lgL('Xóa giải', 'Delete event')) : '') + '</div>' +
          (rows ? '<div class="cr-table-wrap"><table class="lg-table lg-rtable"><thead><tr><th>#</th><th class="lg-l">' + lgE(lgL('Tên', 'Name')) + '</th><th>' + lgE(lgL('Điểm', 'Point')) + '</th><th>' + lgE(lgL('Hệ số', 'Rate')) + '</th><th>' + lgE(lgL('Tổng', 'Total')) + '</th>' + (admin ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
            : '<div class="lg-empty sm">—</div>') + '</div>';
      }).join('');
      return '<details class="lg-year" data-lg-year="' + lgE(tl.year) + '"' + (lgYearOpen(s, tl) ? ' open' : '') + '>' + head +
        '<div class="lg-year-body">' + (events ? '<div class="lg-events wide">' + events + '</div>' : '<div class="lg-empty sm">' + lgE(lgL('Chưa có giải nào.', 'No events yet.')) + '</div>') +
        lgGallery(tl.pictures, ti, admin) + '</div></details>';
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
          var baseName = (typeof careerSeasonIdOf === 'function' && careerSeasonIdOf(s) || state.current) + '_' + year + '_' + (s.timelines[timelineIndex].pictures.length + idx + 1);
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

