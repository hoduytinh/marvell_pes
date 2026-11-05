// Marvell PES Club - modes/league.js (split from app.js; shared global scope, load order set in index.html)
    function generateFixtures(teamCount){
      var n=teamCount; var hasBye=n%2===1; if(hasBye) n+=1;
      var idxs=Array.from({length:n},function(_,i){return i});
      var rounds=[], half=n/2, arr=idxs.slice();
      for(var r=0;r<n-1;r++){
        var pairs=[];
        for(var i=0;i<half;i++){
          var a=arr[i],b=arr[n-1-i];
          var home=(r%2===0)?a:b, away=(r%2===0)?b:a;
          pairs.push({home:home,away:away});
        }
        rounds.push(pairs);
        arr=[arr[0]].concat(arr.slice(2),[arr[1]]);
      }
      var rounds2=rounds.map(function(rs){return rs.map(function(p){return {home:p.away,away:p.home}})});
      var all=rounds.concat(rounds2).map(function(rs){return rs.filter(function(m){return !(hasBye&&(m.home===n-1||m.away===n-1))})});
      return all;
    }

    function emptyRow(){return {team:'',P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0,form:[],idx:-1}}
    function computeStandingsFor(s,mode,uptoRound){
      var rows=s.teams.map(function(name,i){var r=emptyRow(); r.team=name; r.idx=i; return r});
      var R = (typeof uptoRound==='number')? uptoRound : s.rounds.length-1; R=Math.min(R,s.rounds.length-1);
      for(var r=0;r<=R;r++){
        var ms=s.rounds[r];
        for(var m=0;m<ms.length;m++){
          var key=r+'-'+m; var res=s.results[key]; if(!res) continue;
          var hg=Number(res.hg),ag=Number(res.ag); if(!isFinite(hg)||!isFinite(ag)) continue;
          var hIdx=ms[m].home,aIdx=ms[m].away; var h=rows[hIdx],a=rows[aIdx];
          var countHome=(mode!=='away'),countAway=(mode!=='home');
          if(countHome){h.P++;h.GF+=hg;h.GA+=ag}
          if(countAway){a.P++;a.GF+=ag;a.GA+=hg}
          if(hg>ag){ if(countHome){h.W++;h.Pts+=3;h.form.push('W')} if(countAway){a.L++;a.form.push('L')} }
          else if(hg<ag){ if(countAway){a.W++;a.Pts+=3;a.form.push('W')} if(countHome){h.L++;h.form.push('L')} }
          else { if(countHome){h.D++;h.Pts++;h.form.push('D')} if(countAway){a.D++;a.Pts++;a.form.push('D')} }
        }
      }
      rows.forEach(function(rr){rr.GD=rr.GF-rr.GA});
      rows.sort(function(a,b){
        if(a.Pts !== b.Pts) return b.Pts - a.Pts;
        if(a.GD !== b.GD) return b.GD - a.GD;
        if(a.GF !== b.GF) return b.GF - a.GF;
        return a.team.localeCompare(b.team);
      });
      return rows;
    }

    function lastRoundWithAnyResult(s){
  var last = -1;
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var m=0; m<ms.length; m++){
      if (s.results[r+'-'+m]) { last = r; break; }
    }
  }
  return last;
}

function renderDeltaCell(change, hasPrev){
  if (!hasPrev) return '<td class="delta"><span class="pill same">-</span></td>';
  if (change > 0) return '<td class="delta"><span class="pill up">↑</span></td>';
  if (change < 0) return '<td class="delta"><span class="pill down">↓</span></td>';
  return '<td class="delta"><span class="pill same">-</span></td>';
}
function computeRanksTimeline(s){
      var rounds=s.rounds.length; var timeline=Array.from({length:s.teamCount},function(){return []});
      // Start from round 0 (first round)
      for(var r=0;r<rounds;r++){
        // Check if this round has any results
        var hasResults = false;
        for(var m=0; m<s.rounds[r].length; m++){
          var key = r + '-' + m;
          if(s.results[key] && (s.results[key].hg != null || s.results[key].ag != null)){
            hasResults = true;
            break;
          }
        }
        
        // Only include this round in timeline if it has results
        if(hasResults){
          var rows=computeStandingsFor(s,'overall',r);
          rows.forEach(function(rr,idx){ 
            timeline[rr.idx].push(idx+1);
          });
        }
      }
      return timeline;
    }

    function teamPerMatch(s,idx){
      var P=0,GF=0,GA=0; for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(!res) continue; var hi=ms[m].home,ai=ms[m].away; if(hi===idx){P++;GF+=+res.hg;GA+=+res.ag} else if(ai===idx){P++;GF+=+res.ag;GA+=+res.hg} } } return {P:P,GF:GF,GA:GA,avgGF: P?GF/P:1.2,avgGA:P?GA/P:1.2} }
    function pois(l,k){ if(k<0) return 0; var e=Math.exp(-l); var p=e; for(var i=1;i<=k;i++){ p*=l/i } return p }
    

function matchProbs(s, hi, ai){
  var lam = computeRFExpectedGoals(s, hi, ai);
  var lH = lam.lH, lA = lam.lA;
  var pH = 0, pD = 0, pA = 0;
  for (var x=0; x<=8; x++){
    var px = pois(lH, x);
    for (var y=0; y<=8; y++){
      var py = pois(lA, y);
      var p = px * py;
      if (x > y) pH += p;
      else if (x < y) pA += p;
      else pD += p;
    }
  }
  var sum = pH + pD + pA;
  if (sum > 0){ pH /= sum; pD /= sum; pA /= sum; }
  return { home: pH, draw: pD, away: pA };
}
function fullFormSeq(s,teamIdx){ var out=[]; for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(!res) continue; var home=ms[m].home,away=ms[m].away; if(home===teamIdx){out.push(res.hg>res.ag?'W':(res.hg<res.ag?'L':'D'))} else if(away===teamIdx){out.push(res.ag>res.hg?'W':(res.ag<res.hg?'L':'D'))} } } return out }

    function renderFormCells(seq){
  if(!seq||!seq.length) return '<span class="muted">—</span>';
  return (seq || []).map(function(c){
    var ch = (c==='W' ? 'W' : (c==='D' ? 'D' : 'L'));
    return '<span class="formBox ' + ch + '">' + ch + '</span>';
  }).join('');
}

    function drawRankSparks(teamIdxList){
      var s=activeSeason(); var timeline=computeRanksTimeline(s);
      teamIdxList.forEach(function(idx){
        var canvas=document.querySelector('canvas.spark[data-team="'+idx+'"]'); if(!canvas) return;
        var ctx=canvas.getContext('2d'); var w=canvas.width=canvas.clientWidth; var h=canvas.height=canvas.clientHeight;
        var series=timeline[idx]||[]; if(!series.length){ctx.clearRect(0,0,w,h); return}
        var max=s.teamCount; var X=function(i){return (i/((series.length-1)||1))*w}; var Y=function(rank){return ((rank-1)/(max-1||1))*h};
        ctx.clearRect(0,0,w,h); ctx.beginPath(); ctx.moveTo(0,Y(series[0])); for(var i=1;i<series.length;i++){ctx.lineTo(X(i),Y(series[i]))} ctx.strokeStyle='#60a5fa'; ctx.lineWidth=2; ctx.stroke();
      })
    }

    function renderStandingTracker(){
      var s=activeSeason(); 
      
      // Create team options for all 6 selectors
      for(var selNum = 1; selNum <= 6; selNum++){
        var sel = $('rankTeamSel' + selNum);
        if(!sel) continue;
        
        sel.innerHTML = '';
        
        // Add empty option (default - no team selected)
        var emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Chọn đội --';
        sel.appendChild(emptyOption);
        
        // Add team options sorted alphabetically
        var teamList = s.teams.map(function(t, i) { return {name: t, idx: i}; });
        teamList.sort(function(a, b) { return a.name.localeCompare(b.name); });
        teamList.forEach(function(team){ 
          var o = document.createElement('option'); 
          o.value = String(team.idx); 
          o.textContent = team.name; 
          sel.appendChild(o);
        });
        
        sel.onchange = function(){ drawRankChart() };
      }
      
      drawRankChart();
    }
    function drawRankChart(){
      var s=activeSeason(); 
      var canvas=$('rankChart'); 
      var ctx=canvas.getContext('2d'); 
      var w=canvas.width=canvas.clientWidth; 
      var h=canvas.height=canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      
      // Get selected teams from all 6 selectors
      var selectedTeams = [];
      var colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']; // Blue, Red, Green, Yellow, Purple, Pink
      
      for(var i = 1; i <= 6; i++){
        var sel = $('rankTeamSel' + i);
        if(sel && sel.value !== ''){
          selectedTeams.push({
            idx: Number(sel.value),
            color: colors[i-1]
          });
        }
      }
      
      if(selectedTeams.length === 0){
        ctx.fillStyle='#999'; 
        ctx.fillText('Chọn đội để xem biểu đồ xếp hạng', 10, h/2); 
        return;
      }
      
      var max=s.teamCount; 
      var maxRounds = 0;
      
      // Find the maximum number of rounds across all selected teams
      selectedTeams.forEach(function(team){
        var timeline = computeRanksTimeline(s)[team.idx] || [];
        maxRounds = Math.max(maxRounds, timeline.length);
      });
      
      if(maxRounds === 0){
        ctx.fillStyle='#999'; 
        ctx.fillText('Chưa đủ dữ liệu', 10, h/2); 
        return;
      }
      
      var X=function(i){return 40 + (i/((maxRounds-1)||1))*(w-200)};
      var Y=function(rank){return 20 + ((rank-1)/(max-1||1))*(h-40)};
      
      // Find the latest round with any results
      var latestRoundWithResults = -1;
      for(var r = s.rounds.length - 1; r >= 0; r--){
        var hasResults = false;
        for(var m = 0; m < s.rounds[r].length; m++){
          var key = r + '-' + m;
          if(s.results[key]){
            hasResults = true;
            break;
          }
        }
        if(hasResults){
          latestRoundWithResults = r;
          break;
        }
      }
      
      // Draw grid lines
      ctx.globalAlpha=0.3; 
      ctx.strokeStyle='#6b7280'; 
      for(var r=1;r<=max;r++){ 
        var y=Y(r); 
        ctx.beginPath(); 
        ctx.moveTo(40,y); 
        ctx.lineTo(w-160,y); 
        ctx.stroke();
      } 
      ctx.globalAlpha=1;
      
      // Draw lines for each selected team
      selectedTeams.forEach(function(team){
        var timeline = computeRanksTimeline(s)[team.idx] || [];
        if(timeline.length === 0) return;
        
        ctx.strokeStyle = team.color;
        ctx.fillStyle = team.color;
        ctx.lineWidth = 2;
        
        // Draw line
        ctx.beginPath(); 
        ctx.moveTo(X(0), Y(timeline[0])); 
        for(var i=1; i<timeline.length; i++){ 
          ctx.lineTo(X(i), Y(timeline[i]));
        } 
        ctx.stroke();
        
        // Draw points
        for(var j=0; j<timeline.length; j++){ 
          ctx.beginPath(); 
          ctx.arc(X(j), Y(timeline[j]), 3, 0, Math.PI*2); 
          ctx.fill();
        }
        
        // Draw team name label at the end of the line
        if(timeline.length > 0){
          var lastIndex = timeline.length - 1;
          var labelX = X(lastIndex) + 8;
          var labelY = Y(timeline[lastIndex]) + 4;
          
          // Draw background for better readability
          ctx.font = 'bold 12px system-ui';
          var teamName = s.teams[team.idx];
          var textWidth = ctx.measureText(teamName).width;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(labelX - 2, labelY - 12, textWidth + 4, 16);
          
          // Draw team name
          ctx.fillStyle = team.color;
          ctx.textAlign = 'left';
          ctx.fillText(teamName, labelX, labelY);
        }
      });
      
      // Draw pointer for latest round with results
      if(latestRoundWithResults >= 0 && maxRounds > 0){
        // Count how many rounds with results exist up to latestRoundWithResults
        var pointerIndex = 0;
        for(var r = 0; r <= latestRoundWithResults; r++){
          var hasResults = false;
          for(var m = 0; m < s.rounds[r].length; m++){
            var key = r + '-' + m;
            if(s.results[key] && (s.results[key].hg != null || s.results[key].ag != null)){
              hasResults = true;
              break;
            }
          }
          if(hasResults){
            pointerIndex++;
          }
        }
        // Adjust to 0-based index for the last round with results
        pointerIndex = pointerIndex - 1;
        
        if(pointerIndex >= 0 && pointerIndex < maxRounds){
          var pointerX = X(pointerIndex);
          
          // Draw vertical line
          ctx.strokeStyle = '#ff6b35';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]); // Dashed line
          ctx.beginPath();
          ctx.moveTo(pointerX, 20);
          ctx.lineTo(pointerX, h - 30);
          ctx.stroke();
          ctx.setLineDash([]); // Reset to solid line
          
          // Draw arrow pointer at the bottom
          ctx.fillStyle = '#ff6b35';
          ctx.beginPath();
          ctx.moveTo(pointerX, h - 15);
          ctx.lineTo(pointerX - 5, h - 8);
          ctx.lineTo(pointerX + 5, h - 8);
          ctx.closePath();
          ctx.fill();
          
          // Add label
          ctx.fillStyle = '#ff6b35';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Vòng ' + (latestRoundWithResults + 1), pointerX, h - 25);
          ctx.textAlign = 'left'; // Reset text alignment
          ctx.font = '12px system-ui'; // Reset font
        }
      }
      
      // Draw labels
      ctx.fillStyle='#cbd5e1'; 
      ctx.save(); 
      ctx.rotate(-Math.PI/2); 
      ctx.fillText('Hạng (↓ tốt hơn)', -h+20, 12); 
      ctx.restore();
    }

function renderFixtures(roundIdx){
      var s=activeSeason(); if(!s) return;
      
      // Handle tournament season type
      if(s.mode === 'tournament') {
        renderTournamentFixtures(roundIdx);
        return;
      }
      
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  }
      // Get selected rounds - support checkbox selection
      var selectedRounds = [];
      
      if (typeof roundIdx === 'number') {
        // Called programmatically with a specific round
        selectedRounds = [roundIdx];
      } else {
        // Get checked checkboxes from round selector
        var checkboxes = document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked');
        if (checkboxes.length > 0) {
          checkboxes.forEach(function(cb) {
            selectedRounds.push(Number(cb.value));
          });
        }
        // If nothing selected, don't default to anything - selectedRounds stays empty
      }
      
      // Populate round checkboxes
      var roundCheckboxesDiv = document.getElementById('roundCheckboxes');
      if (roundCheckboxesDiv) {
        roundCheckboxesDiv.innerHTML = '';
        for (var i = 0; i < s.rounds.length; i++) {
          var label = document.createElement('label');
          label.style.cssText = 'display:flex; align-items:center; gap:4px; cursor:pointer; padding:4px; border-radius:4px; background:var(--card);';
          
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = String(i);
          checkbox.className = 'round-checkbox';
          // Check this box if it's in selectedRounds
          if (selectedRounds.indexOf(i) !== -1) {
            checkbox.checked = true;
          }
          // Don't check any by default
          
          var span = document.createElement('span');
          span.textContent = 'V' + (i + 1);
          span.style.fontSize = '12px';
          
          label.appendChild(checkbox);
          label.appendChild(span);
          roundCheckboxesDiv.appendChild(label);
          
          // Add change event listener
          checkbox.addEventListener('change', function() {
            renderFixturesWithRound();
          });
        }
      }
      
      var teamFilter=$('teamFilter'); var prev=teamFilter.value||''; teamFilter.innerHTML=''; var any=document.createElement('option'); any.value=''; any.textContent='— Tất cả —'; teamFilter.appendChild(any);
      var teamList = s.teams.map(function(t, i) { return {name: t, idx: i}; });
      teamList.sort(function(a, b) { return a.name.localeCompare(b.name); });
      teamList.forEach(function(team){var o=document.createElement('option'); o.value=String(team.idx); o.textContent=team.name; teamFilter.appendChild(o)});
      if(prev!=='' && Number(prev)<s.teamCount) teamFilter.value=prev;
      var filterTeam=teamFilter.value!==''?Number(teamFilter.value):null; 
      var showOnlyDone=$('onlyDone').checked?true:false;
      var showOnlyPending=$('onlyPending').checked?true:false;
      var fixturesDiv=$('fixtures'); fixturesDiv.innerHTML='';

      var list=[];
      if(filterTeam!=null){
        for(var ri=0;ri<s.rounds.length;ri++){
          var ms=s.rounds[ri]; for(var mi=0;mi<ms.length;mi++){ var mm=ms[mi]; if(mm.home===filterTeam||mm.away===filterTeam){ list.push({r:ri,idx:mi,m:mm}) } }
        }
      } else {
        // Show fixtures from all selected rounds
        selectedRounds.forEach(function(r) {
          (s.rounds[r]||[]).forEach(function(m,idx){ list.push({r:r,idx:idx,m:m}) });
        });
      }

      // Show message if no rounds selected and no team filter
      if(list.length === 0 && filterTeam === null && selectedRounds.length === 0) {
        fixturesDiv.innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--muted);">' +
          '<p style="font-size:16px; margin:0 0 8px 0;">📋 Chưa chọn vòng nào</p>' +
          '<p style="font-size:13px; margin:0;">Nhấn nút "Chọn vòng" ở trên để chọn vòng đấu cần xem</p>' +
        '</div>';
        return;
      }

      list.forEach(function(item){
        var ri=item.r, idx=item.idx, m=item.m; var key=ri+'-'+idx; var res=s.results[key]||{}; 
        if(showOnlyDone && (res.hg==null||res.ag==null)) return;
        if(showOnlyPending && (res.hg!=null&&res.ag!=null)) return;
        var el=document.createElement('div'); el.className='fixture'; el.setAttribute('data-key',key);
        var vhg=(res.hg==null?'':res.hg), vag=(res.ag==null?'':res.ag);
        var probs=matchProbs(s,m.home,m.away); var pct=function(x){return Math.round(x*100)};
        
        // Determine winner/loser classes
        var homeClass = '';
        var awayClass = '';
        var hgVal = parseInt(vhg, 10);
        var agVal = parseInt(vag, 10);
        if(!isNaN(hgVal) && !isNaN(agVal)) {
          if(hgVal > agVal) {
            homeClass = ' bracket-team-winner';
            awayClass = ' bracket-team-loser';
          } else if(agVal > hgVal) {
            awayClass = ' bracket-team-winner';
            homeClass = ' bracket-team-loser';
          }
        }
        
el.innerHTML = `
  <div class="muted">V${ri+1}-${idx+1}</div>
  <div class="teamCell${homeClass}">
    ${(s.teamLogos && s.teamLogos[m.home])
      ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[m.home]+'); background-size: cover; background-position: center;"></span>'
      : '<span class="fixture-logo" style="background:'+(s.teamColors[m.home]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
    <span class="no-i18n">${escapeHtml(s.teams[m.home])}</span>
  </div>
  <input class="scoreH" type="number" min="0" value="${vhg}"/>
  <div style="text-align:center">–</div>
  <input class="scoreA" type="number" min="0" value="${vag}"/>
  <div class="teamCell right${awayClass}">
    <span class="no-i18n">${escapeHtml(s.teams[m.away])}</span>
    ${(s.teamLogos && s.teamLogos[m.away])
      ? '<span class="fixture-logo" style="background-image:url('+s.teamLogos[m.away]+'); background-size: cover; background-position: center;"></span>'
      : '<span class="fixture-logo" style="background:'+(s.teamColors[m.away]||'#1b2550')+'; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); display: inline-block;"></span>'}
  </div>
  <div class="prob">${pct(probs.home)}%-${pct(probs.draw)}%-${pct(probs.away)}%</div>
  <div class="predScore">${estimatePredScore(s, m)}</div>
`;

        var h=el.querySelector('.scoreH'); var a=el.querySelector('.scoreA');
     if (isAdmin()) {
       h.removeAttribute('readonly');
       a.removeAttribute('readonly');
       h.removeAttribute('disabled');
       a.removeAttribute('disabled');
       h.disabled = false;
       a.disabled = false;
       h.style.pointerEvents = 'auto';
       a.style.pointerEvents = 'auto';
     } else {
       h.setAttribute('readonly', 'readonly');
       a.setAttribute('readonly', 'readonly');
       h.setAttribute('disabled', 'disabled');
       a.setAttribute('disabled', 'disabled');
       h.disabled = true;
       a.disabled = true;
       h.style.pointerEvents = 'none';
       a.style.pointerEvents = 'none';
     }
        function commit(){
          if(!isAdmin()){
            toast('Chỉ admin được phép sửa');
            // Do not re-render, just return
            return;
          }
          var hg=(h.value==='')?null:Math.max(0,parseInt(h.value,10));
          var ag=(a.value==='')?null:Math.max(0,parseInt(a.value,10));
          if(hg==null||ag==null){
            delete s.results[key];
          } else {
            s.results[key]={hg:hg,ag:ag};
          }
          saveAll();
          // Update input fields with latest values from s.results
                    if(document.activeElement !== h) {
            h.value = (s.results[key] && s.results[key].hg != null) ? s.results[key].hg : '';
          }
          if(document.activeElement !== a) {
            a.value = (s.results[key] && s.results[key].ag != null) ? s.results[key].ag : '';
          }
          renderStandings();
          renderInsights();
          renderSeasonStats();
          drawRankChart();
          // Only re-render fixtures if the score was actually changed and saved
          // renderFixtures(r); // Remove this line to prevent input disappearing
        }
        h.addEventListener('change',commit); a.addEventListener('change',commit);
        fixturesDiv.appendChild(el);
      })
    }

    function renderInsights(){
      var s=activeSeason(); if(!s) return; 
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  }
var rows=computeStandingsFor(s,'overall'); var ul=$('insights'); ul.innerHTML='';
      if(!rows.length){ ul.innerHTML='<li class="muted">Chưa có dữ liệu</li>'; return }
      var mostGF=rows.slice().sort(function(a,b){return b.GF-a.GF})[0];
      var bestGD=rows.slice().sort(function(a,b){return b.GD-a.GD})[0];
      var leastGA=rows.slice().sort(function(a,b){return a.GA-b.GA})[0];
      ul.innerHTML='<li>Hàng công tốt nhất: <strong>'+escapeHtml(mostGF.team)+'</strong> ('+mostGF.GF+' GF)</li>'+
                   '<li>Hiệu số tốt nhất: <strong>'+escapeHtml(bestGD.team)+'</strong> ('+(bestGD.GD>=0?'+':'')+bestGD.GD+')</li>'+
                   '<li>Thủ chắc nhất: <strong>'+escapeHtml(leastGA.team)+'</strong> ('+leastGA.GA+' GA)</li>'
    }

    function renderSeasonStats(){
      var s=activeSeason(); var ul=$('seasonStats'); if(!s||!ul) return; ul.innerHTML='';
      var rows=computeStandingsFor(s,'overall'); if(!rows.length){ ul.innerHTML='<li class="muted">Chưa có dữ liệu</li>'; return }
      // Form 5 trận tốt nhất
      function formScore(seq){ var sc=0; for(var i=0;i<seq.length;i++){ sc+= (seq[i]==='W'?3:(seq[i]==='D'?1:0)) } return sc }
      var bestForm={team:'',score:-1}; rows.forEach(function(r){ var seq=fullFormSeq(s,r.idx).slice(-5); var sc=formScore(seq); if(sc>bestForm.score){ bestForm={team:r.team,score:sc,seq:seq} } });
      // Chuỗi thắng dài nhất
      function longestRun(seq){ var m=0,c=0; for(var i=0;i<seq.length;i++){ if(seq[i]==='W'){c++; if(c>m) m=c } else c=0 } return m }
      var bestStreak={team:'',len:0}; rows.forEach(function(r){ var seq=fullFormSeq(s,r.idx); var L=longestRun(seq); if(L>bestStreak.len){ bestStreak={team:r.team,len:L} } });
      // Trận nhiều bàn nhất
      var maxGoals=-1, maxLabel='—'; for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(res){ var sum=(+res.hg)+(+res.ag); if(sum>maxGoals){ maxGoals=sum; maxLabel='V'+(r+1)+': '+s.teams[ms[m].home]+' '+res.hg+'–'+res.ag+' '+s.teams[ms[m].away] } } } }
      ul.innerHTML =
        '<li>Form tốt nhất 5 trận: <strong>' + bestForm.team + '</strong> (' + bestForm.score + 'đ)' + (bestForm.seq ? ' <span style="color:#8aa0c5">– ' + bestForm.seq.join(' ') + '</span>' : '') + '</li>' +
        '<li>Chuỗi thắng dài nhất: <strong>' + bestStreak.team + '</strong> (' + bestStreak.len + ' trận)</li>' +
        '<li>Trận nhiều bàn nhất: <strong>' + maxLabel + '</strong></li>';
    }

    function makeMiniRow(){return {team:'',P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}}
    function renderMiniRow(r){ return '<tr><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>'+
      '<tr><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.D+'</td><td>'+r.L+'</td><td>'+r.GF+'</td><td>'+r.GA+'</td><td>'+(r.GD>=0?'+':'')+r.GD+'</td><td>'+r.Pts+'</td></tr>' }
    function splitHomeAwayStats(s,teamIdx){ var home=makeMiniRow(),away=makeMiniRow(); for(var r=0;r<s.rounds.length;r++){ var ms=s.rounds[r]; for(var m=0;m<ms.length;m++){ var key=r+'-'+m,res=s.results[key]; if(!res) continue; var hi=ms[m].home,ai=ms[m].away; var hg=+res.hg,ag=+res.ag; if(hi===teamIdx){ home.P++;home.GF+=hg;home.GA+=ag; if(hg>ag){home.W++;home.Pts+=3}else if(hg<ag){home.L++}else{home.D++;home.Pts++} } else if(ai===teamIdx){ away.P++;away.GF+=ag;away.GA+=hg; if(ag>hg){away.W++;away.Pts+=3}else if(ag<hg){away.L++}else{away.D++;away.Pts++} } } } home.GD=home.GF-home.GA; away.GD=away.GF-away.GA; return {home:home,away:away} }
    function openTeamDialog(teamIdx){
      var s=activeSeason(); var name=s.teams[teamIdx]; $('teamDialogTitle').textContent=name;
      var seq=fullFormSeq(s,teamIdx); $('teamFormSeq').innerHTML=renderFormCells(seq); $('fullForm').innerHTML=renderFormCells(seq);
      var last10=seq.slice(-10); $('teamLast10').innerHTML=last10.length?renderFormCells(last10):'<span class="muted">—</span>';
      var oppSel=$('h2hOpponent'); oppSel.innerHTML=''; var oppList = s.teams.map(function(n,i){ return {name: n, idx: i}; }).filter(function(t){ return t.idx !== teamIdx; }); oppList.sort(function(a, b) { return a.name.localeCompare(b.name); }); oppList.forEach(function(opp){ var o=document.createElement('option'); o.value=String(opp.idx); o.textContent=opp.name; oppSel.appendChild(o) });
      oppSel.onchange=function(){ renderH2H(teamIdx,Number(oppSel.value)) };
      if(oppSel.options.length>0){ oppSel.value=oppSel.options[0].value; renderH2H(teamIdx,Number(oppSel.value)) }
      var sp=splitHomeAwayStats(s,teamIdx); $('homeStats').innerHTML=renderMiniRow(sp.home); $('awayStats').innerHTML=renderMiniRow(sp.away);
      var dlg=$('teamDialog'); if(dlg && typeof dlg.showModal==='function'){ dlg.showModal() } else { dlg.setAttribute('open','open') }
    }
    function renderH2H(aIdx,bIdx){
      var s=activeSeason(); var list=[]; var W=0,D=0,L=0,GF=0,GA=0;
      for(var r=0;r<s.rounds.length;r++){
        var ms=s.rounds[r];
        for(var m=0;m<ms.length;m++){
          var home=ms[m].home,away=ms[m].away; if(!((home===aIdx&&away===bIdx)||(home===bIdx&&away===aIdx))) continue;
          var key=r+'-'+m,res=s.results[key];
          if(res){ var hg=+res.hg,ag=+res.ag; var aHome=(home===aIdx); var gfor=aHome?hg:ag,gag=aHome?ag:hg; GF+=gfor; GA+=gag; if(gfor>gag) W++; else if(gfor<gag) L++; else D++; list.push('<div class="chip small">V'+(r+1)+': '+s.teams[home]+' '+hg+'–'+ag+' '+s.teams[away]+'</div>') }
          else { list.push('<div class="chip small muted">V'+(r+1)+': '+s.teams[home]+' – '+s.teams[away]+' (chưa đá)</div>') }
        }
      }
      $('h2hSummary').innerHTML='Tổng: <strong>'+W+'–'+D+'–'+L+'</strong> • GF/GA: <strong>'+GF+'/'+GA+'</strong>';
      $('h2hList').innerHTML=list.join('')
    }
