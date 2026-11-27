// Marvell PES Club - core/systems.js
// Multi-system support: several independent tournament hubs on one site.
// - Current system comes from ?sys=<id> (default 'pes' = the original site / data.json).
// - Each system has its own cloud file (data/<id>.json) and its own localStorage key.
// - The registry (systems + user accounts) lives in systems.json at the repo root.
// Switching system = full page navigation, so the global `state` never mixes systems.
// Loaded FIRST: state.js / cloud.js read PES_SYSTEM_ID & helpers at load time.

var DEFAULT_SYSTEM_ID = 'pes';
var SYSTEMS_PATH = 'systems.json';
var REGISTRY_CACHE_KEY = 'pesRegistryCache';

function normalizeSystemId(v){
  v = String(v == null ? '' : v).trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,30}$/.test(v) ? v : '';
}

var PES_SYSTEM_ID = (function(){
  var id = '';
  try { id = normalizeSystemId(new URLSearchParams(location.search).get('sys')); } catch(_) {}
  return id || DEFAULT_SYSTEM_ID;
})();

function systemDataPath(id){ return id === DEFAULT_SYSTEM_ID ? 'data.json' : 'data/' + id + '.json'; }
function systemStorageKey(id){ return id === DEFAULT_SYSTEM_ID ? 'pes-league-v15' : 'pes-league-v15@' + id; }
function systemUrl(id){
  var u = new URL(location.href);
  if(id === DEFAULT_SYSTEM_ID) u.searchParams.delete('sys'); else u.searchParams.set('sys', id);
  u.hash = '';
  return u.toString();
}

// Bootstrap registry used until systems.json exists in the repo.
// Passwords are stored only as salted PBKDF2-SHA256 hashes (see auth.js).
var DEFAULT_REGISTRY = {
  version: 1,
  systems: [{ id: 'pes', name: 'Marvell Pes Club', icon: '⚽', sport: 'football' }],
  users: [{ u: 'admin', role: 'admin', salt: 'wSbx/aYviJf37dp0Gb/IPw==', hash: 'P3KCaTEetxuzErrBomk0Wtvqc5M8QsVcPe76X6kBS3E=', iter: 150000 }]
};

var pesRegistry = null;
var _registryPromise = null;

function cloneJson(o){ return JSON.parse(JSON.stringify(o)); }

function sanitizeRegistry(reg){
  var r = (reg && typeof reg === 'object') ? cloneJson(reg) : {};
  if(!Array.isArray(r.systems)) r.systems = [];
  if(!Array.isArray(r.users)) r.users = [];
  r.systems = r.systems.filter(function(s){ return s && normalizeSystemId(s.id) === s.id; });
  if(!r.systems.some(function(s){ return s.id === DEFAULT_SYSTEM_ID; })) r.systems.unshift(cloneJson(DEFAULT_REGISTRY.systems[0]));
  r.users = r.users.filter(function(u){ return u && u.u && u.salt && u.hash; });
  r.users.forEach(function(u){
    if(Array.isArray(u.perms)) u.perms = u.perms.filter(function(p){ return typeof p === 'string'; });
    else delete u.perms;
  });
  if(!r.users.some(function(u){ return u.role === 'admin'; })) r.users.unshift(cloneJson(DEFAULT_REGISTRY.users[0]));
  r.version = 1;
  return r;
}

function findSystem(id){
  if(!pesRegistry) return null;
  return pesRegistry.systems.filter(function(s){ return s.id === id; })[0] || null;
}
function currentSystem(){
  return findSystem(PES_SYSTEM_ID) || {
    id: PES_SYSTEM_ID,
    name: PES_SYSTEM_ID === DEFAULT_SYSTEM_ID ? 'Marvell Pes Club' : PES_SYSTEM_ID,
    icon: '🏆'
  };
}

// ---------- GitHub file helpers (repo from CLOUD_CONFIG) ----------
function ghContentsUrl(path){ return 'https://api.github.com/repos/' + CLOUD_CONFIG.owner + '/' + CLOUD_CONFIG.repo + '/contents/' + path; }
function ghRawFileUrl(path){ return 'https://raw.githubusercontent.com/' + CLOUD_CONFIG.owner + '/' + CLOUD_CONFIG.repo + '/' + CLOUD_CONFIG.branch + '/' + path; }

// Promise<string|null> (null = file does not exist). With a PAT read via the API (always fresh),
// otherwise via the raw CDN (no API rate limit for viewers).
function ghReadText(path, pat){
  var req = pat
    ? fetch(ghContentsUrl(path) + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now(),
        { headers: { 'Accept': 'application/vnd.github.raw', 'Authorization': 'Bearer ' + pat }, cache: 'no-store' })
    : fetch(ghRawFileUrl(path) + '?_t=' + Date.now(), { cache: 'no-store' });
  return req.then(function(r){
    if(r.status === 404) return null;
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  });
}

function ghGetSha(path, pat){
  return fetch(ghContentsUrl(path) + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now(),
    { headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + pat }, cache: 'no-store' })
    .then(function(r){
      if(r.status === 404) return null;
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function(j){ return (j && j.sha) || null; });
    });
}

// Create or overwrite a repo file.
function ghWriteText(path, text, message, pat){
  return ghWriteBase64(path, btoa(unescape(encodeURIComponent(text))), message, pat);
}
// Same with base64 content (binary files such as images).
function ghWriteBase64(path, b64, message, pat){
  return ghGetSha(path, pat).then(function(sha){
    var body = { message: message, content: b64, branch: CLOUD_CONFIG.branch };
    if(sha) body.sha = sha;
    return fetch(ghContentsUrl(path), {
      method: 'PUT',
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }).then(function(r){
    if(!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ': ' + t.substring(0, 160)); });
    return true;
  });
}
// Delete a repo file (no-op if it does not exist).
function ghDeleteFile(path, message, pat){
  return ghGetSha(path, pat).then(function(sha){
    if(!sha) return false;
    return fetch(ghContentsUrl(path), {
      method: 'DELETE',
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + pat, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, sha: sha, branch: CLOUD_CONFIG.branch })
    }).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return true;
    });
  });
}

// ---------- Registry load / save ----------
function readRegistryCache(){
  try { return JSON.parse(localStorage.getItem(REGISTRY_CACHE_KEY) || 'null'); } catch(_) { return null; }
}

function loadRegistry(force){
  if(_registryPromise && !force) return _registryPromise;
  var pat = (typeof CloudSync !== 'undefined' && CloudSync.pat) || null;
  _registryPromise = ghReadText(SYSTEMS_PATH, pat)
    .then(function(txt){ return txt ? JSON.parse(txt) : readRegistryCache(); })
    .catch(function(err){
      console.warn('Registry load failed, using cache:', err);
      return readRegistryCache();
    })
    .then(function(reg){
      pesRegistry = sanitizeRegistry(reg);
      try { localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(pesRegistry)); } catch(_) {}
      return pesRegistry;
    });
  return _registryPromise;
}

function saveRegistry(reg){
  var pat = (typeof CloudSync !== 'undefined' && CloudSync.pat) || null;
  if(!pat) return Promise.reject(new Error('Cần GitHub PAT để lưu'));
  var clean = sanitizeRegistry(reg);
  return ghWriteText(SYSTEMS_PATH, JSON.stringify(clean, null, 2), 'Update systems.json ' + new Date().toISOString(), pat)
    .then(function(){
      pesRegistry = clean;
      _registryPromise = Promise.resolve(clean);
      try { localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(clean)); } catch(_) {}
      return clean;
    });
}

// Initial data for a brand-new system: the embedded default league, without PES teams/logos lists.
function systemSeedState(id){
  var seed = null;
  try { seed = JSON.parse($('EMBEDDED_DATA').textContent || ''); } catch(_) {}
  if(!seed || !seed.seasons) seed = { seasons: {}, current: null };
  seed.teamMasterList = [];
  seed.logoMasterList = [];
  delete seed.teoVisibleTeams;
  seed.systemId = id;
  seed.schemaVersion = SCHEMA_VERSION;
  return seed;
}

// ---------- Header UI ----------
function renderSystemSwitcher(){
  var sel = $('systemSel');
  if(!sel || !pesRegistry) return;
  var list = pesRegistry.systems.filter(function(s){
    return !s.hidden || s.id === PES_SYSTEM_ID || canAccessSystem(s.id);
  });
  sel.innerHTML = '';
  list.forEach(function(s){
    var o = document.createElement('option');
    o.value = s.id;
    o.textContent = (s.icon ? s.icon + ' ' : '') + s.name + (s.hidden ? ' 🙈' : '');
    if(s.id === PES_SYSTEM_ID) o.selected = true;
    sel.appendChild(o);
  });
  sel.classList.toggle('hidden', list.length < 2);
}

function applySystemBranding(){
  var sys = currentSystem();
  var el = $('brandName');
  if(el) el.textContent = sys.name;
  document.title = sys.name;
}

// Called from init() after state is loaded.
function initSystems(){
  var sel = $('systemSel');
  if(sel && !sel._pesWired){
    sel._pesWired = true;
    sel.addEventListener('change', function(){
      if(sel.value && sel.value !== PES_SYSTEM_ID) location.href = systemUrl(sel.value);
    });
  }
  var btn = $('btnSystems');
  if(btn && !btn._pesWired){
    btn._pesWired = true;
    btn.addEventListener('click', openSystemsDialog);
  }
  applySystemBranding();
  updateAuthButton();
  return loadRegistry().then(function(){
    var changed = refreshAuthFromRegistry();
    renderSystemSwitcher();
    applySystemBranding();
    updateAuthButton();
    if(changed){ showAdmin(isAdminUser()); updateCustomLinks(); refreshSeasonUI(); }
  });
}

// ---------- Systems & users management dialog (super admin only) ----------
function sysEl(tag, props, kids){
  var e = document.createElement(tag);
  if(props) Object.keys(props).forEach(function(k){
    var v = props[k];
    if(k === 'text') e.textContent = v;
    else if(k === 'class') e.className = v;
    else if(k === 'style') e.style.cssText = v;
    else if(k === 'on') Object.keys(v).forEach(function(ev){ e.addEventListener(ev, v[ev]); });
    else e[k] = v;
  });
  (kids || []).forEach(function(c){
    if(c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function slugifySystemId(name){
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 30);
}

function openSystemsDialog(){
  if(!isSuperAdmin()){ toast('Chỉ admin được phép quản lý hệ thống'); return; }
  if(!CloudSync.pat) toast('Chưa có PAT: có thể xem nhưng không lưu được');
  loadRegistry(true).then(function(reg){ buildSystemsDialog(cloneJson(reg)); });
}

function buildSystemsDialog(draft){
  var dlg = $('systemsDialog');
  if(!dlg){
    dlg = sysEl('dialog', { id: 'systemsDialog', class: 'sys-dialog' });
    document.body.appendChild(dlg);
  }
  var newSystems = {};   // ids created in this dialog session -> need a data file
  var pendingGrants = []; // [{user, cb, pwIn}] rows ticked "Ghi cloud" but not yet encrypted
  var dirty = false;
  var statusEl = sysEl('div', { class: 'sys-status muted' });

  function setStatus(msg, isErr){
    statusEl.textContent = msg || '';
    statusEl.style.color = isErr ? '#f87171' : '';
  }
  function markDirty(){ dirty = true; setStatus('Có thay đổi chưa lưu'); }
  function sysLabel(s){ return (s.icon ? s.icon + ' ' : '') + s.name; }
  function cloudGrantAvailable(){ return !!CloudSync.pat; }

  // Apply a new password to `user` (hash + optional encrypted PAT grant).
  function applyPassword(user, pw, grantCloud){
    return makePasswordRecord(pw).then(function(rec){
      user.salt = rec.salt; user.hash = rec.hash; user.iter = rec.iter;
      if(grantCloud && CloudSync.pat){
        return wrapToken(CloudSync.pat, pw).then(function(tok){ user.tok = tok; });
      }
      if(!grantCloud) delete user.tok;
    });
  }

  function systemsSection(){
    var rows = draft.systems.map(function(s){
      var hiddenCb = sysEl('input', { type: 'checkbox', checked: !!s.hidden, disabled: s.id === DEFAULT_SYSTEM_ID,
        on: { change: function(){ s.hidden = hiddenCb.checked; markDirty(); } } });
      return sysEl('div', { class: 'sys-row' }, [
        sysEl('input', { class: 'sys-icon no-i18n', value: s.icon || '', maxLength: 4,
          on: { input: function(e){ s.icon = e.target.value.trim(); markDirty(); } } }),
        sysEl('input', { class: 'sys-name no-i18n', value: s.name || '',
          on: { input: function(e){ s.name = e.target.value.trim() || s.id; markDirty(); } } }),
        sysEl('code', { class: 'no-i18n', text: s.id }),
        sysEl('label', { class: 'sys-check', title: 'Ẩn khỏi danh sách chọn hệ thống' }, [hiddenCb, ' ', sysEl('span', { text: 'Ẩn' })]),
        newSystems[s.id]
          ? sysEl('span', { class: 'muted', text: '(mới)' })
          : sysEl('a', { href: systemUrl(s.id), text: 'Mở ↗' })
      ]);
    });

    var iconIn = sysEl('input', { class: 'sys-icon no-i18n', value: '🏆', maxLength: 4 });
    var nameIn = sysEl('input', { class: 'sys-name no-i18n', placeholder: 'Tên hệ thống' });
    var idIn = sysEl('input', { class: 'sys-id no-i18n', placeholder: 'Mã (ID)' });
    nameIn.addEventListener('input', function(){
      if(!idIn._touched) idIn.value = slugifySystemId(nameIn.value);
    });
    idIn.addEventListener('input', function(){ idIn._touched = true; });
    var addBtn = sysEl('button', { type: 'button', class: 'primary', text: '➕ Tạo hệ thống', on: { click: function(){
      var name = nameIn.value.trim();
      var id = normalizeSystemId(idIn.value || slugifySystemId(name));
      if(!name){ setStatus('Nhập tên hệ thống', true); return; }
      if(!id){ setStatus('Mã (ID) chỉ gồm a-z, 0-9, dấu gạch ngang (2-31 ký tự)', true); return; }
      if(draft.systems.some(function(s){ return s.id === id; })){ setStatus('Mã (ID) đã tồn tại', true); return; }
      draft.systems.push({ id: id, name: name, icon: iconIn.value.trim() || '🏆', sport: 'football', createdAt: Date.now() });
      newSystems[id] = true;
      dirty = true;
      render();
      setStatus('Có thay đổi chưa lưu');
    } } });

    return sysEl('section', { class: 'sys-section' }, [
      sysEl('h4', { text: '🗂️ Hệ thống' }),
      sysEl('div', { class: 'sys-list' }, rows),
      sysEl('div', { class: 'sys-row sys-add' }, [iconIn, nameIn, idIn, addBtn])
    ]);
  }

  function systemChecks(selected, onChange){
    return sysEl('div', { class: 'sys-checks' }, draft.systems.map(function(s){
      var cb = sysEl('input', { type: 'checkbox', checked: selected.indexOf(s.id) !== -1,
        on: { change: function(){ onChange(s.id, cb.checked); } } });
      return sysEl('label', { class: 'sys-check' }, [cb, ' ', sysEl('span', { class: 'no-i18n', text: sysLabel(s) })]);
    }));
  }

  // Permission table: one row per user, one checkbox column per permission (PES_PERMS in auth.js).
  function usersSection(){
    pendingGrants = [];
    var me = (authSession() || {}).u;
    // Old registries: role mod/sup/player -> explicit permission list. Admins keep their list too,
    // so un-ticking 👑 restores the previous ticks.
    draft.users.forEach(function(u){
      if(!Array.isArray(u.perms)) u.perms = u.role === 'admin' ? [] : userPerms(u);
      if(u.role !== 'admin') u.role = 'user';
      if(!Array.isArray(u.systems)) u.systems = [];
    });

    function setPerm(user, id, on){
      var list = user.perms.filter(function(x){ return x !== id; });
      if(on){
        list.push(id);
        (permDef(id).needs || []).forEach(function(n){ if(list.indexOf(n) === -1) list.push(n); });
      } else {
        list = list.filter(function(x){ return ((permDef(x) || {}).needs || []).indexOf(id) === -1; });
      }
      user.perms = PES_PERMS.map(function(p){ return p.id; }).filter(function(x){ return list.indexOf(x) !== -1; });
    }

    function userRow(user, isNew){
      var isMe = !isNew && user.u === me;
      var cbs = {};
      var uIn = isNew ? sysEl('input', { class: 'no-i18n sys-uname', placeholder: 'Tên đăng nhập', autocomplete: 'off' }) : null;
      var pwIn = sysEl('input', { type: 'password', class: 'sys-pw', placeholder: isNew ? 'Mật khẩu' : 'Mật khẩu mới', autocomplete: 'new-password' });

      var admCb = sysEl('input', { type: 'checkbox', checked: user.role === 'admin', disabled: isMe,
        title: isMe ? 'Không thể tự bỏ quyền admin của chính mình' : 'Super admin: toàn quyền trên mọi hệ thống',
        on: { change: function(){ user.role = admCb.checked ? 'admin' : 'user'; changed(); } } });
      PES_PERMS.forEach(function(p){
        cbs[p.id] = sysEl('input', { type: 'checkbox', title: permLabel(p, true),
          on: { change: function(){ setPerm(user, p.id, cbs[p.id].checked); changed(); } } });
      });

      var cloudCb = sysEl('input', { type: 'checkbox', checked: !!user.tok,
        on: { change: function(){
          cloudCb._touched = true;
          if(isNew) return;
          if(!cloudCb.checked){ delete user.tok; markDirty(); return; }
          if(!cloudGrantAvailable()){ cloudCb.checked = false; setStatus('Trình duyệt này chưa có PAT để cấp', true); return; }
          dirty = true;
          setStatus('Nhập mật khẩu cho ' + user.u + ' rồi bấm Lưu để cấp quyền ghi cloud');
          pwIn.focus();
        } } });
      if(!isNew) pendingGrants.push({ user: user, cb: cloudCb, pwIn: pwIn });

      var allSys = sysEl('span', { class: 'muted', text: 'Tất cả' });
      var sysChecks = systemChecks(user.systems, function(id, on){
        user.systems = user.systems.filter(function(x){ return x !== id; });
        if(on) user.systems.push(id);
        if(!isNew) markDirty();
      });

      // Reflect `user` in this row (dependencies, admin = everything, cloud token only with a write permission).
      function sync(){
        var adm = user.role === 'admin', eff = userPerms(user), canW = userCanWrite(user);
        PES_PERMS.forEach(function(p){ cbs[p.id].checked = eff.indexOf(p.id) !== -1; cbs[p.id].disabled = adm; });
        if(!canW){ cloudCb.checked = false; if(user.tok){ delete user.tok; if(!isNew) markDirty(); } }
        else if(isNew && !cloudCb._touched) cloudCb.checked = cloudGrantAvailable();
        cloudCb.disabled = !canW || (isNew && !cloudGrantAvailable());
        cloudCb.title = canW ? 'Mã hóa PAT hiện tại bằng mật khẩu của user' : 'Chỉ cấp cho user có quyền ghi dữ liệu';
        allSys.hidden = !adm;
        sysChecks.hidden = adm;
      }
      function changed(){ sync(); if(!isNew) markDirty(); }

      var actions;
      if(isNew){
        var addBtn = sysEl('button', { type: 'button', class: 'primary', text: '➕ Thêm user', on: { click: function(){
          var name = uIn.value.trim().toLowerCase();
          var pw = pwIn.value;
          if(!USERNAME_RE.test(name)){ setStatus('Tên đăng nhập 3-24 ký tự: a-z, 0-9, . _ -', true); return; }
          if(draft.users.some(function(x){ return x.u === name; })){ setStatus('Tên đăng nhập đã tồn tại', true); return; }
          if(pw.length < MIN_PASSWORD_LEN){ setStatus('Mật khẩu tối thiểu 8 ký tự', true); return; }
          user.u = name;
          user.createdAt = Date.now();
          addBtn.disabled = true;
          applyPassword(user, pw, cloudCb.checked && userCanWrite(user)).then(function(){
            draft.users.push(user);
            dirty = true;
            render();
            setStatus('Đã thêm ' + name + ' (bấm Lưu để áp dụng)');
          }).catch(function(e){ setStatus(String(e.message || e), true); addBtn.disabled = false; });
        } } });
        actions = [addBtn];
      } else {
        var keyBtn = sysEl('button', { type: 'button', class: 'ghost', text: '🔑', title: 'Đặt mật khẩu mới', on: { click: function(){
          var pw = pwIn.value;
          if(pw.length < MIN_PASSWORD_LEN){ setStatus('Mật khẩu tối thiểu 8 ký tự', true); return; }
          keyBtn.disabled = true;
          applyPassword(user, pw, cloudCb.checked && userCanWrite(user)).then(function(){
            pwIn.value = '';
            markDirty();
            setStatus('Đã đặt mật khẩu mới cho ' + user.u + ' (bấm Lưu để áp dụng)');
          }).catch(function(e){ setStatus(String(e.message || e), true); })
            .then(function(){ keyBtn.disabled = false; });
        } } });
        actions = [keyBtn, isMe ? null : sysEl('button', { type: 'button', class: 'danger', text: '🗑', title: 'Xoá user', on: { click: function(){
          if(!confirm('Xoá user ' + user.u + '?')) return;
          draft.users = draft.users.filter(function(x){ return x !== user; });
          dirty = true;
          render();
          setStatus('Có thay đổi chưa lưu');
        } } })];
      }

      sync();
      var tds = [
        sysEl('td', { class: 'sys-pt-user' }, isNew ? [uIn] : [
          sysEl('b', { class: 'no-i18n', text: user.u }),
          isMe ? sysEl('small', { class: 'muted', text: ' (bạn)' }) : null,
          user.tok ? sysEl('span', { title: 'Có quyền ghi cloud', text: ' ☁️' }) : null
        ]),
        sysEl('td', { class: 'sys-pt-c sys-pt-adm' }, [admCb])
      ];
      PES_PERMS.forEach(function(p){ tds.push(sysEl('td', { class: 'sys-pt-c' }, [cbs[p.id]])); });
      tds.push(sysEl('td', { class: 'sys-pt-c sys-pt-cloud' }, [cloudCb]));
      tds.push(sysEl('td', { class: 'sys-pt-sys' }, [allSys, sysChecks]));
      tds.push(sysEl('td', { class: 'sys-pt-pw' }, [sysEl('div', { class: 'sys-row' }, [pwIn].concat(actions))]));
      return sysEl('tr', { class: isNew ? 'sys-pt-new' : '' }, tds);
    }

    var head = [
      sysEl('th', { class: 'sys-pt-user', text: 'Người dùng' }),
      sysEl('th', { class: 'sys-pt-c sys-pt-adm', title: 'Super admin: toàn quyền trên mọi hệ thống' }, [
        sysEl('div', { text: '👑' }), sysEl('small', { class: 'no-i18n', text: 'Admin' })])
    ];
    PES_PERMS.forEach(function(p){
      head.push(sysEl('th', { class: 'sys-pt-c', title: permLabel(p, true) }, [
        sysEl('div', { text: p.icon }), sysEl('small', { class: 'no-i18n', text: permLabel(p) })]));
    });
    head.push(sysEl('th', { class: 'sys-pt-c sys-pt-cloud', title: 'Mã hóa PAT hiện tại bằng mật khẩu của user' }, [
      sysEl('div', { text: '☁️' }), sysEl('small', { text: 'Ghi cloud' })]));
    head.push(sysEl('th', { class: 'sys-pt-sys', text: 'Hệ thống' }));
    head.push(sysEl('th', { class: 'sys-pt-pw', text: 'Mật khẩu' }));

    var rows = draft.users.map(function(u){ return userRow(u, false); });
    rows.push(userRow({ u: '', role: 'user', systems: [], perms: [] }, true));

    var legend = sysEl('ul', { class: 'sys-pt-legend muted no-i18n' }, PES_PERMS.map(function(p){
      return sysEl('li', null, [p.icon + ' ', sysEl('b', { text: permLabel(p) }), ': ' + permLabel(p, true)]);
    }));

    return sysEl('section', { class: 'sys-section' }, [
      sysEl('h4', { text: '👤 Người dùng & quyền hạn' }),
      sysEl('div', { class: 'sys-pt-wrap' }, [
        sysEl('table', { class: 'sys-pt' }, [
          sysEl('thead', null, [sysEl('tr', null, head)]),
          sysEl('tbody', null, rows)
        ])
      ]),
      legend
    ]);
  }

  function save(){
    var pat = CloudSync.pat;
    if(!pat){ setStatus('Cần GitHub PAT để lưu (☁️ Cloud)', true); return; }
    // Ticked "Ghi cloud" without pressing 🔑: encrypt the PAT now with the typed password.
    var grants = pendingGrants.filter(function(g){ return g.cb.checked && !g.user.tok; });
    var missing = grants.filter(function(g){ return g.pwIn.value.length < MIN_PASSWORD_LEN; })[0];
    if(missing){
      setStatus('Nhập mật khẩu (tối thiểu 8 ký tự) cho ' + missing.user.u + ' để cấp quyền ghi cloud', true);
      missing.pwIn.focus();
      return;
    }
    saveBtn.disabled = true;
    setStatus('Đang lưu...');
    var created = Object.keys(newSystems);
    var chain = Promise.resolve();
    grants.forEach(function(g){
      chain = chain.then(function(){ return applyPassword(g.user, g.pwIn.value, true); });
    });
    created.forEach(function(id){
      var path = systemDataPath(id);
      chain = chain.then(function(){ return ghGetSha(path, pat); }).then(function(sha){
        if(sha) return true;
        return ghWriteText(path, JSON.stringify(systemSeedState(id), null, 2), 'Create ' + path, pat);
      });
    });
    chain.then(function(){ return saveRegistry(draft); }).then(function(clean){
      draft = cloneJson(clean);
      newSystems = {};
      dirty = false;
      var changed = refreshAuthFromRegistry();
      renderSystemSwitcher();
      applySystemBranding();
      if(changed){ showAdmin(isAdminUser()); updateCustomLinks(); refreshSeasonUI(); }
      render();
      setStatus('✅ Đã lưu');
    }).catch(function(e){
      setStatus('❌ ' + String(e.message || e), true);
    }).then(function(){ saveBtn.disabled = false; });
  }

  var saveBtn = sysEl('button', { type: 'button', class: 'primary', text: '💾 Lưu thay đổi', on: { click: save } });
  var closeBtn = sysEl('button', { type: 'button', text: 'Đóng', on: { click: function(){
    if(dirty && !confirm('Có thay đổi chưa lưu. Vẫn đóng?')) return;
    dlg.close();
  } } });

  function render(){
    dlg.innerHTML = '';
    dlg.appendChild(sysEl('h3', { text: '🗂️ Hệ thống & User' }));
    dlg.appendChild(sysEl('p', { class: 'muted sys-hint',
      text: 'Tick quyền cho từng user; quyền chỉ áp dụng ở các hệ thống được tick. Thay đổi chỉ áp dụng sau khi bấm Lưu (cần PAT).' }));
    dlg.appendChild(systemsSection());
    dlg.appendChild(usersSection());
    dlg.appendChild(sysEl('div', { class: 'sys-footer' }, [statusEl, closeBtn, saveBtn]));
  }

  // Esc closes the dialog without the unsaved-changes check; guard it.
  dlg.oncancel = function(e){ if(dirty && !confirm('Có thay đổi chưa lưu. Vẫn đóng?')) e.preventDefault(); };
  render();
  setStatus('');
  if(typeof dlg.showModal === 'function'){ if(!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
}
