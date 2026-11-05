// Marvell PES Club - features/bracket-tree.js (split from app.js; shared global scope, load order set in index.html)
// ===== Bracket tree (diagram) view — shared by all knockout-style modes =====
// One preference for every bracket: 'tree' (diagram, default) or 'list'
// (the original editable match list).
var BRACKET_VIEW_KEY = 'pesDeView';
function getBracketView() {
  try { return localStorage.getItem(BRACKET_VIEW_KEY) === 'list' ? 'list' : 'tree'; } catch(_) { return 'tree'; }
}
function setBracketView(v) {
  try { localStorage.setItem(BRACKET_VIEW_KEY, v); } catch(_) {}
}

// Switch to list view, re-render, then scroll to + flash the clicked match.
function jumpToBracketMatch(key, rerender) {
  setBracketView('list');
  rerender();
  setTimeout(function() {
    var t = document.querySelector('[data-key="' + key + '"]');
    if(!t) return;
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.classList.add('de-flash');
    setTimeout(function() { t.classList.remove('de-flash'); }, 1800);
  }, 30);
}

function renderBracketViewToggle(host, rerender) {
  var view = getBracketView();
  var bar = document.createElement('div');
  bar.className = 'de-view-toggle';
  [['tree', '🌳 Sơ đồ nhánh'], ['list', '📋 Danh sách trận']].forEach(function(opt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = opt[1];
    if(view === opt[0]) b.classList.add('active');
    b.addEventListener('click', function() {
      if(getBracketView() === opt[0]) return;
      setBracketView(opt[0]);
      rerender();
    });
    bar.appendChild(b);
  });
  if(view === 'tree') {
    var hint = document.createElement('span');
    hint.className = 'de-view-hint';
    hint.textContent = isAdmin() ? 'Bấm vào trận để nhập tỉ số' : 'Bấm vào trận để xem chi tiết';
    bar.appendChild(hint);
  }
  host.appendChild(bar);
}

// Clears `host`, adds the tree/list toggle and returns:
//  - null in tree mode (caller renders the diagram into `host`), or
//  - a fresh inner container (class `listClass`) for the classic list view.
function prepareBracketHost(host, listClass, rerender) {
  host.innerHTML = '';
  host.className = 'bracket-view-host';
  renderBracketViewToggle(host, rerender);
  if(getBracketView() === 'tree') return null;
  var inner = document.createElement('div');
  inner.className = listClass;
  host.appendChild(inner);
  return inner;
}

// Generic single-elimination tree (Knock-out, Tournament knock-out stage,
// Swiss playoffs). cfg:
//   rounds   : [[{home, away}]]  slots are team numbers or {fromRound, matchId, isLoser?} refs
//   names    : round names ('Tranh hạng 3' / '3rd Place…' = third-place round)
//   keyFor   : (r, m) -> s.results key
//   mapIdx   : (slotNumber) -> season team index (identity, or qualifiers[] for Swiss)
//   label    : (ref) -> placeholder text when the team is not known yet
//   code     : (r, m) -> small match code shown above the box
//   rerender : () -> re-render the whole bracket (used by the click-to-edit jump)
// Feeder links come from refs when present, otherwise (refs already replaced
// by team numbers after a result) from "which earlier match did this team win".
function renderKnockoutTree(host, s, cfg) {
  var BOX_W = 200, ROW_H = 24, BOX_H = ROW_H * 2 + 3, COL_GAP = 52, COL_W = BOX_W + COL_GAP;
  var LABEL_H = 14, RNAME_H = 22, PAD = 12, STEP = BOX_H + LABEL_H + 16;
  var rounds = cfg.rounds || [], names = cfg.names || [];
  if(!rounds.length) return;

  function isThird(r) { return /hạng 3|3rd/i.test(names[r] || ''); }
  function isRef(ref) { return !!ref && typeof ref === 'object' && ref.fromRound != null && ref.matchId != null; }
  function resultOf(r, m) {
    var x = s.results[cfg.keyFor(r, m)];
    return x && x.hg != null && x.ag != null ? x : null;
  }
  function slotTeam(ref, depth) {
    if(typeof ref === 'number') { var t = cfg.mapIdx(ref); return t == null ? null : t; }
    if(!isRef(ref) || depth > 12) return null;
    var pm = rounds[ref.fromRound] && rounds[ref.fromRound][ref.matchId];
    var res = resultOf(ref.fromRound, ref.matchId);
    if(!pm || !res || res.hg === res.ag) return null;
    var h = slotTeam(pm.home, depth + 1), a = slotTeam(pm.away, depth + 1);
    if(h == null || a == null) return null;
    var homeWon = res.hg > res.ag;
    return ref.isLoser ? (homeWon ? a : h) : (homeWon ? h : a);
  }

  var colOf = {}, numCols = 0;
  rounds.forEach(function(_, r) { if(!isThird(r)) colOf[r] = numCols++; });

  var nodes = {}, list = [];
  rounds.forEach(function(round, r) {
    (round || []).forEach(function(match, m) {
      if(!match) return;
      var n = { id: r + '-' + m, r: r, m: m, match: match, third: isThird(r), key: cfg.keyFor(r, m),
        h: slotTeam(match.home, 0), a: slotTeam(match.away, 0), res: resultOf(r, m), feeders: [null, null], y: null };
      n.winner = (n.res && n.res.hg !== n.res.ag && n.h != null && n.a != null) ? (n.res.hg > n.res.ag ? n.h : n.a) : null;
      nodes[n.id] = n;
      list.push(n);
    });
  });

  // Feeder links
  var used = {};
  list.forEach(function(n) {
    if(n.third) return;
    [n.match.home, n.match.away].forEach(function(ref, si) {
      var f = null;
      if(isRef(ref)) {
        if(!ref.isLoser) f = nodes[ref.fromRound + '-' + ref.matchId] || null;
      } else {
        var t = si === 0 ? n.h : n.a;
        for(var pr = n.r - 1; t != null && pr >= 0 && !f; pr--) {
          if(isThird(pr)) continue;
          for(var pm = 0; pm < (rounds[pr] || []).length; pm++) {
            var p = nodes[pr + '-' + pm];
            if(p && p.winner === t && !used[p.id]) { f = p; break; }
          }
        }
      }
      if(f && !f.third && !used[f.id] && f.r < n.r) { used[f.id] = true; n.feeders[si] = f; }
    });
  });

  // Vertical layout: leaves stacked top-down in bracket order, parents centered on feeders
  var cursor = RNAME_H + 4;
  function place(n) {
    if(n.y != null) return n.y;
    var ys = [];
    n.feeders.forEach(function(f) { if(f) ys.push(place(f)); });
    if(ys.length) n.y = ys.reduce(function(a, b) { return a + b; }, 0) / ys.length;
    else { n.y = cursor + LABEL_H + BOX_H / 2; cursor += STEP; }
    return n.y;
  }
  var mainNodes = list.filter(function(n) { return !n.third; });
  mainNodes.filter(function(n) { return !used[n.id]; })
    .sort(function(a, b) { return (colOf[b.r] - colOf[a.r]) || (a.m - b.m); })
    .forEach(place);
  mainNodes.forEach(place);

  var lastCol = numCols - 1;
  var finalNode = mainNodes.filter(function(n) { return colOf[n.r] === lastCol; })[0] || null;
  var bottom = cursor;
  var thirdY = finalNode ? finalNode.y + BOX_H + 56 : cursor + LABEL_H + BOX_H / 2;
  list.forEach(function(n) {
    if(!n.third) return;
    n.y = thirdY;
    thirdY += STEP;
    bottom = Math.max(bottom, n.y + BOX_H / 2);
  });
  mainNodes.forEach(function(n) { bottom = Math.max(bottom, n.y + BOX_H / 2); });

  function xOf(n) { return PAD + (n.third ? lastCol : colOf[n.r]) * COL_W; }
  var totalW = PAD + numCols * COL_W - COL_GAP + PAD;
  var totalH = bottom + 36 + PAD;

  var scroll = document.createElement('div');
  scroll.className = 'de-tree-scroll';
  var canvas = document.createElement('div');
  canvas.className = 'de-tree';
  canvas.style.width = totalW + 'px';
  canvas.style.height = totalH + 'px';
  scroll.appendChild(canvas);

  function addAbs(cls, text, left, top, width) {
    var d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    d.style.left = left + 'px';
    d.style.top = top + 'px';
    if(width != null) d.style.width = width + 'px';
    canvas.appendChild(d);
    return d;
  }

  rounds.forEach(function(_, r) {
    if(isThird(r)) return;
    addAbs('de-tree-rname', names[r] || ('Vòng ' + (r + 1)), PAD + colOf[r] * COL_W, 0, BOX_W);
  });

  // Connector lines
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'de-tree-svg');
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', totalH);
  list.forEach(function(n) {
    n.feeders.forEach(function(f, si) {
      if(!f) return;
      var x1 = xOf(f) + BOX_W, y1 = f.y, x2 = xOf(n);
      var top = n.y - BOX_H / 2;
      var y2 = si === 0 ? top + 1 + ROW_H / 2 : top + 2 + ROW_H * 1.5;
      var xm = x2 - COL_GAP / 2;
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', 'M' + x1 + ' ' + y1 + ' H' + xm + ' V' + y2 + ' H' + x2);
      p.setAttribute('class', 'de-tree-line' + (f.res ? ' done' : ''));
      svg.appendChild(p);
    });
  });
  canvas.appendChild(svg);

  function buildRow(idx, ref, score, state) {
    var row = document.createElement('div');
    row.className = 'de-tree-row' + (state ? ' ' + state : '');
    if(idx == null) row.classList.add('tbd');
    if(idx != null && s.teamLogos && s.teamLogos[idx]) {
      var img = document.createElement('img');
      img.src = s.teamLogos[idx];
      img.alt = '';
      img.className = 'de-tree-logo';
      row.appendChild(img);
    } else {
      var sq = document.createElement('span');
      sq.className = 'de-tree-logo';
      sq.style.background = (idx != null && s.teamColors && s.teamColors[idx]) || '#1b2550';
      row.appendChild(sq);
    }
    var name = document.createElement('span');
    name.className = 'de-tree-name';
    name.textContent = idx != null ? (s.teams[idx] || ('Team ' + (idx + 1))) : cfg.label(ref);
    row.appendChild(name);
    var sc = document.createElement('span');
    sc.className = 'de-tree-score';
    sc.textContent = score == null ? '' : score;
    row.appendChild(sc);
    return row;
  }

  list.forEach(function(n) {
    var x = xOf(n);
    var played = !!n.res;
    var hState = '', aState = '';
    if(played && n.res.hg !== n.res.ag) {
      hState = n.res.hg > n.res.ag ? 'win' : 'lose';
      aState = n.res.hg > n.res.ag ? 'lose' : 'win';
    }
    var code = n.third ? ('🥉 ' + (names[n.r] || '')) : cfg.code(n.r, n.m);
    if(code) addAbs('de-tree-code', code, x + 2, n.y - BOX_H / 2 - LABEL_H, BOX_W);
    var variant = n.third ? 'third' : (n === finalNode ? 'grand-final' : (/playoff/i.test(names[n.r] || '') ? 'playoff' : 'winners'));
    var box = document.createElement('div');
    box.className = 'de-tree-match ' + variant + (played ? ' played' : '');
    box.style.left = x + 'px';
    box.style.top = (n.y - BOX_H / 2) + 'px';
    box.style.width = BOX_W + 'px';
    box.style.height = BOX_H + 'px';
    box.appendChild(buildRow(n.h, n.match.home, played ? n.res.hg : null, hState));
    box.appendChild(buildRow(n.a, n.match.away, played ? n.res.ag : null, aState));
    box.addEventListener('click', function() { jumpToBracketMatch(n.key, cfg.rerender); });
    canvas.appendChild(box);
  });

  if(finalNode && finalNode.winner != null) {
    addAbs('de-tree-champion', '🏆 ' + (s.teams[finalNode.winner] || ''), xOf(finalNode), finalNode.y + BOX_H / 2 + 8, BOX_W);
  }

  host.appendChild(scroll);
}

// Draws the whole double-elimination bracket as a tree: match boxes positioned
// absolutely (each later-round match centered on the matches that feed it) and
// an SVG overlay with elbow connector lines. Winners Bracket on top, Losers
// Bracket below, Grand Final to the right fed by both finals. WB losers that
// drop into the LB are shown as a "↓" marker on the LB slot (no cross line, to
// keep the diagram readable).
function renderDoubleEliminationTree(s, host) {
  var de = s.doubleElimination;
  var BOX_W = 200, ROW_H = 24, BOX_H = ROW_H * 2 + 3, COL_GAP = 52, COL_W = BOX_W + COL_GAP;
  var LABEL_H = 14, TITLE_H = 30, RNAME_H = 22, SECTION_GAP = 30, PAD = 12;
  var nodes = {};
  var order = [];

  function refNodeId(ref) {
    if(!ref || typeof ref !== 'object') return null;
    if(ref.bracket === 'playoff') return 'playoff-0-' + ref.matchId;
    if(ref.position === 'loser') return null;
    if(ref.bracket === 'winners' || ref.bracket === 'losers') return ref.bracket + '-' + ref.fromRound + '-' + ref.matchId;
    return null;
  }
  function colX(col) { return PAD + col * COL_W; }
  function addNode(bracket, r, m, match, col, y) {
    var id = bracket + '-' + r + '-' + m;
    nodes[id] = {
      id: id, bracket: bracket, r: r, m: m, match: match, x: colX(col), y: y,
      key: bracket === 'grand-final' ? 'de-grand-final-' + m : 'de-' + bracket + '-' + r + '-' + m
    };
    order.push(id);
    return nodes[id];
  }
  function bottomOf(prefix, start) {
    var b = start;
    order.forEach(function(id) {
      if(id.indexOf(prefix) === 0) b = Math.max(b, nodes[id].y + BOX_H / 2);
    });
    return b;
  }
  // Leaves (round 0) evenly spaced; later rounds centered on same-bracket feeders.
  function layoutSection(rounds, bracket, colStart, top, leafStep, leafPad) {
    rounds.forEach(function(round, r) {
      round.forEach(function(match, m) {
        var ys = [];
        [match.home, match.away].forEach(function(ref) {
          var fid = refNodeId(ref);
          if(fid && fid.indexOf(bracket + '-') === 0 && nodes[fid]) ys.push(nodes[fid].y);
        });
        var y;
        if(ys.length) y = ys.reduce(function(a, b) { return a + b; }, 0) / ys.length;
        else if(r === 0) y = top + leafPad + m * leafStep + LABEL_H + BOX_H / 2;
        else y = bottomOf(bracket + '-', top) + 8 + LABEL_H + BOX_H / 2;
        addNode(bracket, r, m, match, colStart + r, y);
      });
    });
  }

  var hasPO = !!(de.playoffRound && de.playoffRound.length);
  var colOffset = hasPO ? 1 : 0;
  var wbRounds = de.winnersRounds || [];
  var lbRounds = de.losersRounds || [];

  // --- Winners Bracket (+ Playoff column feeding WB Round 1) ---
  var wbTop = TITLE_H + RNAME_H;
  var wbLeafStep = hasPO ? 2 * (BOX_H + LABEL_H) + 24 : BOX_H + LABEL_H + 16;
  var wbLeafPad = hasPO ? (BOX_H + LABEL_H) / 2 + 6 : 0;
  layoutSection(wbRounds, 'winners', colOffset, wbTop, wbLeafStep, wbLeafPad);

  if(hasPO) {
    de.playoffRound.forEach(function(match, m) {
      var y = null;
      (wbRounds[0] || []).some(function(wm, wi) {
        var target = nodes['winners-0-' + wi];
        var isPO = function(ref) { return ref && typeof ref === 'object' && ref.bracket === 'playoff'; };
        var hit = isPO(wm.home) && wm.home.matchId === m ? 'home' : (isPO(wm.away) && wm.away.matchId === m ? 'away' : null);
        if(!hit || !target) return false;
        var both = isPO(wm.home) && isPO(wm.away);
        var off = both ? (BOX_H + LABEL_H) / 2 + 6 : 0;
        y = target.y + (hit === 'home' ? -off : off);
        return true;
      });
      if(y == null) y = bottomOf('', wbTop) + 8 + LABEL_H + BOX_H / 2;
      addNode('playoff', 0, m, match, 0, y);
    });
  }
  var wbBottom = Math.max(bottomOf('winners-', wbTop), bottomOf('playoff-', wbTop));

  // --- Losers Bracket ---
  var lbTitleTop = wbBottom + SECTION_GAP;
  var lbTop = lbTitleTop + TITLE_H + RNAME_H;
  layoutSection(lbRounds, 'losers', colOffset, lbTop, BOX_H + LABEL_H + 16, 0);
  var lbBottom = bottomOf('losers-', lbTop);

  // --- Grand Final ---
  var gfCol = colOffset + Math.max(wbRounds.length, lbRounds.length);
  var gfNode = null;
  if(de.grandFinals && de.grandFinals.length) {
    var gf = de.grandFinals[0];
    var fys = [];
    [gf.home, gf.away].forEach(function(ref) {
      var fid = refNodeId(ref);
      if(fid && nodes[fid]) fys.push(nodes[fid].y);
    });
    var gy = fys.length ? fys.reduce(function(a, b) { return a + b; }, 0) / fys.length : wbTop + BOX_H;
    gfNode = addNode('grand-final', 0, 0, gf, gfCol, gy);
  }

  var totalW = colX(gfCol) + BOX_W + PAD;
  var totalH = Math.max(lbBottom, gfNode ? gfNode.y + BOX_H / 2 + 40 : 0) + PAD;

  var scroll = document.createElement('div');
  scroll.className = 'de-tree-scroll';
  var canvas = document.createElement('div');
  canvas.className = 'de-tree';
  canvas.style.width = totalW + 'px';
  canvas.style.height = totalH + 'px';
  scroll.appendChild(canvas);

  function addAbs(cls, text, left, top, width) {
    var d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    d.style.left = left + 'px';
    d.style.top = top + 'px';
    if(width != null) d.style.width = width + 'px';
    canvas.appendChild(d);
    return d;
  }

  // Section titles + round names
  addAbs('de-tree-section-title winners', '🏆 Winners Bracket', PAD, 0, (colOffset + wbRounds.length) * COL_W - COL_GAP);
  if(hasPO) addAbs('de-tree-rname', 'Playoff', colX(0), TITLE_H, BOX_W);
  wbRounds.forEach(function(_, r) {
    addAbs('de-tree-rname', (de.winnersNames && de.winnersNames[r]) || ('Vòng ' + (r + 1)), colX(colOffset + r), TITLE_H, BOX_W);
  });
  if(lbRounds.length) {
    addAbs('de-tree-section-title losers', '💀 Losers Bracket', colX(colOffset), lbTitleTop, lbRounds.length * COL_W - COL_GAP);
    lbRounds.forEach(function(_, r) {
      addAbs('de-tree-rname', (de.losersNames && de.losersNames[r]) || ('Vòng ' + (r + 1)), colX(colOffset + r), lbTitleTop + TITLE_H, BOX_W);
    });
  }
  if(gfNode) {
    addAbs('de-tree-section-title grand-final', '👑 Grand Final', gfNode.x, gfNode.y - BOX_H / 2 - LABEL_H - TITLE_H, BOX_W);
  }

  // Connector lines
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'de-tree-svg');
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', totalH);
  function hasResult(key) {
    var r = s.results[key];
    return !!(r && r.hg != null && r.ag != null);
  }
  order.forEach(function(id) {
    var n = nodes[id];
    ['home', 'away'].forEach(function(slot) {
      var fid = refNodeId(n.match[slot]);
      var f = fid && nodes[fid];
      if(!f) return;
      var x1 = f.x + BOX_W, y1 = f.y;
      var x2 = n.x;
      var top = n.y - BOX_H / 2;
      var y2 = slot === 'home' ? top + 1 + ROW_H / 2 : top + 2 + ROW_H * 1.5;
      var xm = x2 - COL_GAP / 2;
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', 'M' + x1 + ' ' + y1 + ' H' + xm + ' V' + y2 + ' H' + x2);
      p.setAttribute('class', 'de-tree-line' + (hasResult(f.key) ? ' done' : ''));
      svg.appendChild(p);
    });
  });
  canvas.appendChild(svg);

  // Match boxes
  function matchCode(n) {
    if(n.bracket === 'playoff') return 'PO ' + (n.m + 1);
    if(n.bracket === 'winners') return 'WB ' + (n.r + 1) + '-' + (n.m + 1);
    if(n.bracket === 'losers') return 'LB ' + (n.r + 1) + '-' + (n.m + 1);
    return '';
  }
  function buildRow(ref, score, state) {
    var row = document.createElement('div');
    row.className = 'de-tree-row' + (state ? ' ' + state : '');
    var idx = typeof ref === 'number' ? ref : resolveDoubleEliminationTeam(s, ref);
    var isDrop = ref && typeof ref === 'object' && ref.bracket === 'winners' && ref.position === 'loser';
    if(idx == null) row.classList.add('tbd');
    if(idx != null && s.teamLogos && s.teamLogos[idx]) {
      var img = document.createElement('img');
      img.src = s.teamLogos[idx];
      img.alt = '';
      img.className = 'de-tree-logo';
      row.appendChild(img);
    } else {
      var sq = document.createElement('span');
      sq.className = 'de-tree-logo';
      sq.style.background = (idx != null && s.teamColors && s.teamColors[idx]) || '#1b2550';
      row.appendChild(sq);
    }
    if(isDrop) {
      var drop = document.createElement('span');
      drop.className = 'de-tree-drop';
      drop.textContent = '↓';
      row.appendChild(drop);
      row.title = 'Rớt từ WB ' + (ref.fromRound + 1) + '-' + (ref.matchId + 1);
    }
    var name = document.createElement('span');
    name.className = 'de-tree-name';
    name.textContent = idx != null ? (s.teams[idx] || ('Team ' + (idx + 1))) : getTeamNameForDoubleElimination(s, ref);
    row.appendChild(name);
    var sc = document.createElement('span');
    sc.className = 'de-tree-score';
    sc.textContent = score == null ? '' : score;
    row.appendChild(sc);
    return row;
  }
  function jumpToMatch(key) {
    jumpToBracketMatch(key, function() { renderDoubleEliminationBracket(s); });
  }

  order.forEach(function(id) {
    var n = nodes[id];
    var res = s.results[n.key] || {};
    var played = res.hg != null && res.ag != null;
    var hState = '', aState = '';
    if(played && res.hg !== res.ag) {
      hState = res.hg > res.ag ? 'win' : 'lose';
      aState = res.hg > res.ag ? 'lose' : 'win';
    }
    var code = matchCode(n);
    if(code) addAbs('de-tree-code', code, n.x + 2, n.y - BOX_H / 2 - LABEL_H, BOX_W);
    var box = document.createElement('div');
    box.className = 'de-tree-match ' + n.bracket + (played ? ' played' : '');
    box.style.left = n.x + 'px';
    box.style.top = (n.y - BOX_H / 2) + 'px';
    box.style.width = BOX_W + 'px';
    box.style.height = BOX_H + 'px';
    box.appendChild(buildRow(n.match.home, played ? res.hg : null, hState));
    box.appendChild(buildRow(n.match.away, played ? res.ag : null, aState));
    box.addEventListener('click', function() { jumpToMatch(n.key); });
    canvas.appendChild(box);
  });

  // Champion badge under the Grand Final
  if(gfNode) {
    var gfRes = s.results[gfNode.key];
    if(gfRes && gfRes.hg != null && gfRes.ag != null && gfRes.hg !== gfRes.ag) {
      var champRef = gfRes.hg > gfRes.ag ? gfNode.match.home : gfNode.match.away;
      var champIdx = resolveDoubleEliminationTeam(s, champRef);
      if(champIdx != null) {
        addAbs('de-tree-champion', '🏆 ' + (s.teams[champIdx] || ''), gfNode.x, gfNode.y + BOX_H / 2 + 10, BOX_W);
      }
    }
  }

  host.appendChild(scroll);
}
