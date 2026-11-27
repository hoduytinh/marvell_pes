// Marvell PES Club - features/card-profiles.js
// Default career card per player, set by an admin in the card export dialog ("⭐ Đặt làm thẻ sự nghiệp"):
//   state.cardProfiles[name] = { style, tier ('' = auto), label (custom tier text, optional), img (repo path, optional),
//                                noAv (true = photo turned off, optional), zoom, x, y, t }
// Only the design settings and the photo are stored (data.json, cloud-synced; the photo is uploaded to the repo
// under photos/cards/). Every career card (renderFifaCardHtml) of that player is then drawn live in that design
// on a canvas, with the current stats. Loaded after card-templates.js.
// Admins can also set a design for everyone ("🌐 Đặt mẫu này cho tất cả"): state.cardDefault = { style, noAv, t }
// (auto tier, default photo); a player's own profile always wins over it.

var CE_LIVE = { cards: {}, pending: {}, n: 0, img: {}, logo: {}, rk: null, rkKey: null, cd: null, obs: null, t: 0, until: 0 };

function ceProfile(name){
  var m = typeof state !== 'undefined' && state && state.cardProfiles;
  return m && name ? m[careerName(name)] || null : null;
}
function ceGlobalDefault(){
  var g = typeof state !== 'undefined' && state && state.cardDefault;
  return g && g.style && !ceIsBack(g.style) && CE_STYLES.some(function(s){ return s.k === g.style; }) ? g : null;
}
// Design used for the live career card: own profile, else the design set for everyone.
function ceLiveProfile(name){ return ceProfile(name) || (name ? ceGlobalDefault() : null); }
function ceStyleLabel(k){
  var s = CE_STYLES.filter(function(x){ return x.k === k; })[0];
  return s ? s.icon + ' ' + crL(s.vi, s.en) : k;
}
function ceSlug(name){
  return String(name || 'card').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'card';
}

// ---------------- Live cards ----------------
// Called by renderFifaCardHtml: '' = no profile (normal HTML card).
function ceLiveCardHtml(card){
  var p = ceLiveProfile(card.name);
  if(!p || !p.style || ceIsBack(p.style)) return '';
  var tier = CE_TIERS.indexOf(p.tier) >= 0 ? p.tier : card.tier;
  if(p.style === 'career' || !CE_DRAW[p.style]) return tier !== card.tier || p.label ? renderFifaCardHtml(crExt(card, { tier: tier, tierLabel: p.label || '', noLive: true })) : '';
  var id = 'l' + (++CE_LIVE.n), ks = Object.keys(CE_LIVE.cards);
  if(ks.length > 400) ks.slice(0, ks.length - 300).forEach(function(k){ delete CE_LIVE.cards[k]; delete CE_LIVE.pending[k]; });
  CE_LIVE.cards[id] = card;
  CE_LIVE.pending[id] = 1;
  ceLiveWatch();
  return '<div class="fifa-card fc-live tier-' + tier + '" data-ce-live="' + id + '" data-ce-name="' + escapeHtml(card.name) + '"><canvas></canvas></div>';
}

// Cards are usually inserted right after the HTML is built; an observer catches later insertions.
function ceLiveWatch(){
  CE_LIVE.until = Date.now() + 15000;
  ceLiveSchedule();
  if(!CE_LIVE.obs && window.MutationObserver && document.body){
    CE_LIVE.obs = new MutationObserver(ceLiveSchedule);
    CE_LIVE.obs.observe(document.body, { childList: true, subtree: true });
  }
}
function ceLiveSchedule(){
  if(!CE_LIVE.t) CE_LIVE.t = setTimeout(ceLiveScan, 0);
}
function ceLiveScan(){
  CE_LIVE.t = 0;
  [].forEach.call(document.querySelectorAll('[data-ce-live]:not([data-ce-drawn])'), ceLiveDraw);
  if(CE_LIVE.obs && (!Object.keys(CE_LIVE.pending).length || Date.now() > CE_LIVE.until)){
    CE_LIVE.obs.disconnect(); CE_LIVE.obs = null; CE_LIVE.pending = {};
  }
}

function ceLivePhoto(path, tier){
  var job = path ? (CE_LIVE.img[path] = CE_LIVE.img[path] || ceSafeImg(path)) : Promise.resolve(null);
  return job.then(function(img){
    if(img) return { img: img, alpha: ceHasAlpha(img) };
    return ceDefaultAvatar(tier).then(function(d){ return { img: d, alpha: true }; }, function(){ return { img: null, alpha: false }; });
  });
}
function ceLiveLogo(src){
  if(!src) return Promise.resolve({ img: null, team: null });
  if(!CE_LIVE.logo[src]) CE_LIVE.logo[src] = ceSafeImg(src).then(function(img){ return { img: img, team: img ? ceLogoColors(img) : null }; });
  return CE_LIVE.logo[src];
}
function ceLiveRank(name){
  var cd = careerData(state), only = !!(typeof statsMasterOnly !== 'undefined' && statsMasterOnly && (state.teamMasterList || []).length);
  if(CE_LIVE.cd !== cd || CE_LIVE.rkKey !== only){
    CE_LIVE.cd = cd; CE_LIVE.rkKey = only; CE_LIVE.rk = {};
    careerEloTable(cd, only).forEach(function(t, i){ CE_LIVE.rk[t.name] = i + 1; });
  }
  return CE_LIVE.rk[name] || 0;
}

function ceLiveDraw(el){
  el.setAttribute('data-ce-drawn', '1');
  var id = el.getAttribute('data-ce-live'), card = CE_LIVE.cards[id];
  delete CE_LIVE.pending[id];
  if(!card){ try { card = careerFifaCard(careerData(state), el.getAttribute('data-ce-name')); } catch(e){ card = null; } }
  var p = card && ceLiveProfile(card.name), cv = el.querySelector('canvas');
  if(!p || ceIsBack(p.style) || !CE_DRAW[p.style] || !cv) return;
  var tier = CE_TIERS.indexOf(p.tier) >= 0 ? p.tier : card.tier;
  var k = Math.min(3, Math.max(0.5, Math.max(el.clientWidth || 0, 230) * (window.devicePixelRatio || 1) / CE_W));
  Promise.all([p.noAv ? Promise.resolve({ img: null, alpha: false }) : ceLivePhoto(p.img, tier), ceLiveLogo(card.logo), ceFonts()]).then(function(r){
    ceDrawStyle(cv, p.style, k, { card: card, tier: tier, label: p.label || '', img: r[0].img, noAv: !!p.noAv, av: { zoom: p.zoom || 1, x: p.x || 0, y: p.y || 0 }, alpha: r[0].alpha,
      logo: r[1].img, team: r[1].team || { c1: [37, 99, 235], c2: [255, 255, 255] }, rank: card.rank != null ? card.rank : ceLiveRank(card.name) });
  }).catch(function(err){ console.error('Live card failed:', err); });
}

function ceRefreshCareerViews(){
  if(document.body.classList.contains('page-stats') && typeof renderStatsPage === 'function') renderStatsPage();
}

// ---------------- Export dialog: profile <-> avatar ----------------
// Avatar for the dialog: the profile photo, unless this browser has a newer local edit.
function ceProfileAv(prof, rec){
  if(!prof || (rec && (rec.t || 0) >= (prof.t || 0))) return Promise.resolve(rec);
  var av = { src: null, zoom: prof.zoom || 1, x: prof.x || 0, y: prof.y || 0 };
  if(!prof.img) return Promise.resolve(av);
  if(rec && rec.src && rec.remote === prof.img){ av.src = rec.src; av.remote = prof.img; return Promise.resolve(av); }
  return fetchAsDataUrl(new URL(prof.img, location.href).href).then(function(src){ av.src = src; av.remote = prof.img; return av; }, function(){ return rec; });
}

// Photo -> repo file (longest side <= 800 px; PNG if transparent, else JPEG). Unique name = no stale CDN copy.
function ceUploadPhoto(name, src){
  return ceLoadImg(src).then(function(im){
    var iw = im.naturalWidth, ih = im.naturalHeight, s = Math.min(1, 800 / Math.max(iw, ih)), c = document.createElement('canvas');
    c.width = Math.round(iw * s); c.height = Math.round(ih * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    var png = ceHasAlpha(im), url = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9);
    var sys = typeof PES_SYSTEM_ID === 'string' && PES_SYSTEM_ID !== DEFAULT_SYSTEM_ID ? ceSlug(PES_SYSTEM_ID) + '/' : '';
    var path = 'photos/cards/' + sys + ceSlug(name) + '-' + Date.now().toString(36) + (png ? '.png' : '.jpg');
    return ghWriteBase64(path, url.split(',')[1], 'Card photo: ' + careerName(name), CloudSync.pat).then(function(){
      if(typeof snapshotImageCache !== 'undefined') snapshotImageCache[new URL(path, location.href).href] = Promise.resolve(url);
      CE_LIVE.img[path] = ceLoadImg(url);
      return path;
    });
  });
}

function ceCanWriteCloud(){ return typeof CloudSync !== 'undefined' && CloudSync.canPush() && !!CloudSync.pat; }
// Promise<'ok'|'later'|'fail'|'local'>: result of the cloud sync.
function ceSaveProfiles(){
  saveAll();
  if(!ceCanWriteCloud()) return Promise.resolve('local');
  return CloudSync.push(state).then(function(ok){ return ok ? 'ok' : CloudSync.pushTimer || CloudSync.pushInProgress ? 'later' : 'fail'; }, function(){ return 'fail'; });
}
// Errors must be unmissable: a toast would sit behind the modal dialog.
function ceAlert(msg){ ceStatus(msg); alert(msg); }

function ceSetDefault(){
  var name = ce.name, av = ce.av || {};
  if(!name || !ce.card) return ceAlert('❌ ' + crL('Chưa chọn tuyển thủ có dữ liệu.', 'No player with data selected.'));
  if(!canEditCards()) return ceAlert('❌ ' + crL('Cần quyền 🃏 Thẻ cầu thủ để đặt thẻ sự nghiệp.', 'The 🃏 Player cards permission is required to set the career card.'));
  if(ceIsBack(ce.style)) return ceAlert('❌ ' + crL('Mặt sau không dùng làm thẻ sự nghiệp.', 'The card back cannot be a career card.'));
  if(!ceCanWriteCloud()) return ceAlert('❌ ' + crL('Chưa lưu được: cần bật Đồng bộ cloud và có GitHub PAT (quyền ghi) để lưu thẻ và ảnh lên git.',
    'Not saved: cloud sync must be ON with a GitHub PAT (write access) to save the card and photo to git.'));
  var key = careerName(name), old = ceProfile(name), style = ce.style;
  var rec = { style: style, tier: ce.tier || '', label: String(ce.label || '').trim(), zoom: av.zoom || 1, x: av.x || 0, y: av.y || 0, t: Date.now() };
  var useImg = style !== 'career' && !ce.noAv && av.src;
  if(ce.noAv && style !== 'career') rec.noAv = true;
  ceBusy(true, '⏳ ' + (useImg && !av.remote ? crL('Đang tải ảnh lên git…', 'Uploading the photo to git…') : crL('Đang lưu…', 'Saving…')));
  (useImg ? (av.remote ? Promise.resolve(av.remote) : ceUploadPhoto(name, av.src)) : Promise.resolve(null)).then(function(path){
    if(path) rec.img = path;
    state.cardProfiles = state.cardProfiles || {};
    state.cardProfiles[key] = rec;
    if(path && ce.name === name && ce.av === av){ av.remote = path; ceAvPut(name, av); }
    ceStatus('⏳ ' + crL('Đang đồng bộ lên cloud…', 'Syncing to the cloud…'));
    return ceSaveProfiles().then(function(sync){
      if(old && old.img && old.img !== rec.img) ghDeleteFile(old.img, 'Remove old card photo: ' + key, CloudSync.pat).catch(function(){});
      ceBusy(false, '');
      ceRender();
      ceRefreshCareerViews();
      var same = style === 'career' && !rec.tier && !rec.label ? crL(' (mẫu mặc định, hạng tự động: thẻ trông như cũ)', ' (default design, auto tier: the card looks unchanged)') : '';
      if(sync === 'fail') ceAlert('⚠️ ' + crL('Đã lưu thẻ sự nghiệp của ' + key + ' trên máy này nhưng đồng bộ cloud lỗi — kiểm tra trạng thái Sync rồi thử lại.',
        'Saved the career card of ' + key + ' on this device but the cloud sync failed — check the Sync status and retry.'));
      else ceStatus('✅ ' + crL('Đã lưu thẻ sự nghiệp của ', 'Saved the career card of ') + key + same +
        (sync === 'later' ? crL(' — đang chờ đồng bộ…', ' — sync pending…') : crL(' và đồng bộ lên cloud.', ' and synced to the cloud.')));
    });
  }).catch(function(err){
    console.error('Set default card failed:', err);
    ceBusy(false, '');
    ceAlert('❌ ' + crL('Không lưu được: ', 'Could not save: ') + (err && err.message ? err.message : err));
  });
}

function ceClearDefault(){
  var name = ce.name, p = ceProfile(name), key = careerName(name);
  if(!p || !canEditCards()) return;
  if(!confirm(crL('Bỏ thẻ sự nghiệp mặc định của ', 'Remove the default career card of ') + key + '?')) return;
  delete state.cardProfiles[key];
  ceSaveProfiles();
  if(p.img && ceCanWriteCloud()) ghDeleteFile(p.img, 'Remove card photo: ' + key, CloudSync.pat).catch(function(){});
  ceStatus('✅ ' + crL('Đã bỏ thẻ mặc định.', 'Default card removed.'));
  ceRender();
  ceRefreshCareerViews();
}

// Design for everyone (players without their own career card); tier stays automatic.
function ceSetGlobalDefault(){
  if(!canEditCards()) return ceAlert('❌ ' + crL('Cần quyền 🃏 Thẻ cầu thủ.', 'The 🃏 Player cards permission is required.'));
  if(ceIsBack(ce.style)) return ceAlert('❌ ' + crL('Mặt sau không dùng làm thẻ sự nghiệp.', 'The card back cannot be a career card.'));
  var label = ceStyleLabel(ce.style);
  if(!confirm(crL('Đặt mẫu ' + label + ' làm thẻ mặc định cho tất cả tuyển thủ (trừ người đã có thẻ riêng)?',
    'Use ' + label + ' as the default card for every player (except those with their own card)?'))) return;
  state.cardDefault = { style: ce.style, t: Date.now() };
  if(ce.noAv && ce.style !== 'career') state.cardDefault.noAv = true;
  ceGlobalSaved(crL('Đã đặt mẫu chung: ', 'Default design for everyone: ') + label);
}
function ceClearGlobalDefault(){
  if(!canEditCards() || !state.cardDefault) return;
  if(!confirm(crL('Bỏ mẫu thẻ mặc định chung (về thẻ Sự nghiệp)?', 'Remove the default design for everyone (back to the Career card)?'))) return;
  delete state.cardDefault;
  ceGlobalSaved(crL('Đã bỏ mẫu chung.', 'Default design for everyone removed.'));
}
function ceGlobalSaved(msg){
  ceBusy(true, '⏳ ' + crL('Đang lưu…', 'Saving…'));
  ceSaveProfiles().then(function(sync){
    ceBusy(false, '');
    ceRender();
    ceRefreshCareerViews();
    if(sync === 'fail') ceAlert('⚠️ ' + msg + crL(' — đã lưu trên máy này nhưng đồng bộ cloud lỗi.', ' — saved on this device but the cloud sync failed.'));
    else ceStatus('✅ ' + msg + (sync === 'ok' ? crL(' (đã đồng bộ cloud).', ' (synced to the cloud).') : sync === 'later' ? crL(' — đang chờ đồng bộ…', ' — sync pending…') : crL(' (chỉ trên máy này: chưa bật đồng bộ cloud).', ' (this device only: cloud sync is off).')));
  });
}

// Info + buttons under the export actions (admins only).
function ceRenderDefaultBox(){
  var box = $('ceDefBox');
  if(!box) return;
  var admin = typeof canEditCards === 'function' && canEditCards(), p = ce.card ? ceProfile(ce.name) : null, g = ceGlobalDefault();
  box.hidden = !admin || !ce.card || ceIsBack(ce.style);
  if(box.hidden) return;
  $('ceGlobInfo').textContent = '🌐 ' + crL('Mẫu chung cho tất cả: ', 'Default design for everyone: ') +
    (g ? ceStyleLabel(g.style) + (g.noAv ? crL(' · không ảnh', ' · no photo') : '') : crL('Sự nghiệp (mặc định)', 'Career (default)')) +
    crL(' — thẻ riêng của từng người sẽ ghi đè.', ' — a player\'s own card overrides it.');
  $('ceClearGlobal').hidden = !g;
  $('ceDefInfo').textContent = p
    ? crL('Thẻ sự nghiệp hiện tại: ', 'Current career card: ') + ceStyleLabel(p.style) + ' · ' + (p.tier ? p.tier.toUpperCase() : crL('hạng tự động', 'auto tier')) + (p.label ? ' «' + p.label + '»' : '') + (p.noAv ? crL(' · không ảnh', ' · no photo') : p.img ? crL(' · có ảnh', ' · with photo') : '')
    : g ? crL('Thẻ sự nghiệp của người này: theo mẫu chung.', 'This player\'s career card: the default design.') : crL('Thẻ sự nghiệp: mẫu mặc định.', 'Career card: default design.');
  $('ceClearDefault').hidden = !p;
}
