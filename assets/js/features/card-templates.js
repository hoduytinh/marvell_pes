// Marvell PES Club - features/card-templates.js
// Extra print-card designs for card-export.js, drawn on a canvas in design units (324 x 516 = 54 x 86 mm):
//  'toty'   - Team-of-the-Year style: navy field in an ornate gold frame, gold blades + sparkles;
//             a cut-out (transparent) photo may break out above the frame.
//  'attax'  - trading-card style: shattered glass in the club colours (read from the team logo), vertical
//             side banner, rating / Elo badges on the right, big DEF / ATT boxes, name bar.
//  'legend' - gold-foil legend card: slanted photo panel, slanted name banner, stat bars, DEF / ATT boxes.
//  'allround'  - Match Attax 20/21: white frame, club-colour shards + halftone, vertical name banner,
//                coloured 6-stat ladder, big slanted title, DEF / ATT boxes around the crest.
//  'adrenalyn' - Adrenalyn XL: grey striped geometric photo, white name panel, DEF / CLU / ATT / TOTAL boxes,
//                position panel (tier flag, mini pitch, role) coloured by position.
//  'ucl'       - Champions (Match Attax UCL): starball night photo, white info band, name bar.
//  'back'      - common card back (same for everyone): navy field, PlayStation-button emblem and a
//                hand-drawn "MARVELL PES CLUB" logotype (CE_GLYPH vector letters, no font).
// Each drawer gets o = { card, tier, label (custom tier text), img, av, alpha, noAv (photo turned off),
// logo, team: { c1, c2 }, rank } (ceCardOpts in card-export.js). ceArt draws the photo or, with noAv, a big crest.

function ceRng(seed){
  var a = 7;
  for(var i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) | 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ceRgb(c, a){ var s = c.map(Math.round).join(','); return a == null ? 'rgb(' + s + ')' : 'rgba(' + s + ',' + a + ')'; }
// f > 0 mixes toward white, f < 0 toward black.
function ceShade(c, f){ return c.map(function(v){ return f >= 0 ? v + (255 - v) * f : v * (1 + f); }); }
function cePoly(ctx, pts){ ctx.beginPath(); pts.forEach(function(p, i){ ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); ctx.closePath(); }
function ceShadow(ctx, c, blur, dy){ ctx.shadowColor = c; ctx.shadowBlur = blur * CE_K; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = (dy || 0) * CE_K; }
function ceNoShadow(ctx){ ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
// o: { size, w (weight, may include 'italic'), fill, align, ls (letter spacing), max (fit width), min }
function ceText(ctx, txt, x, y, o){
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'alphabetic';
  ceSpacing(ctx, o.ls || 0);
  if(o.max) ceFit(ctx, txt, o.max, o.size, o.w || 900, o.min || 6);
  else ctx.font = (o.w || 900) + ' ' + o.size + 'px ' + CE_FONT;
  ctx.fillStyle = o.fill || '#fff';
  ctx.fillText(txt, x, y);
  ceSpacing(ctx, 0);
}
function ceStatV(card, k){
  var s = (card.stats || []).filter(function(x){ return x.k === k; })[0];
  return s ? s.v : 0;
}
function ceTierLabel(t){
  return t === 'icon' ? crL('HUYỀN THOẠI', 'LEGEND') : t === 'gold' ? crL('NGÔI SAO', 'SUPERSTAR') :
    t === 'silver' ? crL('CẦU THỦ XUẤT SẮC', 'STANDOUT PLAYER') : crL('TÀI NĂNG TRẺ', 'RISING TALENT');
}
function ceLogoDisc(ctx, img, cx, cy, r, ring){
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ceShadow(ctx, 'rgba(0,0,0,.45)', 6, 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ceNoShadow(ctx);
  ctx.clip();
  if(img){
    var w = img.naturalWidth || 1, h = img.naturalHeight || 1, s = Math.max(2 * r / w, 2 * r / h);
    ctx.drawImage(img, cx - w * s / 2, cy - h * s / 2, w * s, h * s);
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = ring || '#fff'; ctx.stroke();
}
function ceMedalStars(ctx, medals, cx, cy, maxW, maxR){
  medals = (medals || []).slice(0, 30);
  if(!medals.length) return 0;
  var r = Math.min(maxR || 5.6, maxW / (medals.length * 2.25)), gap = r * 2.25, x0 = cx - (medals.length - 1) * gap / 2;
  var col = { gold: '#facc15', silver: '#e2e8f0', bronze: '#d97706' };
  medals.forEach(function(m, j){
    ceStar(ctx, x0 + j * gap, cy, r);
    ctx.fillStyle = col[m] || col.gold; ctx.fill();
    ctx.lineWidth = Math.max(0.5, r * 0.15); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
  });
  return medals.length * gap;
}
// Fan of sharp blades from (ox, oy), angles a0..a1.
function ceFan(ctx, rnd, ox, oy, a0, a1, n, lmin, lmax, stops){
  for(var i = 0; i < n; i++){
    var a = a0 + (a1 - a0) * (i + rnd() * 0.6) / n, L = lmin + rnd() * (lmax - lmin), w = 3 + rnd() * 8;
    var px = -Math.sin(a) * w / 2, py = Math.cos(a) * w / 2, tx = ox + Math.cos(a) * L, ty = oy + Math.sin(a) * L;
    cePoly(ctx, [[ox + px, oy + py], [tx, ty], [ox - px, oy - py]]);
    ctx.globalAlpha = 0.55 + rnd() * 0.4;
    ctx.fillStyle = ceGrad(ctx, ox, oy, tx, ty, stops);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function ceTwinkle(ctx, x, y, r){
  var q = r * 0.16;
  cePoly(ctx, [[x, y - r], [x + q, y - q], [x + r, y], [x + q, y + q], [x, y + r], [x - q, y + q], [x - r, y], [x - q, y - q]]);
  ceShadow(ctx, '#ffe9a0', 6, 0);
  ctx.fillStyle = '#fffbe8'; ctx.fill();
  ceNoShadow(ctx);
}

// Main + accent colour of a club logo (most saturated hue buckets); fallback blue / white.
function ceLogoColors(img){
  var def = { c1: [37, 99, 235], c2: [255, 255, 255] }, d;
  if(!img) return def;
  try {
    var c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = c.height = 40;
    x.drawImage(img, 0, 0, 40, 40);
    d = x.getImageData(0, 0, 40, 40).data;
  } catch(e){ return def; }
  var bins = {};
  for(var i = 0; i < d.length; i += 4){
    if(d[i + 3] < 200) continue;
    var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
    if(s < 0.3 || l < 0.12 || l > 0.9) continue;
    var h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    var k = Math.floor(h * 2) % 12, bn = bins[k] || (bins[k] = { k: k, w: 0, r: 0, g: 0, b: 0 });
    bn.w += s; bn.r += d[i] * s; bn.g += d[i + 1] * s; bn.b += d[i + 2] * s;
  }
  var list = Object.keys(bins).map(function(k){ return bins[k]; }).sort(function(a, b){ return b.w - a.w; });
  if(!list.length || list[0].w < 25) return def;
  function col(bn){ return [bn.r / bn.w, bn.g / bn.w, bn.b / bn.w]; }
  var alt = list.filter(function(bn){ var dk = Math.abs(bn.k - list[0].k); return Math.min(dk, 12 - dk) >= 2 && bn.w > list[0].w * 0.25; })[0];
  return { c1: col(list[0]), c2: alt ? col(alt) : [255, 255, 255] };
}

// ---------------- Tier looks (all canvas designs) ----------------
// metal: frame / badge gradient; lite, acc, gem: light text tones; dark: text on metal; field, base: background;
// foil + ink: the light 'legend' foil and its text; fans / dust / twinkle / holo: amount of decoration.
var CE_GOLD = ['#fff6d0', '#f2c94c', '#b8860b', '#ffe8a3', '#c9971c', '#7a5200'];
var CE_TM = {
  icon: { metal: ['#fffbe8', '#f5d0fe', '#a855f7', '#fde68a', '#c084fc', '#4c1d95'], lite: '#fdf4ff', acc: '#f0abfc', gem: '#f5d0fe', dark: '#2e1065',
    field: ['#d08cff', '#7c3aed', '#3b0f7a', '#12042b'], base: ['#24104f', '#07020f'], beam: '#f5d0fe',
    foil: ['#fdf4ff', '#eedcff', '#b794f6', '#fbd5ef', '#6d3fc8'], ink: ['#6d28d9', '#2e1065', '#4c1d95', '#5b21b6'], fans: 13, dust: 160, twinkle: 16, holo: 0.24 },
  gold: { metal: CE_GOLD, lite: '#fffbe6', acc: '#f2c94c', gem: '#e9d38a', dark: '#2b1a00',
    field: ['#3d6bff', '#1c3aa8', '#0b1a5c', '#050b2e'], base: ['#0d1640', '#03061a'], beam: '#9ec5ff',
    foil: ['#fffaf0', '#f5e6bd', '#d9b35f', '#f7e7b5', '#a8792a'], ink: ['#8a5a00', '#3b2600', '#5c3a00', '#7a5200'], fans: 9, dust: 90, twinkle: 9, holo: 0 },
  silver: { metal: ['#ffffff', '#dfe5ec', '#8d98a8', '#f4f7fa', '#b3bdc9', '#4b5563'], lite: '#ffffff', acc: '#e2e8f0', gem: '#cbd5e1', dark: '#0f172a',
    field: ['#a3b3c9', '#4c5d78', '#222c3d', '#0b0f17'], base: ['#222938', '#06080c'], beam: '#e2e8f0',
    foil: ['#ffffff', '#eef2f6', '#b4bdc9', '#f3f6f9', '#6f7a8a'], ink: ['#475569', '#0f172a', '#1e293b', '#334155'], fans: 6, dust: 50, twinkle: 4, holo: 0 },
  bronze: { metal: ['#ffe6cf', '#e8a46c', '#9a5222', '#ffd2ab', '#c0703a', '#5c2a0a'], lite: '#fff1e4', acc: '#f0a868', gem: '#e8b98f', dark: '#2a1205',
    field: ['#d0804a', '#843f1c', '#411d0b', '#190a04'], base: ['#2e170a', '#0a0402'], beam: '#ffc49a',
    foil: ['#fff2e6', '#f1caa6', '#c27c46', '#f6d4b5', '#7a3e18'], ink: ['#8f4a1a', '#3d1a0a', '#5c2a0a', '#7a3418'], fans: 3, dust: 24, twinkle: 0, holo: 0 }
};
function ceTm(t){ return CE_TM[t] || CE_TM.gold; }
function ceHexA(h, a){ var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
// Rainbow sheen (icon cards).
function ceHolo(ctx, x, y, w, h, a){
  if(!a) return;
  var g = ctx.createLinearGradient(x, y + h, x + w, y);
  ['#ff4fd8', '#7c5cff', '#38bdf8', '#4ade80', '#facc15', '#ff4fd8'].forEach(function(c, i, l){ g.addColorStop(i / (l.length - 1), c); });
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

// ---------------- 'toty' ----------------
function ceDrawToty(ctx, o){
  var W = CE_W, H = CE_H, card = o.card, T = ceTm(o.tier), rnd = ceRng(card.name + '|toty'), i, g, a;
  ceRRect(ctx, 0, 0, W, H, 18);
  g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.base[0]); g.addColorStop(1, T.base[1]);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalAlpha = 0.07; ctx.fillStyle = T.acc;
  for(i = 0; i < 28; i++){ a = i / 28 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(W / 2, 120); ctx.arc(W / 2, 120, H, a, a + Math.PI / 34); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Gold frame.
  var fx = 8, fy = 26, fw = W - 16, fh = H - 34;
  ctx.save();
  ceShield(ctx, fx, fy, fw, fh);
  ceShadow(ctx, 'rgba(0,0,0,.7)', 14, 4);
  ctx.fillStyle = ceGrad(ctx, 0, fy, W, fy + fh, T.metal); ctx.fill();
  ctx.restore();
  ceShield(ctx, fx + 2.5, fy + 2.5, fw - 5, fh - 5);
  ctx.lineWidth = 0.8; ctx.strokeStyle = ceHexA(T.lite, 0.85); ctx.stroke();

  // Navy field.
  var ix = fx + 7, iy = fy + 7, iw = fw - 14, ih = fh - 14;
  ctx.save();
  ceShield(ctx, ix, iy, iw, ih);
  ctx.clip();
  g = ctx.createRadialGradient(W * 0.55, 170, 10, W * 0.55, 170, 330);
  g.addColorStop(0, T.field[0]); g.addColorStop(0.35, T.field[1]); g.addColorStop(0.75, T.field[2]); g.addColorStop(1, T.field[3]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = T.beam;
  for(i = 0; i < 6; i++){
    var bx = 40 + rnd() * 260, bw = 10 + rnd() * 30;
    ctx.globalAlpha = 0.05 + rnd() * 0.07;
    cePoly(ctx, [[bx, 0], [bx + bw, 0], [bx + bw - 160, H], [bx - 160, H]]); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ceHolo(ctx, 0, 0, W, H, T.holo);
  ceFan(ctx, rnd, 318, 46, 1.75, 3.0, T.fans, 80, 190, T.metal);
  ceFan(ctx, rnd, 6, 330, -0.95, 0.2, Math.round(T.fans * 0.66), 50, 115, T.metal);
  for(i = 0; i < T.dust; i++){
    ctx.globalAlpha = 0.35 + rnd() * 0.65;
    ctx.fillStyle = rnd() < 0.6 ? T.gem : '#ffffff';
    ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 0.3 + rnd() * 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for(i = 0; i < T.twinkle; i++) ceTwinkle(ctx, rnd() * W, 50 + rnd() * 380, 3 + rnd() * 5);
  g = ctx.createLinearGradient(0, 320, 0, H);
  g.addColorStop(0, ceHexA(T.base[1], 0)); g.addColorStop(0.3, ceHexA(T.base[1], 0.7)); g.addColorStop(1, ceHexA(T.base[1], 0.92));
  ctx.fillStyle = g; ctx.fillRect(0, 320, W, H);
  ctx.restore();
  ceShield(ctx, ix + 4, iy + 4, iw - 8, ih - 8);
  ctx.lineWidth = 0.8; ctx.strokeStyle = ceHexA(T.acc, 0.55); ctx.stroke();

  // Photo: clipped to the field; a cut-out may also overlap the top of the frame.
  if(o.img || o.noAv){
    ctx.save();
    ceShield(ctx, ix, iy, iw, ih);
    if(o.alpha) ctx.rect(0, 0, W, 150);
    ctx.clip();
    ceArt(ctx, o, o.img ? { x: 40, y: 0, w: 270, h: 352 } : { x: 60, y: 40, w: 230, h: 280 }, { from: o.alpha ? 0.8 : 0.6, sides: !o.alpha }, T.acc);
    ctx.restore();
  }

  // Crest on the crown.
  ctx.beginPath(); ctx.arc(W / 2, 41, 12, 0, Math.PI * 2);
  ceShadow(ctx, 'rgba(0,0,0,.5)', 4, 1);
  ctx.fillStyle = T.field[2]; ctx.fill();
  ceNoShadow(ctx);
  ctx.lineWidth = 1.6; ctx.strokeStyle = ceGrad(ctx, W / 2 - 12, 29, W / 2 + 12, 53, T.metal); ctx.stroke();
  ceStar(ctx, W / 2, 35.5, 2.4); ctx.fillStyle = T.acc; ctx.fill();
  ceText(ctx, 'PES', W / 2 + 0.3, 46.5, { size: 7.5, fill: T.acc, ls: 0.6 });

  // Rating column.
  ceShadow(ctx, 'rgba(0,0,0,.65)', 4, 1.5);
  ceText(ctx, String(card.ovr), 66, 110, { size: 50, fill: ceGrad(ctx, 0, 72, 0, 110, [T.lite, T.acc, T.metal[2]]), ls: -1.5 });
  ceText(ctx, card.pos, 66, 134, { size: 19, fill: T.gem, ls: 1 });
  ceNoShadow(ctx);
  ctx.fillStyle = ceHexA(T.acc, 0.85); ctx.fillRect(50, 142, 32, 1.6);
  ceLogoDisc(ctx, o.logo, 66, 166, 15, T.acc);
  var tierTxt = ceLabelOr(o, o.tier.toUpperCase()), pw = cePillW(ctx, tierTxt, 7, 1.4, 48, 76);
  ceRRect(ctx, 66 - pw / 2, 189, pw, 12, 6); ctx.fillStyle = ceGrad(ctx, 66 - pw / 2, 0, 66 + pw / 2, 0, T.metal); ctx.fill();
  ceText(ctx, tierTxt, 66.6, 198, { size: 7, fill: T.dark, ls: 1.4, max: pw - 8, min: 4 });

  // Name, stats row, footer.
  var line = [ceHexA(T.acc, 0), T.acc, ceHexA(T.acc, 0)];
  ceShadow(ctx, 'rgba(0,0,0,.8)', 5, 1.5);
  ceText(ctx, String(card.name || '').toUpperCase(), W / 2, 376, { size: 27, fill: ceGrad(ctx, 0, 354, 0, 378, [T.lite, T.acc]), ls: 0.6, max: 240, min: 12 });
  ceNoShadow(ctx);
  ctx.fillStyle = ceGrad(ctx, 50, 0, W - 50, 0, line);
  ctx.fillRect(50, 386, W - 100, 1.2);
  (card.stats || []).slice(0, 6).forEach(function(s, j){
    var cx = 62 + 40 * j;
    ceText(ctx, CE_CODES[s.k] || s.k.toUpperCase(), cx, 404, { size: 10, w: 800, fill: T.gem, ls: 0.6 });
    ceShadow(ctx, 'rgba(0,0,0,.5)', 3, 1);
    ceText(ctx, String(s.v), cx, 430, { size: 22, fill: s.v >= 90 ? '#fde047' : '#ffffff' });
    ceNoShadow(ctx);
  });
  ctx.fillStyle = ceGrad(ctx, 60, 0, W - 60, 0, line);
  ctx.fillRect(60, 442, W - 120, 1);
  ceText(ctx, 'ELO ' + card.elo + '  \u00b7  ' + card.P + crL(' TRẬN', ' MATCHES'), W / 2, 460, { size: 9.5, w: 800, fill: T.gem, ls: 0.8, max: 190 });
  ceMedalStars(ctx, card.medalList, W / 2, 476, 96, 5);
}

// ---------------- 'attax' ----------------
function ceDrawAttax(ctx, o){
  var W = CE_W, H = CE_H, card = o.card, T = ceTm(o.tier), rnd = ceRng(card.name + '|attax'), c1 = o.team.c1, c2 = o.team.c2, i, g, a, r;
  ceRRect(ctx, 0, 0, W, H, 18); ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, T.metal); ctx.fill();
  ceRRect(ctx, 4, 4, W - 8, H - 8, 15); ctx.fillStyle = ceGrad(ctx, 0, 0, 0, H, T.base); ctx.fill();
  ctx.lineWidth = 0.8; ctx.strokeStyle = ceHexA(T.lite, 0.5); ctx.stroke();

  // Art panel: club colours + shattered glass.
  var P = { x: 10, y: 10, w: W - 20, h: 344 }, ox = W * 0.6, oy = 150;
  ctx.save();
  ceRRect(ctx, P.x, P.y, P.w, P.h, 10);
  ctx.clip();
  g = ctx.createLinearGradient(P.x, P.y, P.x + P.w, P.y + P.h);
  g.addColorStop(0, ceRgb(ceShade(c1, 0.35))); g.addColorStop(0.5, ceRgb(c1)); g.addColorStop(1, ceRgb(ceShade(c1, -0.55)));
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
  for(i = 0; i < 70; i++){
    a = rnd() * Math.PI * 2;
    var r1 = 8 + rnd() * 50, r2 = r1 + 50 + rnd() * 240, da = (0.05 + rnd() * 0.2) * (rnd() < 0.5 ? 1 : -1), q = rnd();
    cePoly(ctx, [[ox + Math.cos(a) * r1, oy + Math.sin(a) * r1], [ox + Math.cos(a + da) * r2, oy + Math.sin(a + da) * r2],
      [ox + Math.cos(a + da * 0.3) * r2 * 0.82, oy + Math.sin(a + da * 0.3) * r2 * 0.82]]);
    ctx.fillStyle = q < 0.35 ? 'rgba(255,255,255,' + (0.5 + rnd() * 0.4) + ')' : q < 0.6 ? ceRgb(c2, 0.75) :
      q < 0.8 ? ceRgb(ceShade(c1, 0.45), 0.7) : ceRgb(ceShade(c1, -0.45), 0.6);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.7;
  for(i = 0; i < 16; i++){
    a = rnd() * Math.PI * 2; r = 0;
    ctx.beginPath(); ctx.moveTo(ox, oy);
    for(var s = 0; s < 4; s++){ r += 30 + rnd() * 60; a += (rnd() - 0.5) * 0.4; ctx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r); }
    ctx.stroke();
  }
  // Tier tint: gold keeps club colours, others recolour the glass to the tier metal.
  var tint = { icon: ['#9333ea', 0.7], silver: ['#94a3b8', 0.92], bronze: ['#b45309', 0.8] }[o.tier];
  if(tint){
    ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = tint[1];
    ctx.fillStyle = tint[0]; ctx.fillRect(P.x, P.y, P.w, P.h); ctx.restore();
  }
  g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 90);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
  ceHolo(ctx, P.x, P.y, P.w, P.h, T.holo * 1.4);
  ceArt(ctx, o, o.alpha ? { x: 34, y: 14, w: 240, h: 340 } : P, null, '#fff');
  g = ctx.createLinearGradient(0, 290, 0, P.y + P.h);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = g; ctx.fillRect(P.x, 290, P.w, 70);

  // Side banner with the tier title.
  cePoly(ctx, [[0, 0], [44, 0], [44, 292], [0, 308]]);
  ceShadow(ctx, 'rgba(0,0,0,.45)', 8, 0);
  ctx.fillStyle = ceHexA(T.base[0], 0.94); ctx.fill();
  ceNoShadow(ctx);
  ctx.fillStyle = ceGrad(ctx, 0, 0, 0, 292, T.metal); ctx.fillRect(44, 0, 3, 292);
  ctx.save();
  ctx.translate(28, 158); ctx.rotate(-Math.PI / 2);
  ceText(ctx, ceLabelOr(o, ceTierLabel(o.tier)), 0, 6, { size: 16, fill: ceGrad(ctx, -125, 0, 125, 0, T.metal), ls: 2, max: 250, min: 9 });
  ctx.restore();
  ctx.restore();
  ceLogoDisc(ctx, o.logo, 28, 322, 17, T.acc);

  // Brand + badges on the right.
  ceRRect(ctx, 256, 18, 50, 20, 5);
  ceShadow(ctx, 'rgba(0,0,0,.4)', 4, 1); ctx.fillStyle = '#fff'; ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 1.4; ctx.strokeStyle = '#dc2626'; ctx.stroke();
  ceText(ctx, 'PES', 281, 33, { size: 13, w: 'italic 900', fill: '#dc2626', ls: 0.5 });
  var rx = 262, rw = 44, mid = rx + rw / 2;
  ceRRect(ctx, rx, 48, rw, 38, 5);
  ceShadow(ctx, 'rgba(0,0,0,.4)', 5, 1.5); ctx.fillStyle = '#fff'; ctx.fill(); ceNoShadow(ctx);
  ceText(ctx, crL('VỊ TRÍ', 'POS'), mid, 59, { size: 6.5, w: 800, fill: '#64748b', ls: 0.6 });
  ceText(ctx, card.pos, mid, 80, { size: 17, fill: '#0f172a', max: rw - 6, min: 8 });
  ceRRect4(ctx, rx, 94, rw, 52, [5, 5, 5, 5]);
  ceShadow(ctx, 'rgba(0,0,0,.4)', 5, 1.5); ctx.fillStyle = '#fff'; ctx.fill(); ceNoShadow(ctx);
  ceRRect4(ctx, rx, 94, rw, 14, [5, 5, 0, 0]); ctx.fillStyle = ceGrad(ctx, rx, 0, rx + rw, 0, T.metal); ctx.fill();
  ceText(ctx, crL('CHỈ SỐ', 'RATING'), mid, 104, { size: 7, fill: T.dark, ls: 0.6, max: rw - 4 });
  ceText(ctx, String(card.ovr), mid, 138, { size: 27, fill: '#111827', ls: -1 });
  ctx.beginPath(); ctx.arc(mid, 176, 21, 0, Math.PI * 2);
  ceShadow(ctx, 'rgba(0,0,0,.45)', 5, 1.5);
  g = ctx.createRadialGradient(mid - 6, 170, 2, mid, 176, 21); g.addColorStop(0, '#374151'); g.addColorStop(1, '#0b0f19');
  ctx.fillStyle = g; ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 2; ctx.strokeStyle = ceGrad(ctx, mid - 21, 155, mid + 21, 197, T.metal); ctx.stroke();
  ceText(ctx, 'ELO', mid, 172, { size: 6.5, w: 800, fill: T.acc, ls: 0.8 });
  ceText(ctx, String(card.elo), mid, 186, { size: 11, fill: '#fff', max: 34 });
  if(o.rank){
    ceRRect(ctx, rx + 4, 206, rw - 8, 20, 4);
    ceShadow(ctx, 'rgba(0,0,0,.45)', 4, 1); ctx.fillStyle = '#111827'; ctx.fill(); ceNoShadow(ctx);
    ctx.lineWidth = 0.8; ctx.strokeStyle = T.acc; ctx.stroke();
    ceText(ctx, '#' + o.rank, mid, 220, { size: 11, fill: '#fff' });
  }
  ceShadow(ctx, 'rgba(0,0,0,.8)', 3, 1);
  ceText(ctx, card.P + crL(' TRẬN', ' MATCHES'), mid, o.rank ? 240 : 218, { size: 7.5, w: 800, fill: '#fff', ls: 0.5, max: 50 });
  ceNoShadow(ctx);

  // Trophy stars over the bottom of the art.
  var n = Math.min((card.medalList || []).length, 30);
  if(n){
    var sw = Math.min(200, n * 12.4) + 16;
    ceRRect(ctx, W / 2 - sw / 2, 328, sw, 18, 9); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    ceMedalStars(ctx, card.medalList, W / 2, 337.5, sw - 16, 5.5);
  }

  // DEF / ATT boxes.
  [[14, crL('PHÒNG THỦ', 'DEFENCE'), ceStatV(card, 'def'), ['#3b82f6', '#1e3a8a']], [166, crL('TẤN CÔNG', 'ATTACK'), ceStatV(card, 'att'), ['#ef4444', '#991b1b']]].forEach(function(b){
    var cx = b[0] + 72;
    ceText(ctx, b[1], cx, 370, { size: 10, fill: '#fff', ls: 1.2, max: 140 });
    ceRRect(ctx, b[0], 376, 144, 60, 7);
    ctx.fillStyle = ceGrad(ctx, 0, 376, 0, 436, b[3]); ctx.fill();
    ceRRect(ctx, b[0] + 2.5, 378.5, 139, 55, 5); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke();
    ceShadow(ctx, 'rgba(0,0,0,.4)', 4, 2);
    ceText(ctx, String(b[2]), cx, 424, { size: 46, fill: '#fff', ls: -1 });
    ceNoShadow(ctx);
  });

  // Name bar + the other four stats.
  ceRRect(ctx, 14, 444, 296, 30, 6);
  ctx.fillStyle = ceGrad(ctx, 14, 0, 310, 0, [ceRgb(ceShade(c1, -0.3)), '#111827', ceRgb(ceShade(c1, -0.3))]); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = ceGrad(ctx, 14, 0, 310, 0, T.metal); ctx.stroke();
  ctx.fillStyle = T.acc; ctx.fillRect(22, 444, 280, 1.5);
  ceText(ctx, String(card.name || '').toUpperCase(), W / 2, 465, { size: 19, fill: '#fff', ls: 1, max: 270, min: 10 });
  ['frm', 'clu', 'exp', 'tro'].forEach(function(k, j){
    var x = 14 + j * 75, v = ceStatV(card, k);
    ceRRect(ctx, x, 480, 71, 20, 5); ctx.fillStyle = '#1f2937'; ctx.fill();
    ceText(ctx, CE_CODES[k], x + 8, 494, { size: 9, w: 800, fill: '#9ca3af', align: 'left', ls: 0.5 });
    ceText(ctx, String(v), x + 63, 494.5, { size: 12, fill: v >= 90 ? '#facc15' : '#fff', align: 'right' });
  });
}

// ---------------- 'legend' ----------------
function ceDrawLegend(ctx, o){
  var W = CE_W, H = CE_H, card = o.card, T = ceTm(o.tier), rnd = ceRng(card.name + '|legend'), i, g;
  ceRRect(ctx, 0, 0, W, H, 18);
  ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, T.foil); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(-1.05);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  for(i = -520; i < 520; i += 16) ctx.fillRect(i, -520, 5, 1040);
  ctx.restore();
  g = ctx.createLinearGradient(0, H * 0.5, W, H * 0.8);
  g.addColorStop(0, 'rgba(255,0,128,0)'); g.addColorStop(0.3, 'rgba(255,120,200,.14)'); g.addColorStop(0.5, 'rgba(120,200,255,.16)');
  g.addColorStop(0.7, 'rgba(160,255,160,.12)'); g.addColorStop(1, 'rgba(255,255,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ceHolo(ctx, 0, 0, W, H, T.holo);
  ctx.restore();
  ceRRect(ctx, 4, 4, W - 8, H - 8, 15); ctx.lineWidth = 1.5; ctx.strokeStyle = ceHexA(T.ink[0], 0.6); ctx.stroke();

  // Slanted photo panel.
  var PP = [[16, 16], [308, 16], [308, 258], [16, 300]];
  ctx.save();
  cePoly(ctx, PP);
  ceShadow(ctx, 'rgba(0,0,0,.4)', 10, 3);
  ctx.fillStyle = T.field[3]; ctx.fill();
  ceNoShadow(ctx);
  ctx.clip();
  g = ctx.createRadialGradient(W * 0.55, 110, 10, W * 0.55, 110, 260);
  g.addColorStop(0, T.field[1]); g.addColorStop(0.6, T.field[2]); g.addColorStop(1, T.field[3]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 310);
  ctx.fillStyle = '#fff';
  for(i = 0; i < 5; i++){
    var bx = 60 + rnd() * 200;
    ctx.globalAlpha = 0.06 + rnd() * 0.06;
    cePoly(ctx, [[bx - 8, 16], [bx + 8, 16], [bx + 60, 300], [bx - 60, 300]]); ctx.fill();
  }
  ctx.globalAlpha = 0.55;
  for(i = 0; i < 8; i++){ var a = i / 8 * Math.PI * 2 - Math.PI / 2; ceStar(ctx, 276 + Math.cos(a) * 15, 50 + Math.sin(a) * 15, 4); ctx.fill(); }
  ctx.globalAlpha = 1;
  ceArt(ctx, o, o.alpha ? { x: 40, y: 22, w: 260, h: 290 } : { x: 16, y: 16, w: 292, h: 286 }, { from: o.alpha ? 0.86 : 1 }, T.metal[2]);
  ctx.restore();
  cePoly(ctx, PP);
  ctx.lineWidth = 3; ctx.strokeStyle = ceGrad(ctx, 0, 0, W, 300, T.metal); ctx.stroke();
  cePoly(ctx, [[20, 20], [304, 20], [304, 255], [20, 296]]);
  ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
  if(o.rank){
    ctx.beginPath(); ctx.arc(40, 40, 15, 0, Math.PI * 2);
    ceShadow(ctx, 'rgba(0,0,0,.45)', 5, 1.5);
    ctx.fillStyle = ceGrad(ctx, 25, 25, 55, 55, T.metal); ctx.fill(); ceNoShadow(ctx);
    ctx.lineWidth = 1; ctx.strokeStyle = T.ink[2]; ctx.stroke();
    ceText(ctx, '#' + o.rank, 40, 44.5, { size: 11, fill: T.dark, max: 26 });
  }
  ctx.save();
  ctx.translate(27, 180); ctx.rotate(-Math.PI / 2);
  ceShadow(ctx, 'rgba(0,0,0,.8)', 3, 0);
  ceText(ctx, String(card.name || '').toUpperCase() + '  \u00b7  ' + card.pos, 0, 3, { size: 8, w: 800, fill: 'rgba(255,255,255,.85)', ls: 2, max: 200 });
  ctx.restore();

  // Slanted name banner along the panel edge, tier tag above it.
  ctx.save();
  ctx.translate(W / 2, 284); ctx.rotate(Math.atan2(258 - 300, 292));
  cePoly(ctx, [[-150, -40], [-40, -40], [-46, -27], [-156, -27]]);
  ceShadow(ctx, 'rgba(0,0,0,.35)', 4, 1);
  ctx.fillStyle = ceGrad(ctx, -156, -40, -40, -27, T.metal); ctx.fill(); ceNoShadow(ctx);
  ceText(ctx, ceLabelOr(o, ceTierLabel(o.tier)), -98, -30.5, { size: 8.5, fill: T.dark, ls: 1.2, max: 100, min: 5 });
  cePoly(ctx, [[-176, -27], [176, -27], [170, 13], [-182, 13]]);
  ceShadow(ctx, 'rgba(0,0,0,.5)', 8, 3);
  ctx.fillStyle = ceGrad(ctx, 0, -27, 0, 13, T.base); ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 1.5; ctx.strokeStyle = ceGrad(ctx, -170, 0, 170, 0, T.metal); ctx.stroke();
  ceText(ctx, String(card.name || '').toUpperCase(), 0, 2.5, { size: 26, fill: ceGrad(ctx, 0, -18, 0, 4, [T.lite, T.acc]), ls: 1, max: 290, min: 11 });
  ctx.restore();

  // Rating block.
  ceShadow(ctx, 'rgba(255,255,255,.6)', 0, 1);
  ceText(ctx, String(card.ovr), 78, 372, { size: 48, fill: ceGrad(ctx, 0, 336, 0, 372, [T.ink[0], T.ink[1]]), ls: -1.5 });
  ceText(ctx, card.pos, 78, 393, { size: 15, fill: T.ink[2], ls: 1.5 });
  ceNoShadow(ctx);
  ceText(ctx, 'ELO ' + card.elo, 78, 409, { size: 8.5, w: 800, fill: T.ink[3], ls: 1 });

  // Stat bars (the four not shown in the big boxes).
  var cols = ['#4338ca', '#7e22ce', '#be185d', '#c2410c'];
  ['frm', 'clu', 'exp', 'tro'].forEach(function(k, j){
    var y = 310 + j * 23, x0 = 150, x1 = 312, v = ceStatV(card, k);
    var lab = ((card.stats || []).filter(function(s){ return s.k === k; })[0] || {}).label || CE_CODES[k];
    cePoly(ctx, [[x0 + 7, y], [x1, y], [x1 - 7, y + 19], [x0, y + 19]]);
    ceShadow(ctx, 'rgba(0,0,0,.3)', 3, 1);
    ctx.fillStyle = ceGrad(ctx, x0, 0, x1, 0, [cols[j], 'rgba(20,16,32,.9)']); ctx.fill();
    ceNoShadow(ctx);
    ceText(ctx, lab, x0 + 14, y + 13, { size: 8.5, w: 800, fill: '#fff', align: 'left', ls: 0.6, max: 100, min: 6 });
    ceText(ctx, String(v), x1 - 14, y + 14, { size: 13, fill: v >= 90 ? '#fde047' : '#fff', align: 'right' });
  });

  // DEF / ATT boxes with the club crest between them.
  [[[[14, 418], [152, 418], [142, 470], [14, 470]], 80, crL('PHÒNG THỦ', 'DEFENCE'), ceStatV(card, 'def'), ['#1e40af', '#0f172a']],
   [[[172, 418], [310, 418], [310, 470], [182, 470]], 244, crL('TẤN CÔNG', 'ATTACK'), ceStatV(card, 'att'), ['#e11d48', '#881337']]].forEach(function(b){
    cePoly(ctx, b[0]);
    ceShadow(ctx, 'rgba(0,0,0,.35)', 5, 2);
    ctx.fillStyle = ceGrad(ctx, 0, 418, 0, 470, b[4]); ctx.fill(); ceNoShadow(ctx);
    ctx.lineWidth = 1.2; ctx.strokeStyle = ceGrad(ctx, 0, 418, 324, 470, T.metal); ctx.stroke();
    ceText(ctx, b[2], b[1], 431, { size: 8.5, w: 800, fill: 'rgba(255,255,255,.9)', ls: 1.2, max: 110 });
    ceShadow(ctx, 'rgba(0,0,0,.4)', 3, 1.5);
    ceText(ctx, String(b[3]), b[1], 464, { size: 30, fill: '#fff', ls: -0.5 });
    ceNoShadow(ctx);
  });
  ceLogoDisc(ctx, o.logo, W / 2, 444, 18, T.acc);

  // Footer.
  ceMedalStars(ctx, card.medalList, W / 2, 485, 250, 5.5);
  ceText(ctx, 'MARVELL PES CLUB  \u00b7  ' + card.P + crL(' TRẬN', ' MATCHES'), W / 2, 504, { size: 7.5, w: 800, fill: T.ink[3], ls: 1.5, max: 260 });
}

// ---------------- Shared helpers of the newer designs ----------------
// Photo into box; with the photo turned off (o.noAv) a big club crest takes its place.
function ceArt(ctx, o, box, fade, ring){
  if(o.img){ ceDrawAvatar(ctx, o.img, o.av, box, fade); return; }
  if(!o.noAv) return;
  var r = Math.min(box.w, box.h) * 0.27, cx = box.x + box.w / 2, cy = box.y + box.h * 0.45;
  var g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.1);
  g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(box.x, box.y, box.w, box.h);
  ceLogoDisc(ctx, o.logo, cx, cy, r, ring || '#fff');
  if(!o.logo){
    var ini = String(o.card.name || '?').split(/\s+/).map(function(w){ return w.charAt(0); }).join('').slice(0, 3).toUpperCase();
    ceText(ctx, ini, cx, cy + r * 0.32, { size: r * 0.9, fill: '#334155', max: r * 1.6 });
  }
}
function cePosRole(pos){
  return pos === 'CB' ? crL('HẬU VỆ', 'DEFENDER') : pos === 'CDM' || pos === 'CAM' ? crL('TIỀN VỆ', 'MIDFIELDER') : crL('TIỀN ĐẠO', 'FORWARD');
}
// Position on a vertical pitch (attack at the top): [x, y] fractions.
function cePosXY(pos){
  return { ST: [0.5, 0.12], CF: [0.5, 0.22], LW: [0.2, 0.2], CAM: [0.5, 0.36], CDM: [0.5, 0.6], CB: [0.5, 0.84] }[pos] || [0.5, 0.5];
}
// Card body of the newer designs: thick tier-metal frame + light tier foil (shiny stripes for icon / gold / silver,
// matte bronze, rainbow icon), so ICON / GOLD / SILVER / BRONZE read at a glance.
function ceTierBase(ctx, T){
  var W = CE_W, H = CE_H, i;
  ceRRect(ctx, 0, 0, W, H, 18);
  ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, T.metal); ctx.fill();
  ctx.save();
  ceRRect(ctx, 6, 6, W - 12, H - 12, 13); ctx.clip();
  ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, T.foil.slice(0, 4)); ctx.fillRect(0, 0, W, H);
  if(T.twinkle){
    ctx.globalAlpha = 0.28; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
    for(i = -H; i < W; i += 17){ ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  ceHolo(ctx, 0, 0, W, H, T.holo);
  ctx.restore();
  ceRRect(ctx, 6, 6, W - 12, H - 12, 13);
  ctx.lineWidth = 1.2; ctx.strokeStyle = T.metal[5]; ctx.stroke();
}
// Recolours a panel toward the tier metal (gold keeps the club colours), as in 'attax'.
function ceTierTint(ctx, tier, x, y, w, h){
  var t = { icon: ['#9333ea', 0.72], silver: ['#94a3b8', 0.9], bronze: ['#b45309', 0.8] }[tier];
  if(!t) return;
  ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = t[1];
  ctx.fillStyle = t[0]; ctx.fillRect(x, y, w, h); ctx.restore();
}
// Tier sparkles (none for bronze).
function ceSparkles(ctx, rnd, T, x, y, w, h){
  for(var i = 0; i < T.twinkle; i++) ceTwinkle(ctx, x + rnd() * w, y + rnd() * h, 3 + rnd() * 6);
}
// Metal outline of a path already built.
function ceMetalLine(ctx, T, x0, y0, x1, y1, lw){
  ctx.lineWidth = lw || 2; ctx.strokeStyle = ceGrad(ctx, x0, y0, x1, y1, T.metal); ctx.stroke();
}

// ---------------- 'allround' (Match Attax 20/21: white frame, shards, stat ladder) ----------------
function ceDrawAllround(ctx, o){
  var W = CE_W, H = CE_H, card = o.card, T = ceTm(o.tier), rnd = ceRng(card.name + '|allround'), c1 = o.team.c1, i, g;
  var dark = ceRgb(ceShade(c1, -0.55)), mid = ceRgb(c1), lite = ceRgb(ceShade(c1, 0.62));
  ceTierBase(ctx, T);

  // Art: white -> club tint, shards around the player, halftone patch.
  var P = { x: 12, y: 12, w: 300, h: 378 };
  ctx.save();
  ceRRect(ctx, P.x, P.y, P.w, P.h, 8); ctx.clip();
  g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, lite);
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
  var fx = 190, fy = 175;
  for(i = 0; i < 28; i++){
    var a = rnd() * Math.PI * 2, r1 = 55 + rnd() * 90, r2 = r1 + 90 + rnd() * 230, da = 0.05 + rnd() * 0.14, q = rnd();
    cePoly(ctx, [[fx + Math.cos(a) * r1, fy + Math.sin(a) * r1], [fx + Math.cos(a - da) * r2, fy + Math.sin(a - da) * r2], [fx + Math.cos(a + da) * r2, fy + Math.sin(a + da) * r2]]);
    ctx.globalAlpha = 0.55 + rnd() * 0.4;
    ctx.fillStyle = q < 0.4 ? dark : q < 0.65 ? mid : q < 0.85 ? lite : '#ffffff';
    ctx.fill();
  }
  ctx.fillStyle = dark;
  for(var hy = 20; hy < 210; hy += 6) for(var hx = 130; hx < 312; hx += 6){
    var dd = Math.sqrt((hx - 262) * (hx - 262) + (hy - 72) * (hy - 72)) / 120;
    if(dd >= 1) continue;
    ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(hx, hy, 1.7 * (1 - dd), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ceTierTint(ctx, o.tier, P.x, P.y, P.w, P.h);
  ceHolo(ctx, P.x, P.y, P.w, P.h, T.holo * 1.4);
  ceSparkles(ctx, rnd, T, 80, 30, 220, 300);
  ceArt(ctx, o, o.img ? (o.alpha ? { x: 52, y: 22, w: 260, h: 368 } : P) : { x: 50, y: 24, w: 210, h: 300 }, o.alpha ? null : { from: 0.88 }, mid);
  // Vertical name banner.
  cePoly(ctx, [[12, 12], [64, 12], [64, 226], [12, 252]]);
  ceShadow(ctx, 'rgba(0,0,0,.35)', 6, 0);
  ctx.fillStyle = ceGrad(ctx, 0, 12, 0, 252, T.base); ctx.fill(); ceNoShadow(ctx);
  ctx.fillStyle = ceGrad(ctx, 0, 12, 0, 226, T.metal); ctx.fillRect(64, 12, 3, 214);
  ctx.save();
  ctx.translate(38, 120); ctx.rotate(-Math.PI / 2);
  ceText(ctx, 'MARVELL PES', 0, -8, { size: 8, w: 700, fill: T.acc, ls: 2, max: 190 });
  ceText(ctx, String(card.name || '').toUpperCase(), 0, 15, { size: 24, fill: T.lite, ls: 0.5, max: 196, min: 9 });
  ctx.restore();
  ctx.restore();
  ceRRect(ctx, P.x, P.y, P.w, P.h, 8); ceMetalLine(ctx, T, P.x, P.y, P.x + P.w, P.y + P.h, 2.5);

  // Rating badge.
  ctx.beginPath(); ctx.arc(282, 44, 22, 0, Math.PI * 2);
  ceShadow(ctx, 'rgba(0,0,0,.35)', 5, 1.5); ctx.fillStyle = ceGrad(ctx, 260, 22, 304, 66, T.metal); ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  ceText(ctx, String(card.ovr), 282, 52, { size: 21, fill: T.dark, ls: -0.5 });
  ceText(ctx, card.pos, 282, 61.5, { size: 6.5, w: 800, fill: T.dark, ls: 0.5 });

  // Coloured stat ladder.
  var cols = ['#ec4899', '#a855f7', '#14b8a6', '#f97316', '#e11d48', '#334155'];
  (card.stats || []).slice(0, 6).forEach(function(s, j){
    var y = 206 + j * 21, xl = 196 + j * 3;
    cePoly(ctx, [[xl + 6, y], [266, y], [262, y + 17], [xl, y + 17]]);
    ceShadow(ctx, 'rgba(0,0,0,.3)', 3, 1); ctx.fillStyle = cols[j]; ctx.fill(); ceNoShadow(ctx);
    ceText(ctx, s.label, 258, y + 12, { size: 8, w: 800, fill: '#fff', align: 'right', ls: 0.4, max: 54, min: 4.5 });
    cePoly(ctx, [[268, y], [310, y], [306, y + 17], [264, y + 17]]);
    ceShadow(ctx, 'rgba(0,0,0,.3)', 3, 1); ctx.fillStyle = '#fff'; ctx.fill(); ceNoShadow(ctx);
    ceText(ctx, String(s.v), 287, y + 13, { size: 12, fill: s.v >= 90 ? '#b45309' : '#0f172a' });
  });

  // Big title band (tier / custom label) in the tier metal.
  cePoly(ctx, [[14, 340], [262, 340], [252, 380], [14, 380]]);
  ceShadow(ctx, 'rgba(0,0,0,.4)', 6, 2); ctx.fillStyle = ceGrad(ctx, 14, 340, 262, 380, T.metal); ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 1.5; ctx.strokeStyle = T.metal[5]; ctx.stroke();
  cePoly(ctx, [[14, 340], [30, 340], [22, 380], [14, 380]]); ctx.fillStyle = ceGrad(ctx, 0, 340, 0, 380, T.base); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(30, 342, 226, 2);
  ceShadow(ctx, 'rgba(255,255,255,.6)', 2, 1);
  ceText(ctx, ceLabelOr(o, ceTierLabel(o.tier)), 36, 371, { size: 27, w: 'italic 900', fill: T.dark, align: 'left', ls: 0.5, max: 210, min: 9 });
  ceNoShadow(ctx);

  // DEF / ATT with the crest between them.
  [[[[16, 396], [128, 396], [124, 410], [16, 410]], [[16, 410], [124, 410], [114, 466], [16, 466]], 66, crL('PHÒNG THỦ', 'DEFENCE'), ceStatV(card, 'def'), ['#67e8f9', '#0891b2']],
   [[[196, 396], [308, 396], [308, 410], [200, 410]], [[200, 410], [308, 410], [308, 466], [210, 466]], 258, crL('TẤN CÔNG', 'ATTACK'), ceStatV(card, 'att'), ['#f9a8d4', '#db2777']]].forEach(function(b){
    cePoly(ctx, b[0]); ctx.fillStyle = ceGrad(ctx, 0, 396, 0, 410, b[5]); ctx.fill();
    ceText(ctx, b[3], b[2], 406.5, { size: 8.5, w: 900, fill: '#0f172a', ls: 1, max: 96 });
    cePoly(ctx, b[1]);
    ceShadow(ctx, 'rgba(0,0,0,.35)', 5, 2); ctx.fillStyle = ceGrad(ctx, 0, 410, 0, 466, T.base); ctx.fill(); ceNoShadow(ctx);
    ceMetalLine(ctx, T, 0, 410, 0, 466, 1.5);
    ceText(ctx, String(b[4]), b[2], 457, { size: 40, fill: T.lite, ls: -1 });
  });
  ctx.beginPath(); ctx.arc(W / 2, 434, 37, 0, Math.PI * 2);
  ceShadow(ctx, 'rgba(0,0,0,.35)', 6, 2); ctx.fillStyle = ceGrad(ctx, 125, 397, 199, 471, T.metal); ctx.fill(); ceNoShadow(ctx);
  ceLogoDisc(ctx, o.logo, W / 2, 434, 32, '#fff');

  // Footer.
  ceText(ctx, (o.rank ? '#' + o.rank + '  ' : '') + card.pos, 18, 490, { size: 11, fill: T.ink[1], align: 'left', max: 80 });
  ceText(ctx, 'MARVELL PES  \u00b7  ' + card.P + crL(' TRẬN', ' MATCHES'), 18, 502, { size: 6, w: 700, fill: T.ink[0], align: 'left', ls: 0.5, max: 92 });
  ceMedalStars(ctx, card.medalList, W / 2, 492, 104, 4.6);
  ceRRect(ctx, 236, 478, 72, 26, 5); ctx.fillStyle = ceGrad(ctx, 0, 478, 0, 504, T.base); ctx.fill();
  ceMetalLine(ctx, T, 236, 0, 308, 0, 1.5);
  ceText(ctx, 'ELO ' + card.elo, 272, 495.5, { size: 12, fill: T.lite, max: 64 });
}

// ---------------- 'adrenalyn' (Panini Adrenalyn XL: geometric photo, white name panel, position panel) ----------------
function ceDrawAdrenalyn(ctx, o){
  var W = CE_W, H = CE_H, card = o.card, T = ceTm(o.tier), rnd = ceRng(card.name + '|adrenalyn'), c1 = o.team.c1, i, g;
  var navy = ceRgb(ceShade(c1, -0.62)), PC = { CB: ['#f472b6', '#be185d'], CDM: ['#34d399', '#047857'], CAM: ['#34d399', '#047857'] }[card.pos] || ['#60a5fa', '#1d4ed8'];
  ceTierBase(ctx, T);

  // Photo panel with a slanted bottom edge: tier-foil stripes + club blocks with metal edges.
  ctx.save();
  ceRRect(ctx, 12, 12, 300, 390, 10); ctx.clip();
  cePoly(ctx, [[0, 0], [W, 0], [W, 350], [0, 392]]); ctx.clip();
  ctx.fillStyle = T.foil[1]; ctx.fillRect(12, 12, 300, 390);
  for(i = 0; i < 6; i++){
    var bx = -190 + i * 86;
    cePoly(ctx, [[bx, 402], [bx + 46, 402], [bx + 46 + 330, 12], [bx + 330, 12]]);
    ctx.fillStyle = i % 2 ? T.foil[0] : T.foil[2]; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
    for(var s = -420; s < 420; s += 4.5){ ctx.beginPath(); ctx.moveTo(s, 402); ctx.lineTo(s + 330, 12); ctx.stroke(); }
    ctx.restore();
  }
  ctx.fillStyle = navy;
  [[[150, 12], [312, 12], [312, 236]], [[12, 250], [12, 402], [128, 402]], [[196, 402], [312, 262], [312, 318], [244, 402]]].forEach(function(pts){
    cePoly(ctx, pts); ctx.fillStyle = navy; ctx.fill(); ceMetalLine(ctx, T, 12, 12, 312, 402, 3);
  });
  ceHolo(ctx, 12, 12, 300, 390, T.holo * 1.3);
  ceSparkles(ctx, rnd, T, 30, 30, 270, 300);
  ceArt(ctx, o, o.alpha ? { x: 30, y: 26, w: 270, h: 370 } : { x: 12, y: 12, w: 300, h: 390 }, null, navy);
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(12, 392); ctx.lineTo(312, 350); ceMetalLine(ctx, T, 12, 392, 312, 350, 3);
  ceLogoDisc(ctx, o.logo, 44, 46, 22, '#fff');
  ceRRect(ctx, 244, 20, 60, 18, 3);
  ceShadow(ctx, 'rgba(0,0,0,.3)', 3, 1); ctx.fillStyle = navy; ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.stroke();
  ceText(ctx, 'PES', 274, 33.5, { size: 11, w: 'italic 900', fill: '#fff', ls: 2 });
  if(o.rank){
    ceShadow(ctx, 'rgba(0,0,0,.7)', 3, 1);
    ceText(ctx, '#' + o.rank, 302, 52, { size: 9, fill: '#fff', align: 'right' });
    ceNoShadow(ctx);
  }

  // Position panel: tier flag, mini pitch, role.
  ceRRect(ctx, 244, 340, 68, 164, 8);
  ceShadow(ctx, 'rgba(0,0,0,.3)', 6, 2); ctx.fillStyle = ceGrad(ctx, 0, 340, 0, 504, PC); ctx.fill(); ceNoShadow(ctx);
  ceMetalLine(ctx, T, 244, 340, 312, 504, 2.5);
  ceRRect(ctx, 250, 348, 56, 34, 3); ctx.fillStyle = ceGrad(ctx, 250, 348, 306, 382, T.metal); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.stroke();
  ceText(ctx, ceLabelOr(o, o.tier.toUpperCase()), 278, 369.5, { size: 10, fill: T.dark, ls: 0.8, max: 50, min: 4 });
  var px = 257, py = 390, pw = 42, ph = 58, xy = cePosXY(card.pos);
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(px, py + ph * Math.max(0, Math.min(0.7, xy[1] - 0.15)), pw, ph * 0.3);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(px, py, pw, ph);
  ctx.beginPath(); ctx.moveTo(px, py + ph / 2); ctx.lineTo(px + pw, py + ph / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(px + pw / 2, py + ph / 2, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(px + pw * 0.25, py, pw * 0.5, ph * 0.16);
  ctx.strokeRect(px + pw * 0.25, py + ph * 0.84, pw * 0.5, ph * 0.16);
  ctx.beginPath(); ctx.arc(px + pw * xy[0], py + ph * xy[1], 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ceText(ctx, cePosRole(card.pos), 278, 466, { size: 8.5, fill: '#fff', ls: 0.5, max: 60, min: 5 });
  ceText(ctx, card.pos, 278, 490, { size: 18, fill: '#fff', ls: 1 });

  // Crest + name.
  ceLogoDisc(ctx, o.logo, 42, 414, 22, T.metal[2]);
  ceText(ctx, 'MARVELL PES CLUB', 74, 406, { size: 8, w: 700, fill: T.ink[0], align: 'left', ls: 1, max: 160 });
  ceText(ctx, String(card.name || '').toUpperCase(), 74, 430, { size: 22, fill: T.ink[1], align: 'left', max: 164, min: 9 });

  // DEF / CLU / ATT / TOTAL.
  var def = ceStatV(card, 'def'), clu = ceStatV(card, 'clu'), att = ceStatV(card, 'att');
  [['DEF', def, '#db2777', ['#f472b6', '#9d174d'], '#fff'], [CE_CODES.clu, clu, '#0d9488', ['#2dd4bf', '#0f766e'], '#fff'],
   ['ATT', att, '#16a34a', ['#4ade80', '#15803d'], '#fff'], [crL('TỔNG', 'TOTAL'), def + clu + att, '#6d28d9', ['#fef08a', '#facc15'], '#4c1d95']].forEach(function(b, j){
    var x = 16 + j * 56;
    ceText(ctx, b[0], x + 26, 450, { size: 8.5, fill: b[2], ls: 0.5, max: 50 });
    ceRRect(ctx, x, 454, 52, 30, 5);
    ceShadow(ctx, 'rgba(0,0,0,.25)', 3, 1); ctx.fillStyle = ceGrad(ctx, 0, 454, 0, 484, b[3]); ctx.fill(); ceNoShadow(ctx);
    ctx.lineWidth = 1.2; ctx.strokeStyle = b[2]; ctx.stroke();
    ceText(ctx, String(b[1]), x + 26, 476, { size: j === 3 ? 17 : 19, fill: b[4], max: 46 });
  });

  // Footer: Elo badge + trophy stars.
  ceRRect(ctx, 16, 490, 90, 16, 4); ctx.fillStyle = ceGrad(ctx, 0, 490, 0, 506, T.base); ctx.fill();
  ceMetalLine(ctx, T, 16, 0, 106, 0, 1.2);
  ceText(ctx, 'ELO ' + card.elo, 61, 501.5, { size: 9, fill: T.lite, ls: 0.6, max: 84 });
  ceMedalStars(ctx, card.medalList, 174, 498, 124, 4.4);
}

// ---------------- 'ucl' (Topps Match Attax Champions: starball night, white info band) ----------------
function ceDrawUcl(ctx, o){
  var W = CE_W, H = CE_H, card = o.card, T = ceTm(o.tier), rnd = ceRng(card.name + '|ucl'), i, g, a;
  ceTierBase(ctx, T);

  ctx.save();
  ceRRect(ctx, 10, 10, 304, 496, 13); ctx.clip();
  g = ctx.createRadialGradient(200, 160, 10, 200, 160, 430);
  g.addColorStop(0, T.field[0]); g.addColorStop(0.3, T.field[1]); g.addColorStop(0.7, T.field[2]); g.addColorStop(1, T.field[3]);
  ctx.fillStyle = g; ctx.fillRect(10, 10, 304, 496);
  // Starball: ring of stars + orbit lines.
  var sx = 196, sy = 172;
  ctx.strokeStyle = T.beam;
  ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
  for(i = 0; i < 7; i++){ ctx.beginPath(); ctx.arc(sx, sy, 50 + i * 34, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 0.3; ctx.lineWidth = 2;
  ctx.strokeStyle = ceGrad(ctx, 40, 20, 320, 330, T.metal);
  for(i = 0; i < 8; i++){ a = i / 8 * Math.PI * 2 + 0.2; ceStar(ctx, sx + Math.cos(a) * 128, sy + Math.sin(a) * 128, 30); ctx.stroke(); }
  ceStar(ctx, sx, sy, 48); ctx.stroke();
  ctx.fillStyle = T.beam;
  for(i = 0; i < 40 + T.dust; i++){
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.beginPath(); ctx.arc(10 + rnd() * 304, 10 + rnd() * 380, 0.3 + rnd() * 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ceHolo(ctx, 10, 10, 304, 400, T.holo * 1.3);
  ceSparkles(ctx, rnd, T, 30, 30, 270, 320);
  ceArt(ctx, o, o.alpha ? { x: 24, y: 40, w: 280, h: 356 } : { x: 10, y: 10, w: 304, h: 392 }, { from: 0.8 }, T.acc);
  g = ctx.createLinearGradient(0, 320, 0, 410);
  g.addColorStop(0, ceHexA(T.field[3], 0)); g.addColorStop(1, ceHexA(T.field[3], 0.85));
  ctx.fillStyle = g; ctx.fillRect(10, 320, 304, 186);
  ctx.restore();
  ceRRect(ctx, 10, 10, 304, 496, 13); ceMetalLine(ctx, T, 10, 10, 314, 506, 3);

  // Crest, brand, rank.
  ceLogoDisc(ctx, o.logo, 40, 42, 19, '#fff');
  ceRRect(ctx, 250, 22, 54, 20, 10);
  ceShadow(ctx, 'rgba(0,0,0,.35)', 4, 1); ctx.fillStyle = '#fff'; ctx.fill(); ceNoShadow(ctx);
  ceText(ctx, 'PES', 277, 36.5, { size: 12, w: 'italic 900', fill: T.field[2], ls: 1 });
  if(o.rank){
    ceRRect(ctx, 280, 50, 24, 16, 3); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
    ceText(ctx, String(o.rank), 292, 61.5, { size: 9, fill: '#0b1d51', max: 20 });
  }
  var n = Math.min((card.medalList || []).length, 30);
  if(n){
    var sw = Math.min(200, n * 12.4) + 16;
    ceRRect(ctx, W / 2 - sw / 2, 370, sw, 18, 9); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
    ceMedalStars(ctx, card.medalList, W / 2, 379.5, sw - 16, 5.5);
  }

  // Info band in the light tier foil.
  ceRRect(ctx, 18, 396, 288, 104, 10);
  ceShadow(ctx, 'rgba(0,0,0,.45)', 8, 2); ctx.fillStyle = ceGrad(ctx, 18, 396, 306, 500, T.foil.slice(0, 4)); ctx.fill(); ceNoShadow(ctx);
  ceMetalLine(ctx, T, 18, 396, 306, 500, 2);
  ceRRect(ctx, 26, 404, 42, 44, 6); ctx.fillStyle = ceGrad(ctx, 0, 404, 0, 448, T.base); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = ceGrad(ctx, 26, 404, 68, 448, T.metal); ctx.stroke();
  ceText(ctx, card.pos, 47, 430, { size: 15, fill: '#fff', max: 36 });
  ceText(ctx, ceLabelOr(o, o.tier.toUpperCase()), 47, 442, { size: 6, w: 800, fill: T.acc, ls: 0.4, max: 38, min: 3.5 });
  ctx.fillStyle = ceHexA(T.ink[0], 0.3); ctx.fillRect(76, 408, 1, 36); ctx.fillRect(140, 408, 1, 36); ctx.fillRect(222, 408, 1, 36);
  ceText(ctx, crL('CHỈ SỐ', 'RATING'), 108, 414, { size: 6, w: 800, fill: T.ink[0], ls: 0.6, max: 58 });
  ceText(ctx, String(card.ovr), 108, 444, { size: 30, fill: T.ink[1], ls: -1 });
  [['ATT', ceStatV(card, 'att'), '#e11d48', 420], ['DEF', ceStatV(card, 'def'), '#2563eb', 440]].forEach(function(b){
    ceText(ctx, b[0], 148, b[3], { size: 7.5, w: 800, fill: T.ink[0], align: 'left', ls: 0.5 });
    ceText(ctx, String(b[1]), 214, b[3] + 0.5, { size: 13, fill: T.ink[1], align: 'right' });
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(148, b[3] + 3, 66, 2.5);
    ctx.fillStyle = b[2]; ctx.fillRect(148, b[3] + 3, 66 * Math.max(0, Math.min(1, (b[1] - 40) / 59)), 2.5);
  });
  ctx.beginPath(); ctx.arc(238, 426, 10, 0, Math.PI * 2);
  ctx.fillStyle = ceGrad(ctx, 228, 416, 248, 436, T.metal); ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = T.metal[5]; ctx.stroke();
  ceStar(ctx, 238, 426, 5); ctx.fillStyle = T.metal[5]; ctx.fill();
  ceText(ctx, 'ELO', 252, 418, { size: 6, w: 800, fill: T.ink[0], align: 'left', ls: 0.6 });
  ceText(ctx, String(card.elo), 252, 436, { size: 15, fill: T.ink[1], align: 'left', max: 48 });
  ceText(ctx, card.P + crL(' TRẬN', ' MATCHES'), 252, 445, { size: 5.5, w: 700, fill: T.ink[0], align: 'left', max: 48 });
  ceRRect(ctx, 26, 454, 272, 38, 7);
  ctx.fillStyle = ceGrad(ctx, 0, 454, 0, 492, T.base); ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = ceGrad(ctx, 26, 0, 298, 0, T.metal); ctx.stroke();
  ceText(ctx, String(card.name || '').toUpperCase(), W / 2, 480, { size: 20, fill: '#fff', ls: 1, max: 250, min: 9 });
}

// ---------------- Card back (common to every card) ----------------
// Hand-drawn lettering: each glyph = [advance, strokes] on a grid of cap height 10 (stroke centre lines,
// chamfered corners), stroked in layers (shadow, rim, metal face, engraved inline).
var CE_GLYPH = {
  M: [6.5, [[[0, 10], [0, 0], [3.25, 6], [6.5, 0], [6.5, 10]]]],
  A: [6, [[[0, 10], [0, 2.5], [2.5, 0], [3.5, 0], [6, 2.5], [6, 10]], [[0, 6], [6, 6]]]],
  R: [6, [[[0, 10], [0, 0], [4.5, 0], [6, 1.5], [6, 3.5], [4.5, 5], [0, 5]], [[3.5, 5], [6, 7.5], [6, 10]]]],
  V: [6, [[[0, 0], [0, 5.5], [2.4, 10], [3.6, 10], [6, 5.5], [6, 0]]]],
  E: [5.5, [[[5.5, 0], [0, 0], [0, 10], [5.5, 10]], [[0, 5], [4, 5]]]],
  L: [5, [[[0, 0], [0, 10], [5, 10]]]],
  P: [6, [[[0, 10], [0, 0], [4.5, 0], [6, 1.5], [6, 4], [4.5, 5.5], [0, 5.5]]]],
  S: [6, [[[6, 0], [1.5, 0], [0, 1.5], [0, 3.5], [1.5, 5], [4.5, 5], [6, 6.5], [6, 8.5], [4.5, 10], [0, 10]]]],
  C: [6, [[[6, 0], [1.5, 0], [0, 1.5], [0, 8.5], [1.5, 10], [6, 10]]]],
  U: [6, [[[0, 0], [0, 8.5], [1.5, 10], [4.5, 10], [6, 8.5], [6, 0]]]],
  B: [6, [[[0, 0], [4, 0], [5.5, 1.5], [5.5, 3.5], [4, 5], [0, 5]], [[0, 0], [0, 10], [4.5, 10], [6, 8.5], [6, 6.5], [4.5, 5], [0, 5]]]],
  ' ': [1.5, []]
};
// Word centred on cx with its baseline at y; st = { sw (stroke), track, skew, face[], rim[], inline }.
function ceLogoWord(ctx, txt, cx, y, cap, st){
  var s = cap / 10, sw = st.sw || 2.1, tr = st.track == null ? 1.6 : st.track, k = st.skew == null ? 0.16 : st.skew;
  var chars = txt.split('').filter(function(c){ return CE_GLYPH[c]; }), wd = 0;
  chars.forEach(function(c, i){ wd += CE_GLYPH[c][0] + sw + (i < chars.length - 1 ? tr : 0); });
  ctx.save();
  ctx.translate(cx - k * cap / 2, y);
  ctx.transform(1, 0, -k, 1, 0, 0);
  ctx.beginPath();
  var x = -wd / 2 + sw / 2;
  chars.forEach(function(c){
    CE_GLYPH[c][1].forEach(function(ln){ ln.forEach(function(p, j){ ctx[j ? 'lineTo' : 'moveTo']((x + p[0]) * s, (p[1] - 10) * s); }); });
    x += CE_GLYPH[c][0] + sw + tr;
  });
  ctx.lineJoin = 'miter'; ctx.miterLimit = 2.5; ctx.lineCap = 'square';
  ceShadow(ctx, 'rgba(0,0,0,.8)', 9, 3);
  ctx.lineWidth = (sw + 1.9) * s; ctx.strokeStyle = '#03050c'; ctx.stroke();
  ceNoShadow(ctx);
  ctx.lineWidth = (sw + 0.9) * s; ctx.strokeStyle = ceGrad(ctx, 0, -cap, 0, 0, st.rim); ctx.stroke();
  ctx.lineWidth = sw * s; ctx.strokeStyle = ceGrad(ctx, 0, -cap, 0, 0, st.face); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.lineWidth = 0.3 * s; ctx.strokeStyle = st.inline || 'rgba(8,12,32,.8)'; ctx.stroke();
  ctx.restore();
  return wd * s;
}
var CE_PS = { tri: '#3fd9a8', cir: '#f2546b', x: '#6aa6ff', sq: '#e57fd0' };
function cePsPath(ctx, k, cx, cy, s){
  ctx.beginPath();
  if(k === 'tri'){ ctx.moveTo(cx, cy - s * 1.02); ctx.lineTo(cx + s * 0.95, cy + s * 0.62); ctx.lineTo(cx - s * 0.95, cy + s * 0.62); ctx.closePath(); }
  else if(k === 'cir') ctx.arc(cx, cy, s * 0.86, 0, Math.PI * 2);
  else if(k === 'x'){ var d = s * 0.78; ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); }
  else ctx.rect(cx - s * 0.76, cy - s * 0.76, s * 1.52, s * 1.52);
}
// PlayStation symbol, glowing in its colour.
function cePsSym(ctx, k, cx, cy, s, lw, glow, col){
  cePsPath(ctx, k, cx, cy, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if(glow) ceShadow(ctx, col || CE_PS[k], glow, 0);
  ctx.lineWidth = lw; ctx.strokeStyle = col || CE_PS[k]; ctx.stroke();
  ceNoShadow(ctx);
}

// Card-back logo image (put by the club in logos/, any plain background or transparent), loaded on first use and
// turned into a mask: alpha = distance from the background colour (or the PNG alpha), so it can be finished in metal.
// A page opened from file:// can't read the pixels back (tainted canvas): then cePsLogoFlat is used instead.
var CE_PS_LOGO = { state: 0, img: null, mask: null, box: null, tint: null };
function cePsLogoLoad(){
  if(CE_PS_LOGO.state) return;
  CE_PS_LOGO.state = 1;
  var srcs = ['logos/Playstation_icon.png', 'logos/playstation.png', 'logos/playstation.jpg', 'logos/playstation.svg'];
  (function next(i){
    if(i >= srcs.length){ CE_PS_LOGO.state = 2; return; }
    var im = new Image();
    im.onload = function(){
      CE_PS_LOGO.img = im;
      try { cePsMask(im); } catch(e){ console.warn('Card back logo (no pixel access, flat finish):', e); }
      CE_PS_LOGO.state = 2;
      var d = document.getElementById('cardExportDialog');
      if(d && d.open && typeof ceRender === 'function') ceRender();
    };
    im.onerror = function(){ next(i + 1); };
    im.src = srcs[i];
  })(0);
}
// The source logo is small (~200 px): its coverage (0..1) is computed at the native size, upscaled in steps with
// high-quality smoothing + a slight blur (smooth curves, no staircase), then cut with a steep threshold at 1200 px,
// so the edges stay razor sharp at 300 DPI instead of a blurry upscale.
var CE_PS_MASK_PX = 1200, CE_PS_MASK_PAD = 40;
function cePsMask(im){
  var w = im.naturalWidth || 500, h = im.naturalHeight || 500;
  var c = document.createElement('canvas'), x = c.getContext('2d'), i;
  c.width = w; c.height = h;
  x.drawImage(im, 0, 0, w, h);
  var id = x.getImageData(0, 0, w, h), d = id.data, n = d.length;
  var cs = [0, (w - 1) * 4, (h - 1) * w * 4, (h * w - 1) * 4], bg = [0, 0, 0, 0];
  cs.forEach(function(o){ for(var k = 0; k < 4; k++) bg[k] += d[o + k] / 4; });
  var useA = bg[3] < 128, dist = new Float32Array(n / 4), mx = 0;
  for(i = 0; i < n; i += 4){
    var v = useA ? d[i + 3] : Math.sqrt((d[i] - bg[0]) * (d[i] - bg[0]) + (d[i + 1] - bg[1]) * (d[i + 1] - bg[1]) + (d[i + 2] - bg[2]) * (d[i + 2] - bg[2]));
    dist[i / 4] = v; if(v > mx) mx = v;
  }
  if(mx < 40) return;
  for(i = 0; i < n; i += 4){ d[i] = d[i + 1] = d[i + 2] = Math.round(Math.min(1, dist[i / 4] / (useA ? 255 : mx)) * 255); d[i + 3] = 255; }
  x.putImageData(id, 0, 0);
  // Staged upscale (x2 per step); the last step adds a blur of ~0.45 source px.
  var sc = CE_PS_MASK_PX / Math.max(w, h), tw = Math.round(w * sc), th = Math.round(h * sc), src = c, cw = w;
  while(cw < tw){
    var nw = Math.min(tw, cw * 2), last = nw === tw, nc = document.createElement('canvas'), nx = nc.getContext('2d');
    nc.width = nw; nc.height = last ? th : Math.round(nw * h / w);
    nx.fillStyle = '#000'; nx.fillRect(0, 0, nc.width, nc.height);
    nx.imageSmoothingEnabled = true; nx.imageSmoothingQuality = 'high';
    if(last && 'filter' in nx) nx.filter = 'blur(' + (sc * 0.45).toFixed(2) + 'px)';
    nx.drawImage(src, 0, 0, nc.width, nc.height);
    nx.filter = 'none';
    src = nc; cw = nw;
  }
  var P = CE_PS_MASK_PAD, sx = src.getContext('2d'), hd = sx.getImageData(0, 0, src.width, src.height), q = hd.data, W = src.width, H = src.height;
  var x0 = W, y0 = H, x1 = -1, y1 = -1;
  for(i = 0; i < q.length; i += 4){
    var t = q[i] / 255, p = i / 4;
    t = t <= 0.42 ? 0 : t >= 0.58 ? 1 : (t - 0.42) / 0.16;
    t = t * t * (3 - 2 * t);
    q[i] = q[i + 1] = q[i + 2] = 255; q[i + 3] = Math.round(t * 255);
    if(t > 0.5){ var px = p % W, py = (p - px) / W; if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py; }
  }
  if(x1 < 0) return;
  var m = document.createElement('canvas');
  m.width = W + 2 * P; m.height = H + 2 * P;
  m.getContext('2d').putImageData(hd, P, P);
  CE_PS_LOGO.mask = m; CE_PS_LOGO.box = { x: x0 + P, y: y0 + P, w: x1 - x0 + 1, h: y1 - y0 + 1 }; CE_PS_LOGO.tint = null;
}
// Mask grown by r px (union of shifted copies on 3 rings), filled with `fill`.
function cePsGrow(m, r, fill, box){
  var c = document.createElement('canvas'), x = c.getContext('2d'), k, a;
  c.width = m.width; c.height = m.height;
  if(r > 0) [[1, 40], [0.66, 28], [0.33, 16]].forEach(function(ring){
    for(k = 0; k < ring[1]; k++){ a = k / ring[1] * Math.PI * 2; x.drawImage(m, Math.cos(a) * r * ring[0], Math.sin(a) * r * ring[0]); }
  });
  x.drawImage(m, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = typeof fill === 'string' ? fill : ceGrad(x, box.x, box.y, box.x + box.w, box.y + box.h, fill);
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
// No pixel access: filters turn the logo light-on-black (background -> black), multiplied by the metal gradient and
// screened onto the (dark) emblem, so only the logo shows.
function cePsLogoFlat(ctx, cx, cy, bw, bh, face){
  var im = CE_PS_LOGO.img, w = im.naturalWidth || 200, h = im.naturalHeight || 200, s = Math.min(bw / w, bh / h);
  var dw = w * s, dh = h * s, c = document.createElement('canvas'), x = c.getContext('2d');
  c.width = Math.max(1, Math.round(dw * CE_K)); c.height = Math.max(1, Math.round(dh * CE_K));
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(im, 0, 0, c.width, c.height);
  if('filter' in x){
    var t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    var tx = t.getContext('2d'); tx.filter = 'grayscale(1) invert(1) contrast(3)'; tx.drawImage(c, 0, 0);
    x.clearRect(0, 0, c.width, c.height); x.drawImage(t, 0, 0);
  } else {
    x.globalCompositeOperation = 'difference'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height);
  }
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = ceGrad(x, 0, 0, c.width, c.height, face); x.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(c, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  return true;
}
// Draws the logo fitted in bw x bh around (cx, cy): glow, dark outline, metal rim, metal face. false = no logo yet.
// op: { glow (shadow colour, default blue), gold (gold face + chrome rim instead of chrome face + gold rim), face, rim (stops) }.
var CE_GOLD = ['#fff4cf', '#e9c46a', '#9c7631', '#f7e2a0', '#b88a3a'], CE_CHROME = ['#ffffff', '#e8ecf4', '#8f9ab3', '#ffffff', '#b4bdd0', '#eef1f7'];
function cePsLogo(ctx, cx, cy, bw, bh, op){
  cePsLogoLoad();
  op = op || {};
  var L = CE_PS_LOGO, m = L.mask, b = L.box;
  var face = op.face || (op.gold ? CE_GOLD : CE_CHROME), rim = op.rim || (op.gold ? CE_CHROME : CE_GOLD);
  if(!m) return L.img ? cePsLogoFlat(ctx, cx, cy, bw, bh, face) : false;
  var T = L.tint || (L.tint = {}), rk = 'r' + rim.join(), fk = 'f' + face.join();
  if(!T.dark) T.dark = cePsGrow(m, b.w * 0.019, '#05081a', b);
  if(!T[rk]) T[rk] = cePsGrow(m, b.w * 0.0095, rim, b);
  if(!T[fk]) T[fk] = cePsGrow(m, 0, face, b);
  var s = Math.min(bw / b.w, bh / b.h), dw = m.width * s, dh = m.height * s;
  var x0 = cx - (b.x + b.w / 2) * s, y0 = cy - (b.y + b.h / 2) * s;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ceShadow(ctx, op.glow || 'rgba(96,130,255,.6)', 10, 0);
  ctx.drawImage(T.dark, x0, y0, dw, dh);
  ceNoShadow(ctx);
  ctx.drawImage(T[rk], x0, y0, dw, dh);
  ctx.drawImage(T[fk], x0, y0, dw, dh);
  ctx.restore();
  return true;
}

// "MARVELL" (baseline y) over "PES CLUB" between two rules. st: { face1, rim1, face2, rim2, rule }.
function ceBackWordmark(ctx, y, st){
  st = st || {};
  var W = CE_W, rule = st.rule || '#e9c46a', rule0 = ceHexA(rule, 0);
  ceLogoWord(ctx, 'MARVELL', W / 2, y, 33, { face: st.face1 || CE_CHROME, rim: st.rim1 || CE_GOLD });
  var pw = ceLogoWord(ctx, 'PES CLUB', W / 2, y + 40, 21, { face: st.face2 || CE_GOLD, rim: st.rim2 || ['#ffffff', '#8792ab'], sw: 2.2, track: 1.7 });
  var lx0 = W / 2 - pw / 2 - 14, lx1 = W / 2 + pw / 2 + 12, ly = y + 29;
  [[34, lx0], [lx1, W - 34]].forEach(function(seg, n){
    ctx.fillStyle = ceGrad(ctx, seg[0], 0, seg[1], 0, n ? [rule, rule0] : [rule0, rule]);
    ctx.fillRect(seg[0], ly - 0.8, seg[1] - seg[0], 1.6);
    var dx = n ? seg[0] : seg[1];
    cePoly(ctx, [[dx, ly - 3.5], [dx + 3.5, ly], [dx, ly + 3.5], [dx - 3.5, ly]]); ctx.fillStyle = rule; ctx.fill();
  });
}

// Back 1 (navy): PlayStation-symbol wallpaper, dial ring around the logo, wordmark, symbol row.
function ceDrawBack(ctx, o){
  var W = CE_W, H = CE_H, rnd = ceRng('marvell-pes-back'), i, j, g, a;
  var GOLD = CE_GOLD, CHROME = CE_CHROME;
  var gun = ['#6b7489', '#1c2133', '#9aa3b8', '#262c40', '#b3bbcd', '#141826'];
  // Gunmetal frame + deep navy field.
  ceRRect(ctx, 0, 0, W, H, 18); ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, gun); ctx.fill();
  ctx.save();
  ceRRect(ctx, 7, 7, W - 14, H - 14, 13); ctx.clip();
  g = ctx.createRadialGradient(162, 190, 10, 162, 230, 360);
  g.addColorStop(0, '#24306a'); g.addColorStop(0.4, '#141c44'); g.addColorStop(0.75, '#0a0f27'); g.addColorStop(1, '#04060e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Faint PlayStation symbol wallpaper.
  var ks = ['tri', 'cir', 'x', 'sq'];
  ctx.globalAlpha = 0.11;
  for(j = 0; j * 24 < H + 24; j++) for(i = 0; i * 24 < W + 24; i++){
    cePsSym(ctx, ks[(i + j * 3) % 4], i * 24 + (j % 2) * 12, j * 24 + 6, 4.2, 0.9, 0, '#c7d2fe');
  }
  ctx.globalAlpha = 1;
  // Soft light behind the emblem + diagonal sheen.
  g = ctx.createRadialGradient(162, 190, 0, 162, 190, 170);
  g.addColorStop(0, 'rgba(96,130,255,.38)'); g.addColorStop(1, 'rgba(96,130,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  g = ctx.createLinearGradient(0, 120, W, 40);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.fillStyle = '#fff';
  for(i = 0; i < 70; i++){
    ctx.globalAlpha = 0.15 + rnd() * 0.5;
    ctx.beginPath(); ctx.arc(14 + rnd() * 296, 14 + rnd() * 488, 0.3 + rnd() * 0.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Vignette.
  g = ctx.createRadialGradient(162, 258, 150, 162, 258, 330);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ceRRect(ctx, 7, 7, W - 14, H - 14, 13); ctx.lineWidth = 1.2; ctx.strokeStyle = '#05070f'; ctx.stroke();
  ceRRect(ctx, 14, 14, W - 28, H - 28, 9); ctx.lineWidth = 0.8; ctx.strokeStyle = ceGrad(ctx, 0, 0, W, H, ['rgba(233,196,106,.55)', 'rgba(233,196,106,.15)', 'rgba(233,196,106,.55)']); ctx.stroke();
  // Corner brackets.
  ctx.strokeStyle = ceGrad(ctx, 0, 0, W, H, GOLD); ctx.lineWidth = 1.6; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  [[22, 22, 1, 1], [W - 22, 22, -1, 1], [22, H - 22, 1, -1], [W - 22, H - 22, -1, -1]].forEach(function(c){
    ctx.beginPath(); ctx.moveTo(c[0], c[1] + c[3] * 18); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + c[2] * 18, c[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c[0] + c[2] * 5, c[1] + c[3] * 9); ctx.lineTo(c[0] + c[2] * 5, c[1] + c[3] * 5); ctx.lineTo(c[0] + c[2] * 9, c[1] + c[3] * 5); ctx.stroke();
  });

  // Emblem: dial ring + the four buttons in controller layout.
  var ex = 162, ey = 190;
  ctx.beginPath(); ctx.arc(ex, ey, 104, 0, Math.PI * 2);
  ctx.lineWidth = 2.2; ctx.strokeStyle = ceGrad(ctx, ex - 104, ey - 104, ex + 104, ey + 104, GOLD); ctx.stroke();
  ctx.beginPath(); ctx.arc(ex, ey, 97, 0, Math.PI * 2);
  ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(233,196,106,.45)'; ctx.stroke();
  ctx.strokeStyle = 'rgba(223,229,240,.35)'; ctx.lineWidth = 0.8; ctx.lineCap = 'butt';
  for(i = 0; i < 48; i++){
    a = i / 48 * Math.PI * 2; var r0 = i % 4 ? 99.5 : 98;
    ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0); ctx.lineTo(ex + Math.cos(a) * 102, ey + Math.sin(a) * 102); ctx.stroke();
  }
  // Centre logo: PlayStation logo in chrome with a gold rim.
  cePsLogo(ctx, ex, ey + 2, 150, 126);

  // Logotype.
  ceBackWordmark(ctx, 352);
  ceText(ctx, 'FOOTBALL  \u00b7  FRIENDSHIP  \u00b7  GLORY', W / 2, 418, { size: 6.5, w: 700, fill: 'rgba(223,229,240,.6)', ls: 2.6, max: 230 });

  // Bottom: symbol row between rules.
  var by0 = 458;
  ctx.fillStyle = ceGrad(ctx, 60, 0, W - 60, 0, ['rgba(223,229,240,0)', 'rgba(223,229,240,.4)', 'rgba(223,229,240,0)']);
  ctx.fillRect(60, by0 - 16, W - 120, 0.8); ctx.fillRect(60, by0 + 16, W - 120, 0.8);
  ks.forEach(function(k, n){ cePsSym(ctx, k, W / 2 + (n - 1.5) * 26, by0 + (k === 'tri' ? 1 : 0), 6.5, 1.8, 6); });
  ceBackText(ctx, o && o.bt);
}

// Back 2 (carbon neon): carbon-fibre twill, diagonal blue/cyan light beams, honeycomb glow, neon hexagon badge.
function ceDrawBack2(ctx, o){
  var W = CE_W, H = CE_H, rnd = ceRng('marvell-pes-neon'), i, j, a, g, cx = W / 2, cy = 196, c = 6;
  var NEON = ['#e0fbff', '#67e8f9', '#22d3ee', '#2563eb', '#67e8f9'], CY = '#22d3ee';
  var hex = function(x, y, r){
    ctx.beginPath();
    for(var k = 0; k < 6; k++){ var t = Math.PI / 3 * k - Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(t) * r, y + Math.sin(t) * r); }
    ctx.closePath();
  };
  ceRRect(ctx, 0, 0, W, H, 18); ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, ['#5b6272', '#0d1016', '#a7afbf', '#151922', '#c9d0dc', '#090b10']); ctx.fill();
  ctx.save();
  ceRRect(ctx, 7, 7, W - 14, H - 14, 13); ctx.clip();
  ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, W, H);
  // 2/2 carbon twill: each cell has a highlight strip along its weave direction.
  for(j = 0; j * c < H; j++) for(i = 0; i * c < W; i++){
    var hz = (i + j) % 4 < 2, x = i * c, y = j * c;
    ctx.fillStyle = hz ? '#12151c' : '#0c0e13'; ctx.fillRect(x, y, c + 0.3, c + 0.3);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    if(hz) ctx.fillRect(x, y + 1.2, c, 1.4); else ctx.fillRect(x + 1.2, y, 1.4, c);
  }
  g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 270);
  g.addColorStop(0, 'rgba(37,99,235,.5)'); g.addColorStop(0.45, 'rgba(37,99,235,.14)'); g.addColorStop(1, 'rgba(37,99,235,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Diagonal light beams + thin neon lines.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(cx, H / 2); ctx.rotate(-0.42);
  [[-150, 46, '#2563eb', 0.3], [-62, 18, '#22d3ee', 0.2], [72, 60, '#1d4ed8', 0.26], [152, 14, '#67e8f9', 0.2]].forEach(function(b){
    g = ctx.createLinearGradient(0, b[0] - b[1] / 2, 0, b[0] + b[1] / 2);
    g.addColorStop(0, ceHexA(b[2], 0)); g.addColorStop(0.5, ceHexA(b[2], b[3])); g.addColorStop(1, ceHexA(b[2], 0));
    ctx.fillStyle = g; ctx.fillRect(-400, b[0] - b[1] / 2, 800, b[1]);
  });
  ceShadow(ctx, CY, 6, 0);
  [[-176, 0.5], [-168, 0.22], [-34, 0.18], [112, 0.45], [122, 0.25], [196, 0.4]].forEach(function(l){
    ctx.fillStyle = ceHexA('#67e8f9', l[1]); ctx.fillRect(-400, l[0], 800, 0.7);
  });
  ceNoShadow(ctx);
  ctx.restore();

  // Honeycomb, fading out from the badge.
  var hr = 11, hw = hr * Math.sqrt(3);
  ctx.lineWidth = 0.5;
  for(j = -1; j * hr * 1.5 < H + hr; j++) for(i = -1; i * hw < W + hw; i++){
    var hx = i * hw + (j % 2 ? hw / 2 : 0), hy = j * hr * 1.5, al = 0.22 * Math.max(0, 1 - Math.hypot(hx - cx, hy - cy) / 250);
    if(al < 0.01) continue;
    hex(hx, hy, hr * 0.9); ctx.strokeStyle = 'rgba(103,232,249,' + al.toFixed(3) + ')'; ctx.stroke();
  }
  for(i = 0; i < 70; i++){
    ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 0.3 + rnd() * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(165,243,252,' + (0.25 + rnd() * 0.5).toFixed(2) + ')'; ctx.fill();
  }
  g = ctx.createRadialGradient(cx, H / 2, 120, cx, H / 2, 330);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.65)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Neon frame + chamfered corner brackets.
  ceRRect(ctx, 7, 7, W - 14, H - 14, 13); ctx.lineWidth = 1.2; ctx.strokeStyle = '#03050a'; ctx.stroke();
  ceShadow(ctx, CY, 8, 0);
  ceRRect(ctx, 13, 13, W - 26, H - 26, 9); ctx.lineWidth = 0.9; ctx.strokeStyle = ceGrad(ctx, 0, 0, W, H, NEON); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#a5f3fc';
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function(s){
    var x0 = s[0] > 0 ? 20 : W - 20, y0 = s[1] > 0 ? 20 : H - 20;
    ctx.beginPath(); ctx.moveTo(x0, y0 + s[1] * 30); ctx.lineTo(x0, y0 + s[1] * 8); ctx.lineTo(x0 + s[0] * 8, y0); ctx.lineTo(x0 + s[0] * 30, y0); ctx.stroke();
  });

  // Hexagon badge with circuit traces from the side vertices.
  ceShadow(ctx, 'rgba(34,211,238,.85)', 10, 0);
  ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(103,232,249,.8)'; ctx.fillStyle = '#a5f3fc';
  [[1, -1], [1, 1], [-1, -1], [-1, 1]].forEach(function(s){
    var vx = cx + s[0] * 104 * Math.cos(Math.PI / 6), vy = cy + s[1] * 52, ex = vx + s[0] * 24, ey = vy + s[1] * 22;
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(ex, vy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, 2.2, 0, Math.PI * 2); ctx.fill();
  });
  hex(cx, cy, 110); ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(103,232,249,.45)'; ctx.stroke();
  hex(cx, cy, 104); ctx.fillStyle = '#04060c'; ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = ceGrad(ctx, cx - 104, cy - 104, cx + 104, cy + 104, NEON); ctx.stroke();
  ceNoShadow(ctx);
  hex(cx, cy, 92);
  g = ctx.createRadialGradient(cx, cy - 20, 6, cx, cy, 100);
  g.addColorStop(0, '#0d1b3d'); g.addColorStop(1, '#04060c');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(103,232,249,.35)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(103,232,249,.4)'; ctx.stroke();
  ctx.lineCap = 'butt';
  for(i = 0; i < 60; i++){
    a = i / 60 * Math.PI * 2; var r1 = i % 5 ? 71 : 74;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 68); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.strokeStyle = i % 5 ? 'rgba(103,232,249,.3)' : 'rgba(165,243,252,.75)'; ctx.stroke();
  }
  cePsLogo(ctx, cx, cy + 2, 104, 90, { glow: 'rgba(34,211,238,.8)', rim: NEON });

  // Logotype, tagline, symbol row.
  ceBackWordmark(ctx, 352, { face1: CE_CHROME, rim1: ['#a5f3fc', '#2563eb', '#67e8f9'], face2: NEON, rim2: ['#ffffff', '#8792ab'], rule: CY });
  ceText(ctx, 'FOOTBALL  \u00b7  FRIENDSHIP  \u00b7  GLORY', W / 2, 418, { size: 6.5, w: 700, fill: 'rgba(165,243,252,.7)', ls: 2.6, max: 230 });
  var by0 = 458;
  ctx.fillStyle = ceGrad(ctx, 60, 0, W - 60, 0, ['rgba(34,211,238,0)', 'rgba(34,211,238,.55)', 'rgba(34,211,238,0)']);
  ctx.fillRect(60, by0 - 16, W - 120, 0.8); ctx.fillRect(60, by0 + 16, W - 120, 0.8);
  ['tri', 'cir', 'x', 'sq'].forEach(function(k, n){ cePsSym(ctx, k, W / 2 + (n - 1.5) * 26, by0 + (k === 'tri' ? 1 : 0), 6.5, 1.8, 6); });
  ceBackText(ctx, o && o.bt);
}

// Back 3 (prestige): burgundy-black field, engine-turned waves, gold guilloche rosette (banknote style) around a gold logo.
function ceDrawBack3(ctx, o){
  var W = CE_W, H = CE_H, i, j, t, r, g, cx = W / 2, cy = 196;
  ceRRect(ctx, 0, 0, W, H, 18); ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, ['#6b4c16', '#f7e2a0', '#9c7631', '#fff4cf', '#b88a3a', '#4e3410']); ctx.fill();
  ctx.save();
  ceRRect(ctx, 7, 7, W - 14, H - 14, 13); ctx.clip();
  g = ctx.createRadialGradient(cx, cy, 10, cx, 258, 380);
  g.addColorStop(0, '#4a1424'); g.addColorStop(0.45, '#22080f'); g.addColorStop(1, '#060205');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Engine-turned waves.
  ctx.lineWidth = 0.45; ctx.strokeStyle = 'rgba(233,196,106,.13)';
  for(j = -6; j < H + 6; j += 6){
    ctx.beginPath();
    for(i = 0; i <= W; i += 2){ var wy = j + 2.4 * Math.sin(i / 9 + j / 23); if(i) ctx.lineTo(i, wy); else ctx.moveTo(i, wy); }
    ctx.stroke();
  }
  g = ctx.createRadialGradient(cx, 258, 160, cx, 258, 340);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ceRRect(ctx, 7, 7, W - 14, H - 14, 13); ctx.lineWidth = 1.2; ctx.strokeStyle = '#05070f'; ctx.stroke();

  var gold = ceGrad(ctx, 0, 0, W, H, CE_GOLD);
  // Border: two rules with a braided wave between them, small rosettes in the corners.
  ctx.strokeStyle = gold;
  ceRRect(ctx, 12, 12, W - 24, H - 24, 9); ctx.lineWidth = 0.9; ctx.stroke();
  ceRRect(ctx, 22, 22, W - 44, H - 44, 5); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.lineWidth = 0.5;
  var braid = function(x0, y0, x1, y1){
    var len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    [0, Math.PI].forEach(function(ph){
      ctx.beginPath();
      for(t = 0; t <= len; t += 0.8){ var off = 2.6 * Math.sin(t / 3.2 + ph); ctx[t ? 'lineTo' : 'moveTo'](x0 + ux * t - uy * off, y0 + uy * t + ux * off); }
      ctx.stroke();
    });
  };
  braid(40, 17, W - 40, 17); braid(40, H - 17, W - 40, H - 17); braid(17, 40, 17, H - 40); braid(W - 17, 40, W - 17, H - 40);
  [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]].forEach(function(c){
    for(j = 0; j < 3; j++){
      ctx.beginPath();
      for(t = 0; t <= 360; t++){ var a = t / 180 * Math.PI; r = 7 + 2.4 * Math.sin(6 * a + j * Math.PI / 3); ctx[t ? 'lineTo' : 'moveTo'](c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r); }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(c[0], c[1], 1.6, 0, Math.PI * 2); ctx.fillStyle = gold; ctx.fill();
  });

  // Guilloche rosette.
  var curve = function(base, amp, k, ph, lw, a1){
    ctx.beginPath();
    for(t = 0; t <= 1440; t++){ var a = t / 720 * Math.PI; r = base + amp * Math.sin(k * a + ph); ctx[t ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.globalAlpha = a1; ctx.lineWidth = lw; ctx.stroke(); ctx.globalAlpha = 1;
  };
  ctx.strokeStyle = ceGrad(ctx, cx - 110, cy - 110, cx + 110, cy + 110, CE_GOLD);
  for(j = 0; j < 16; j++) curve(95, 9, 12, j * Math.PI / 8, 0.45, 0.8);
  for(j = 0; j < 12; j++) curve(72, 8, 18, j * Math.PI / 6, 0.4, 0.7);
  ctx.beginPath(); ctx.arc(cx, cy, 108, 0, Math.PI * 2); ctx.lineWidth = 1.8; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 112, 0, Math.PI * 2); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 84, 0, Math.PI * 2); ctx.lineWidth = 0.6; ctx.stroke();
  for(i = 0; i < 24; i++){
    var ba = i / 24 * Math.PI * 2;
    cePoly(ctx, [[cx + Math.cos(ba) * 108, cy + Math.sin(ba) * 108], [cx + Math.cos(ba + 0.035) * 112.5, cy + Math.sin(ba + 0.035) * 112.5],
      [cx + Math.cos(ba) * 117, cy + Math.sin(ba) * 117], [cx + Math.cos(ba - 0.035) * 112.5, cy + Math.sin(ba - 0.035) * 112.5]]);
    ctx.fillStyle = gold; ctx.fill();
  }
  g = ctx.createRadialGradient(cx, cy - 12, 4, cx, cy, 58);
  g.addColorStop(0, '#3d0f1d'); g.addColorStop(1, '#0d0307');
  ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2);
  ceShadow(ctx, 'rgba(0,0,0,.6)', 8, 2); ctx.fillStyle = g; ctx.fill(); ceNoShadow(ctx);
  ctx.lineWidth = 2; ctx.strokeStyle = ceGrad(ctx, cx - 58, cy - 58, cx + 58, cy + 58, CE_GOLD); ctx.stroke();
  cePsLogo(ctx, cx, cy + 1, 82, 72, { gold: true, glow: 'rgba(233,196,106,.35)' });

  ceBackWordmark(ctx, 352, { face1: CE_GOLD, rim1: CE_CHROME, face2: CE_CHROME, rim2: CE_GOLD });
  ceText(ctx, 'FOOTBALL  \u00b7  FRIENDSHIP  \u00b7  GLORY', cx, 418, { size: 6.5, w: 700, fill: 'rgba(247,226,160,.7)', ls: 2.6, max: 230 });
  var by0 = 458;
  ctx.fillStyle = ceGrad(ctx, 60, 0, W - 60, 0, ['rgba(233,196,106,0)', 'rgba(233,196,106,.6)', 'rgba(233,196,106,0)']);
  ctx.fillRect(60, by0 - 16, W - 120, 0.8); ctx.fillRect(60, by0 + 16, W - 120, 0.8);
  ['tri', 'cir', 'x', 'sq'].forEach(function(k, m){ cePsSym(ctx, k, cx + (m - 1.5) * 26, by0 + (k === 'tri' ? 1 : 0), 6.5, 1.6, 0, '#e9c46a'); });
  ceBackText(ctx, o && o.bt);
}

// ---------------- Custom text on the card back ----------------
// bt = { txt, vert (rotated 90 deg, reads bottom to top), x, y (centre, % of the card), size (design units), col }.
// Font: Oswald 700 (condensed sports lettering, has Vietnamese glyphs), metal fill + dark outline.
var CE_BT_FONT = '"Oswald"', CE_BT_BOX = null;
var CE_BT_COLS = {
  gold: { fill: CE_GOLD, edge: '#1a1204' },
  silver: { fill: CE_CHROME, edge: '#0b0f1a' },
  white: { fill: ['#ffffff', '#ffffff'], edge: '#05070f' },
  black: { fill: ['#2b2f38', '#05070c'], edge: 'rgba(255,255,255,.85)' }
};
function ceBackText(ctx, bt){
  CE_BT_BOX = null;
  var txt = bt && String(bt.txt || '').trim();
  if(!txt) return;
  var W = CE_W, H = CE_H, vert = !!bt.vert, size = Math.max(6, +bt.size || 24), maxW = vert ? H - 40 : W - 36;
  var x = (bt.x == null ? 50 : +bt.x) / 100 * W, y = (bt.y == null ? 9 : +bt.y) / 100 * H, col = CE_BT_COLS[bt.col] || CE_BT_COLS.gold;
  ctx.save();
  ceSpacing(ctx, size * 0.05);
  ctx.font = '700 ' + size + 'px ' + CE_BT_FONT + ', ' + CE_FONT;
  var tw = ctx.measureText(txt).width;
  if(tw > maxW){ size *= maxW / tw; ceSpacing(ctx, size * 0.05); ctx.font = '700 ' + size + 'px ' + CE_BT_FONT + ', ' + CE_FONT; tw = ctx.measureText(txt).width; }
  ctx.translate(x, y);
  if(vert) ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ceShadow(ctx, 'rgba(0,0,0,.55)', 4, 1.2);
  ctx.lineWidth = Math.max(1.2, size * 0.14); ctx.strokeStyle = col.edge; ctx.strokeText(txt, 0, 0);
  ceNoShadow(ctx);
  ctx.fillStyle = ceGrad(ctx, 0, -size * 0.55, 0, size * 0.5, col.fill);
  ctx.fillText(txt, 0, 0);
  ceSpacing(ctx, 0);
  ctx.restore();
  var bw = tw + 8, bh = size * 1.25;
  CE_BT_BOX = vert ? { x: x - bh / 2, y: y - bw / 2, w: bh, h: bw } : { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
}
