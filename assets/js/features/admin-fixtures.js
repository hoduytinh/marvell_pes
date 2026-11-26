// Marvell PES Club - features/admin-fixtures.js (shared global scope, load order set in index.html)
// Admin/supporter Dashboard tab "Nhập kết quả": the current round(s) of every unlocked season, mirrored
// with score inputs. A score typed here is committed THROUGH the season's own fixture/bracket UI
// (amCommit), so knock-out advancement, next-round generation, etc. behave exactly as in the season.

var AM_NEXT_KEY = 'pesAmNextOnly';
var amQuery = '';
var AM_OPEN = {}; // seasons expanded by the admin (collapsed by default, kept across re-renders)
var amBusy = false;
var amNextOnly = (function(){ try { return localStorage.getItem(AM_NEXT_KEY) !== '0'; } catch(_) { return true; } })();
// Per-season round choice: absent = auto (follows amNextOnly), '*' = all rounds, else a round name.
var AM_ROUND_KEY = 'pesAmRound';
var AM_ROUND = (function(){ try { return JSON.parse(localStorage.getItem(AM_ROUND_KEY)) || {}; } catch(_) { return {}; } })();
// Result filter: '' = all, 'done' = played only, 'pend' = not played yet.
var AM_STATUS_KEY = 'pesAmStatus';
var amStatus = (function(){ try { var v = localStorage.getItem(AM_STATUS_KEY); return v === 'done' || v === 'pend' ? v : ''; } catch(_) { return ''; } })();

// Unlocked, not-finished, non-special seasons in season-selector order.
function amSeasonIds(){
  var ids = (state.seasonOrder || []).slice();
  Object.keys(state.seasons || {}).forEach(function(id){ if(ids.indexOf(id) === -1) ids.push(id); });
  return ids.filter(function(id){
    var s = state.seasons[id];
    return s && String(id).indexOf('separator-') !== 0 && !pesIsSpecialSeason(s) && !seasonLocked(s) && !s.forceEnded;
  });
}

function amSeasonHtml(sid){
  var s = state.seasons[sid], all;
  try { all = collectSeasonMatches(s).filter(function(m){ return m.rest == null; }); }
  catch(e){ console.error('Admin fixtures: cannot read season ' + sid, e); return ''; }
  var pending = all.filter(function(m){ return !m.res; });
  if(!pending.length) return '';
  // Whole rounds (played + pending), only the rounds that still have something to enter.
  var groups = [], byRound = {};
  all.forEach(function(m){
    if(!byRound[m.round]){ byRound[m.round] = []; groups.push(m.round); }
    byRound[m.round].push(m);
  });
  var allGroups = groups, sel = AM_ROUND[sid] || '';
  if(sel && sel !== '*' && !byRound.hasOwnProperty(sel)) sel = ''; // round no longer exists → auto
  if(sel === '*') groups = allGroups;
  else if(sel) groups = allGroups.filter(function(g){ return String(g) === sel; });
  else {
    groups = allGroups.filter(function(g){ return byRound[g].some(function(m){ return !m.res; }); });
    if(amNextOnly) groups = groups.slice(0, 1);
  }
  var rbar = '<div class="am-rbar"><label>' + crL('Vòng', 'Round') + ' <select class="am-rsel" data-am-rsel="' + escapeHtml(sid) + '">' +
    '<option value=""' + (sel ? '' : ' selected') + '>' + escapeHtml(amNextOnly ? crL('Vòng hiện tại (tự động)', 'Current round (auto)') : crL('Các vòng còn trận chờ', 'Rounds with pending matches')) + '</option>' +
    '<option value="*"' + (sel === '*' ? ' selected' : '') + '>' + escapeHtml(crL('Tất cả các vòng', 'All rounds')) + '</option>' +
    allGroups.map(function(g){
      var n = byRound[g].length, d = byRound[g].filter(function(m){ return m.res; }).length;
      return '<option value="' + escapeHtml(String(g)) + '"' + (sel === String(g) ? ' selected' : '') + '>' + pesRoundStatus(d, n).icon + ' ' + escapeHtml(String(g)) + ' (' + d + '/' + n + ')</option>';
    }).join('') + '</select></label></div>';
  var teams = s.teams || [], played = all.length - pending.length;
  var pct = all.length ? Math.round(played * 100 / all.length) : 0;
  var openTitle = escapeHtml(crL('Mở trận này trong giải', 'Open this match in its season'));
  var rows = groups.map(function(g){
    var left = byRound[g].filter(function(m){ return !m.res; }).length, rst = pesRoundStatus(byRound[g].length - left, byRound[g].length);
    return '<div class="am-round"><div class="am-round-h" title="' + escapeHtml(rst.title) + '">' + rst.icon + ' ' + escapeHtml(g) + ' <small>' + (byRound[g].length - left) + '/' + byRound[g].length + '</small></div>' +
      byRound[g].map(function(m){
        var h = teams[m.home] || ('#' + (m.home + 1)), a = teams[m.away] || ('#' + (m.away + 1));
        // Player submissions (features/result-submit.js): {cls, lock, hg, ag, acts, line}
        var x = typeof rsAmRow === 'function' ? rsAmRow(sid, s, m) : null;
        var vh = m.res ? m.res.hg : x && x.hg != null ? x.hg : '', va = m.res ? m.res.ag : x && x.ag != null ? x.ag : '';
        var dis = x && x.lock ? ' disabled' : '';
        return '<div class="am-row' + (m.res ? ' done' : '') + (x && x.cls ? ' ' + x.cls : '') + '" data-am-sid="' + escapeHtml(sid) + '" data-am-key="' + escapeHtml(m.key) + '" data-am-t="' + escapeHtml((h + ' ' + a).toLowerCase()) + '">' +
          '<span class="am-stage">' + (m.stage !== g ? escapeHtml(m.stage) : '') + '</span>' +
          '<span class="am-team am-h no-i18n">' + escapeHtml(h) + '</span>' +
          '<input type="number" min="0" inputmode="numeric" class="am-in am-hg" value="' + vh + '"' + dis + '>' +
          '<span class="am-dash">-</span>' +
          '<input type="number" min="0" inputmode="numeric" class="am-in am-ag" value="' + va + '"' + dis + '>' +
          '<span class="am-team am-a no-i18n">' + escapeHtml(a) + '</span>' +
          '<span class="am-acts">' + (x && x.acts ? x.acts : '') + '<button type="button" class="am-open" data-am-open title="' + openTitle + '">↗</button></span>' +
          (x && x.line ? x.line : '') + '</div>';
      }).join('') + '</div>';
  }).join('');
  return '<details class="am-season" data-am-season="' + escapeHtml(sid) + '"' + (AM_OPEN[sid] ? ' open' : '') + '><summary>' +
    (s.logo ? '<img class="am-logo" src="' + escapeHtml(s.logo) + '" alt="">' : '') +
    '<span class="am-name">' + crSeasonLink(sid, s.name || sid) + '</span>' +
    '<span class="sm-badge">' + escapeHtml(crModeLabel(s.mode || 'league')) + '</span>' +
    '<span class="am-prog" title="' + played + '/' + all.length + '"><i style="width:' + pct + '%"></i></span>' +
    '<span class="am-count">' + played + '/' + all.length + ' · <b>' + pending.length + '</b> ' + crL('trận chờ', 'pending') + '</span>' +
    '</summary>' + rbar + rows + '</details>';
}

function amRenderHtml(){
  amShowBack(false);
  var ids = amSeasonIds(), parts = [];
  ids.forEach(function(sid){ var h = amSeasonHtml(sid); if(h) parts.push(h); });
  var tools = '<div class="sp-tools">' +
    '<input type="search" id="amSearch" class="sp-search" placeholder="' + escapeHtml(crL('Lọc theo tên đội…', 'Filter by team…')) + '" value="' + escapeHtml(amQuery) + '">' +
    '<select id="amStatus" class="am-status">' +
      [['', crL('Tất cả trận', 'All matches')], ['pend', crL('Chưa có kết quả', 'No result yet')], ['done', crL('Đã có kết quả', 'Has result')]].map(function(o){
        return '<option value="' + o[0] + '"' + (amStatus === o[0] ? ' selected' : '') + '>' + escapeHtml(o[1]) + '</option>';
      }).join('') + '</select>' +
    '<label class="sp-check"><input type="checkbox" id="amNextOnly"' + (amNextOnly ? ' checked' : '') + '> ' + crL('Chỉ vòng tiếp theo của mỗi giải', 'Next round of each season only') + '</label>' +
    '<span class="muted am-sum">' + crL(parts.length + ' giải đang mở có trận chờ nhập', parts.length + ' open season(s) with pending matches') + '</span></div>' +
    (typeof rsPanelHtml === 'function' ? rsPanelHtml() : '');
  if(!parts.length) return tools + '<div class="muted am-empty">🎉 ' + crL('Không còn trận nào chờ nhập kết quả ở các giải chưa khóa.', 'No pending matches in unlocked seasons.') + '</div>';
  return tools + '<div class="am-list">' + parts.join('') + '</div><div class="muted am-none" hidden>' + crL('Không có trận nào khớp.', 'No matching match.') + '</div>';
}

function amApplySearch(){
  var q = amQuery.trim().toLowerCase(), any = false;
  [].forEach.call(document.querySelectorAll('#statsPage .am-season'), function(sec){
    var secAny = false;
    [].forEach.call(sec.querySelectorAll('.am-round'), function(rd){
      var rdAny = false;
      [].forEach.call(rd.querySelectorAll('.am-row'), function(r){
        var ok = (!q || r.getAttribute('data-am-t').indexOf(q) !== -1) &&
          (!amStatus || (amStatus === 'done') === r.classList.contains('done'));
        r.hidden = !ok;
        if(ok) rdAny = true;
      });
      rd.hidden = !rdAny;
      if(rdAny) secAny = true;
    });
    sec.hidden = !secAny;
    if(secAny) any = true;
  });
  var none = document.querySelector('#statsPage .am-none');
  if(none) none.hidden = any;
}

// Floating shortcut back to the list after jumping into a season.
function amShowBack(on){
  var b = $('amBack');
  if(!on){ if(b) b.remove(); return; }
  if(!b){
    b = document.createElement('button');
    b.type = 'button';
    b.id = 'amBack';
    b.className = 'am-back';
    document.body.appendChild(b);
  }
  b.textContent = '📝 ' + crL('Danh sách nhập kết quả', 'Results to enter');
}

function amFocusMatch(key, tries){
  setTimeout(function(){
    var els = document.querySelectorAll('main.container:not(.stats-page) [data-key="' + CSS.escape(key) + '"]');
    var el = [].filter.call(els, function(e){ return e.offsetParent !== null; })[0] || els[0];
    if(!el){
      if(tries < 10) amFocusMatch(key, tries + 1);
      else toast(crL('Không tìm thấy trận trong giao diện mùa giải', 'Match not found in the season view'));
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('de-flash');
    setTimeout(function(){ el.classList.remove('de-flash'); }, 1800);
    var inp = el.querySelector('input.scoreH') || el.querySelector('input[type="number"]');
    if(inp) try { inp.focus({ preventScroll: true }); } catch(e){}
  }, tries ? 120 : 60);
}

// ---- Commit through the season's own UI ----
// Fixture filters of the season view (read / overwrite before rendering another season).
function amReadFilters(){
  var tf = $('teamFilter'), od = $('onlyDone'), op = $('onlyPending'), rs = $('roundSel');
  return {
    rounds: [].map.call(document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked'), function(cb){ return cb.value; }),
    team: tf ? tf.value : '', done: !!(od && od.checked), pend: !!(op && op.checked), rsel: rs ? rs.value : ''
  };
}
// Renderers read these before rebuilding them, so placeholders are enough to steer them.
function amSetFilters(f){
  var box = $('roundCheckboxes'), tf = $('teamFilter'), od = $('onlyDone'), op = $('onlyPending'), rs = $('roundSel');
  if(box) box.innerHTML = f.rounds.map(function(v){ return '<input type="checkbox" checked value="' + escapeHtml(v) + '">'; }).join('');
  if(tf){ tf.innerHTML = '<option value="' + escapeHtml(f.team) + '"></option>'; tf.value = f.team; }
  if(od) od.checked = f.done;
  if(op) op.checked = f.pend;
  if(rs && f.rsel){ rs.innerHTML = '<option value="' + escapeHtml(f.rsel) + '"></option>'; rs.value = f.rsel; }
}
function amSaved(s, key, hg, ag){
  var r = s.results[key];
  var has = r && r.hg != null && r.ag != null && r.hg !== '' && r.ag !== '';
  return hg == null ? !has : !!has && +r.hg === hg && +r.ag === ag;
}
// Render season `sid` in the (hidden) season view, type the score into its real inputs and fire
// the events its handlers listen to (change / blur / Enter), then render the previous season back.
function amCommit(sid, key, hg, ag){
  var s = state.seasons[sid];
  if(!s || seasonLocked(s) || !(isAdminUser() || isSupporter())) return false;
  if(amSaved(s, key, hg, ag)) return true;
  var prev = state.current, bview = getBracketView(), keep = amReadFilters(), ok = false;
  var rnd = /^(\d+)-\d+$/.exec(key) || /^cswiss-(\d+)-\d+$/.exec(key);
  var grp = /^group-[^-]+-(\d+)-\d+$/.exec(key);
  var show = { rounds: rnd ? [rnd[1]] : [], team: '', done: false, pend: false, rsel: grp ? 'group-' + grp[1] : '' };
  amBusy = true;
  try {
    state.current = sid;
    setBracketView('list');
    amSetFilters(show);
    refreshAll();
    var el = [].filter.call(document.querySelectorAll('main.container:not(.stats-page) [data-key="' + CSS.escape(key) + '"]'), function(x){
      return x.querySelector('input.scoreH') && x.querySelector('input.scoreA');
    })[0];
    if(el){
      var h = el.querySelector('input.scoreH'), a = el.querySelector('input.scoreA');
      if(!h.disabled && !a.disabled && !h.readOnly && !a.readOnly){
        h.value = hg == null ? '' : hg;
        a.value = ag == null ? '' : ag;
        var fire = [
          function(){ a.dispatchEvent(new Event('change')); },
          function(){ a.dispatchEvent(new Event('blur')); },
          function(){ a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })); }
        ];
        for(var i = 0; i < fire.length && !amSaved(s, key, hg, ag); i++) fire[i]();
        ok = amSaved(s, key, hg, ag);
        if(ok){ amSetFilters(show); refreshAll(); } // let the format self-heal / build its next round
      }
    }
  } catch(e){ console.error('Admin fixtures: commit failed', sid, key, e); }
  state.current = prev;
  setBracketView(bview);
  amSetFilters(keep);
  saveAll();
  try { refreshAll(); } catch(e){ console.error(e); }
  amBusy = false;
  return ok;
}

function amRowSel(sid, key){
  return '#statsPage .am-row[data-am-sid="' + CSS.escape(sid) + '"][data-am-key="' + CSS.escape(key) + '"]';
}
function amNum(inp){
  var v = parseInt(inp.value, 10);
  return inp.value === '' || isNaN(v) ? null : Math.max(0, v);
}
function amRowCommit(row){
  if(amBusy || !row || !(isAdminUser() || isSupporter())) return;
  var hi = row.querySelector('.am-hg'), ai = row.querySelector('.am-ag');
  var hg = amNum(hi), ag = amNum(ai);
  if((hg == null) !== (ag == null)) return; // wait for the other side
  var sid = row.getAttribute('data-am-sid'), key = row.getAttribute('data-am-key'), s = state.seasons[sid];
  if(!s || amSaved(s, key, hg, ag)) return;
  var rows = [].slice.call(document.querySelectorAll('#statsPage .am-season[open] .am-row:not([hidden])'));
  var after = rows.slice(rows.indexOf(row) + 1).filter(function(r){ return !r.classList.contains('done'); })
    .map(function(r){ return [r.getAttribute('data-am-sid'), r.getAttribute('data-am-key')]; });
  var y = row.getBoundingClientRect().top;
  var ok = amCommit(sid, key, hg, ag);
  toast(ok ? crL('✅ Đã lưu kết quả', '✅ Result saved') : crL('⚠️ Không lưu được, bấm ↗ để nhập trong giải', '⚠️ Not saved, use ↗ to enter it in the season'));
  renderStatsPage();
  var same = document.querySelector(amRowSel(sid, key)), anchor = same && !same.hidden ? same : null;
  for(var j = 0; !anchor && j < after.length; j++){ // edited row filtered out → keep the next one in its place
    var c = document.querySelector(amRowSel(after[j][0], after[j][1]));
    if(c && !c.hidden) anchor = c;
  }
  if(anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - y); // keep the edited row in place
  if(!ok) return;
  for(var i = 0; i < after.length; i++){
    var nx = document.querySelector(amRowSel(after[i][0], after[i][1]));
    if(nx && !nx.classList.contains('done')){ var inp = nx.querySelector('.am-hg'); try { inp.focus({ preventScroll: true }); inp.select(); } catch(e){} break; }
  }
  if(same){ same.classList.add('am-saved'); setTimeout(function(){ same.classList.remove('am-saved'); }, 1200); }
}

function amGoto(sid, key){
  var s = state.seasons[sid];
  if(!s) return;
  var rnd = /^(\d+)-\d+$/.exec(key) || /^cswiss-(\d+)-\d+$/.exec(key);
  var grp = /^group-[^-]+-(\d+)-\d+$/.exec(key);
  var inFixtures = !!(rnd || grp);
  if(!inFixtures) setBracketView('list'); // knockout / swiss: score inputs only exist in list view
  var ids = availableViews(s).map(function(v){ return v.id; }), want = inFixtures ? 'fixtures' : 'bracket';
  try { localStorage.setItem(VIEW_KEY, ids.indexOf(want) !== -1 ? want : 'all'); } catch(_) {}
  crGotoSeason(sid);
  var done = $('onlyDone'), tf = $('teamFilter');
  if(done) done.checked = false;
  if(tf) tf.value = '';
  if(rnd){
    [].forEach.call(document.querySelectorAll('#roundCheckboxes input[type="checkbox"]'), function(cb){ cb.checked = cb.value === rnd[1]; });
    renderFixturesWithRound();
  } else if(grp && typeof renderTournamentFixtures === 'function') renderTournamentFixtures('group-' + grp[1]);
  amShowBack(true);
  amFocusMatch(key, 0);
}

document.addEventListener('click', function(e){
  var t = e.target;
  if(!t || !t.closest) return;
  if(t.closest('#amBack')){
    amShowBack(false);
    if(isAdminUser() || isSupporter() || isPlayer()) openStatsPage('admin');
    return;
  }
  if(t.closest('#btnAdminFixtures')){
    var det = t.closest('details');
    if(det) det.open = false;
    openStatsPage('admin');
    return;
  }
  var open = t.closest('#statsPage .am-row [data-am-open]');
  if(open){
    var row = open.closest('.am-row');
    amGoto(row.getAttribute('data-am-sid'), row.getAttribute('data-am-key'));
  }
});

document.addEventListener('keydown', function(e){
  var t = e.target;
  if(e.key !== 'Enter' || !t || !t.classList || !t.classList.contains('am-in') || !t.closest('#statsPage')) return;
  e.preventDefault();
  var row = t.closest('.am-row'), ai = row.querySelector('.am-ag');
  if(t !== ai && ai.value === ''){ ai.focus(); ai.select(); return; }
  amRowCommit(row);
});

document.addEventListener('toggle', function(e){
  var d = e.target;
  if(d && d.matches && d.matches('#statsPage .am-season')) AM_OPEN[d.getAttribute('data-am-season')] = d.open;
}, true);

document.addEventListener('input', function(e){
  if(e.target && e.target.id === 'amSearch'){ amQuery = e.target.value; amApplySearch(); }
});

document.addEventListener('change', function(e){
  if(e.target && e.target.classList && e.target.classList.contains('am-in') && e.target.closest('#statsPage')){
    amRowCommit(e.target.closest('.am-row'));
    return;
  }
  if(e.target && e.target.classList && e.target.classList.contains('am-rsel')){
    var sid = e.target.getAttribute('data-am-rsel');
    if(e.target.value) AM_ROUND[sid] = e.target.value; else delete AM_ROUND[sid];
    try { localStorage.setItem(AM_ROUND_KEY, JSON.stringify(AM_ROUND)); } catch(_) {}
    var y = e.target.getBoundingClientRect().top;
    renderStatsPage();
    var ns = document.querySelector('#statsPage .am-rsel[data-am-rsel="' + CSS.escape(sid) + '"]');
    if(ns) window.scrollBy(0, ns.getBoundingClientRect().top - y); // keep the season in place
    return;
  }
  if(e.target && e.target.id === 'amStatus'){
    amStatus = e.target.value;
    try { localStorage.setItem(AM_STATUS_KEY, amStatus); } catch(_) {}
    amApplySearch();
    return;
  }
  if(e.target && e.target.id === 'amNextOnly'){
    amNextOnly = e.target.checked;
    try { localStorage.setItem(AM_NEXT_KEY, amNextOnly ? '1' : '0'); } catch(_) {}
    renderStatsPage();
  }
});
