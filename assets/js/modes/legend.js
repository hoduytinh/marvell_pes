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

    // Render Legend mode - timeline with events and medals
    function renderLegendMode(s) {
      console.log('renderLegendMode called for season:', s.name, 'mode:', s.mode);
      
      if(!s || !s.timelines) {
        s.timelines = [];
      }
      
      $('seasonTitle').textContent = '— ' + s.name + ' (LEGEND)';
      $('leagueLogo').style.backgroundImage = s.logo ? ('url("' + s.logo + '")') : 'none';
      
      // Hide all unnecessary elements - use more specific selectors
      var standingsSection = document.querySelector('main.container section.card.grow');
      if(standingsSection) standingsSection.style.display = 'none';
      
      var fixturesSection = document.querySelector('main.container section.card:has(#fixtures)');
      if(fixturesSection) fixturesSection.style.display = 'none';
      
      var roundSelDiv = document.querySelector('.round-selector');
      if(roundSelDiv) roundSelDiv.style.display = 'none';
      
      // Create main legend container
      var mainContainer = document.querySelector('main.container');
      
      // Remove any existing legend or ranking containers
      var existingLegend = document.getElementById('legendContainer');
      if(existingLegend) existingLegend.remove();
      
      var existingRanking = document.getElementById('rankingModeContainer');
      if(existingRanking) existingRanking.remove();
      
      var legendContainer = document.createElement('div');
      legendContainer.id = 'legendContainer';
      legendContainer.className = 'row';
      legendContainer.style.cssText = 'margin-top: 20px;';
      
      // Calculate statistics
      var stats = calculateLegendStats(s);
      
      // Statistics and Standings row
      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; width: 100%;';
      
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
        { icon: '👑', label: 'Gold Medals', value: stats.totalGold },
        { icon: '🏆', label: 'Silver Medals', value: stats.totalSilver },
        { icon: '🎖️', label: 'Bronze Medals', value: stats.totalBronze },
        { icon: '⭐', label: 'Total Champions', value: stats.totalChampions }
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
      
      // Champions Standings Table
      var standingsCard = document.createElement('section');
      standingsCard.className = 'card';
      standingsCard.style.cssText = 'padding: 24px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
      
      var standingsTitle = document.createElement('h3');
      standingsTitle.textContent = '🏅 All-Time Champions';
      standingsTitle.style.cssText = 'margin: 0 0 20px 0; color: var(--accent); font-size: 22px; font-weight: 700; border-bottom: 2px solid var(--accent); padding-bottom: 12px;';
      standingsCard.appendChild(standingsTitle);
      
      var tableContainer = document.createElement('div');
      tableContainer.style.cssText = 'overflow-x: auto;';
      
      var table = document.createElement('table');
      table.style.cssText = 'width: 100%; border-collapse: collapse;';
      
      // Table header
      var thead = document.createElement('thead');
      thead.innerHTML = '<tr style="background: rgba(59, 130, 246, 0.2);">' +
        '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">#</th>' +
        '<th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Champion</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">👑</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">🏆</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">🎖️</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Pts</th>' +
        '<th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; border-bottom: 2px solid var(--accent);">Total</th>' +
        '</tr>';
      table.appendChild(thead);
      
      // Table body
      var tbody = document.createElement('tbody');
      stats.championsList.forEach(function(champion, idx) {
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
        
        var total = champion.gold + champion.silver + champion.bronze;
        var points = champion.gold * 4 + champion.silver * 2 + champion.bronze * 1;
        
        tr.innerHTML = 
          '<td style="padding: 10px; font-weight: 600; ' + rankColor + '">' + (idx + 1) + '</td>' +
          '<td style="padding: 10px; font-weight: 600; font-size: 15px;">' + champion.name + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 16px; color: #FFD700;">' + champion.gold + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 16px; color: #C0C0C0;">' + champion.silver + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 16px; color: #CD7F32;">' + champion.bronze + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 17px; color: var(--accent);">' + points + '</td>' +
          '<td style="padding: 10px; text-align: center; font-weight: 700; font-size: 17px; color: var(--muted);">' + total + '</td>';
        
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      
      tableContainer.appendChild(table);
      standingsCard.appendChild(tableContainer);
      statsRow.appendChild(standingsCard);
      
      legendContainer.appendChild(statsRow);
      
      // Create legend section (Hall of Champions) - on separate row below
      var hallSection = document.createElement('div');
      hallSection.style.cssText = 'margin-top: 20px; width: 100%;';
      
      var section = document.createElement('section');
      section.className = 'card grow';
      section.style.cssText = 'padding: 32px; background: linear-gradient(135deg, var(--card) 0%, var(--panel) 100%); box-shadow: 0 8px 24px rgba(0,0,0,0.3); width: 100%;';
      
      // Header with Add Timeline button
      var header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--accent);';
      
      var title = document.createElement('h3');
      title.textContent = '🏆 Hall of Champions';
      title.style.cssText = 'margin: 0; color: var(--accent); font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);';
      header.appendChild(title);
      
      if(isAdmin()) {
        var addTimelineBtn = document.createElement('button');
        addTimelineBtn.className = 'primary';
        addTimelineBtn.textContent = '📅 Add Timeline';
        addTimelineBtn.style.cssText = 'padding: 10px 20px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);';
        addTimelineBtn.onclick = function() { addTimeline(s); };
        header.appendChild(addTimelineBtn);
      }
      
      section.appendChild(header);
      
      // Render all timelines (newest first - reverse order)
      var timelinesDiv = document.createElement('div');
      timelinesDiv.id = 'timelinesContainer';
      var reversedTimelines = s.timelines.slice().reverse();
      reversedTimelines.forEach(function(timeline) {
        var originalIndex = s.timelines.indexOf(timeline);
        timelinesDiv.appendChild(renderTimeline(s, timeline, originalIndex));
      });
      
      section.appendChild(timelinesDiv);
      hallSection.appendChild(section);
      legendContainer.appendChild(hallSection);
      mainContainer.appendChild(legendContainer);
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
    
    function renderTimeline(s, timeline, index) {
      var timelineDiv = document.createElement('div');
      timelineDiv.className = 'timeline-box';
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
            renderLegendMode(s);
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
        addEventBtn.onclick = function() { addEvent(s, index); };
        btnGroup.appendChild(addEventBtn);
        
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Year';
        deleteBtn.style.cssText = 'background: #dc2626; color: white; padding: 8px 16px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);';
        deleteBtn.onclick = function() {
          if(confirm('Delete timeline for ' + timeline.year + '?')) {
            s.timelines.splice(index, 1);
            saveAll();
            renderLegendMode(s);
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
        eventsContainer.appendChild(renderEvent(s, index, event, eventIndex));
      });
      timelineDiv.appendChild(eventsContainer);
      
      // Picture gallery section
      if(!timeline.pictures) timeline.pictures = [];
      
      var pictureSection = document.createElement('div');
      pictureSection.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border);';
      
      if(isAdmin()) {
        var pictureHeader = document.createElement('div');
        pictureHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        
        var pictureTitle = document.createElement('h5');
        pictureTitle.textContent = '📸 Photo Gallery';
        pictureTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: var(--accent);';
        pictureHeader.appendChild(pictureTitle);
        
        var addPictureBtn = document.createElement('button');
        addPictureBtn.textContent = '➕ Add Photo';
        addPictureBtn.className = 'primary';
        addPictureBtn.style.cssText = 'padding: 6px 14px; font-size: 13px; font-weight: 600;';
        addPictureBtn.onclick = function() { addPicture(s, index); };
        pictureHeader.appendChild(addPictureBtn);
        
        pictureSection.appendChild(pictureHeader);
      }
      
      // Picture gallery display
      if(timeline.pictures.length > 0) {
        var galleryDiv = document.createElement('div');
        // If more than 4 pictures, display vertically; otherwise horizontally
        if(timeline.pictures.length > 4) {
          galleryDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 8px 0;';
        } else {
          galleryDiv.style.cssText = 'display: flex; gap: 16px; overflow-x: auto; padding: 8px 0;';
        }
        
        timeline.pictures.forEach(function(pictureUrl, picIndex) {
          var picContainer = renderPictureItem(s, index, pictureUrl, picIndex);
          galleryDiv.appendChild(picContainer);
        });
        
        pictureSection.appendChild(galleryDiv);
      }
      
      timelineDiv.appendChild(pictureSection);
      
      return timelineDiv;
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
          var baseName = state.current + '_' + year + '_' + (s.timelines[timelineIndex].pictures.length + idx + 1);
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
    
    function resizeImage(file, maxWidth, callback) {
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
    
    function renderPictureItem(s, timelineIndex, pictureUrl, picIndex) {
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
            renderLegendMode(s);
          }
        };
        container.appendChild(deleteBtn);
      }
      
      return container;
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
    
    function renderEvent(s, timelineIndex, event, eventIndex) {
      var eventDiv = document.createElement('div');
      eventDiv.style.cssText = 'border: 2px solid var(--border); padding: 20px; background: linear-gradient(135deg, var(--panel) 0%, var(--card) 100%); border-radius: 12px; min-width: 320px; flex: 0 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;';
      
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
            renderLegendMode(s);
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
            renderLegendMode(s);
          }
        };
        eventHeader.appendChild(deleteEventBtn);
      }
      
      eventDiv.appendChild(eventHeader);
      
      // Migrate old format to new format if needed
      if(event.gold !== undefined && typeof event.gold === 'string') {
        event.medals = {
          gold: [event.gold],
          silver: [event.silver],
          bronze: [event.bronze]
        };
        delete event.gold;
        delete event.silver;
        delete event.bronze;
      }
      if(!event.medals) {
        event.medals = { gold: [], silver: [], bronze: [] };
      }
      
      // Medal sections - vertical layout, each medal on its own line
      var medalsDiv = document.createElement('div');
      medalsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
      
      // Render gold medals
      var goldMedals = event.medals.gold || [];
      goldMedals.forEach(function(team, teamIndex) {
        var medalItem = renderMedalItem(s, timelineIndex, eventIndex, 'gold', '👑', team, teamIndex);
        medalsDiv.appendChild(medalItem);
      });
      
      // Render silver medals
      var silverMedals = event.medals.silver || [];
      silverMedals.forEach(function(team, teamIndex) {
        var medalItem = renderMedalItem(s, timelineIndex, eventIndex, 'silver', '🏆', team, teamIndex);
        medalsDiv.appendChild(medalItem);
      });
      
      // Render bronze medals
      var bronzeMedals = event.medals.bronze || [];
      bronzeMedals.forEach(function(team, teamIndex) {
        var medalItem = renderMedalItem(s, timelineIndex, eventIndex, 'bronze', '🎖️', team, teamIndex);
        medalsDiv.appendChild(medalItem);
      });
      
      // Add buttons for admin
      if(isAdmin()) {
        var addBtnsDiv = document.createElement('div');
        addBtnsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);';
        
        var addGoldBtn = document.createElement('button');
        addGoldBtn.textContent = '+ 👑';
        addGoldBtn.style.cssText = 'background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #000; padding: 6px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);';
        addGoldBtn.onclick = function() {
          if(!event.medals.gold) event.medals.gold = [];
          event.medals.gold.push('');
          saveAll();
          renderLegendMode(s);
        };
        addBtnsDiv.appendChild(addGoldBtn);
        
        var addSilverBtn = document.createElement('button');
        addSilverBtn.textContent = '+ 🏆';
        addSilverBtn.style.cssText = 'background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%); color: #000; padding: 6px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);';
        addSilverBtn.onclick = function() {
          if(!event.medals.silver) event.medals.silver = [];
          event.medals.silver.push('');
          saveAll();
          renderLegendMode(s);
        };
        addBtnsDiv.appendChild(addSilverBtn);
        
        var addBronzeBtn = document.createElement('button');
        addBronzeBtn.textContent = '+ 🎖️';
        addBronzeBtn.style.cssText = 'background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%); color: #fff; padding: 6px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);';
        addBronzeBtn.onclick = function() {
          if(!event.medals.bronze) event.medals.bronze = [];
          event.medals.bronze.push('');
          saveAll();
          renderLegendMode(s);
        };
        addBtnsDiv.appendChild(addBronzeBtn);
        
        medalsDiv.appendChild(addBtnsDiv);
      }
      
      eventDiv.appendChild(medalsDiv);
      
      return eventDiv;
    }
    
    function renderMedalItem(s, timelineIndex, eventIndex, medalType, emoji, teamName, teamIndex) {
      var itemDiv = document.createElement('div');
      
      // Different styles for each medal type
      var bgColor, borderColor, glowColor;
      if(medalType === 'gold') {
        bgColor = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.05) 100%)';
        borderColor = 'rgba(255, 215, 0, 0.4)';
        glowColor = 'rgba(255, 215, 0, 0.3)';
      } else if(medalType === 'silver') {
        bgColor = 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(168, 168, 168, 0.05) 100%)';
        borderColor = 'rgba(192, 192, 192, 0.4)';
        glowColor = 'rgba(192, 192, 192, 0.3)';
      } else {
        bgColor = 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(184, 115, 51, 0.05) 100%)';
        borderColor = 'rgba(205, 127, 50, 0.4)';
        glowColor = 'rgba(205, 127, 50, 0.3)';
      }
      
      itemDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; background: ' + bgColor + '; padding: 10px 14px; border-radius: 8px; border: 1px solid ' + borderColor + '; box-shadow: 0 2px 8px ' + glowColor + '; transition: all 0.2s;';
      
      // Hover effect
      itemDiv.onmouseenter = function() {
        this.style.transform = 'translateX(4px)';
        this.style.boxShadow = '0 4px 12px ' + glowColor;
      };
      itemDiv.onmouseleave = function() {
        this.style.transform = '';
        this.style.boxShadow = '0 2px 8px ' + glowColor;
      };
      
      // Medal emoji
      var emojiSpan = document.createElement('span');
      emojiSpan.textContent = emoji;
      emojiSpan.style.cssText = 'font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
      itemDiv.appendChild(emojiSpan);
      
      if(isAdmin()) {
        // Team name input with dropdown
        var nameContainer = document.createElement('div');
        nameContainer.style.cssText = 'display: flex; gap: 4px; align-items: center;';
        
        var input = document.createElement('input');
        input.type = 'text';
        input.value = teamName || '';
        input.placeholder = 'Team name...';
        input.style.cssText = 'width: 180px; padding: 6px 12px; border: 2px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); font-size: 15px; font-weight: 500;';
        input.oninput = function() {
          s.timelines[timelineIndex].events[eventIndex].medals[medalType][teamIndex] = this.value;
          saveAll();
        };
        nameContainer.appendChild(input);
        
        // Dropdown button to select from master list
        var dropdownBtn = document.createElement('button');
        dropdownBtn.type = 'button';
        dropdownBtn.textContent = '↓';
        dropdownBtn.className = 'ghost small';
        dropdownBtn.style.cssText = 'padding: 2px 6px; min-width: 24px; background: var(--panel); border: 1px solid var(--border);';
        dropdownBtn.title = 'Select from Team List';
        dropdownBtn.onclick = function() {
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
              input.value = selectedTeam;
              s.timelines[timelineIndex].events[eventIndex].medals[medalType][teamIndex] = selectedTeam;
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
        
        itemDiv.appendChild(nameContainer);
        
        // Remove button
        var removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = 'background: #dc2626; color: white; padding: 4px 8px; font-size: 13px; font-weight: 700; border: none; border-radius: 5px; cursor: pointer;';
        removeBtn.onclick = function() {
          s.timelines[timelineIndex].events[eventIndex].medals[medalType].splice(teamIndex, 1);
          saveAll();
          renderLegendMode(s);
        };
        itemDiv.appendChild(removeBtn);
      } else {
        // Display only
        var display = document.createElement('span');
        display.textContent = teamName || '—';
        display.style.cssText = 'color: var(--text); font-size: 16px; font-weight: 600;';
        itemDiv.appendChild(display);
      }
      
      return itemDiv;
    }
