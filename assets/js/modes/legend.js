// Marvell PES Club - modes/legend.js (split from app.js; shared global scope, load order set in index.html)
    // Calculate statistics for Legend mode
    function calculateLegendStats(s) {
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
      
      var championsMap = {}; // { teamName: { gold: 0, silver: 0, bronze: 0 } }
      
      stats.totalYears = s.timelines.length;
      
      s.timelines.forEach(function(timeline) {
        if(!timeline.events) return;
        
        stats.totalEvents += timeline.events.length;
        
        timeline.events.forEach(function(event) {
          if(!event.medals) return;
          
          // Count gold medals
          if(event.medals.gold) {
            event.medals.gold.forEach(function(team) {
              if(team && team.trim()) {
                stats.totalGold++;
                if(!championsMap[team]) {
                  championsMap[team] = { gold: 0, silver: 0, bronze: 0 };
                }
                championsMap[team].gold++;
              }
            });
          }
          
          // Count silver medals
          if(event.medals.silver) {
            event.medals.silver.forEach(function(team) {
              if(team && team.trim()) {
                stats.totalSilver++;
                if(!championsMap[team]) {
                  championsMap[team] = { gold: 0, silver: 0, bronze: 0 };
                }
                championsMap[team].silver++;
              }
            });
          }
          
          // Count bronze medals
          if(event.medals.bronze) {
            event.medals.bronze.forEach(function(team) {
              if(team && team.trim()) {
                stats.totalBronze++;
                if(!championsMap[team]) {
                  championsMap[team] = { gold: 0, silver: 0, bronze: 0 };
                }
                championsMap[team].bronze++;
              }
            });
          }
        });
      });
      
      // Convert map to sorted list
      Object.keys(championsMap).forEach(function(teamName) {
        stats.championsList.push({
          name: teamName,
          gold: championsMap[teamName].gold,
          silver: championsMap[teamName].silver,
          bronze: championsMap[teamName].bronze
        });
      });
      
      // Sort by: Points (Gold×4 + Silver×2 + Bronze×1)
      stats.championsList.sort(function(a, b) {
        var pointsA = a.gold * 4 + a.silver * 2 + a.bronze * 1;
        var pointsB = b.gold * 4 + b.silver * 2 + b.bronze * 1;
        if(pointsB !== pointsA) return pointsB - pointsA;
        // If points are equal, sort by gold, then silver, then bronze
        if(b.gold !== a.gold) return b.gold - a.gold;
        if(b.silver !== a.silver) return b.silver - a.silver;
        return b.bronze - a.bronze;
      });
      
      // Total Champions = số người đã từng ít nhất 1 lần có huy chương vàng
      stats.totalChampions = stats.championsList.filter(function(c) {
        return c.gold > 0;
      }).length;
      
      return stats;
    }

    // Legend / Ranking are shown inside a Dashboard tab (career.js sets PES_MODE_HOST);
    // the main page is only used when such a season is the active one (no other seasons).
    var PES_MODE_HOST = null;
    function pesModeHost(s){
      if(PES_MODE_HOST && PES_MODE_HOST.isConnected && PES_MODE_HOST.getAttribute('data-mode') === s.mode) return PES_MODE_HOST;
      return activeSeason() === s ? document.querySelector('main.container') : null;
    }

    // ---- Shared Legend / Ranking view helpers (CSS: "Legend / Ranking" section in styles.css) ----
    function lgL(vi, en){ return typeof crL === 'function' ? crL(vi, en) : en; }
    function lgE(v){ return escapeHtml(v == null ? '' : String(v)); }
    function lgName(n){
      n = String(n || '').trim();
      if(!n) return '<span class="muted">—</span>';
      return typeof crTeam === 'function' ? crTeam(n) : '<span class="no-i18n">' + lgE(n) + '</span>';
    }
    function lgNum(v){ return String(Math.round((+v || 0) * 100) / 100); }
    function lgA(o){ return Object.keys(o || {}).map(function(k){ return ' data-' + k + '="' + lgE(o[k]) + '"'; }).join(''); }
    function lgBtn(act, label, o, cls, title){
      return '<button type="button" class="lg-btn' + (cls ? ' ' + cls : '') + '" data-lg="' + act + '"' + lgA(o) + (title ? ' title="' + lgE(title) + '"' : '') + '>' + label + '</button>';
    }
    function lgZ(v){ return v ? String(v) : '<span class="lg-zero">0</span>'; }
    function lgBar(v, max, label){
      var p = max > 0 ? Math.max(2, Math.round(v * 100 / max)) : 0;
      return '<div class="lg-pts"><div class="lg-bar"><i style="width:' + p + '%"></i></div><b>' + label + '</b></div>';
    }
    function lgKpis(items){
      return '<div class="lg-kpis">' + items.map(function(i){
        return '<div class="lg-kpi"><span class="lg-kpi-ico">' + i.icon + '</span><div><div class="lg-kpi-v">' + i.v + '</div><div class="lg-kpi-l">' + lgE(i.l) + '</div></div></div>';
      }).join('') + '</div>';
    }
    // Top-3 podium, shown 2nd - 1st - 3rd.
    function lgPodium(list, val, sub){
      if(!list.length) return '';
      return '<div class="lg-podium">' + [1, 0, 2].map(function(i){
        var c = list[i];
        if(!c) return '<div class="lg-pod p' + (i + 1) + ' empty"><div class="lg-pod-step">' + (i + 1) + '</div></div>';
        return '<div class="lg-pod p' + (i + 1) + '"><div class="lg-pod-medal">' + ['🥇', '🥈', '🥉'][i] + '</div>' +
          '<div class="lg-pod-name">' + lgName(c.name) + '</div><div class="lg-pod-val">' + val(c) + '</div>' +
          (sub ? '<div class="lg-pod-sub">' + sub(c) + '</div>' : '') + '<div class="lg-pod-step">' + (i + 1) + '</div></div>';
      }).join('') + '</div>';
    }
    // Admin: pick a name from the Team List.
    function lgPickTeam(onPick){
      var teams = (state.teamMasterList || []).slice();
      if(!teams.length){ alert('Team List is empty. Add teams to Team List first.'); return; }
      teams.sort(function(a, b){ return a.toLowerCase().localeCompare(b.toLowerCase()); });
      var dlg = document.createElement('dialog');
      dlg.className = 'lg-dialog';
      dlg.innerHTML = '<h4>' + lgE(lgL('Chọn đội', 'Select team')) + '</h4><div class="lg-pick-list">' +
        teams.map(function(t){ return '<button type="button" class="lg-pick no-i18n" data-team="' + lgE(t) + '">' + lgE(t) + '</button>'; }).join('') +
        '</div><div class="lg-dialog-foot"><button type="button" data-close>' + lgE(lgL('Hủy', 'Cancel')) + '</button></div>';
      dlg.addEventListener('click', function(e){
        var b = e.target.closest('.lg-pick');
        if(b){ dlg.close(); onPick(b.getAttribute('data-team')); return; }
        if(e.target.closest('[data-close]')) dlg.close();
      });
      dlg.addEventListener('close', function(){ if(dlg.parentNode) dlg.parentNode.removeChild(dlg); });
      document.body.appendChild(dlg);
      addListSearch(dlg.querySelector('.lg-pick-list'), '.lg-pick', function(el){ return el.getAttribute('data-team'); });
      if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
    }
    function lgOpenPhoto(url){
      var m = document.createElement('div');
      m.className = 'lg-lightbox';
      var img = document.createElement('img');
      img.src = url;
      m.appendChild(img);
      m.onclick = function(){ m.remove(); };
      document.body.appendChild(m);
    }
    // Clear the previous view; on the main page also hide the regular season sections.
    function lgPrepHost(s, tag){
      var host = pesModeHost(s);
      if(!host) return null;
      if(host.id !== 'spModeHost'){
        $('seasonTitle').textContent = '— ' + s.name + ' (' + tag + ')';
        $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';
        ['main.container section.card.grow', 'main.container section.card:has(#fixtures)', '.round-selector'].forEach(function(q){
          var el = document.querySelector(q);
          if(el) el.style.display = 'none';
        });
      }
      ['legendContainer', 'rankingModeContainer'].forEach(function(id){ var el = document.getElementById(id); if(el) el.remove(); });
      return host;
    }
    // Year blocks are <details>; remember open/closed per mode + year across re-renders.
    var LG_OPEN = {};
    function lgYearOpen(s, tl){
      return !!LG_OPEN[s.mode + ':' + tl.year];
    }
    // One delegated handler per render: [data-lg] buttons (click) and [data-lg-in] inputs (change).
    function lgBind(root, s, acts){
      function args(el){
        var o = {};
        ['ti', 'ei', 'mi', 'pi', 'ri'].forEach(function(k){ var v = el.getAttribute('data-' + k); if(v != null) o[k] = +v; });
        o.mt = el.getAttribute('data-mt');
        return o;
      }
      root.addEventListener('click', function(e){
        var b = e.target.closest('[data-lg]');
        if(!b || !root.contains(b) || !acts[b.getAttribute('data-lg')]) return;
        e.preventDefault();
        e.stopPropagation();
        acts[b.getAttribute('data-lg')](args(b), b);
      });
      root.addEventListener('change', function(e){
        var el = e.target.closest('[data-lg-in]');
        if(el && acts[el.getAttribute('data-lg-in')]) acts[el.getAttribute('data-lg-in')](args(el), el);
      });
      root.addEventListener('toggle', function(e){
        var d = e.target;
        if(d && d.matches && d.matches('details[data-lg-year]')) LG_OPEN[s.mode + ':' + d.getAttribute('data-lg-year')] = d.open;
      }, true);
    }
    function lgGallery(pics, ti, admin){
      if(!pics || !pics.length) return '';
      return '<div class="lg-gallery">' + pics.map(function(p, pi){
        return '<figure class="lg-photo"><img src="' + lgE(p) + '" alt="" loading="lazy" data-lg="photo">' +
          (admin ? lgBtn('delPhoto', '✕', { ti: ti, pi: pi }, 'icon', lgL('Xóa ảnh', 'Delete photo')) : '') + '</figure>';
      }).join('') + '</div>';
    }

    var LG_MEDALS = [
      { k: 'gold', icon: '🥇' },
      { k: 'silver', icon: '🥈' },
      { k: 'bronze', icon: '🥉' }
    ];
    function legendPts(c){ return c.gold * 4 + c.silver * 2 + c.bronze; }
    function legendMigrateEvent(ev){
      if(ev.gold !== undefined && typeof ev.gold === 'string'){
        ev.medals = { gold: [ev.gold], silver: [ev.silver], bronze: [ev.bronze] };
        delete ev.gold; delete ev.silver; delete ev.bronze;
      }
      if(!ev.medals) ev.medals = { gold: [], silver: [], bronze: [] };
    }

    // Render Legend mode: KPIs, all-time medal table (podium + table), Hall of Champions by year.
    function renderLegendMode(s) {
      if(!s) return;
      if(!s.timelines) s.timelines = [];
      var host = lgPrepHost(s, 'LEGEND');
      if(!host) return;
      s.timelines.forEach(function(tl){ (tl.events || []).forEach(legendMigrateEvent); });
      var st = calculateLegendStats(s), admin = isAdmin(), list = st.championsList;
      var max = list.length ? legendPts(list[0]) : 0;
      var medalLine = function(c){ return '🥇' + c.gold + ' · 🥈' + c.silver + ' · 🥉' + c.bronze; };

      var html = lgKpis([
        { icon: '📅', v: st.totalYears, l: lgL('Năm', 'Years') },
        { icon: '🏅', v: st.totalEvents, l: lgL('Giải đấu', 'Events') },
        { icon: '👑', v: st.totalChampions, l: lgL('Nhà vô địch', 'Champions') },
        { icon: '🥇', v: st.totalGold, l: lgL('HC Vàng', 'Gold') },
        { icon: '🥈', v: st.totalSilver, l: lgL('HC Bạc', 'Silver') },
        { icon: '🥉', v: st.totalBronze, l: lgL('HC Đồng', 'Bronze') }
      ]);

      var table = list.length ? '<div class="cr-table-wrap"><table class="lg-table"><thead><tr><th>#</th><th class="lg-l">' + lgE(lgL('Tuyển thủ', 'Player')) + '</th>' +
        '<th title="Gold">🥇</th><th title="Silver">🥈</th><th title="Bronze">🥉</th><th>' + lgE(lgL('Tổng HC', 'Medals')) + '</th><th class="lg-l">' + lgE(lgL('Điểm', 'Points')) + '</th></tr></thead><tbody>' +
        list.map(function(c, i){
          var p = legendPts(c);
          return '<tr' + (i < 3 ? ' class="lg-top' + (i + 1) + '"' : '') + '><td><span class="lg-rk">' + (i + 1) + '</span></td><td class="lg-l lg-n">' + lgName(c.name) + '</td>' +
            '<td class="lg-g">' + lgZ(c.gold) + '</td><td class="lg-s">' + lgZ(c.silver) + '</td><td class="lg-b">' + lgZ(c.bronze) + '</td>' +
            '<td>' + (c.gold + c.silver + c.bronze) + '</td><td class="lg-l">' + lgBar(p, max, p) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="lg-empty">' + lgE(lgL('Chưa có huy chương nào.', 'No medals yet.')) + '</div>';

      html += '<section class="lg-card"><div class="lg-head"><h3>🏅 ' + lgE(lgL('Bảng vàng mọi thời đại', 'All-time champions')) + '</h3>' +
        '<small>' + lgE(lgL('Điểm = 🥇×4 + 🥈×2 + 🥉×1', 'Points = 🥇×4 + 🥈×2 + 🥉×1')) + '</small></div>' +
        (list.length ? '<div class="lg-hero"><div>' + lgPodium(list, function(c){ return legendPts(c) + ' <small>' + lgE(lgL('điểm', 'pts')) + '</small>'; }, medalLine) + '</div><div>' + table + '</div></div>' : table) +
        '</section>';

      var years = s.timelines.map(function(tl, ti){ return { tl: tl, ti: ti }; }).reverse();
      html += '<section class="lg-card"><div class="lg-head"><h3>🏛️ Hall of Champions</h3><small>' + years.length + ' ' + lgE(lgL('năm', 'years')) + '</small>' +
        (admin ? '<span class="lg-head-acts">' + lgBtn('addYear', '＋ ' + lgE(lgL('Thêm năm', 'Add year')), null, 'primary') + '</span>' : '') + '</div>' +
        (years.length ? '<div class="lg-years">' + years.map(function(y, pos){ return legendYearHtml(s, y.tl, y.ti, pos, admin); }).join('') + '</div>'
          : '<div class="lg-empty">' + lgE(lgL('Chưa có năm nào.', 'No years yet.')) + '</div>') + '</section>';

      var root = document.createElement('div');
      root.id = 'legendContainer';
      root.className = 'lg-wrap';
      root.innerHTML = html;
      var rr = function(){ saveAll(); renderLegendMode(s); };
      var T = function(a){ return s.timelines[a.ti]; };
      var E = function(a){ return T(a).events[a.ei]; };
      lgBind(root, s, {
        addYear: function(){ addTimeline(s); },
        renameYear: function(a){ var v = prompt('Rename timeline:', T(a).year); if(v && v.trim()){ T(a).year = v.trim(); rr(); } },
        delYear: function(a){ if(confirm('Delete timeline for ' + T(a).year + '?')){ s.timelines.splice(a.ti, 1); rr(); } },
        addEvent: function(a){ addEvent(s, a.ti); },
        renameEvent: function(a){ var v = prompt('Rename event:', E(a).name); if(v && v.trim()){ E(a).name = v.trim(); rr(); } },
        delEvent: function(a){ if(confirm('Delete event "' + E(a).name + '"?')){ T(a).events.splice(a.ei, 1); rr(); } },
        addMedal: function(a){ var m = E(a).medals; (m[a.mt] = m[a.mt] || []).push(''); rr(); },
        delMedal: function(a){ E(a).medals[a.mt].splice(a.mi, 1); rr(); },
        pickMedal: function(a){ lgPickTeam(function(t){ E(a).medals[a.mt][a.mi] = t; rr(); }); },
        setMedal: function(a, el){ E(a).medals[a.mt][a.mi] = el.value; rr(); },
        addPhoto: function(a){ addPicture(s, a.ti); },
        delPhoto: function(a){ if(confirm('Delete this photo?')){ T(a).pictures.splice(a.pi, 1); rr(); } },
        photo: function(a, el){ lgOpenPhoto(el.getAttribute('src')); }
      });
      host.appendChild(root);
    }

    function legendYearHtml(s, tl, ti, pos, admin){
      var evs = tl.events || [], pics = tl.pictures || [], golds = [];
      evs.forEach(function(ev){ (ev.medals.gold || []).forEach(function(n){ n = String(n || '').trim(); if(n && golds.indexOf(n) === -1) golds.push(n); }); });
      var head = '<summary class="lg-year-head"><span class="lg-year-badge">' + lgE(tl.year) + '</span>' +
        '<span class="lg-year-meta">' + evs.length + ' ' + lgE(lgL('giải', 'events')) + (pics.length ? ' · 📸 ' + pics.length : '') + '</span>' +
        '<span class="lg-year-champs">' + golds.slice(0, 6).map(function(n){ return '<span class="lg-chip no-i18n">🥇 ' + lgE(n) + '</span>'; }).join('') + (golds.length > 6 ? '<span class="lg-chip">+' + (golds.length - 6) + '</span>' : '') + '</span>' +
        (admin ? '<span class="lg-acts">' + lgBtn('renameYear', '✏️', { ti: ti }, 'icon', lgL('Đổi tên năm', 'Rename year')) +
          lgBtn('addEvent', '＋ ' + lgE(lgL('Giải', 'Event')), { ti: ti }) + lgBtn('addPhoto', '📸 ' + lgE(lgL('Ảnh', 'Photo')), { ti: ti }) +
          lgBtn('delYear', '🗑', { ti: ti }, 'icon danger', lgL('Xóa năm', 'Delete year')) + '</span>' : '') +
        '<span class="lg-chev">▾</span></summary>';
      var events = evs.map(function(ev, ei){
        var rows = LG_MEDALS.map(function(m){
          return (ev.medals[m.k] || []).map(function(n, mi){
            var o = { ti: ti, ei: ei, mt: m.k, mi: mi };
            return '<div class="lg-medal ' + m.k + '"><span class="lg-medal-ico">' + m.icon + '</span>' + (admin
              ? '<input class="lg-in no-i18n" type="text" value="' + lgE(n) + '" placeholder="' + lgE(lgL('Tên đội...', 'Team name...')) + '" data-lg-in="setMedal"' + lgA(o) + '>' +
                lgBtn('pickMedal', '▾', o, 'icon', lgL('Chọn từ danh sách đội', 'Pick from Team List')) + lgBtn('delMedal', '✕', o, 'icon danger')
              : '<span class="lg-medal-n">' + lgName(n) + '</span>') + '</div>';
          }).join('');
        }).join('');
        return '<div class="lg-event"><div class="lg-event-head"><span class="lg-event-name no-i18n">' + lgE(ev.name) + '</span>' +
          (admin ? lgBtn('renameEvent', '✏️', { ti: ti, ei: ei }, 'icon', lgL('Đổi tên giải', 'Rename event')) + lgBtn('delEvent', '✕', { ti: ti, ei: ei }, 'icon danger', lgL('Xóa giải', 'Delete event')) : '') + '</div>' +
          '<div class="lg-medals">' + (rows || '<div class="lg-empty sm">—</div>') + '</div>' +
          (admin ? '<div class="lg-add">' + LG_MEDALS.map(function(m){ return lgBtn('addMedal', '＋ ' + m.icon, { ti: ti, ei: ei, mt: m.k }, 'sm'); }).join('') + '</div>' : '') + '</div>';
      }).join('');
      return '<details class="lg-year" data-lg-year="' + lgE(tl.year) + '"' + (lgYearOpen(s, tl) ? ' open' : '') + '>' + head +
        '<div class="lg-year-body">' + (events ? '<div class="lg-events">' + events + '</div>' : '<div class="lg-empty sm">' + lgE(lgL('Chưa có giải nào.', 'No events yet.')) + '</div>') +
        lgGallery(pics, ti, admin) + '</div></details>';
    }
    
    function addTimeline(s) {
      var year = prompt('Enter year:');
      if(!year) return;
      
      if(!s.timelines) s.timelines = [];
      s.timelines.push({
        year: year,
        events: [],
        pictures: []
      });
      s.timelines.sort(function(a, b) { return parseInt(a.year) - parseInt(b.year); });
      saveAll();
      renderLegendMode(s);
    }
    
    function addPicture(s, timelineIndex) {
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
            message: 'chore: upload timeline photo ' + baseName
          }).then(function(path) {
            s.timelines[timelineIndex].pictures.push(path);
          }).catch(function(err) {
            console.error('Photo upload failed:', err);
            alert('Upload ảnh thất bại: ' + (err && err.message ? err.message : err));
          }).then(function() {
            done++;
            if(done === files.length) {
              saveAll();
              renderLegendMode(s);
            }
          });
        });
      };
      input.click();
    }
    
    function addEvent(s, timelineIndex) {
      var eventName = prompt('Enter event name:');
      if(!eventName) return;
      
      if(!s.timelines[timelineIndex].events) s.timelines[timelineIndex].events = [];
      s.timelines[timelineIndex].events.push({
        name: eventName,
        medals: {
          gold: [],
          silver: [],
          bronze: []
        }
      });
      saveAll();
      renderLegendMode(s);
    }
