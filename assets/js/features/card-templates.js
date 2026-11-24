// Marvell PES Club - features/card-templates.js
// Extra print-card designs for card-export.js, drawn on a canvas in design units (324 x 516 = 54 x 86 mm):
//  'toty'   - Team-of-the-Year style: navy field in an ornate gold frame, gold blades + sparkles;
//             a cut-out (transparent) photo may break out above the frame.
//  'attax'  - trading-card style: shattered glass in the club colours (read from the team logo), vertical
//             side banner, rating / Elo badges on the right, big DEF / ATT boxes, name bar.
//  'legend' - gold-foil legend card: slanted photo panel, slanted name banner, stat bars, DEF / ATT boxes.
// Each drawer gets o = { card, tier, img, av, alpha, logo, team: { c1, c2 }, rank } (ceCardOpts in card-export.js).

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
  if(o.img){
    ctx.save();
    ceShield(ctx, ix, iy, iw, ih);
    if(o.alpha) ctx.rect(0, 0, W, 150);
    ctx.clip();
    ceDrawAvatar(ctx, o.img, o.av, { x: 40, y: 0, w: 270, h: 352 }, { from: o.alpha ? 0.8 : 0.6, sides: !o.alpha });
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
  ceRRect(ctx, 42, 189, 48, 12, 6); ctx.fillStyle = ceGrad(ctx, 42, 0, 90, 0, T.metal); ctx.fill();
  ceText(ctx, o.tier.toUpperCase(), 66.6, 198, { size: 7, fill: T.dark, ls: 1.4 });

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
  if(o.img) ceDrawAvatar(ctx, o.img, o.av, o.alpha ? { x: 34, y: 14, w: 240, h: 340 } : P, null);
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
  ceText(ctx, ceTierLabel(o.tier), 0, 6, { size: 16, fill: ceGrad(ctx, -125, 0, 125, 0, T.metal), ls: 2, max: 250, min: 9 });
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
  if(o.img) ceDrawAvatar(ctx, o.img, o.av, o.alpha ? { x: 40, y: 22, w: 260, h: 290 } : { x: 16, y: 16, w: 292, h: 286 }, { from: o.alpha ? 0.86 : 1 });
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
  ceText(ctx, ceTierLabel(o.tier), -98, -30.5, { size: 8.5, fill: T.dark, ls: 1.2, max: 100 });
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
