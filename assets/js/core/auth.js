// Marvell PES Club - core/auth.js
// Username/password login backed by the systems.json registry (see systems.js).
// - Passwords are stored only as salted PBKDF2-SHA256 hashes (WebCrypto).
// - Roles: 'admin' (everything) and 'mod' (edit the systems assigned to it).
// - Optional cloud write grant: the admin's GitHub PAT encrypted with AES-GCM using a key
//   derived from the user's password, so only someone who knows that password can unlock it.
// NOTE: UI gating is client-side only; the real write protection is the GitHub token.

var AUTH_KEY = 'pesAuth';
var SESSION_PAT_KEY = 'pesSessPAT';
var LAST_USER_KEY = 'pesLastUser';
var PBKDF2_ITER = 150000;
var USERNAME_RE = /^[a-z0-9._-]{3,24}$/;
var MIN_PASSWORD_LEN = 8;

// ---------- Session / permissions ----------
function authSession(){
  try {
    var a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
    return (a && a.u) ? a : null;
  } catch(_) { return null; }
}
function isSuperAdmin(){ var a = authSession(); return !!(a && a.role === 'admin'); }
function canEditSystem(id){
  var a = authSession();
  if(!a) return false;
  if(a.role === 'admin') return true;
  return a.role === 'mod' && Array.isArray(a.systems) && a.systems.indexOf(id) !== -1;
}
// "Admin mode" for the current system (used everywhere in the app to gate editing UI).
function isAdmin(){ return canEditSystem(PES_SYSTEM_ID); }

// Legacy flag still read by teo-widget.js.
function syncLegacyAdminFlag(){
  try {
    if(isAdmin()) sessionStorage.setItem('pesAdmin', '1');
    else sessionStorage.removeItem('pesAdmin');
  } catch(_) {}
}

function ensureAdmin(){
  if(isAdmin()) return true;
  openAdminLogin();
  return false;
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
    b.textContent = 'Admin';
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
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ u: user.u, role: user.role, systems: (user.systems || []).slice() }));
        localStorage.setItem(LAST_USER_KEY, user.u);
      } catch(_) {}
      syncLegacyAdminFlag();
      updateAuthButton();
      // Unlock the shared PAT only if this browser has none of its own.
      if(user.tok && !CloudSync.pat){
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
  var before = isAdmin();
  var user = findUser(pesRegistry, a.u);
  if(!user || user.disabled){
    authLogout(true);
    return before;
  }
  try {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ u: user.u, role: user.role, systems: (user.systems || []).slice() }));
  } catch(_) {}
  syncLegacyAdminFlag();
  return before !== isAdmin();
}
