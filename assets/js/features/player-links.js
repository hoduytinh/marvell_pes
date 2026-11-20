// Marvell PES Club - features/player-links.js
// Every player name shown in the app becomes a link (span.pl-link) that opens a compact
// profile popup; from the popup (or its card) the full Career page of the Stats page opens.
// Names are taken from the career data (all rated players) + the master team list.

var PL_SKIP = 'input,select,option,textarea,script,style,svg,canvas,label,button,a,code,pre,title,' +
  '.pl-link,.no-pl,.sel-search-pop,#teoBubble,#chatPanel,#nameDialog,#koGamesDialog,#settingsDialog,#seasonDialog,#teamCountDialog,#reorderSeasonsDialog,#cloudConfigDialog,#adminLoginDialog,#homeLinkDialog,[draggable="true"],[contenteditable="true"],.fc-name,.sp-h2h-pick';

function plL(vi, en){ return (typeof crL === 'function') ? crL(vi, en) : vi; }
function plEsc(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

var plIndex = { cd: null, re: null, map: {} };
function plBuildIndex(){
  if(typeof careerData !== 'function' || typeof state === 'undefined' || !state || !state.seasons) return null;
  var cd = careerData(state);
  if(plIndex.cd === cd && plIndex.masterLen === (state.teamMasterList || []).length) return plIndex;
  var map = {};
  Object.keys(cd.elo).forEach(function(n){ map[n.toLowerCase()] = n; });
  Object.keys(cd.trophies).forEach(function(k){ if(!map[k]) map[k] = cd.trophies[k].name; });
  (state.teamMasterList || []).forEach(function(n){ n = String(n || '').trim(); if(n && !map[n.toLowerCase()]) map[n.toLowerCase()] = n; });
  Object.keys(state.seasons).forEach(function(id){
    var s = state.seasons[id];
    if(s && typeof seasonIsDoubles === 'function' && seasonIsDoubles(s)) (s.teams || []).forEach(function(n){ n = String(n || '').trim(); if(n && !map[n.toLowerCase()]) map[n.toLowerCase()] = n; });
  });
  var names = Object.keys(map).map(function(k){ return map[k]; }).filter(function(n){ return n.length >= 2 && !/^(bye|tbd|team \d+)$/i.test(n); })
    .sort(function(a, b){ return b.length - a.length; });
  var re = null;
  if(names.length){
    try { re = new RegExp('(?<![\\p{L}\\p{N}_])(' + names.map(plEsc).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu'); } catch(e){ re = null; }
  }
  plIndex = { cd: cd, re: re, map: map, masterLen: (state.teamMasterList || []).length };
  return plIndex;
}

function plWrap(root){
  var idx = plBuildIndex();
  if(!idx || !idx.re) return;
  var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(n){
      if(!n.nodeValue || n.nodeValue.trim().length < 2) return NodeFilter.FILTER_REJECT;
      var p = n.parentElement;
      if(!p || p.closest(PL_SKIP)) return NodeFilter.FILTER_REJECT;
      var dlg = p.closest('dialog');
      if(dlg && !dlg.open) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = [], n;
  while((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(function(node){
    var text = node.nodeValue, re = idx.re, m, last = 0, frag = null;
    re.lastIndex = 0;
    while((m = re.exec(text))){
      var name = idx.map[m[1].toLowerCase()];
      if(!name) continue;
      if(!frag) frag = document.createDocumentFragment();
      if(m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var sp = document.createElement('span');
      sp.className = 'pl-link no-i18n';
      sp.setAttribute('data-player', name);
      sp.textContent = m[1];
      frag.appendChild(sp);
      last = m.index + m[1].length;
    }
    if(!frag) return;
    if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
}

var plTimer = null;
function plSchedule(){ clearTimeout(plTimer); plTimer = setTimeout(function(){ try { plWrap(document.body); } catch(e){} }, 180); }
(function(){
  function start(){
    plSchedule();
    new MutationObserver(function(muts){
      for(var i = 0; i < muts.length; i++){
        var t = muts[i].target, el = t && (t.nodeType === 1 ? t : t.parentElement);
        if(el && el.closest && el.closest('#teoBubble,#chatPanel,.sel-search-pop,#playerMini')) continue;
        plSchedule();
        return;
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// ---------------- Mini profile popup ----------------
function plDialog(){
  var d = document.getElementById('playerMini');
  if(d) return d;
  d = document.createElement('dialog');
  d.id = 'playerMini';
  d.className = 'pm-dialog no-pl';
  document.body.appendChild(d);
  d.addEventListener('click', function(e){
    if(e.target === d){ d.close(); return; }
    var b = e.target.closest && e.target.closest('[data-pm-act]');
    if(!b) return;
    var act = b.getAttribute('data-pm-act'), nm = b.getAttribute('data-name');
    if(act === 'close') d.close();
    else if(act === 'career'){ d.close(); openCareerDialog(nm); }
    else if(act === 'season'){ d.close(); var i = +b.getAttribute('data-idx'); if(typeof openTeamDialog === 'function') openTeamDialog(i); }
    else if(act === 'h2h'){ d.close(); if(typeof statsH2H !== 'undefined'){ statsH2H[0] = nm; } openStatsPage('h2h'); }
  });
  return d;
}

// Team index of `name` in the active season (doubles: the pair containing the player).
function plSeasonIdx(name){
  var s = typeof activeSeason === 'function' ? activeSeason() : null;
  if(!s || !Array.isArray(s.teams)) return -1;
  var low = String(name).toLowerCase();
  for(var i = 0; i < s.teams.length; i++){
    if(String(s.teams[i] || '').trim().toLowerCase() === low) return i;
    if(typeof seasonIsDoubles === 'function' && seasonIsDoubles(s)){
      var p = seasonPair(s, i);
      if(p && (p[0].toLowerCase() === low || p[1].toLowerCase() === low)) return i;
    }
  }
  return -1;
}

function plMiniBody(cd, name){
  var e = escapeHtml, card = careerFifaCard(cd, name), t = cd.elo[name], tc = teamCareer(cd, name);
  var form = tc.list.slice(-5).map(function(x){ return '<span class="formBox ' + x.r + '">' + x.r + '</span>'; }).join('');
  var stars = careerStarsHtml(careerMedalList(cd, name));
  var stat = function(label, v){ return '<div class="pm-stat"><span>' + label + '</span><b>' + v + '</b></div>'; };
  var html = '<div class="pm-body">' +
    (card ? '<div class="fc-pick" role="button" tabindex="0" data-career-team="' + e(name) + '" title="' + e(plL('Xem toàn bộ sự nghiệp', 'View full career')) + '">' + renderFifaCardHtml(card) + '</div>' : '') +
    '<div class="pm-info">' +
    (t ? stat('Elo', Math.round(t.elo) + (tc.rank ? ' <small class="muted">#' + tc.rank + '/' + tc.rankOf + '</small>' : '')) +
      stat(plL('Đỉnh cao', 'Peak'), Math.round(t.peak)) : '') +
    (t && t.P ? stat(plL('Đơn T-H-B', 'Singles W-D-L'), t.W + '-' + t.D + '-' + t.L) : '') +
    (t && t.DP ? stat(plL('Đôi T-H-B', 'Doubles W-D-L'), t.DW + '-' + t.DD + '-' + t.DL) : '') +
    stat(plL('Điểm danh hiệu', 'Trophy pts'), tc.trophyPts) +
    (stars ? '<div class="pm-stars fc-stars">' + stars + '</div>' : '') +
    (form ? '<div class="pm-form"><span class="muted">' + plL('5 trận gần nhất', 'Last 5') + '</span> ' + form + '</div>' : '') +
    '</div></div>';
  return html;
}

function openPlayerMini(name){
  if(typeof careerData !== 'function') return;
  var cd = careerData(state), d = plDialog(), e = escapeHtml;
  name = careerResolveName(cd, name);
  var names = [name];
  // A doubles team name ("Tĩnh - Linh") shows both players.
  if(!cd.elo[name] && !cd.trophies[name.toLowerCase()] && typeof seasonPair === 'function'){
    var low = name.toLowerCase(), cur = activeSeason(), ids = Object.keys(state.seasons);
    if(cur) ids.unshift(state.current);
    for(var k = 0; k < ids.length; k++){
      var s = state.seasons[ids[k]];
      if(!s || !Array.isArray(s.teams) || !seasonIsDoubles(s)) continue;
      var i = s.teams.map(function(x){ return String(x || '').trim().toLowerCase(); }).indexOf(low);
      var p = i >= 0 ? seasonPair(s, i) : null;
      if(p){ names = p.map(function(x){ return careerResolveName(cd, x); }); break; }
    }
  }
  var sIdx = plSeasonIdx(names.length > 1 ? name : names[0]);
  if(names.length > 1 && sIdx < 0) sIdx = plSeasonIdx(names[0]);
  var main = names[0];
  d.innerHTML = '<div class="pm-wrap"><div class="pm-head"><strong class="no-i18n">' + e(names.join(' & ')) + '</strong>' +
    '<button type="button" class="ghost dlg-x" data-pm-act="close" aria-label="Close">✕</button></div>' +
    names.map(function(n){ return plMiniBody(cd, n); }).join('') +
    '<div class="pm-actions">' +
    (sIdx >= 0 ? '<button type="button" class="ghost" data-pm-act="season" data-idx="' + sIdx + '">📋 ' + plL('Mùa này', 'This season') + '</button>' : '') +
    '<button type="button" class="ghost" data-pm-act="h2h" data-name="' + e(main) + '">⚔️ ' + plL('Đối đầu', 'Head-to-head') + '</button>' +
    names.map(function(n){ return '<button type="button" class="primary" data-pm-act="career" data-name="' + e(n) + '">🃏 ' + plL('Sự nghiệp', 'Career') + (names.length > 1 ? ' · <span class="no-i18n">' + e(n) + '</span>' : '') + '</button>'; }).join('') +
    '</div></div>';
  if(!d.open){ if(typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', 'open'); }
}

// Capture phase: the click must not also trigger the row/card handler underneath the name.
document.addEventListener('click', function(e){
  var t = e.target && e.target.closest && e.target.closest('.pl-link');
  if(!t) return;
  e.preventDefault();
  e.stopPropagation();
  openPlayerMini(t.getAttribute('data-player'));
}, true);
