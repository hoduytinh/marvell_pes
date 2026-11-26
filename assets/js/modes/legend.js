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

    // The Hall of Legend is a Dashboard tab (career.js sets PES_MODE_HOST and passes careerAutoLegend()).
    var PES_MODE_HOST = null;
    function pesModeHost(){
      return PES_MODE_HOST && PES_MODE_HOST.isConnected ? PES_MODE_HOST : null;
    }

    // ---- Shared Hall of Legend / PES Ranking view helpers (CSS: "Legend / Ranking" section in styles.css) ----
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
    function lgOpenPhoto(url){
      var m = document.createElement('div');
      m.className = 'lg-lightbox';
      var img = document.createElement('img');
      img.src = url;
      m.appendChild(img);
      m.onclick = function(){ m.remove(); };
      document.body.appendChild(m);
    }
    function lgPrepHost(){
      var host = pesModeHost();
      if(!host) return null;
      var old = document.getElementById('legendContainer');
      if(old) old.remove();
      return host;
    }
    // Year blocks are <details>; remember open/closed per year across re-renders.
    var LG_OPEN = {};
    function lgYearOpen(tl){
      return !!LG_OPEN[tl.year];
    }
    // One delegated handler per render: [data-lg] buttons (click).
    function lgBind(root, acts){
      function args(el){
        var o = {};
        ['ti', 'pi'].forEach(function(k){ var v = el.getAttribute('data-' + k); if(v != null) o[k] = +v; });
        return o;
      }
      root.addEventListener('click', function(e){
        var b = e.target.closest('[data-lg]');
        if(!b || !root.contains(b) || !acts[b.getAttribute('data-lg')]) return;
        e.preventDefault();
        e.stopPropagation();
        acts[b.getAttribute('data-lg')](args(b), b);
      });
      root.addEventListener('toggle', function(e){
        var d = e.target;
        if(d && d.matches && d.matches('details[data-lg-year]')) LG_OPEN[d.getAttribute('data-lg-year')] = d.open;
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

    // Career cards of the top 3 (features/career.js), in podium order 2nd - 1st - 3rd. Click = full career.
    function lgPodiumCards(list){
      if(!list.length || typeof careerData !== 'function' || typeof renderFifaCardHtml !== 'function') return '';
      var cd = careerData(state), any = false;
      var html = [1, 0, 2].map(function(i){
        var c = list[i], n = c ? careerResolveName(cd, c.name) : null, card = n ? careerFifaCard(cd, n) : null;
        if(!card) return '<div class="lg-pod-card empty"></div>';
        any = true;
        return '<div class="lg-pod-card"><div class="fc-pick" role="button" tabindex="0" data-career-team="' + lgE(n) + '" title="' +
          lgE(lgL('Xem toàn bộ sự nghiệp', 'View full career')) + '">' + renderFifaCardHtml(card) + '</div></div>';
      }).join('');
      return any ? '<div class="lg-pod-cards">' + html + '</div>' : '';
    }

    // Hall of Legend (career.js careerAutoLegend: built from season results): KPIs, all-time medal
    // table (podium + table), Hall of Champions by year. Read-only, except photos (admin).
    function renderLegendMode(s) {
      if(!s) return;
      if(!s.timelines) s.timelines = [];
      var host = lgPrepHost();
      if(!host) return;
      var st = calculateLegendStats(s), list = st.championsList;
      var photoAdmin = isAdminUser();
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
        (list.length ? '<div class="lg-hero"><div>' + lgPodium(list, function(c){ return legendPts(c) + ' <small>' + lgE(lgL('điểm', 'pts')) + '</small>'; }, medalLine) + lgPodiumCards(list) + '</div><div>' + table + '</div></div>' : table) +
        '</section>';

      var years = s.timelines.map(function(tl, ti){ return { tl: tl, ti: ti }; }).reverse();
      html += '<section class="lg-card"><div class="lg-head"><h3>🏛️ Hall of Champions</h3><small>' + years.length + ' ' + lgE(lgL('năm', 'years')) + '</small></div>' +
        (years.length ? '<div class="lg-years">' + years.map(function(y){ return legendYearHtml(y.tl, y.ti, photoAdmin); }).join('') + '</div>'
          : '<div class="lg-empty">' + lgE(lgL('Chưa có năm nào.', 'No years yet.')) + '</div>') + '</section>';

      var root = document.createElement('div');
      root.id = 'legendContainer';
      root.className = 'lg-wrap';
      root.innerHTML = html;
      var T = function(a){ return s.timelines[a.ti]; };
      // Photos live in state.hallPhotos[year].
      var hallArr = function(a){ var map = hallPhotoMap(state), y = String(T(a).year); return map[y] || (map[y] = []); };
      lgBind(root, {
        addPhoto: function(a){ T(a).pictures = hallArr(a); addPicture(s, a.ti); },
        delPhoto: function(a){ if(confirm('Delete this photo?')){ hallArr(a).splice(a.pi, 1); saveAll(); legendRerender(); } },
        photo: function(a, el){ lgOpenPhoto(el.getAttribute('src')); }
      });
      var fillCards = function(d){
        var box = d.querySelector('[data-lg-ycards]');
        if(!box || box.hasAttribute('data-done')) return;
        box.setAttribute('data-done', '1');
        var tl = s.timelines[+box.getAttribute('data-lg-ycards')];
        try { box.innerHTML = tl ? lgYearCardsHtml(tl) : ''; } catch(e){ console.warn('Year cards failed:', e); }
      };
      root.addEventListener('toggle', function(e){
        var d = e.target;
        if(d && d.open && d.matches && d.matches('details[data-lg-year]')) fillCards(d);
      }, true);
      host.appendChild(root);
      [].forEach.call(root.querySelectorAll('details[data-lg-year][open]'), fillCards);
    }
    // The Hall is rebuilt from the data on every render.
    function legendRerender(){ renderLegendMode(careerAutoLegend(state)); }

    function legendYearHtml(tl, ti, photoAdmin){
      var evs = tl.events || [], pics = tl.pictures || [], golds = [];
      evs.forEach(function(ev){ ((ev.medals || {}).gold || []).forEach(function(n){ n = String(n || '').trim(); if(n && golds.indexOf(n) === -1) golds.push(n); }); });
      var head = '<summary class="lg-year-head"><span class="lg-year-badge">' + lgE(tl.year) + '</span>' +
        '<span class="lg-year-meta">' + evs.length + ' ' + lgE(lgL('giải', 'events')) + (pics.length ? ' · 📸 ' + pics.length : '') + '</span>' +
        '<span class="lg-year-champs">' + golds.slice(0, 6).map(function(n){ return '<span class="lg-chip no-i18n">🥇 ' + lgE(n) + '</span>'; }).join('') + (golds.length > 6 ? '<span class="lg-chip">+' + (golds.length - 6) + '</span>' : '') + '</span>' +
        (photoAdmin ? '<span class="lg-acts">' + lgBtn('addPhoto', '📸 ' + lgE(lgL('Ảnh', 'Photo')), { ti: ti }) + '</span>' : '') +
        '<span class="lg-chev">▾</span></summary>';
      var events = evs.map(function(ev){
        var medals = ev.medals || {};
        var rows = LG_MEDALS.map(function(m){
          return (medals[m.k] || []).map(function(n){
            return '<div class="lg-medal ' + m.k + '"><span class="lg-medal-ico">' + m.icon + '</span><span class="lg-medal-n">' + lgName(n) + '</span></div>';
          }).join('');
        }).join('');
        return '<div class="lg-event"><div class="lg-event-head"><span class="lg-event-name no-i18n">' + lgE(ev.name) + '</span></div>' +
          '<div class="lg-medals">' + (rows || '<div class="lg-empty sm">—</div>') + '</div></div>';
      }).join('');
      return '<details class="lg-year" data-lg-year="' + lgE(tl.year) + '"' + (lgYearOpen(tl) ? ' open' : '') + '>' + head +
        '<div class="lg-year-body">' + (events ? '<div class="lg-events">' + events + '</div>' : '<div class="lg-empty sm">' + lgE(lgL('Chưa có giải nào.', 'No events yet.')) + '</div>') +
        (evs.length ? '<div class="lg-ycards" data-lg-ycards="' + ti + '"></div>' : '') +
        lgGallery(pics, ti, photoAdmin) + '</div></details>';
    }

    // Career cards of the year's medal winners (one card per player, best medals first), with the
    // career as of the end of that year (careerDataUntil). Built when the year block is first opened.
    function lgYearCardsHtml(tl){
      if(typeof careerDataUntil !== 'function' || typeof renderFifaCardHtml !== 'function') return '';
      var cd = careerDataUntil(tl.year), by = {}, list = [];
      (tl.events || []).forEach(function(ev){
        LG_MEDALS.forEach(function(m){
          ((ev.medals || {})[m.k] || []).forEach(function(n){
            n = String(n || '').trim();
            if(!n) return;
            var k = n.toLowerCase(), e = by[k];
            if(!e){ e = by[k] = { name: n, gold: 0, silver: 0, bronze: 0 }; list.push(e); }
            e[m.k]++;
          });
        });
      });
      list.sort(function(a, b){ return b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze; });
      var only = !!(typeof statsMasterOnly !== 'undefined' && statsMasterOnly && (state.teamMasterList || []).length), rank = {};
      careerEloTable(cd, only).forEach(function(t, i){ rank[t.name] = i + 1; });
      var cards = list.map(function(e){
        var n = careerResolveName(cd, e.name), card = careerFifaCard(cd, n);
        if(!card) return '';
        card.rank = rank[n] || 0;
        var tally = LG_MEDALS.map(function(m){ return e[m.k] ? '<span>' + m.icon + (e[m.k] > 1 ? '×' + e[m.k] : '') + '</span>' : ''; }).join('');
        return '<div class="lg-yc"><div class="fc-pick" role="button" tabindex="0" data-career-team="' + lgE(n) + '" data-career-year="' + lgE(tl.year) + '" title="' +
          lgE(lgL('Xem sự nghiệp tính đến hết ' + tl.year, 'View career as of the end of ' + tl.year)) + '">' + renderFifaCardHtml(card) + '</div><div class="lg-yc-tally">' + tally + '</div></div>';
      }).join('');
      return cards ? '<div class="lg-ycards-head">🃏 ' + lgE(lgL('Thẻ sự nghiệp tính đến hết ', 'Career cards as of the end of ') + tl.year) + '</div><div class="lg-ycards-row">' + cards + '</div>' : '';
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
          var baseName = 'hall_' + year + '_' + (s.timelines[timelineIndex].pictures.length + idx + 1) + '_' + Date.now().toString(36);
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
              legendRerender();
            }
          });
        });
      };
      input.click();
    }
