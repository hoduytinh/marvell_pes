// Marvell PES Club - features/card-export.js
// Career page "🖨️ In thẻ": exports a player's card at the print size 54 x 86 mm, as a 300 DPI PNG
// (pHYs set, so print software reads the real size) or straight to the browser print dialog (paper / PDF).
// Designs (CE_STYLES):
//  - 'career': the Career card (renderFifaCardHtml) laid out for the print size (CSS .fc-print), captured with html2canvas.
//  - 'player': FUT-style player card drawn on a canvas around an avatar: a photo picked from the computer
//    (kept per player in this browser's IndexedDB) or the built-in default player illustration.
//  - 'toty' / 'attax' / 'legend' / 'allround' / 'adrenalyn' / 'ucl': more canvas designs, see card-templates.js.
//  - 'back': the common card back (same for every player, for double-sided printing).
// "Hiện ảnh trên thẻ" off (ce.noAv) draws the canvas designs without the photo (big club crest instead).
// Photos with a background can be cut out in the browser ("✂️ Tách nền"): plain backgrounds by a colour flood
// fill, others with the MediaPipe selfie segmenter (loaded from a CDN on first use). Transparent PNGs work as is.
// Loaded after career.js and round-export.js (uses loadHtml2Canvas, fetchAsDataUrl, inlineSnapshotImages, flattenSnapshotColors).

var CE_DPI = 300, CE_W = 324, CE_H = 516; // design units: 6 per mm
var CE_PX_W = Math.round(54 / 25.4 * CE_DPI), CE_PX_H = Math.round(86 / 25.4 * CE_DPI); // 638 x 1016 px
var CE_TIERS = ['icon', 'gold', 'silver', 'bronze'];
var CE_CODES = { att: 'ATT', def: 'DEF', frm: 'FRM', clu: 'CLU', exp: 'EXP', tro: 'TRO' };
var CE_FONT = '"Inter","Segoe UI",Roboto,Arial,sans-serif';
var CE_STYLES = [
  { k: 'career', icon: '🃏', vi: 'Sự nghiệp', en: 'Career' },
  { k: 'player', icon: '⚽', vi: 'FUT', en: 'FUT' },
  { k: 'toty', icon: '🌟', vi: 'Đội hình năm', en: 'Team of the Year' },
  { k: 'attax', icon: '💥', vi: 'Match Attax', en: 'Match Attax' },
  { k: 'legend', icon: '👑', vi: 'Huyền thoại', en: 'Legend' },
  { k: 'allround', icon: '🔷', vi: 'Match Attax 20', en: 'Match Attax 20' },
  { k: 'adrenalyn', icon: '🟪', vi: 'Adrenalyn XL', en: 'Adrenalyn XL' },
  { k: 'ucl', icon: '✨', vi: 'Champions', en: 'Champions' },
  { k: 'back', icon: '🂠', vi: 'Mặt sau', en: 'Card back' },
  { k: 'back2', icon: '⚡', vi: 'Mặt sau – Carbon Neon', en: 'Back – Carbon Neon' },
  { k: 'back3', icon: '💠', vi: 'Mặt sau – Hoàng gia', en: 'Back – Prestige' }
];
// Card-back designs (common to everyone, never a career card).
function ceIsBack(style){ return /^back\d*$/.test(String(style || '')); }
var CE_K = CE_PX_W / CE_W; // canvas px per design unit of the card being drawn
var ce = { name: null, style: 'player', tier: '', label: '', noAv: false, av: null, avImg: null, avAlpha: false, logoImg: null, team: null, card: null, rank: 0, ranks: {}, seq: 0, saveT: 0,
  bt: { txt: '', vert: false, x: 50, y: 9, size: 24, col: 'gold' } };
try {
  var ceSaved = localStorage.getItem('pesCardStyle');
  if(!ceIsBack(ceSaved) && CE_STYLES.some(function(s){ return s.k === ceSaved; })) ce.style = ceSaved;
  var ceBtSaved = JSON.parse(localStorage.getItem('pesCardBackText') || 'null');
  if(ceBtSaved && typeof ceBtSaved === 'object') Object.keys(ce.bt).forEach(function(k){ if(ceBtSaved[k] != null) ce.bt[k] = ceBtSaved[k]; });
} catch(e){}

var CE_PAL = {
  gold: { stops: ['#fff6cf', '#f6d365', '#e0a91b', '#a16207', '#5c3a00'], ink: '#2b1a00', soft: 'rgba(43,26,0,.75)', line: 'rgba(92,58,0,.5)',
    hi: '#9a3412', rim: ['#fff8dc', '#b07d10', '#fff1b8', '#7a5200'], base: ['#3a2803', '#0d0800'], ray: '#f6d365',
    shirt: ['#1d4ed8', '#172554'], trim: '#fde68a', pill: ['rgba(0,0,0,.2)', '#2b1a00'] },
  silver: { stops: ['#ffffff', '#e5eaf1', '#b8c2cf', '#7d8899', '#465163'], ink: '#0f172a', soft: 'rgba(15,23,42,.72)', line: 'rgba(15,23,42,.38)',
    hi: '#1d4ed8', rim: ['#ffffff', '#8a95a5', '#f1f5f9', '#4b5563'], base: ['#273041', '#07090d'], ray: '#e5eaf1',
    shirt: ['#dc2626', '#701a1a'], trim: '#f1f5f9', pill: ['rgba(0,0,0,.16)', '#0f172a'] },
  bronze: { stops: ['#ffe8d2', '#efb07c', '#c97a3d', '#8f4a1a', '#4a220a'], ink: '#2a1205', soft: 'rgba(42,18,5,.75)', line: 'rgba(74,34,10,.5)',
    hi: '#7f1d1d', rim: ['#ffe0c2', '#8f4a1a', '#ffd3ad', '#5c2a0a'], base: ['#331a0c', '#0a0503'], ray: '#efb07c',
    shirt: ['#047857', '#052e22'], trim: '#fed7aa', pill: ['rgba(0,0,0,.2)', '#2a1205'] },
  icon: { stops: ['#a78bfa', '#7c3aed', '#4c1d95', '#2e1065', '#0b0820'], ink: '#fff7d6', soft: 'rgba(255,247,214,.82)', line: 'rgba(250,204,21,.6)',
    hi: '#fde047', rim: ['#fff3b0', '#b8860b', '#fde68a', '#8a6100'], base: ['#1c0f3f', '#05030d'], ray: '#facc15',
    shirt: ['#facc15', '#854d0e'], trim: '#1e1b4b', pill: ['#facc15', '#1e1b4b'] }
};

// ---------------- Avatars (IndexedDB: per system + player) ----------------
var CE_DB = null;
function ceDb(){
  if(!CE_DB) CE_DB = new Promise(function(res, rej){
    if(!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
    var rq = indexedDB.open('pesCardAvatars', 1);
    rq.onupgradeneeded = function(){ rq.result.createObjectStore('av'); };
    rq.onsuccess = function(){ res(rq.result); };
    rq.onerror = function(){ rej(rq.error); };
  });
  return CE_DB;
}
function ceKey(name){ return (typeof PES_SYSTEM_ID === 'string' ? PES_SYSTEM_ID : 'pes') + '|' + careerName(name).toLowerCase(); }
function ceAvGet(name){
  return ceDb().then(function(db){
    return new Promise(function(res){
      var rq = db.transaction('av').objectStore('av').get(ceKey(name));
      rq.onsuccess = function(){ res(rq.result || null); };
      rq.onerror = function(){ res(null); };
    });
  }).catch(function(){ return null; });
}
function ceAvPut(name, rec){
  return ceDb().then(function(db){
    return new Promise(function(res){
      var tx = db.transaction('av', 'readwrite'), os = tx.objectStore('av');
      if(rec){ rec.t = Date.now(); os.put(rec, ceKey(name)); } else os.delete(ceKey(name));
      tx.oncomplete = function(){ res(true); };
      tx.onerror = function(){ res(false); };
    });
  }).catch(function(){ return false; });
}

function ceLoadImg(src){
  return new Promise(function(res, rej){
    var im = new Image();
    im.onload = function(){ res(im); };
    im.onerror = function(){ rej(new Error('image')); };
    im.src = src;
  });
}
// CORS-clean image (team logos are repo paths / GitHub raw), or null.
function ceSafeImg(src){
  if(!src) return Promise.resolve(null);
  var p = /^data:/i.test(src) ? Promise.resolve(src) : fetchAsDataUrl(new URL(src, location.href).href);
  return p.then(ceLoadImg).catch(function(){ return null; });
}

// Photo from the computer -> data URL, longest side <= 1200 px (PNG keeps transparency).
function ceReadFile(file){
  return new Promise(function(res, rej){
    var fr = new FileReader();
    fr.onload = function(){ res(fr.result); };
    fr.onerror = function(){ rej(fr.error); };
    fr.readAsDataURL(file);
  }).then(ceLoadImg).then(function(im){
    var iw = im.naturalWidth, ih = im.naturalHeight;
    if(!iw || !ih) throw new Error('image');
    var s = Math.min(1, 1200 / Math.max(iw, ih)), c = document.createElement('canvas');
    c.width = Math.round(iw * s); c.height = Math.round(ih * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL(/png|webp|gif/i.test(file.type) ? 'image/png' : 'image/jpeg', 0.92);
  });
}

// Default avatar: footballer bust (transparent background), shirt in the tier colours.
function ceDefaultAvatarSvg(p){
  var body = 'M28 460C30 384 70 344 146 324L174 316C186 338 214 338 226 316L254 324C330 344 370 384 372 460Z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 460"><defs>' +
    '<linearGradient id="k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#626a7a"/><stop offset=".5" stop-color="#2c313c"/><stop offset="1" stop-color="#0f1217"/></linearGradient>' +
    '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.shirt[0] + '"/><stop offset="1" stop-color="' + p.shirt[1] + '"/></linearGradient>' +
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".2"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '</defs>' +
    '<path d="' + body + '" fill="url(#s)"/>' +
    '<path d="M72 372C60 398 54 428 52 460M84 362C72 392 66 426 64 460" stroke="' + p.trim + '" stroke-width="6" fill="none" opacity=".8"/>' +
    '<path d="M328 372C340 398 346 428 348 460M316 362C328 392 334 426 336 460" stroke="' + p.trim + '" stroke-width="6" fill="none" opacity=".8"/>' +
    '<path d="' + body + '" fill="url(#g)"/>' +
    '<path d="M170 246L170 320C184 344 216 344 230 320L230 246Z" fill="url(#k)"/>' +
    '<path d="M170 286C186 304 214 304 230 286L230 304C214 320 186 320 170 304Z" fill="#000" opacity=".28"/>' +
    '<path d="M162 312L200 356L238 312" fill="none" stroke="' + p.trim + '" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<ellipse cx="131" cy="178" rx="11" ry="24" fill="url(#k)"/><ellipse cx="269" cy="178" rx="11" ry="24" fill="url(#k)"/>' +
    '<path d="M200 72C150 72 128 110 130 162C131 194 139 224 153 246C167 268 184 280 200 280C216 280 233 268 247 246C261 224 269 194 270 162C272 110 250 72 200 72Z" fill="url(#k)"/>' +
    '<path d="M126 158C116 98 152 52 206 54C252 56 286 90 276 152C270 126 254 110 230 106C214 92 186 94 168 106C150 114 134 132 126 158Z" fill="#06070a"/>' +
    '<path d="M248 94C268 114 274 142 270 172" stroke="#fff" stroke-opacity=".16" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '</svg>';
}
var CE_DEF_IMG = {};
function ceDefaultAvatar(tier){
  if(!CE_DEF_IMG[tier]) CE_DEF_IMG[tier] = ceLoadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ceDefaultAvatarSvg(CE_PAL[tier] || CE_PAL.gold)));
  return CE_DEF_IMG[tier];
}

// ---------------- Player card (canvas) ----------------
function ceRRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// FUT-style shield: raised centre on top, concave top corners, tapered bottom.
function ceShield(ctx, x, y, w, h){
  function X(f){ return x + f * w; }
  function Y(f){ return y + f * h; }
  ctx.beginPath();
  ctx.moveTo(X(.5), Y(0));
  ctx.quadraticCurveTo(X(.62), Y(.028), X(.84), Y(.03));
  ctx.quadraticCurveTo(X(.86), Y(.078), X(1), Y(.085));
  ctx.lineTo(X(1), Y(.83));
  ctx.quadraticCurveTo(X(1), Y(.875), X(.86), Y(.915));
  ctx.lineTo(X(.58), Y(.985));
  ctx.quadraticCurveTo(X(.5), Y(1.004), X(.42), Y(.985));
  ctx.lineTo(X(.14), Y(.915));
  ctx.quadraticCurveTo(X(0), Y(.875), X(0), Y(.83));
  ctx.lineTo(X(0), Y(.085));
  ctx.quadraticCurveTo(X(.14), Y(.078), X(.16), Y(.03));
  ctx.quadraticCurveTo(X(.38), Y(.028), X(.5), Y(0));
  ctx.closePath();
}

function ceGrad(ctx, x0, y0, x1, y1, stops){
  var g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(function(c, i){ g.addColorStop(i / (stops.length - 1), c); });
  return g;
}

// Font size (<= size, >= min) at which `text` fits in maxW; sets ctx.font.
function ceFit(ctx, text, maxW, size, weight, min){
  for(; size > min; size -= 0.5){
    ctx.font = weight + ' ' + size + 'px ' + CE_FONT;
    if(ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = weight + ' ' + size + 'px ' + CE_FONT;
  return size;
}
function ceSpacing(ctx, px){ if('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

// Avatar into box b (design units), cover-fit + zoom/offset; fade = { from: 0..1 (bottom fade start, 1 = none), sides: bool }.
function ceDrawAvatar(ctx, img, av, b, fade){
  fade = fade || {};
  var k = CE_K, c = document.createElement('canvas');
  c.width = Math.round(b.w * k); c.height = Math.round(b.h * k);
  var x = c.getContext('2d'), iw = img.naturalWidth || img.width || 400, ih = img.naturalHeight || img.height || 460;
  var z = (av && av.zoom) || 1, s = Math.max(c.width / iw, c.height / ih) * z, dw = iw * s, dh = ih * s;
  x.drawImage(img, (c.width - dw) / 2 + ((av && av.x) || 0) / 100 * c.width, (c.height - dh) / 2 + ((av && av.y) || 0) / 100 * c.height, dw, dh);
  x.globalCompositeOperation = 'destination-in';
  if(fade.from != null && fade.from < 1){
    var f0 = fade.from, fy = x.createLinearGradient(0, 0, 0, c.height);
    fy.addColorStop(0, '#000'); fy.addColorStop(f0, '#000'); fy.addColorStop(f0 + (1 - f0) * 0.57, 'rgba(0,0,0,.55)'); fy.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fy;
    x.fillRect(0, 0, c.width, c.height);
  }
  if(fade.sides){
    var fx = x.createLinearGradient(0, 0, c.width, 0);
    fx.addColorStop(0, 'rgba(0,0,0,0)'); fx.addColorStop(0.1, '#000'); fx.addColorStop(0.9, '#000'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fx;
    x.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(c, b.x, b.y, b.w, b.h);
}

function ceStar(ctx, cx, cy, r){
  ctx.beginPath();
  for(var i = 0; i < 10; i++){
    var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
}

// Sizes the canvas for the card at k px per design unit and returns its context in design units.
function cePrep(cv, k){
  CE_K = k || CE_PX_W / CE_W;
  cv.width = Math.round(CE_W * CE_K); cv.height = Math.round(CE_H * CE_K);
  var ctx = cv.getContext('2d');
  ctx.setTransform(cv.width / CE_W, 0, 0, cv.height / CE_H, 0, 0);
  ctx.clearRect(0, 0, CE_W, CE_H);
  return ctx;
}

function ceDrawPlayerCard(ctx, o){
  var card = o.card, tier = o.tier, avImg = o.img, av = o.av, logoImg = o.logo;
  var p = CE_PAL[tier] || CE_PAL.gold, W = CE_W, H = CE_H, i, g;

  // Base: full 54 x 86 mm rectangle, 3 mm corners, dark tier tone with light rays.
  ceRRect(ctx, 0, 0, W, H, 18);
  ctx.fillStyle = ceGrad(ctx, 0, 0, W, H, p.base);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = p.ray;
  ctx.globalAlpha = 0.08;
  for(i = 0; i < 24; i++){
    var a = i / 24 * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(W / 2, H * 0.3); ctx.arc(W / 2, H * 0.3, H, a, a + Math.PI / 30); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // Shield body.
  var sx = 9, sy = 9, sw = W - 18, sh = H - 18;
  ctx.save();
  ceShield(ctx, sx, sy, sw, sh);
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
  ctx.fillStyle = ceGrad(ctx, sx, sy, sx + sw * 0.85, sy + sh, p.stops);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ceShield(ctx, sx, sy, sw, sh);
  ctx.clip();
  g = ctx.createRadialGradient(W / 2, 40, 8, W / 2, 40, W * 0.8);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  [[0.12, '#fff', [[0, .2], [.62, 0], [.82, 0], [0, .47]]], [0.08, '#fff', [[1, .3], [.3, 1], [.56, 1], [1, .56]]],
   [0.07, '#fff', [[.56, 0], [1, 0], [1, .17]]], [0.1, '#000', [[0, .72], [.5, 1], [0, 1]]], [0.08, '#000', [[1, .78], [1, 1], [.66, 1]]]].forEach(function(f){
    ctx.globalAlpha = f[0]; ctx.fillStyle = f[1];
    ctx.beginPath();
    f[2].forEach(function(pt, j){ ctx[j ? 'lineTo' : 'moveTo'](pt[0] * W, pt[1] * H); });
    ctx.closePath(); ctx.fill();
  });
  ctx.globalAlpha = 0.06; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  for(i = -H; i < W; i += 11){ ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ceArt(ctx, o, { x: 62, y: 20, w: 254, h: 302 }, { from: o.alpha ? 0.8 : 0.72, sides: !o.alpha }, p.rim[1]);
  ctx.restore();

  // Rims.
  ceShield(ctx, sx, sy, sw, sh);
  ctx.lineWidth = 3; ctx.strokeStyle = ceGrad(ctx, 0, 0, W, H, p.rim); ctx.stroke();
  ceShield(ctx, sx + 7, sy + 7, sw - 14, sh - 14);
  ctx.lineWidth = 1; ctx.strokeStyle = p.line; ctx.stroke();

  var light = tier === 'icon';
  function ink(sh){
    ctx.fillStyle = p.ink;
    ctx.shadowColor = light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.5)';
    ctx.shadowBlur = sh || 0; ctx.shadowOffsetY = light ? 1 : 0.8;
  }
  function noShadow(){ ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // Brand on the crown.
  noShadow(); ceSpacing(ctx, 2.2);
  ctx.globalAlpha = 0.7; ctx.fillStyle = p.ink; ctx.font = '800 7px ' + CE_FONT;
  ctx.fillText('MARVELL PES CLUB', W / 2, 34);
  ctx.globalAlpha = 1; ceSpacing(ctx, 0);

  // Left column: rating, position, club logo, tier.
  var cx = 56;
  ink(3); ceSpacing(ctx, -1.5); ctx.font = '900 54px ' + CE_FONT; ctx.fillText(String(card.ovr), cx, 96);
  ceSpacing(ctx, 1); ctx.font = '900 21px ' + CE_FONT; ctx.fillText(card.pos, cx, 120);
  ceSpacing(ctx, 0); noShadow();
  ctx.fillStyle = p.line; ctx.fillRect(cx - 18, 128, 36, 2);
  var ly = 156, lr = 19;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, ly, lr, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#fff'; ctx.fill();
  noShadow(); ctx.clip();
  if(logoImg){
    var lw = logoImg.naturalWidth || 1, lh = logoImg.naturalHeight || 1, ls = Math.max(2 * lr / lw, 2 * lr / lh);
    ctx.drawImage(logoImg, cx - lw * ls / 2, ly - lh * ls / 2, lw * ls, lh * ls);
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, ly, lr, 0, Math.PI * 2);
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, ly, lr + 2.2, 0, Math.PI * 2);
  ctx.lineWidth = 1.5; ctx.strokeStyle = p.line; ctx.stroke();
  var tierTxt = ceLabelOr(o, tier.toUpperCase()), pw = cePillW(ctx, tierTxt, 8, 1.6, 50, 72);
  ceRRect(ctx, cx - pw / 2, 184, pw, 14, 7);
  ctx.fillStyle = p.pill[0]; ctx.fill();
  ceSpacing(ctx, 1.6); ctx.fillStyle = p.pill[1]; ceFit(ctx, tierTxt, pw - 8, 8, 900, 4.5);
  ctx.fillText(tierTxt, cx + 0.8, 194);
  ceSpacing(ctx, 0);

  // Name.
  var name = String(card.name || '').toUpperCase();
  ink(2); ceSpacing(ctx, 0.8);
  ceFit(ctx, name, 262, 30, 900, 13);
  ctx.fillText(name, W / 2, 346);
  ceSpacing(ctx, 0); noShadow();
  ctx.fillStyle = ceGrad(ctx, 40, 0, W - 40, 0, ['rgba(0,0,0,0)', p.ink, 'rgba(0,0,0,0)']);
  ctx.globalAlpha = 0.55; ctx.fillRect(40, 355, W - 80, 1.2); ctx.globalAlpha = 1;

  // Medal stars.
  var medals = (card.medalList || []).slice(0, 24), sr = medals.length > 14 ? 4.4 : 5.6, gap = sr * 2.25;
  var x0 = W / 2 - (medals.length - 1) * gap / 2;
  var starCol = { gold: '#facc15', silver: '#e2e8f0', bronze: '#d97706' };
  medals.forEach(function(m, j){
    ceStar(ctx, x0 + j * gap, 369, sr);
    ctx.fillStyle = starCol[m] || '#facc15'; ctx.fill();
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
  });

  // Stats: 3 rows x 2 columns, FUT style "86 ATT".
  var top = medals.length ? 402 : 396;
  ctx.fillStyle = p.line; ctx.fillRect(W / 2 - 0.6, top - 20, 1.2, 78);
  (card.stats || []).slice(0, 6).forEach(function(s, j){
    var y = top + Math.floor(j / 2) * 28, vx = j % 2 ? 222 : 92;
    ctx.textAlign = 'right'; ink(1);
    if(s.v >= 90) ctx.fillStyle = p.hi;
    ctx.font = '900 24px ' + CE_FONT; ctx.fillText(String(s.v), vx, y);
    noShadow(); ctx.textAlign = 'left'; ctx.fillStyle = p.soft; ceSpacing(ctx, 0.6);
    ctx.font = '800 14px ' + CE_FONT; ctx.fillText(CE_CODES[s.k] || s.k.toUpperCase(), vx + 6, y);
    ceSpacing(ctx, 0);
  });

  // Footer: Elo and matches.
  ctx.textAlign = 'center';
  ctx.fillStyle = ceGrad(ctx, 70, 0, W - 70, 0, ['rgba(0,0,0,0)', p.line, 'rgba(0,0,0,0)']);
  ctx.fillRect(70, top + 66, W - 140, 1.2);
  var foot = 'ELO ' + card.elo + '  \u00b7  ' + card.P + crL(' TRẬN', ' MATCHES');
  ink(0); ceSpacing(ctx, 0.8); ceFit(ctx, foot, 120, 10.5, 800, 7);
  ctx.fillText(foot, W / 2, top + 82);
  ceSpacing(ctx, 0); noShadow();
}

// ---------------- Career card (HTML, print layout) ----------------
function ceCareerCardHtml(card, tier, label){
  return renderFifaCardHtml(crExt(card, { tier: tier, tierLabel: label || '', noLive: true })).replace('class="fifa-card ', 'class="fifa-card fc-print ');
}
// Shrinks the name until it fits on one line.
function ceFitName(root){
  var el = root.querySelector('.fc-name');
  if(!el) return;
  for(var fs = 30; fs > 12 && el.scrollWidth > el.clientWidth; fs -= 1) el.style.fontSize = fs + 'px';
}

// Background of .fifa-card.fc-print (html2canvas mis-draws its layered radial/repeating gradients), same colours as the CSS.
var CE_CAREER_BG = {
  gold: { bg: [['#fff3c4', 0], ['#f5c542', .35], ['#d49b0b', .68], ['#8a5a00', 1]], line: 'rgba(90,55,0,.35)' },
  silver: { bg: [['#ffffff', 0], ['#dbe2ec', .35], ['#9ca9ba', .68], ['#566275', 1]], line: 'rgba(15,23,42,.28)' },
  bronze: { bg: [['#ffe2c6', 0], ['#e39a5e', .35], ['#b0612b', .68], ['#6b3410', 1]], line: 'rgba(70,30,5,.35)' },
  icon: { bg: [['#4c1d95', 0], ['#7c3aed', .4], ['#312e81', .72], ['#0b0820', 1]], line: 'rgba(250,204,21,.6)' }
};
function ceRRect4(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.arcTo(x + w, y, x + w, y + h, r[1]);
  ctx.arcTo(x + w, y + h, x, y + h, r[2]);
  ctx.arcTo(x, y + h, x, y, r[3]);
  ctx.arcTo(x, y, x + w, y, r[0]);
  ctx.closePath();
}
function ceCareerBg(ctx, tier){
  var b = CE_CAREER_BG[tier] || CE_CAREER_BG.gold, W = CE_W, H = CE_H, i, g;
  var a = 160 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(W * dx) + Math.abs(H * dy);
  ceRRect4(ctx, 0, 0, W, H, [34, 34, 66, 66]);
  ctx.save();
  ctx.clip();
  g = ctx.createLinearGradient(W / 2 - dx * L / 2, H / 2 - dy * L / 2, W / 2 + dx * L / 2, H / 2 + dy * L / 2);
  b.bg.forEach(function(s){ g.addColorStop(s[1], s[0]); });
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for(i = -700; i < 700; i += 14) ctx.fillRect(i, -700, 6, 1400);
  ctx.restore();
  ctx.save();
  ctx.translate(W / 2, 0); ctx.scale(1, (0.55 * H) / (1.2 * W));
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.2 * W);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-W, 0, 2 * W, 4 * H);
  ctx.restore();
  ceRRect4(ctx, 0, 0, W, H, [34, 34, 66, 66]);
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke();
  ctx.restore();
  ceRRect4(ctx, 10.75, 10.75, W - 21.5, H - 21.5, [25, 25, 56, 56]);
  ctx.lineWidth = 1.5; ctx.strokeStyle = b.line;
  if(tier === 'icon'){ ctx.shadowColor = 'rgba(250,204,21,.35)'; ctx.shadowBlur = 10; }
  ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

// ---------------- PNG output ----------------
var CE_CRC = null;
function ceCrc(bytes){
  if(!CE_CRC){
    CE_CRC = new Uint32Array(256);
    for(var n = 0; n < 256; n++){ var c = n; for(var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CE_CRC[n] = c >>> 0; }
  }
  var crc = 0xFFFFFFFF;
  for(var i = 0; i < bytes.length; i++) crc = CE_CRC[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
// Writes the pHYs chunk (pixels per metre) so the PNG opens as 54 x 86 mm.
function cePngWithDpi(blob, dpi){
  return blob.arrayBuffer().then(function(buf){
    var src = new Uint8Array(buf), dv = new DataView(buf), ppm = Math.round(dpi / 0.0254);
    var chunk = new Uint8Array(21), cv = new DataView(chunk.buffer);
    cv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4); cv.setUint32(8, ppm); cv.setUint32(12, ppm); chunk[16] = 1;
    cv.setUint32(17, ceCrc(chunk.subarray(4, 17)));
    var at = 8, ihdrEnd = 33, parts;
    while(at + 8 <= src.length){
      var len = dv.getUint32(at), type = String.fromCharCode(src[at + 4], src[at + 5], src[at + 6], src[at + 7]);
      if(type === 'pHYs'){ parts = [src.subarray(0, at), chunk, src.subarray(at + 12 + len)]; break; }
      if(type === 'IDAT' || type === 'IEND') break;
      at += 12 + len;
    }
    return new Blob(parts || [src.subarray(0, ihdrEnd), chunk, src.subarray(ihdrEnd)], { type: 'image/png' });
  });
}

// ---------------- Canvas designs ----------------
var CE_DRAW = {
  player: ceDrawPlayerCard,
  toty: function(ctx, o){ ceDrawToty(ctx, o); },
  attax: function(ctx, o){ ceDrawAttax(ctx, o); },
  legend: function(ctx, o){ ceDrawLegend(ctx, o); },
  allround: function(ctx, o){ ceDrawAllround(ctx, o); },
  adrenalyn: function(ctx, o){ ceDrawAdrenalyn(ctx, o); },
  ucl: function(ctx, o){ ceDrawUcl(ctx, o); },
  back: function(ctx, o){ ceDrawBack(ctx, o); },
  back2: function(ctx, o){ ceDrawBack2(ctx, o); },
  back3: function(ctx, o){ ceDrawBack3(ctx, o); }
};
function ceCardOpts(){
  return { card: ce.card, tier: ceTier(), label: ce.label, img: ce.noAv ? null : ce.avImg, noAv: !!ce.noAv, av: ce.av, alpha: ce.avAlpha, logo: ce.logoImg,
    team: ce.team || { c1: [37, 99, 235], c2: [255, 255, 255] }, rank: ce.rank, bt: ce.bt };
}
function ceDrawStyle(cv, style, k, o){
  var ctx = cePrep(cv, k);
  CE_DRAW[style](ctx, o || ceCardOpts());
  CE_K = CE_PX_W / CE_W;
}

// True when more than 4% of the image is (semi-)transparent, i.e. an already cut-out photo.
function ceHasAlpha(img){
  if(!img) return false;
  try {
    var c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = c.height = 48;
    x.drawImage(img, 0, 0, 48, 48);
    var d = x.getImageData(0, 0, 48, 48).data, n = 0;
    for(var i = 3; i < d.length; i += 4) if(d[i] < 200) n++;
    return n > 48 * 48 * 0.04;
  } catch(e){ return false; }
}

// ---------------- Background removal ----------------
var CE_MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
var CE_SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
var CE_SEG = null;
function ceSegmenter(){
  if(!CE_SEG){
    CE_SEG = import(CE_MP + '/vision_bundle.mjs').then(function(m){
      return m.FilesetResolver.forVisionTasks(CE_MP + '/wasm').then(function(files){
        return m.ImageSegmenter.createFromOptions(files, {
          baseOptions: { modelAssetPath: CE_SEG_MODEL, delegate: 'CPU' },
          runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true
        });
      });
    });
    CE_SEG.catch(function(){ CE_SEG = null; });
  }
  return CE_SEG;
}
function ceImgCanvas(img){
  var c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}
function ceSmooth(a, b, v){ v = Math.min(1, Math.max(0, (v - a) / (b - a))); return v * v * (3 - 2 * v); }

// Plain / studio background: flood fill from the edges with their dominant colour. Throws if the edges are busy.
function ceCutFlood(img){
  var c = ceImgCanvas(img), w = c.width, h = c.height, x = c.getContext('2d'), id = x.getImageData(0, 0, w, h), d = id.data;
  var bord = [], hist = {}, best = null, i, p;
  for(i = 0; i < w; i++) bord.push(i);
  for(i = 1; i < h; i++) bord.push(i * w, i * w + w - 1); // top + sides (the body usually touches the bottom)
  bord.forEach(function(q){
    var key = (d[q * 4] >> 4) << 8 | (d[q * 4 + 1] >> 4) << 4 | d[q * 4 + 2] >> 4, b = hist[key] || (hist[key] = { n: 0, r: 0, g: 0, b: 0 });
    b.n++; b.r += d[q * 4]; b.g += d[q * 4 + 1]; b.b += d[q * 4 + 2];
    if(!best || b.n > best.n) best = b;
  });
  var R = best.r / best.n, G = best.g / best.n, B = best.b / best.n;
  function dist2(q){ var dr = d[q * 4] - R, dg = d[q * 4 + 1] - G, db = d[q * 4 + 2] - B; return dr * dr + dg * dg + db * db; }
  var match = bord.filter(function(q){ return dist2(q) < 48 * 48; });
  if(match.length < bord.length * 0.6) throw new Error('busy');
  var sd = Math.sqrt(match.reduce(function(s, q){ return s + dist2(q); }, 0) / match.length);
  var tol2 = Math.pow(Math.min(70, Math.max(36, sd * 2.5 + 18)), 2), seen = new Uint8Array(w * h), stack = new Int32Array(w * h), top = 0, n = 0;
  match.forEach(function(q){ if(!seen[q] && dist2(q) < tol2){ seen[q] = 1; stack[top++] = q; } });
  while(top){
    p = stack[--top]; n++;
    var px = p % w, nb = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p - w, p + w];
    for(i = 0; i < 4; i++){ var q = nb[i]; if(q >= 0 && q < w * h && !seen[q] && dist2(q) < tol2){ seen[q] = 1; stack[top++] = q; } }
  }
  if(n < w * h * 0.05 || n > w * h * 0.95) throw new Error('busy');
  for(p = 0; p < w * h; p++){
    if(seen[p]){ d[p * 4 + 3] = 0; continue; }
    var px2 = p % w;
    if((px2 > 0 && seen[p - 1]) || (px2 < w - 1 && seen[p + 1]) || (p >= w && seen[p - w]) || (p < w * h - w && seen[p + w])) d[p * 4 + 3] >>= 1;
  }
  x.putImageData(id, 0, 0);
  return c.toDataURL('image/png');
}

// Person segmentation (MediaPipe selfie multiclass, class 0 = background).
function ceCutAi(img){
  return ceSegmenter().then(function(seg){
    var c = ceImgCanvas(img), w = c.width, h = c.height, mask = null, mw = 0, mh = 0;
    seg.segment(c, function(res){
      var m = res && res.confidenceMasks && res.confidenceMasks[0];
      if(m){ mask = m.getAsFloat32Array().slice(); mw = m.width; mh = m.height; }
    });
    if(!mask) throw new Error('segment');
    var x = c.getContext('2d'), id = x.getImageData(0, 0, w, h), d = id.data, kept = 0;
    for(var py = 0; py < h; py++){
      var fy = Math.max(0, Math.min(mh - 1, (py + 0.5) * mh / h - 0.5)), y0 = Math.floor(fy), y1 = Math.min(mh - 1, y0 + 1), ty = fy - y0;
      for(var px = 0; px < w; px++){
        var fx = Math.max(0, Math.min(mw - 1, (px + 0.5) * mw / w - 0.5)), x0 = Math.floor(fx), x1 = Math.min(mw - 1, x0 + 1), tx = fx - x0;
        var bg = (mask[y0 * mw + x0] * (1 - tx) + mask[y0 * mw + x1] * tx) * (1 - ty) + (mask[y1 * mw + x0] * (1 - tx) + mask[y1 * mw + x1] * tx) * ty;
        var a = ceSmooth(0.3, 0.7, 1 - bg), j = (py * w + px) * 4 + 3;
        d[j] = Math.round(d[j] * a);
        if(a > 0.5) kept++;
      }
    }
    if(kept < w * h * 0.02) throw new Error(crL('không thấy người trong ảnh', 'no person found'));
    x.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  });
}

function ceCutBackground(){
  var name = ce.name, av = ce.av;
  if(!av || !av.src || !ce.avImg) return;
  if(ce.avAlpha){ ceStatus('ℹ️ ' + crL('Ảnh đã có nền trong suốt.', 'The photo already has a transparent background.')); return; }
  var img = ce.avImg, how = crL('nền trơn', 'plain background');
  ceBusy(true, '⏳ ' + crL('Đang tách nền…', 'Removing the background…'));
  var job;
  try { job = Promise.resolve(ceCutFlood(img)); }
  catch(e){
    how = 'AI';
    ceStatus('⏳ ' + crL('Đang tách nền bằng AI (lần đầu tải thư viện ~25 MB)…', 'Removing the background with AI (first use downloads ~25 MB)…'));
    job = new Promise(function(res){ setTimeout(res, 30); }).then(function(){ return ceCutAi(img); });
  }
  job.then(function(src){
    if(name !== ce.name) return;
    ce.av = { src: src, orig: av.orig || av.src, zoom: av.zoom || 1, x: av.x || 0, y: av.y || 0 };
    ceAvPut(name, ce.av);
    ceBusy(false, '✅ ' + crL('Đã tách nền (', 'Background removed (') + how + ').');
    return ceLoadAvatar().then(ceRender);
  }).catch(function(err){
    console.error('Background removal failed:', err);
    ceBusy(false, '❌ ' + crL('Không tách được nền: ', 'Could not remove the background: ') + (err && err.message ? err.message : err) +
      crL(' — có thể dùng remove.bg / Canva rồi tải lại ảnh PNG.', ' — try remove.bg / Canva and upload the PNG.'));
  });
}

// Current card -> canvas of exactly 638 x 1016 px.
function ceRenderCanvas(){
  if(ce.style !== 'career'){
    var cv = document.createElement('canvas');
    ceDrawStyle(cv, ce.style);
    return Promise.resolve(cv);
  }
  var src = document.querySelector('#cePreview .fifa-card');
  if(!src) return Promise.reject(new Error('no card'));
  return loadHtml2Canvas().then(function(h2c){
    var wrap = document.createElement('div');
    wrap.className = 'no-i18n ce-snap';
    wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;';
    wrap.appendChild(src.cloneNode(true));
    document.body.appendChild(wrap);
    var node = wrap.firstChild;
    return inlineSnapshotImages(wrap).then(function(){
      flattenSnapshotColors(wrap);
      return h2c(node, { backgroundColor: null, scale: CE_PX_W / CE_W, width: CE_W, height: CE_H, useCORS: true, allowTaint: false, logging: false,
        ignoreElements: function(el){ return el.tagName === 'IMG' && !wrap.contains(el); } });
    }).then(function(c){
      wrap.remove();
      var o = document.createElement('canvas'), x = o.getContext('2d');
      o.width = CE_PX_W; o.height = CE_PX_H;
      x.setTransform(CE_PX_W / CE_W, 0, 0, CE_PX_H / CE_H, 0, 0);
      ceCareerBg(x, ceTier());
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.drawImage(c, 0, 0, CE_PX_W, CE_PX_H);
      return o;
    }, function(err){ wrap.remove(); throw err; });
  });
}

function ceRenderPng(){
  return ceFonts().then(ceBtFont).then(ceRenderCanvas).then(function(c){
    return new Promise(function(res, rej){ c.toBlob(function(b){ if(b) res(b); else rej(new Error('PNG')); }, 'image/png'); });
  }).then(function(b){ return cePngWithDpi(b, CE_DPI); });
}

function ceFileName(){
  if(ceIsBack(ce.style)) return 'marvell-pes-card-' + ce.style + '-54x86mm.png';
  return ceSlug(ce.name) + '-' + ce.style + '-54x86mm.png';
}

// ---------------- Dialog ----------------
function ceTier(){ return ce.tier || (ce.card && ce.card.tier) || 'gold'; }
// Custom tier text (o.label, upper-cased) or the design's default text.
function ceLabelOr(o, def){ var l = String((o && o.label) || '').trim(); return l ? l.toUpperCase() : def; }
function ceDefaultTierText(style, tier){ return style === 'attax' || style === 'legend' || style === 'allround' ? ceTierLabel(tier) : tier.toUpperCase(); }
// Pill width that fits txt (900 weight, size px, letter spacing ls), clamped to [min, max].
function cePillW(ctx, txt, size, ls, min, max){
  ceSpacing(ctx, ls); ctx.font = '900 ' + size + 'px ' + CE_FONT;
  var w = ctx.measureText(txt).width + 12;
  ceSpacing(ctx, 0);
  return Math.min(max, Math.max(min, w));
}
function ceStatus(msg){ var el = $('ceStatus'); if(el) el.textContent = msg || ''; }

function ceDialog(){
  var d = $('cardExportDialog');
  if(d) return d;
  d = document.createElement('dialog');
  d.id = 'cardExportDialog';
  d.className = 'ce-dialog no-pl';
  var tierOpts = CE_TIERS.map(function(t){ return '<option value="' + t + '">' + t.toUpperCase() + '</option>'; }).join('');
  d.innerHTML = '<div class="dlg-head"><h3>🖨️ ' + crL('Xuất thẻ để in', 'Export card for printing') + ' · 54 × 86 mm</h3>' +
    '<button type="button" class="dlg-x ghost" title="' + escapeHtml(crL('Đóng', 'Close')) + '">✕</button></div>' +
    '<div class="ce-wrap"><div class="ce-preview no-i18n" id="cePreview"></div><div class="ce-side">' +
    '<label class="ce-field"><span>' + crL('Tuyển thủ', 'Player') + '</span><select id="ceTeam" class="no-i18n"></select></label>' +
    '<div class="ce-field"><span>' + crL('Mẫu thẻ', 'Design') + '</span><div class="ce-seg ce-styles">' +
      CE_STYLES.map(function(s){
        return '<button type="button" data-ce-style="' + s.k + '" title="' + escapeHtml(crL(s.vi, s.en)) + '"><span class="ce-thumb no-i18n"></span>' +
          '<span class="ce-lbl">' + s.icon + ' ' + crL(s.vi, s.en) + '</span></button>';
      }).join('') + '</div></div>' +
    '<label class="ce-field"><span>' + crL('Hạng thẻ', 'Card tier') + '</span><select id="ceTier"><option value="" id="ceTierAuto"></option>' + tierOpts + '</select></label>' +
    '<label class="ce-field"><span>' + crL('Chữ hiển thị hạng (để trống = mặc định)', 'Tier label text (empty = default)') + '</span><input type="text" id="ceLabel" class="no-i18n" maxlength="18" autocomplete="off"></label>' +
    '<div class="ce-av" id="ceAvBox"><div class="ce-field"><span>' + crL('Ảnh đại diện', 'Avatar') + '</span></div>' +
      '<label class="ce-check"><input type="checkbox" id="ceAvOn"> ' + crL('Hiện ảnh trên thẻ (tắt = hiện logo CLB)', 'Show the photo on the card (off = club logo)') + '</label>' +
      '<div class="ce-av-ctl" id="ceAvCtl"><div class="ce-av-btns"><button type="button" id="ceAvPick">📁 ' + crL('Chọn ảnh từ máy…', 'Choose a photo…') + '</button>' +
      '<button type="button" class="ghost" id="ceAvReset">↺ ' + crL('Ảnh mặc định', 'Default image') + '</button>' +
      '<button type="button" id="ceAvCut">✂️ ' + crL('Tách nền', 'Remove background') + '</button>' +
      '<button type="button" class="ghost" id="ceAvOrig">↶ ' + crL('Ảnh gốc', 'Original photo') + '</button>' +
      '<input type="file" id="ceAvFile" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>' +
      '<label class="ce-range"><span>' + crL('Phóng to', 'Zoom') + '</span><input type="range" id="ceZoom" min="50" max="250" step="1"></label>' +
      '<label class="ce-range"><span>' + crL('Ngang', 'Left / right') + '</span><input type="range" id="ceX" min="-50" max="50" step="1"></label>' +
      '<label class="ce-range"><span>' + crL('Dọc', 'Up / down') + '</span><input type="range" id="ceY" min="-50" max="50" step="1"></label>' +
      '<small class="muted">' + crL('Ảnh được lưu theo từng tuyển thủ trên trình duyệt này. Ảnh PNG nền trong suốt dùng được ngay (mẫu Đội hình năm cho ảnh tràn ra khỏi khung). Ảnh có nền: bấm ✂️ Tách nền — nền trơn tách ngay, nền phức tạp dùng AI (lần đầu cần Internet, tải ~25 MB).',
        'Photos are saved per player in this browser. Transparent PNGs work as is (the Team of the Year design lets them break out of the frame). Photo with a background: press ✂️ Remove background — plain backgrounds are removed instantly, others with AI (first use needs Internet, ~25 MB).') + '</small></div></div>' +
    '<div class="ce-av" id="ceBtBox" hidden><div class="ce-field"><span>' + crL('Chữ trên mặt sau', 'Text on the card back') + '</span>' +
      '<input type="text" id="ceBtTxt" class="no-i18n" maxlength="40" autocomplete="off" placeholder="' + escapeHtml(crL('Nhập chữ muốn in (để trống = không in)', 'Text to print (empty = none)')) + '"></div>' +
      '<div class="ce-seg"><button type="button" data-ce-bt-dir="h">↔ ' + crL('Ngang', 'Horizontal') + '</button><button type="button" data-ce-bt-dir="v">↕ ' + crL('Dọc', 'Vertical') + '</button></div>' +
      '<label class="ce-range"><span>' + crL('Màu chữ', 'Colour') + '</span><select id="ceBtCol">' +
        '<option value="gold">' + crL('Vàng kim', 'Gold') + '</option><option value="silver">' + crL('Bạc', 'Silver') + '</option>' +
        '<option value="white">' + crL('Trắng', 'White') + '</option><option value="black">' + crL('Đen', 'Black') + '</option></select></label>' +
      '<label class="ce-range"><span>' + crL('Cỡ chữ', 'Size') + '</span><input type="range" id="ceBtSize" min="10" max="64" step="1"></label>' +
      '<label class="ce-range"><span>' + crL('Vị trí ngang', 'Left / right') + '</span><input type="range" id="ceBtX" min="0" max="100" step="0.5"></label>' +
      '<label class="ce-range"><span>' + crL('Vị trí dọc', 'Up / down') + '</span><input type="range" id="ceBtY" min="0" max="100" step="0.5"></label>' +
      '<div class="ce-av-btns"><button type="button" class="ghost" id="ceBtReset">↺ ' + crL('Đặt lại vị trí', 'Reset position') + '</button></div>' +
      '<small class="muted">' + crL('Kéo chữ trực tiếp trên ảnh xem trước để di chuyển. Font Oswald (có dấu tiếng Việt). Chữ dùng chung cho mọi mặt sau, lưu trên trình duyệt này.',
        'Drag the text on the preview to move it. Font: Oswald. The text is shared by every card back and saved in this browser.') + '</small></div>' +
    '<div class="ce-actions"><button type="button" class="primary" id="ceDownload">⬇️ ' + crL('Tải PNG 300 DPI', 'Download PNG 300 DPI') + '</button>' +
      '<button type="button" id="cePrint">🖨️ ' + crL('In / Lưu PDF', 'Print / Save PDF') + '</button></div>' +
    '<div class="ce-default" id="ceDefBox" hidden><div class="muted" id="ceDefInfo"></div><div class="ce-actions">' +
      '<button type="button" id="ceSetDefault" title="' + escapeHtml(crL('Lưu mẫu, hạng và ảnh này (ảnh tải lên git) làm thẻ hiển thị ở trang Sự nghiệp; chỉ số vẫn cập nhật theo thời gian thực.',
        'Save this design, tier and photo (uploaded to git) as the card shown on the Career page; stats stay live.')) + '">⭐ ' + crL('Đặt làm thẻ sự nghiệp', 'Set as career card') + '</button>' +
      '<button type="button" class="ghost" id="ceClearDefault">✖ ' + crL('Bỏ thẻ mặc định', 'Remove default card') + '</button></div>' +
      '<div class="muted ce-glob" id="ceGlobInfo"></div><div class="ce-actions">' +
      '<button type="button" id="ceSetGlobal" title="' + escapeHtml(crL('Dùng mẫu này (hạng tự động, ảnh mặc định) cho thẻ sự nghiệp của mọi người chưa có thẻ riêng.',
        'Use this design (auto tier, default photo) for the career card of everyone without their own card.')) + '">🌐 ' + crL('Đặt mẫu này cho tất cả', 'Use this design for everyone') + '</button>' +
      '<button type="button" class="ghost" id="ceClearGlobal">✖ ' + crL('Bỏ mẫu chung', 'Remove the design for everyone') + '</button></div></div>' +
    '<div class="ce-status" id="ceStatus"></div>' +
    '<div class="muted ce-note">' + crL('Ảnh ' + CE_PX_W + ' × ' + CE_PX_H + ' px = đúng 54 × 86 mm ở 300 DPI. Khi in chọn tỉ lệ 100% (Actual size), lề = None.',
      'Image ' + CE_PX_W + ' × ' + CE_PX_H + ' px = exactly 54 × 86 mm at 300 DPI. When printing choose scale 100% (Actual size), margins = None.') + '</div>' +
    '</div></div>';
  document.body.appendChild(d);

  d.addEventListener('click', function(e){
    var t = e.target;
    if(t === d){
      var r = d.getBoundingClientRect();
      if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
      return;
    }
    var st = t.closest('[data-ce-style]');
    if(st){
      ce.style = st.getAttribute('data-ce-style');
      if(!ceIsBack(ce.style)) try { localStorage.setItem('pesCardStyle', ce.style); } catch(_){}
      ceRender();
      return;
    }
    var bd = t.closest('[data-ce-bt-dir]');
    if(bd){ ce.bt.vert = bd.getAttribute('data-ce-bt-dir') === 'v'; ceBtChanged(true); return; }
    if(t.closest('#ceBtReset')){ ce.bt.x = 50; ce.bt.y = ce.bt.vert ? 50 : 9; ceBtChanged(true); return; }
    if(t.closest('#ceAvPick')){ $('ceAvFile').click(); return; }
    if(t.closest('#ceAvReset')){ ce.av = null; ceAvPut(ce.name, null); ceLoadAvatar().then(ceRender); return; }
    if(t.closest('#ceAvCut')){ ceCutBackground(); return; }
    if(t.closest('#ceAvOrig')){
      if(ce.av && ce.av.orig){
        ce.av = { src: ce.av.orig, zoom: ce.av.zoom || 1, x: ce.av.x || 0, y: ce.av.y || 0 };
        ceAvPut(ce.name, ce.av);
        ceStatus('');
        ceLoadAvatar().then(ceRender);
      }
      return;
    }
    if(t.closest('#ceSetDefault')){ ceSetDefault(); return; }
    if(t.closest('#ceClearDefault')){ ceClearDefault(); return; }
    if(t.closest('#ceSetGlobal')){ ceSetGlobalDefault(); return; }
    if(t.closest('#ceClearGlobal')){ ceClearGlobalDefault(); return; }
    if(t.closest('#ceDownload')){ ceDownload(); return; }
    if(t.closest('#cePrint')){ cePrint(); }
  });
  d.addEventListener('change', function(e){
    var id = e.target.id;
    if(id === 'ceZoom' || id === 'ceX' || id === 'ceY') ceRenderThumbs();
    else if(id === 'ceTeam') ceSelect(e.target.value);
    else if(id === 'ceTier'){ ce.tier = e.target.value; ceLoadAvatar().then(ceRender); }
    else if(id === 'ceAvOn'){ ce.noAv = !e.target.checked; ceRender(); }
    else if(id === 'ceBtCol'){ ce.bt.col = e.target.value; ceBtChanged(true); }
    else if(id === 'ceBtTxt' || id === 'ceBtSize' || id === 'ceBtX' || id === 'ceBtY') ceRenderThumbs();
    else if(id === 'ceAvFile'){
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if(!f) return;
      if(!/^image\//.test(f.type)){ ceStatus(crL('❌ File không phải ảnh', '❌ Not an image file')); return; }
      ceStatus('⏳ ' + crL('Đang đọc ảnh…', 'Reading image…'));
      var name = ce.name;
      ceReadFile(f).then(function(src){
        if(name !== ce.name) return;
        ce.av = { src: src, zoom: 1, x: 0, y: 0 };
        ceAvPut(name, ce.av);
        ceStatus('');
        return ceLoadAvatar().then(ceRender);
      }).catch(function(){ ceStatus(crL('❌ Không đọc được ảnh', '❌ Could not read the image')); });
    }
  });
  d.addEventListener('input', function(e){
    var id = e.target.id, k = id === 'ceZoom' ? 'zoom' : id === 'ceX' ? 'x' : id === 'ceY' ? 'y' : null;
    if(id === 'ceLabel'){ ce.label = e.target.value; ceRender(); return; }
    if(id === 'ceBtTxt'){ ce.bt.txt = e.target.value; ceBtChanged(false); ceBtFont().then(ceDrawPreview); return; }
    if(id === 'ceBtSize' || id === 'ceBtX' || id === 'ceBtY'){ ce.bt[id === 'ceBtSize' ? 'size' : id === 'ceBtX' ? 'x' : 'y'] = +e.target.value; ceBtChanged(false); return; }
    if(!k) return;
    ce.av = ce.av || { src: null, zoom: 1, x: 0, y: 0 };
    ce.av[k] = k === 'zoom' ? +e.target.value / 100 : +e.target.value;
    ceDrawPreview();
    var name = ce.name, rec = ce.av;
    clearTimeout(ce.saveT);
    ce.saveT = setTimeout(function(){ ceAvPut(name, rec.src || rec.zoom !== 1 || rec.x || rec.y ? rec : null); }, 400);
  });
  ceBtDrag(d);
  return d;
}

// ---------------- Card back text ----------------
// thumbs: also redraw the design buttons (not while typing / dragging).
function ceBtChanged(thumbs){
  try { localStorage.setItem('pesCardBackText', JSON.stringify(ce.bt)); } catch(e){}
  ceBtSync();
  ceDrawPreview();
  if(thumbs) ceRenderThumbs();
}
function ceBtSync(){
  var bt = ce.bt, d = $('cardExportDialog');
  if(!d) return;
  var tx = $('ceBtTxt');
  if(tx.value !== bt.txt) tx.value = bt.txt;
  $('ceBtCol').value = CE_BT_COLS[bt.col] ? bt.col : 'gold';
  $('ceBtSize').value = bt.size; $('ceBtX').value = bt.x; $('ceBtY').value = bt.y;
  [].forEach.call(d.querySelectorAll('[data-ce-bt-dir]'), function(b){ b.classList.toggle('active', (b.getAttribute('data-ce-bt-dir') === 'v') === !!bt.vert); });
  $('cePreview').classList.toggle('ce-drag', ceIsBack(ce.style) && !!String(bt.txt || '').trim());
}
// Loads the Oswald glyphs needed for the current text (Google Fonts serves Vietnamese as its own subset).
function ceBtFont(){
  var txt = String(ce.bt.txt || '').trim();
  if(!txt || !document.fonts || !document.fonts.load) return Promise.resolve();
  return document.fonts.load('700 30px ' + CE_BT_FONT, txt).catch(function(){});
}
// Drag the text on the preview (pointer inside the text keeps its grab offset, elsewhere the text jumps there).
function ceBtDrag(d){
  var box = d.querySelector('#cePreview'), drag = null;
  function pos(e){
    var cv = box.querySelector('canvas'), r = cv && cv.getBoundingClientRect();
    return r && r.width ? { x: (e.clientX - r.left) / r.width * CE_W, y: (e.clientY - r.top) / r.height * CE_H } : null;
  }
  function move(e, p){
    ce.bt.x = Math.round(Math.max(0, Math.min(100, (p.x + drag.dx) / CE_W * 100)) * 2) / 2;
    ce.bt.y = Math.round(Math.max(0, Math.min(100, (p.y + drag.dy) / CE_H * 100)) * 2) / 2;
    ceBtChanged(false);
  }
  box.addEventListener('pointerdown', function(e){
    if(!ceIsBack(ce.style) || !String(ce.bt.txt || '').trim() || e.button) return;
    var p = pos(e);
    if(!p) return;
    var b = CE_BT_BOX, cx = ce.bt.x / 100 * CE_W, cy = ce.bt.y / 100 * CE_H;
    var inside = b && p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6;
    drag = { id: e.pointerId, dx: inside ? cx - p.x : 0, dy: inside ? cy - p.y : 0 };
    try { box.setPointerCapture(e.pointerId); } catch(_){}
    e.preventDefault();
    move(e, p);
  });
  box.addEventListener('pointermove', function(e){
    if(!drag || e.pointerId !== drag.id) return;
    var p = pos(e);
    if(p) move(e, p);
  });
  function end(e){
    if(!drag || e.pointerId !== drag.id) return;
    drag = null;
    ceRenderThumbs();
  }
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
}

function ceLoadAvatar(){
  var seq = ce.seq, src = ce.av && ce.av.src;
  return (src ? ceLoadImg(src).catch(function(){ return ceDefaultAvatar(ceTier()); }) : ceDefaultAvatar(ceTier()))
    .then(function(img){ if(seq === ce.seq){ ce.avImg = img; ce.avAlpha = !src || ceHasAlpha(img); } }, function(){ if(seq === ce.seq){ ce.avImg = null; ce.avAlpha = false; } });
}

function ceSelect(name){
  var cd = careerData(state), seq = ++ce.seq, prof = ceProfile(name), glob = !prof && ceGlobalDefault();
  ce.name = name;
  ce.card = careerFifaCard(cd, name);
  ce.rank = ce.ranks[name] || 0;
  ce.av = null; ce.avImg = null; ce.avAlpha = false; ce.logoImg = null; ce.team = null;
  if(prof){
    if(CE_STYLES.some(function(s){ return s.k === prof.style; })) ce.style = prof.style;
    ce.tier = CE_TIERS.indexOf(prof.tier) >= 0 ? prof.tier : '';
    ce.label = prof.label || '';
    ce.noAv = !!prof.noAv;
  } else if(glob){
    ce.style = glob.style;
    ce.noAv = !!glob.noAv;
  }
  ceRender();
  if(!ce.card) return Promise.resolve();
  return Promise.all([
    ceAvGet(name).then(function(rec){ return ceProfileAv(prof, rec); }).then(function(av){ if(seq === ce.seq) ce.av = av; return ceLoadAvatar(); }),
    ceSafeImg(ce.card.logo).then(function(img){ if(seq === ce.seq){ ce.logoImg = img; ce.team = ceLogoColors(img); } })
  ]).then(function(){ if(seq === ce.seq) ceRender(); });
}

function ceDrawPreview(){
  var cv = document.querySelector('#cePreview canvas');
  if(cv && ce.card && ce.style !== 'career') ceDrawStyle(cv, ce.style);
}

// Small previews inside the design buttons.
function ceRenderThumbs(){
  var d = $('cardExportDialog');
  if(!d || !ce.card) return;
  [].forEach.call(d.querySelectorAll('[data-ce-style]'), function(b){
    var k = b.getAttribute('data-ce-style'), t = b.querySelector('.ce-thumb');
    if(!t) return;
    if(k === 'career'){ t.innerHTML = ceCareerCardHtml(ce.card, ceTier(), ce.label); return; }
    var cv = t.querySelector('canvas');
    if(!cv){ t.innerHTML = ''; cv = t.appendChild(document.createElement('canvas')); }
    ceDrawStyle(cv, k, 0.4);
  });
}

function ceRender(){
  var d = $('cardExportDialog'), box = $('cePreview');
  if(!d || !box) return;
  [].forEach.call(d.querySelectorAll('[data-ce-style]'), function(b){ b.classList.toggle('active', b.getAttribute('data-ce-style') === ce.style); });
  var auto = $('ceTierAuto');
  if(auto) auto.textContent = crL('Tự động', 'Auto') + (ce.card ? ' (' + ce.card.tier.toUpperCase() + ')' : '');
  $('ceTier').value = ce.tier;
  var lbl = $('ceLabel');
  if(lbl.value !== ce.label) lbl.value = ce.label;
  lbl.placeholder = ceDefaultTierText(ce.style, ceTier());
  var back = ceIsBack(ce.style);
  $('ceTier').closest('.ce-field').hidden = back;
  lbl.closest('.ce-field').hidden = back;
  $('ceBtBox').hidden = !back;
  ceBtSync();
  $('ceAvBox').hidden = ce.style === 'career' || back;
  $('ceAvOn').checked = !ce.noAv;
  $('ceAvCtl').hidden = !!ce.noAv;
  var av = ce.av || {};
  $('ceAvCut').hidden = !av.src || !!av.orig;
  $('ceAvOrig').hidden = !av.orig;
  $('ceZoom').value = Math.round((av.zoom || 1) * 100);
  $('ceX').value = av.x || 0;
  $('ceY').value = av.y || 0;
  ['ceDownload', 'cePrint', 'ceSetDefault'].forEach(function(id){ $(id).disabled = !ce.card; });
  ceRenderDefaultBox();
  if(!ce.card){ box.innerHTML = '<div class="muted">' + crL('Chưa có dữ liệu trận đấu.', 'No match data yet.') + '</div>'; return; }
  ceRenderThumbs();
  if(ce.style !== 'career'){
    if(!box.querySelector('canvas')){ box.innerHTML = ''; box.appendChild(document.createElement('canvas')); }
    ceDrawPreview();
  } else {
    box.innerHTML = ceCareerCardHtml(ce.card, ceTier(), ce.label);
    ceFitName(box);
  }
}

function ceBusy(on, msg){
  ['ceDownload', 'cePrint', 'ceAvCut', 'ceSetDefault', 'ceClearDefault', 'ceSetGlobal', 'ceClearGlobal'].forEach(function(id){ var b = $(id); if(b) b.disabled = on || !ce.card; });
  ceStatus(msg);
}
function ceFail(err){
  console.error('Card export failed:', err);
  ceBusy(false, crL('❌ Không tạo được ảnh: ', '❌ Could not create the image: ') + (err && err.message ? err.message : err));
}

function ceDownload(){
  if(!ce.card) return;
  ceBusy(true, '⏳ ' + crL('Đang tạo ảnh…', 'Creating image…'));
  ceRenderPng().then(function(blob){
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = ceFileName();
    $('cardExportDialog').appendChild(a); // inside the modal dialog: the rest of the page is inert
    a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    ceBusy(false, '✅ ' + crL('Đã tải ', 'Downloaded ') + ceFileName());
  }).catch(ceFail);
}

// Prints through a hidden iframe whose page size is exactly 54 x 86 mm (works for "Save as PDF" too).
function cePrint(){
  if(!ce.card) return;
  ceBusy(true, '⏳ ' + crL('Đang chuẩn bị bản in…', 'Preparing print…'));
  ceRenderPng().then(blobToDataUrl).then(function(url){
    var old = $('cePrintFrame');
    if(old) old.remove();
    var fr = document.createElement('iframe');
    fr.id = 'cePrintFrame';
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(fr);
    var doc = fr.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(ce.name + ' 54x86mm') + '</title><style>' +
      '@page{size:54mm 86mm;margin:0}html,body{margin:0;padding:0}img{display:block;width:54mm;height:86mm}</style></head><body><img alt=""></body></html>');
    doc.close();
    var img = doc.images[0];
    img.onload = function(){
      ceBusy(false, '');
      setTimeout(function(){ try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch(e){ ceFail(e); } }, 100);
    };
    img.onerror = function(){ ceFail(new Error('print image')); };
    img.src = url;
  }).catch(ceFail);
}

function openCardExport(name){
  var d = ceDialog(), cd = careerData(state);
  var only = typeof statsMasterOnly !== 'undefined' && statsMasterOnly && (state.teamMasterList || []).length;
  var table = careerEloTable(cd, !!only);
  ce.ranks = {};
  table.forEach(function(t, i){ ce.ranks[t.name] = i + 1; });
  var names = table.map(function(t){ return t.name; }).sort(function(a, b){ return a.localeCompare(b); });
  if(name && names.indexOf(name) === -1) names.unshift(name);
  name = name || names[0] || null;
  $('ceTeam').innerHTML = names.map(function(n){ return '<option value="' + escapeHtml(n) + '"' + (n === name ? ' selected' : '') + '>' + escapeHtml(n) + '</option>'; }).join('');
  ce.tier = ''; ce.label = ''; ce.noAv = false;
  ceStatus('');
  if(!d.open) d.showModal();
  if(name) ceSelect(name); else { ce.card = null; ceRender(); }
  ceFonts().then(ceBtFont).then(function(){ if(d.open && ce.card) ceRender(); });
}

var CE_FONTS = null;
function ceFonts(){
  if(!CE_FONTS) CE_FONTS = !document.fonts || !document.fonts.load ? Promise.resolve() :
    Promise.all(['800 14px Inter', '900 30px Inter', '700 30px ' + CE_BT_FONT].map(function(f){ return document.fonts.load(f).catch(function(){}); }));
  return CE_FONTS;
}

document.addEventListener('click', function(e){
  var b = e.target && e.target.closest && e.target.closest('#spCardExport');
  if(b){ e.preventDefault(); openCardExport(b.getAttribute('data-name') || (typeof statsCareer !== 'undefined' ? statsCareer : null)); }
});
