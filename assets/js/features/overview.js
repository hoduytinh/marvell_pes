// Marvell PES Club - features/overview.js
// Season overview card (format, teams, progress, leader/champion, next match) and
// section view tabs (Overview / Standings / Fixtures / Bracket / Stats).
// Tabs only toggle <main data-view>; CSS hides [data-sec] blocks that don't match,
// so mode-specific show/hide logic in refreshSeasonUI() stays untouched.

var VIEW_KEY = 'pesView';
var PES_VIEWS = [
  { id: 'all',       icon: '🏠', label: 'Tổng quan' },
  { id: 'standings', icon: '📊', label: 'Bảng xếp hạng' },
  { id: 'fixtures',  icon: '📅', label: 'Lịch thi đấu' },
  { id: 'bracket',   icon: '🌳', label: 'Nhánh đấu' },
  { id: 'stats',     icon: '📈', label: 'Thống kê' }
];

function availableViews(s){
  var def = getModeDef(s);
  var has = { all: true, standings: def.standings, fixtures: def.fixtures, bracket: def.bracket, stats: def.extras };
  return PES_VIEWS.filter(function(v){ return has[v.id]; });
}

function getSavedView(){
  try { return localStorage.getItem(VIEW_KEY) || 'all'; } catch(_) { return 'all'; }
}

function setView(view){
  try { localStorage.setItem(VIEW_KEY, view); } catch(_) {}
  // Re-render so canvases (trend sparks, rank chart) are drawn while visible
  refreshSeasonUI();
  var main = document.querySelector('main.container');
  if(main) main.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function renderViewTabs(s){
  var nav = $('viewTabs');
  var main = document.querySelector('main.container');
  if(!nav || !main) return;
  var views = s ? availableViews(s) : [];
  var current = getSavedView();
  if(!views.some(function(v){ return v.id === current; })) current = 'all';
  main.setAttribute('data-view', current);

  // A single tab is pointless (Legend / Ranking) — hide the bar
  if(views.length <= 2){
    nav.hidden = true;
    main.setAttribute('data-view', 'all');
    return;
  }
  nav.hidden = false;
  nav.innerHTML = '';
  views.forEach(function(v){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'view-tab' + (v.id === current ? ' active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', v.id === current ? 'true' : 'false');
    var ic = document.createElement('span'); ic.className = 'view-tab-icon'; ic.textContent = v.icon;
    var lb = document.createElement('span'); lb.textContent = v.label;
    b.appendChild(ic); b.appendChild(lb);
    b.addEventListener('click', function(){ if(v.id !== getSavedView()) setView(v.id); });
    nav.appendChild(b);
  });
}

// ---- Overview data ----
function isPlayedResult(r){
  return !!r && (r.bye || (r.hg != null && r.ag != null && r.hg !== '' && r.ag !== ''));
}

function seasonOverviewData(s){
  var data = { teams: s.teams ? s.teams.length : 0, played: 0, total: null, leader: null, champion: null, next: null };
  Object.keys(s.results || {}).forEach(function(k){ if(isPlayedResult(s.results[k])) data.played++; });

  if(s.mode === 'chess-swiss' && s.chessSwiss){
    var cs = s.chessSwiss;
    if(cs.byeIndex != null) data.teams--;
    data.total = cs.numRounds * Math.floor(s.teams.length / 2);
    var stats = chessSwissStats(s, cs.rounds.length).filter(function(st){ return !st.isBye; });
    stats.sort(function(a, b){ return (b.Pts - a.Pts) || (b.GD - a.GD) || (b.GF - a.GF) || (b.W - a.W) || a.team.localeCompare(b.team); });
    if(data.played > 0 && stats.length) data.leader = stats[0].team;
    cs.rounds.some(function(rd, r){
      return (rd.matches || []).some(function(m, mi){
        if(m.home === cs.byeIndex || m.away === cs.byeIndex) return false;
        if(isPlayedResult(s.results['cswiss-' + r + '-' + mi])) return false;
        data.next = { round: r + 1, home: s.teams[m.home], away: s.teams[m.away] };
        return true;
      });
    });
  } else if((!s.mode || s.mode === 'league') && Array.isArray(s.rounds)){
    data.total = s.rounds.reduce(function(n, rd){ return n + rd.length; }, 0);
    data.played = 0;
    s.rounds.forEach(function(rd, r){ rd.forEach(function(m, mi){ if(isPlayedResult(s.results[r + '-' + mi])) data.played++; }); });
    if(data.played > 0){
      var rows = computeStandingsFor(s, 'overall');
      if(rows.length) data.leader = rows[0].team;
    }
    s.rounds.some(function(rd, r){
      return rd.some(function(m, mi){
        if(isPlayedResult(s.results[r + '-' + mi])) return false;
        data.next = { round: r + 1, home: s.teams[m.home], away: s.teams[m.away] };
        return true;
      });
    });
  }

  // Champion: every standings renderer marks the winner with 🏆 once the season is decided
  var champRow = [].slice.call(document.querySelectorAll('#standings tr')).filter(function(tr){
    var cell = tr.querySelector('.team');
    return cell && cell.textContent.indexOf('🏆') !== -1;
  })[0];
  if(champRow) data.champion = champRow.querySelector('.team').textContent.replace(/[🏆🥈🥉]/gu, '').trim();
  if(data.total != null && data.played > data.total) data.played = data.total;
  return data;
}

function ovStat(label, valueNode, extraClass){
  var box = document.createElement('div');
  box.className = 'ov-stat' + (extraClass ? ' ' + extraClass : '');
  var l = document.createElement('div'); l.className = 'ov-label'; l.textContent = label;
  var v = document.createElement('div'); v.className = 'ov-value';
  if(typeof valueNode === 'string') v.textContent = valueNode; else v.appendChild(valueNode);
  box.appendChild(l); box.appendChild(v);
  return box;
}

function ovTeam(name){
  var sp = document.createElement('span');
  sp.className = 'no-i18n';
  sp.textContent = name;
  return sp;
}

function renderSeasonOverview(s){
  var host = $('seasonOverview');
  if(!host) return;
  if(!s || s.mode === 'legend' || s.mode === 'ranking'){ host.hidden = true; host.innerHTML = ''; return; }
  var d = seasonOverviewData(s);
  var def = getModeDef(s);
  host.innerHTML = '';
  host.hidden = false;

  var status, statusClass;
  if(d.champion || (d.total && d.played >= d.total)){ status = 'Đã kết thúc'; statusClass = 'done'; }
  else if(d.played > 0){ status = 'Đang diễn ra'; statusClass = 'live'; }
  else { status = 'Chưa bắt đầu'; statusClass = 'idle'; }

  var head = document.createElement('div'); head.className = 'ov-head';
  var mode = document.createElement('span'); mode.className = 'ov-mode'; mode.textContent = def.label;
  var title = document.createElement('span'); title.className = 'ov-title no-i18n'; title.textContent = s.name || '';
  var st = document.createElement('span'); st.className = 'ov-status ' + statusClass; st.textContent = status;
  head.appendChild(mode); head.appendChild(title); head.appendChild(st);
  host.appendChild(head);

  var grid = document.createElement('div'); grid.className = 'ov-grid';
  grid.appendChild(ovStat('Số đội', String(d.teams)));

  if(d.total){
    var pct = Math.round(d.played * 100 / d.total);
    var wrap = document.createElement('div');
    var txt = document.createElement('div'); txt.textContent = d.played + ' / ' + d.total + ' (' + pct + '%)';
    var bar = document.createElement('div'); bar.className = 'ov-bar';
    var fill = document.createElement('i'); fill.style.width = pct + '%';
    bar.appendChild(fill); wrap.appendChild(txt); wrap.appendChild(bar);
    grid.appendChild(ovStat('Tiến độ', wrap));
  } else {
    grid.appendChild(ovStat('Đã thi đấu', String(d.played)));
  }

  if(d.champion) grid.appendChild(ovStat('Vô địch', ovTeam('🏆 ' + d.champion), 'ov-champ'));
  else if(d.leader) grid.appendChild(ovStat('Dẫn đầu', ovTeam(d.leader)));

  if(d.next && !d.champion){
    var nx = document.createElement('div'); nx.className = 'ov-next';
    var rd = document.createElement('span'); rd.className = 'ov-round'; rd.textContent = 'Vòng ' + d.next.round;
    var vs = document.createElement('span'); vs.className = 'ov-vs'; vs.textContent = 'vs';
    nx.appendChild(rd); nx.appendChild(ovTeam(d.next.home)); nx.appendChild(vs); nx.appendChild(ovTeam(d.next.away));
    grid.appendChild(ovStat('Trận tiếp theo', nx, 'ov-wide'));
  }
  host.appendChild(grid);
}

// Called from saveAll(): refresh the card after score edits without a full re-render
var _overviewTimer = null;
function scheduleOverviewRefresh(){
  clearTimeout(_overviewTimer);
  _overviewTimer = setTimeout(function(){
    try { renderSeasonOverview(activeSeason()); } catch(e) { console.warn('Overview refresh failed:', e); }
  }, 50);
}
