// Marvell PES Club - features/prediction.js (split from app.js; shared global scope, load order set in index.html)
function estimatePredScore(s, m){
  // Use the same lambdas as probabilities and choose the most likely score
  var lam = computeRFExpectedGoals(s, m.home, m.away);
  var lH = lam.lH, lA = lam.lA;

  // Get category probabilities
  var probs = matchProbs(s, m.home, m.away);
  var cat = 'draw';
  if (probs.home >= probs.draw && probs.home >= probs.away) cat = 'home';
  else if (probs.away >= probs.draw && probs.away >= probs.home) cat = 'away';

  var best = {x:1, y:1, p:-1};
  for (var x=0; x<=8; x++){
    var px = pois(lH, x);
    for (var y=0; y<=8; y++){
      var py = pois(lA, y);
      var p = px * py;
      // keep only scorelines consistent with the dominant category
      if ((cat==='home' && x<=y) || (cat==='away' && x>=y) || (cat==='draw' && x!==y)) continue;
      // tie-breaker: prefer lower total goals to avoid wild scores
      if (p > best.p || (Math.abs(p - best.p) < 1e-12 && (x+y) < (best.x+best.y))){
        best = {x:x, y:y, p:p};
      }
    }
  }

  // Fallback: if for some reason no candidate found (unlikely), pick joint-mode
  if (best.p < 0){
    var alt = {x:0, y:0, p:-1};
    for (var X=0; X<=8; X++){
      var pX = pois(lH, X);
      for (var Y=0; Y<=8; Y++){
        var pY = pois(lA, Y);
        var P = pX * pY;
        if (P > alt.p){ alt = {x:X, y:Y, p:P}; }
      }
    }
    best = alt;
  }
  return best.x + '-' + best.y;
}

// Helper functions for season-wide averages (used elsewhere)
function avgGF(idx, lastN){
  var goals = [];
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r+'-'+k;
      var res = s.results[key];
      if (!res) continue;
      var mm = ms[k];
      if (mm.home===idx) goals.push(+res.hg);
      else if (mm.away===idx) goals.push(+res.ag);
    }
  }
  if (goals.length===0) return 1.0; // fallback
  goals = goals.slice(-lastN);
  var sum = goals.reduce((a,b)=>a+b,0);
  return sum / goals.length;
}

function avgGA(idx, lastN){
  var goals = [];
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r+'-'+k;
      var res = s.results[key];
      if (!res) continue;
      var mm = ms[k];
      if (mm.home===idx) goals.push(+res.ag);
      else if (mm.away===idx) goals.push(+res.hg);
    }
  }
  if (goals.length===0) return 1.0;
  goals = goals.slice(-lastN);
  var sum = goals.reduce((a,b)=>a+b,0);
  return sum / goals.length;
}


function getRankMap(s){
  // Use most recent round with any result; fallback to initial order
  var last = (typeof lastRoundWithAnyResult==='function') ? lastRoundWithAnyResult(s) : -1;
  var rows = (typeof computeStandingsFor==='function')
    ? computeStandingsFor(s, 'POINTS', (last>=0? last : s.rounds.length-1))
    : null;
  var map = {};
  if (rows && rows.length){
    rows.forEach(function(r,i){ map[r.idx] = i+1; });
  } else {
    (s.teams||[]).forEach(function(_,i){ map[i]=i+1; });
  }
  return map;
}

function estimatePredScoreSeasonRanked(s, m){
  // season-wide averages
  function teamAvgGF(idx){
    var sum=0, n=0;
    for (var r=0;r<s.rounds.length;r++){
      var ms=s.rounds[r];
      for (var k=0;k<ms.length;k++){
        var key=r+'-'+k, res=s.results[key]; if(!res) continue;
        var mm=ms[k];
        if (mm.home===idx){ sum+=+res.hg; n++; }
        else if (mm.away===idx){ sum+=+res.ag; n++; }
      }
    }
    return n? (sum/n) : 1.0;
  }
  function teamAvgGA(idx){
    var sum=0, n=0;
    for (var r=0;r<s.rounds.length;r++){
      var ms=s.rounds[r];
      for (var k=0;k<ms.length;k++){
        var key=r+'-'+k, res=s.results[key]; if(!res) continue;
        var mm=ms[k];
        if (mm.home===idx){ sum+=+res.ag; n++; }
        else if (mm.away===idx){ sum+=+res.hg; n++; }
      }
    }
    return n? (sum/n) : 1.0;
  }
  var egH = (teamAvgGF(m.home) + teamAvgGA(m.away))/2;
  var egA = (teamAvgGF(m.away) + teamAvgGA(m.home))/2;

  // Home advantage
  // Rank weighting: 3% per rank gap (clamped), applied asymmetrically
  var rankMap = getRankMap(s);
  var rh = rankMap[m.home] || 10, ra = rankMap[m.away] || 10;
  var gap = (ra - rh); // positive => home ranked better
  var factor = 1 + (gap * 0.03);
  if (factor < 0.6) factor = 0.6;
  if (factor > 1.4) factor = 1.4;
  egH *= factor;
  egA /= factor;

  // Clamp and round
  egH = Math.max(0, Math.round(egH));
  egA = Math.max(0, Math.round(egA));
  return egH + '-' + egA;
}


/* ==== PATCH: Helpers for ranked + recent-form probabilities ==== */

function seasonAvgGF(s, idx){
  var sum = 0, n = 0;
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r + '-' + k, res = s.results[key]; if(!res) continue;
      var m = ms[k];
      if (m.home === idx){ sum += (+res.hg); n++; }
      else if (m.away === idx){ sum += (+res.ag); n++; }
    }
  }
  return n ? (sum/n) : 1.0;
}

function seasonAvgGA(s, idx){
  var sum = 0, n = 0;
  for (var r=0; r<s.rounds.length; r++){
    var ms = s.rounds[r];
    for (var k=0; k<ms.length; k++){
      var key = r + '-' + k, res = s.results[key]; if(!res) continue;
      var m = ms[k];
      if (m.home === idx){ sum += (+res.ag); n++; }
      else if (m.away === idx){ sum += (+res.hg); n++; }
    }
  }
  return n ? (sum/n) : 1.0;
}

// Recent form score for last N matches (W=3, D=1, L=0) -> points per game (0..3)
function teamRecentPPG(s, idx, lastN){
  var seq = fullFormSeq(s, idx);
  if (!seq.length) return 1.5;
  var last = seq.slice(-lastN);
  var pts = 0;
  for (var i=0; i<last.length; i++){
    pts += (last[i] === 'W' ? 3 : (last[i] === 'D' ? 1 : 0));
  }
  return pts / last.length;
}

/* ==== END Helpers ==== */
/* ==== PATCH: shared lambdas for rank+form (used by matchProbs & pred score) ==== */
function computeRFExpectedGoals(s, hi, ai){
  // Base (season averages)
  var baseH = (seasonAvgGF(s, hi) + seasonAvgGA(s, ai)) / 2;
  var baseA = (seasonAvgGF(s, ai) + seasonAvgGA(s, hi)) / 2;

  // Rank factor
  var rankMap = (typeof getRankMap === 'function') ? getRankMap(s) : getRankMapLatest(s);
  var rH = rankMap[hi] || 10;
  var rA = rankMap[ai] || 10;
  var gap = (rA - rH);
  var fRank = clamp(1 + 0.03 * gap, 0.70, 1.30);

  // Recent form factor (last 5)
  var N = 5;
  var ppgH = teamRecentPPG(s, hi, N);
  var ppgA = teamRecentPPG(s, ai, N);
  var fFormH = clamp(1 + 0.25 * (ppgH - 1.5), 0.85, 1.15);
  var fFormA = clamp(1 + 0.25 * (ppgA - 1.5), 0.85, 1.15);

  var lH = baseH * fRank * fFormH;
  var lA = baseA * (1 / fRank) * fFormA;

  // Clamp
  lH = clamp(lH, 0.15, 4.5);
  lA = clamp(lA, 0.15, 4.5);
  return { lH: lH, lA: lA };
}

    function randPoisson(lambda){var L=Math.exp(-lambda); var k=0,p=1; do{k++;p*=Math.random()}while(p>L); return k-1}
    
function highlightChampionChances(){
  var table = document.getElementById('simTable');
  if (!table) return;
  var rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
  if (rows.length === 0) return;
  // extract % values from column 2 ("Vô địch")
  var data = rows.map(function(r,i){
    var cell = r.cells[1];
    var txt = cell ? (cell.textContent || '').replace('%','').trim() : '0';
    var val = parseFloat(txt); if (!isFinite(val)) val = 0;
    return { idx: i, val: val };
  });
  var sorted = data.slice().sort(function(a,b){ return b.val - a.val; });
  var top4 = sorted.slice(0,4).map(function(x){ return x.idx; });
  var low3 = sorted.slice(-3).map(function(x){ return x.idx; });
  rows.forEach(function(r,i){
    r.style.background = '';
    if (top4.indexOf(i) !== -1){
      r.style.background = 'rgba(34,197,94,0.15)'; // light green
    } else if (low3.indexOf(i) !== -1){
      r.style.background = 'rgba(239,68,68,0.15)'; // light red
    }
  });
}

function runSimulation(N){
      var s=activeSeason(); if(!s) return; 
  var curR = lastRoundWithAnyResult(s);
  var prevR = curR - 1;

  var rows = computeStandingsFor(s, standingsMode, (curR>=0 ? curR : s.rounds.length-1));
  var prevRows = (prevR >= 0) ? computeStandingsFor(s, standingsMode, prevR) : null;
  var prevMap = null;
  if (prevRows) {
    prevMap = {};
    prevRows.forEach(function(rr, i){ prevMap[rr.idx] = i + 1; });
  
  try{ highlightChampionChances(); }catch(e){}
}
var win=Array(s.teamCount).fill(0), top4=Array(s.teamCount).fill(0), rel=Array(s.teamCount).fill(0);
      var pct=function(x){return (x*100/N).toFixed(1)+'%'};
      for(var it=0;it<N;it++){
        var tmp=JSON.parse(JSON.stringify(s));
        for(var r=0;r<tmp.rounds.length;r++){
          for(var m=0;m<tmp.rounds[r].length;m++){
            var key=r+'-'+m; if(tmp.results[key]) continue;
            var hg=Math.max(0,Math.round(randPoisson(1.3+Math.random()*0.6)));
            var ag=Math.max(0,Math.round(randPoisson(1.1+Math.random()*0.6)));
            tmp.results[key]={hg:hg,ag:ag};
          }
        }
        var rows=computeStandingsFor(tmp,'overall');
        rows.forEach(function(rr,idx){ if(idx===0) win[rr.idx]++; if(idx<4) top4[rr.idx]++; if(idx>=rows.length-(s.settings.rel||3)) rel[rr.idx]++ })
      }
      var table=$('simTable'); table.innerHTML=''; var head=document.createElement('tr'); head.innerHTML='<th align="left">Đội</th><th>Vô địch</th><th>Top4</th><th>Rớt hạng</th>'; table.appendChild(head);
      s.teams.forEach(function(name,i){ var tr=document.createElement('tr'); tr.innerHTML='<td>'+escapeHtml(name)+'</td><td>'+pct(win[i])+'</td><td>'+pct(top4[i])+'</td><td>'+pct(rel[i])+'</td>'; table.appendChild(tr) })
    }
