// Marvell PES Club - core/auth.js
// Username/password login backed by the systems.json registry (see systems.js).
// - Passwords are stored only as salted PBKDF2-SHA256 hashes (WebCrypto).
// - Permissions: role 'admin' = super admin (everything, every system). Every other user has
//   `perms` (list of PES_PERMS ids, ticked in the Systems & Users dialog) that apply to the
//   systems listed in `systems`. Old registries with role mod/sup/player map via LEGACY_ROLE_PERMS.
// - Optional cloud write grant: the admin's GitHub PAT encrypted with AES-GCM using a key
//   derived from the user's password, so only someone who knows that password can unlock it.
//   It is only unlocked for users holding a write permission (PERM_WRITE).
// NOTE: UI gating is client-side only; the real write protection is the GitHub token.

var AUTH_KEY = 'pesAuth';
var SESSION_PAT_KEY = 'pesSessPAT';
var LAST_USER_KEY = 'pesLastUser';
var PBKDF2_ITER = 150000;
var USERNAME_RE = /^[a-z0-9._-]{3,24}$/;
var MIN_PASSWORD_LEN = 8;

// Permission table (columns of the Systems & Users dialog). `needs`: permissions it depends on.
var PES_PERMS = [
  { id: 'edit',    icon: '🛠️', vi: 'Quản lý giải',  en: 'Manage seasons',
    viT: 'Tạo/sửa/xoá mùa giải, đội, cài đặt, nhánh đấu, random, backup, link/ghi chú, Hall of Legend…',
    enT: 'Create/edit/delete seasons, teams, settings, brackets, random, backups, links/notes, Hall of Legend…' },
  { id: 'score',   icon: '⚽', vi: 'Nhập tỉ số',    en: 'Enter scores',
    viT: 'Nhập / sửa tỉ số trận đấu (kể cả 🎮 tỉ số từng trận KO)', enT: 'Enter / edit match scores (incl. 🎮 KO game scores)' },
  { id: 'approve', icon: '✅', vi: 'Duyệt kết quả', en: 'Approve results', needs: ['score'],
    viT: 'Duyệt / cho gửi lại kết quả do người chơi gửi (cần quyền Nhập tỉ số)', enT: 'Approve / reopen results sent by players (needs Enter scores)' },
  { id: 'submit',  icon: '📨', vi: 'Gửi kết quả',   en: 'Submit results',
    viT: 'Gửi kết quả chờ duyệt, mỗi trận 1 lần (không dùng khi đã có quyền Nhập tỉ số)', enT: 'Submit results for approval, once per match (unused with Enter scores)' },
  { id: 'export',  icon: '📤', vi: 'Export vòng',   en: 'Export round',
    viT: 'Xuất text + ảnh vòng đấu (Slack)', enT: 'Export round text + image (Slack)' },
  { id: 'cards',   icon: '🃏', vi: 'Thẻ cầu thủ',   en: 'Player cards',
    viT: 'Đặt thẻ sự nghiệp mặc định, ảnh thẻ, mẫu thẻ chung', enT: 'Set default career cards, card photos, global card style' }
];
// Permissions that write data (only these may unlock / use the cloud token).
var PERM_WRITE = ['edit', 'score', 'approve', 'cards'];
var LEGACY_ROLE_PERMS = {
  mod: ['edit', 'score', 'approve', 'export', 'cards'],
  sup: ['score', 'export'],
  player: ['submit']
};
function permDef(id){ return PES_PERMS.filter(function(p){ return p.id === id; })[0] || null; }
function permLabel(p, title){
  var en = localStorage.getItem('pesLang') !== 'vi';
  return title ? (en ? p.enT : p.viT) : (en ? p.en : p.vi);
}

// Effective permission ids of a registry user or a session ({role, perms}).
function userPerms(user){
  if(!user) return [];
  if(user.role === 'admin') return PES_PERMS.map(function(p){ return p.id; });
  var src = Array.isArray(user.perms) ? user.perms : (LEGACY_ROLE_PERMS[user.role] || []);
  var out = PES_PERMS.map(function(p){ return p.id; }).filter(function(id){ return src.indexOf(id) !== -1; });
  return out.filter(function(id){
    return (permDef(id).needs || []).every(function(n){ return out.indexOf(n) !== -1; });
  });
}
function userCanWrite(user){
  return userPerms(user).some(function(p){ return PERM_WRITE.indexOf(p) !== -1; });
}

// ---------- Session / permissions ----------
function authSession(){
  try {
    var a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
    return (a && a.u) ? a : null;
  } catch(_) { return null; }
}
function authStoreSession(user){
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({
    u: user.u, role: user.role, systems: (user.systems || []).slice(), perms: userPerms(user)
  }));
}
function isSuperAdmin(){ var a = authSession(); return !!(a && a.role === 'admin'); }
// Logged-in user is assigned to system `id` (super admin: every system).
function canAccessSystem(id){
  var a = authSession();
  if(!a) return false;
  return a.role === 'admin' || (Array.isArray(a.systems) && a.systems.indexOf(id) !== -1);
}
// Permission `perm` in system `id` (default: the current system).
function hasPerm(perm, id){
  var a = authSession();
  return canAccessSystem(id || PES_SYSTEM_ID) && userPerms(a).indexOf(perm) !== -1;
}
function hasAnyPerm(list, id){ return list.some(function(p){ return hasPerm(p, id); }); }
function canEditSystem(id){ return hasPerm('edit', id); }
// "Admin mode" for the current system (used everywhere in the app to gate editing UI).
// isAdminUser(): 'edit' permission. isAdmin(): permission AND the active season is not locked
// (a locked season is finished and read-only until it is unlocked in Settings).
function isAdminUser(){ return canEditSystem(PES_SYSTEM_ID); }
function seasonLocked(s){
  if(s === undefined){ try { s = (typeof state !== 'undefined' && state && state.seasons) ? state.seasons[state.current] : null; } catch(_) { s = null; } }
  return !!(s && s.locked);
}
function isAdmin(){ return isAdminUser() && !seasonLocked(); }
function canScoreUser(){ return hasPerm('score'); }
function canApproveResults(){ return hasPerm('approve'); }
function canExportRound(){ return hasPerm('export'); }
function canEditCards(){ return hasPerm('cards'); }
function canWriteCloud(){ return hasAnyPerm(PERM_WRITE); }
// "Player mode": may only submit results for approval (users who can enter scores do that directly).
function isPlayer(){ return hasPerm('submit') && !hasPerm('score'); }
// Score inputs of the active season (locked seasons stay read-only).
function canEditScores(){ return canScoreUser() && !seasonLocked(); }

// Legacy flag still read by teo-widget.js.
function syncLegacyAdminFlag(){
  try {
    if(isAdminUser()) sessionStorage.setItem('pesAdmin', '1');
    else sessionStorage.removeItem('pesAdmin');
  } catch(_) {}
}

function ensureAdmin(){
  if(isAdminUser()) return true;
  openAdminLogin();
  return false;
}

// For actions that modify the active season's structure or results.
function ensureSeasonEditable(){
  if(!ensureAdmin()) return false;
  if(seasonLocked()){
    alert((localStorage.getItem('pesLang') === 'vi')
      ? '🔒 Mùa giải này đã bị khóa (đã kết thúc). Mở khóa trong menu Mùa giải trước khi chỉnh sửa.'
      : '🔒 This season is locked (finished). Unlock it from the Seasons menu before editing.');
    return false;
  }
  return true;
}

function openAdminLogin(){
  var dlg = $('adminLoginDialog');
  if(!dlg) return;
  var userIn = $('adminUserInput'), passIn = $('adminPassInput'), err = $('adminPassError');
  if(userIn && !userIn.value){ try { userIn.value = localStorage.getItem(LAST_USER_KEY) || ''; } catch(_) {} }
  if(passIn) passIn.value = '';
  if(err) err.style.display = 'none';
  if(typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', 'open');
  setTimeout(function(){
    var target = (userIn && !userIn.value) ? userIn : passIn;
    if(target) target.focus();
  }, 50);
}

function updateAuthButton(){
  var b = $('btnAdmin');
  if(!b) return;
  var a = authSession();
  b.textContent = '';
  if(a){
    b.appendChild(document.createTextNode('👤 '));
    var s = document.createElement('span');
    s.className = 'no-i18n';
    s.textContent = a.u;
    b.appendChild(s);
    b.title = 'Đăng xuất';
  } else {
    b.appendChild(document.createTextNode('🔑 '));
    var l = document.createElement('span');
    l.textContent = 'Đăng nhập';
    b.appendChild(l);
    b.title = 'Đăng nhập';
  }
}

// ---------- Crypto helpers ----------
function bufToB64(buf){
  var bytes = new Uint8Array(buf), s = '';
  for(var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBuf(b64){
  var s = atob(b64), bytes = new Uint8Array(s.length);
  for(var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}
function randB64(n){ return bufToB64(crypto.getRandomValues(new Uint8Array(n))); }
function hasWebCrypto(){ return !!(window.crypto && crypto.subtle && crypto.getRandomValues); }

function pbkdf2Key(password, saltB64, iter){
  return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey'])
    .then(function(base){
      return { base: base, params: { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBuf(saltB64), iterations: iter } };
    });
}

function hashPassword(password, saltB64, iter){
  return pbkdf2Key(password, saltB64, iter).then(function(k){
    return crypto.subtle.deriveBits(k.params, k.base, 256);
  }).then(bufToB64);
}

function makePasswordRecord(password){
  var salt = randB64(16);
  return hashPassword(password, salt, PBKDF2_ITER).then(function(hash){
    return { salt: salt, hash: hash, iter: PBKDF2_ITER };
  });
}

// Constant-time-ish compare of two base64 strings.
function safeEqual(a, b){
  if(typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var r = 0;
  for(var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function verifyPassword(user, password){
  return hashPassword(password, user.salt, user.iter || PBKDF2_ITER).then(function(h){ return safeEqual(h, user.hash); });
}

function aesKey(password, saltB64, iter){
  return pbkdf2Key(password, saltB64, iter).then(function(k){
    return crypto.subtle.deriveKey(k.params, k.base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  });
}

function wrapToken(token, password){
  var salt = randB64(16), iv = crypto.getRandomValues(new Uint8Array(12));
  return aesKey(password, salt, PBKDF2_ITER).then(function(key){
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(token));
  }).then(function(ct){
    return { salt: salt, iv: bufToB64(iv), ct: bufToB64(ct), iter: PBKDF2_ITER };
  });
}

function unwrapToken(tok, password){
  return aesKey(password, tok.salt, tok.iter || PBKDF2_ITER).then(function(key){
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(tok.iv) }, key, b64ToBuf(tok.ct));
  }).then(function(pt){ return new TextDecoder().decode(pt); });
}

// ---------- Login / logout ----------
function findUser(reg, name){
  if(!reg || !Array.isArray(reg.users)) return null;
  return reg.users.filter(function(u){ return u.u === name; })[0] || null;
}

// Promise<{ok:boolean, error?:string, cloud?:boolean}>
function authLogin(username, password){
  var name = String(username || '').trim().toLowerCase();
  if(!hasWebCrypto()) return Promise.resolve({ ok: false, error: 'Trình duyệt không hỗ trợ mã hóa (cần HTTPS)' });
  if(!name || !password) return Promise.resolve({ ok: false });
  return loadRegistry().then(function(reg){
    var user = findUser(reg, name);
    if(!user || user.disabled) return { ok: false };
    return verifyPassword(user, password).then(function(match){
      if(!match) return { ok: false };
      try {
        authStoreSession(user);
        localStorage.setItem(LAST_USER_KEY, user.u);
      } catch(_) {}
      syncLegacyAdminFlag();
      updateAuthButton();
      // Unlock the shared PAT only if this browser has none of its own.
      if(user.tok && userCanWrite(user) && !CloudSync.pat){
        return unwrapToken(user.tok, password).then(function(pat){
          CloudSync.setSessionPAT(pat);
          return { ok: true, cloud: true };
        }).catch(function(e){
          console.warn('Cannot unlock cloud token:', e);
          return { ok: true, cloud: false };
        });
      }
      return { ok: true, cloud: !!CloudSync.pat };
    });
  }).catch(function(e){
    console.warn('Login failed:', e);
    return { ok: false, error: String(e.message || e) };
  });
}

function authLogout(silent){
  try {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('pesAdmin');
  } catch(_) {}
  if(typeof CloudSync !== 'undefined') CloudSync.clearSessionPAT();
  updateAuthButton();
  if(!silent) toast('Đã đăng xuất');
}

// Re-sync role/systems of the logged-in user with the latest registry.
// Returns true if the edit permission for the current system changed.
function refreshAuthFromRegistry(){
  var a = authSession();
  if(!a || !pesRegistry){ syncLegacyAdminFlag(); return false; }
  var sig = function(){ return isAdmin() + '|' + PES_PERMS.map(function(p){ return hasPerm(p.id) ? p.id : ''; }).join(','); };
  var before = sig();
  var user = findUser(pesRegistry, a.u);
  if(!user || user.disabled){
    authLogout(true);
    return before !== sig();
  }
  try { authStoreSession(user); } catch(_) {}
  if(!userCanWrite(user) && CloudSync.patFromSession) CloudSync.clearSessionPAT();
  syncLegacyAdminFlag();
  return before !== sig();
}
