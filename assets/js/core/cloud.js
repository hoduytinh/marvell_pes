// Marvell PES Club - core/cloud.js (split from app.js; shared global scope, load order set in index.html)
    // =================== CLOUD SYNC (GitHub Pages) ===================
    var CLOUD_CONFIG = {
      owner: 'hoduytinh',
      repo: 'marvell_pes',
      branch: 'main',
      dataPath: systemDataPath(PES_SYSTEM_ID)
    };

    // ---- Conflict-safe sync helpers ----
    // Git blob SHA-1 of a text, so the sha we send with a PUT always matches the
    // exact data this device is based on (GitHub rejects the write with 409 if
    // another device pushed in between, instead of silently overwriting it).
    function cloudBlobSha(text) {
      if(!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.reject(new Error('no WebCrypto'));
      var enc = new TextEncoder();
      var body = enc.encode(text);
      var head = enc.encode('blob ' + body.length + '\0');
      var all = new Uint8Array(head.length + body.length);
      all.set(head); all.set(body, head.length);
      return crypto.subtle.digest('SHA-1', all).then(function(buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }

    function cloudIsObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

    function cloudJsonEqual(a, b) {
      if(a === b) return true;
      if(!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
      var aa = Array.isArray(a);
      if(aa !== Array.isArray(b)) return false;
      if(aa) {
        if(a.length !== b.length) return false;
        for(var i = 0; i < a.length; i++) if(!cloudJsonEqual(a[i], b[i])) return false;
        return true;
      }
      var ka = Object.keys(a);
      if(ka.length !== Object.keys(b).length) return false;
      for(var j = 0; j < ka.length; j++) {
        if(!Object.prototype.hasOwnProperty.call(b, ka[j]) || !cloudJsonEqual(a[ka[j]], b[ka[j]])) return false;
      }
      return true;
    }

    // 3-way merge: keep changes from both sides; if the same value was changed on
    // both devices, this device wins. Objects (seasons, results 'r-m', ...) merge per key.
    function cloudMerge3(base, local, remote) {
      if(cloudJsonEqual(local, remote)) return local;
      if(cloudJsonEqual(local, base)) return remote;
      if(cloudJsonEqual(remote, base)) return local;
      if(cloudIsObj(local) && cloudIsObj(remote)) {
        var b = cloudIsObj(base) ? base : {};
        var out = {};
        var keys = Object.keys(local).concat(Object.keys(remote).filter(function(k) { return !(k in local); }));
        keys.forEach(function(k) {
          var v = cloudMerge3(b[k], local[k], remote[k]);
          if(v !== undefined) out[k] = v;
        });
        return out;
      }
      return local;
    }

    // Copy src into target keeping object identities (open UI closures keep working).
    function cloudApplyInPlace(target, src) {
      Object.keys(target).forEach(function(k) { if(!(k in src)) delete target[k]; });
      Object.keys(src).forEach(function(k) {
        if(cloudIsObj(target[k]) && cloudIsObj(src[k])) cloudApplyInPlace(target[k], src[k]);
        else if(!cloudJsonEqual(target[k], src[k])) target[k] = src[k];
      });
    }

    var CloudSync = {
      pat: null,
      enabled: true,
      sha: null,
      baseText: null,
      conflictRetries: 0,
      lastSyncedHash: null,
      pushTimer: null,
      pushInProgress: false,
      pendingState: null,
      status: 'idle',
      statusText: '',

      patFromSession: false,

      init: function() {
        var localPat = null, sessPat = null;
        try { localPat = localStorage.getItem('pesGitHubPAT') || null; } catch(_){}
        try { sessPat = sessionStorage.getItem('pesSessPAT') || null; } catch(_){}
        this.pat = localPat || sessPat;
        this.patFromSession = !localPat && !!sessPat;
        try { this.enabled = localStorage.getItem('pesCloudSyncEnabled') !== '0'; } catch(_) { this.enabled = true; }
        if(!this._lifecycleBound) {
          // Mobile browsers freeze/discard background tabs: push pending edits
          // right away instead of waiting for the debounce timer.
          var self = this;
          this._lifecycleBound = true;
          document.addEventListener('visibilitychange', function() {
            if(document.visibilityState === 'hidden') self.flush();
            else if(self.status === 'error' && self.pendingState) self.schedulePush(self.pendingState);
            else self.pull();
          });
          window.addEventListener('pagehide', function() { self.flush(); });
        }
        this.updateUI();
      },

      flush: function() {
        if(!this.pushTimer) return;
        clearTimeout(this.pushTimer);
        this.pushTimer = null;
        this.push(this.pendingState);
      },

      hasPAT: function() { return !!this.pat; },
      isEnabled: function() { return !!this.enabled; },

      setEnabled: function(on) {
        this.enabled = !!on;
        try {
          localStorage.setItem('pesCloudSyncEnabled', this.enabled ? '1' : '0');
        } catch(_){}
        if(!this.enabled) {
          if(this.pushTimer) {
            clearTimeout(this.pushTimer);
            this.pushTimer = null;
          }
          this.pendingState = null;
        }
        this.updateUI();
      },

      // PAT unlocked at login (encrypted grant in systems.json); kept for this tab only.
      setSessionPAT: function(pat) {
        if(!pat) { this.clearSessionPAT(); return; }
        this.pat = pat;
        this.patFromSession = true;
        try { sessionStorage.setItem('pesSessPAT', pat); } catch(_){}
        this.updateUI();
        // Data was read from the CDN before login and may be minutes old.
        this.pull();
      },

      clearSessionPAT: function() {
        try { sessionStorage.removeItem('pesSessPAT'); } catch(_){}
        if(!this.patFromSession) return;
        var localPat = null;
        try { localPat = localStorage.getItem('pesGitHubPAT') || null; } catch(_){}
        this.pat = localPat;
        this.patFromSession = false;
        if(this.pushTimer) { clearTimeout(this.pushTimer); this.pushTimer = null; }
        this.pendingState = null;
        this.updateUI();
      },

      // A PAT unlocked by login may only push for systems the user can edit.
      canPush: function() {
        if(!this.pat || !this.enabled) return false;
        if(this.patFromSession && !isAdmin()) return false;
        return true;
      },

      setPAT: function(pat) {
        this.pat = pat ? pat.trim() : null;
        this.patFromSession = false;
        try {
          if(this.pat) localStorage.setItem('pesGitHubPAT', this.pat);
          else localStorage.removeItem('pesGitHubPAT');
        } catch(_){}
        this.updateUI();
      },

      apiUrl: function() {
        return 'https://api.github.com/repos/' + CLOUD_CONFIG.owner + '/' + CLOUD_CONFIG.repo + '/contents/' + CLOUD_CONFIG.dataPath;
      },

      // Direct raw CDN URL for READING the data file. Unlike the Contents API
      // (which caps at ~1 MB and is rate-limited for unauthenticated viewers),
      // raw.githubusercontent.com serves public files up to 100 MB with generous
      // limits — required now that data.json exceeds 1 MB.
      rawUrl: function() {
        return 'https://raw.githubusercontent.com/' + CLOUD_CONFIG.owner + '/' + CLOUD_CONFIG.repo + '/' + CLOUD_CONFIG.branch + '/' + CLOUD_CONFIG.dataPath;
      },

      setStatus: function(s, text) {
        this.status = s;
        this.statusText = text || '';
        this.updateUI();
      },

      updateUI: function() {
        var el = document.getElementById('cloudSyncStatus');
        var toggleBtn = document.getElementById('btnCloudSyncToggle');
        if(toggleBtn) {
          toggleBtn.textContent = this.enabled ? 'Sync: ON' : 'Sync: OFF';
          toggleBtn.title = this.enabled
            ? 'Tự động đồng bộ đang bật. Nhấn để tắt.'
            : 'Tự động đồng bộ đang tắt. Nhấn để bật lại.';
        }
        if(!el) return;
        if(!this.enabled) {
          el.textContent = '⏸️ Sync tắt';
          el.style.color = 'var(--muted)';
          el.title = 'Đang tắt tự động đồng bộ lên server';
          return;
        }
        if(!this.pat && this.status !== 'loading' && typeof isAdmin === 'function' && isAdmin()) {
          el.textContent = '⚠️ Chỉ lưu trên máy';
          el.style.color = '#f59e0b';
          el.title = 'Thiết bị này chưa có quyền ghi cloud: thay đổi chỉ lưu trên máy, không đồng bộ lên server';
          return;
        }
        var labels = {
          idle: this.pat ? '☁️ Sẵn sàng' : '☁️ Chưa có PAT',
          loading: '⏳ Đang tải cloud...',
          saving: '⏫ Đang đồng bộ...',
          synced: '✅ Đã sync',
          offline: '⚠️ Offline',
          error: '❌ Lỗi'
        };
        el.textContent = labels[this.status] || this.status;
        var colorMap = {
          synced: '#10b981', loading: '#3b82f6', saving: '#3b82f6',
          offline: '#f59e0b', error: '#dc2626', idle: 'var(--muted)'
        };
        el.style.color = colorMap[this.status] || 'var(--muted)';
        el.title = this.statusText || ('Cloud sync: ' + this.status);
      },

      // Returns Promise<stateObject|null>
      load: function() {
        var self = this;
        self.setStatus('loading');

        // Parse + record hash, then refresh sha for future writes.
        function handleJsonText(jsonText) {
          if(!jsonText) return null;
          var parsed = JSON.parse(jsonText);
          self.lastSyncedHash = self.hash(jsonText);
          // Remember what this device is based on; the sha is computed locally
          // (no API call) and sent with the next PUT for conflict detection.
          self.baseText = jsonText;
          self.sha = null;
          cloudBlobSha(jsonText).then(function(sha) {
            if(self.baseText === jsonText) self.sha = sha;
          }).catch(function() {
            if(self.pat) self._refreshSha();
          });
          self.setStatus('synced');
          return parsed;
        }

        // GitHub Contents API (raw media type): always fresh, up to 100 MB.
        // Primary for PAT holders (5000 req/h); fallback for viewers (60 req/h).
        function loadViaApi(fallback) {
          var url = self.apiUrl() + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now();
          var headers = { 'Accept': 'application/vnd.github.raw' };
          if(self.pat) headers['Authorization'] = 'Bearer ' + self.pat;
          return fetch(url, { headers: headers, cache: 'no-store' })
            .then(function(r) {
              if(r.status === 404) {
                self.sha = null;
                self.setStatus('idle', 'data.json chưa tồn tại trên GitHub - sẽ tạo khi admin lưu lần đầu');
                return null;
              }
              if(!fallback && (r.status === 401 || r.status === 403)) {
                self.setStatus('error', 'PAT không hợp lệ hoặc thiếu quyền (HTTP ' + r.status + ')');
                return null;
              }
              if(!r.ok) throw new Error('HTTP ' + r.status);
              return r.text().then(handleJsonText);
            })
            .catch(function(err) {
              if(fallback) {
                console.warn('CloudSync.load (API) failed, trying raw CDN:', err);
                return fallback();
              }
              console.warn('CloudSync.load (API) failed:', err);
              self.setStatus('offline', String(err.message || err));
              return null;
            });
        }

        // raw.githubusercontent.com: no API rate limit, but the CDN caches the
        // file for ~5 minutes (query string is ignored), so it can be stale.
        function loadViaRaw(fallback) {
          var rawFetchUrl = self.rawUrl() + '?_t=' + Date.now();
          var rawHeaders = {};
          if(self.pat) rawHeaders['Authorization'] = 'Bearer ' + self.pat;
          return fetch(rawFetchUrl, { headers: rawHeaders, cache: 'no-store' })
            .then(function(r) {
              if(r.status === 404) {
                self.sha = null;
                self.setStatus('idle', 'data.json chưa tồn tại trên GitHub - sẽ tạo khi admin lưu lần đầu');
                return null;
              }
              if(!r.ok) throw new Error('HTTP ' + r.status);
              return r.text().then(handleJsonText);
            })
            .catch(function(err) {
              if(fallback) {
                console.warn('CloudSync.load (raw CDN) failed, trying Contents API:', err);
                return fallback();
              }
              console.warn('CloudSync.load (raw CDN) failed:', err);
              self.setStatus('offline', String(err.message || err));
              return null;
            });
        }

        // Editors must read the latest commit, otherwise a stale CDN copy would be
        // pushed back over newer results.
        if(self.pat) return loadViaApi(function() { return loadViaRaw(); });
        return loadViaRaw(function() { return loadViaApi(); });
      },

      schedulePush: function(stateRef) {
        var self = this;
        if(!self.canPush()) return;
        self.pendingState = stateRef;
        if(self.pushTimer) clearTimeout(self.pushTimer);
        self.pushTimer = setTimeout(function() {
          self.pushTimer = null;
          self.push(self.pendingState);
        }, 2000);
      },

      push: function(stateRef) {
        var self = this;
        if(!self.canPush()) return Promise.resolve(false);
        if(!stateRef) return Promise.resolve(false);
        if(self.pushInProgress) {
          // Will be re-pushed via schedulePush after current completes
          self.schedulePush(stateRef);
          return Promise.resolve(false);
        }

        var jsonText = JSON.stringify(stateRef, null, 2);
        var newHash = self.hash(jsonText);
        if(newHash === self.lastSyncedHash) {
          self.setStatus('synced');
          return Promise.resolve(true);
        }

        self.pushInProgress = true;
        self.setStatus('saving');

        var contentBase64;
        try {
          contentBase64 = btoa(unescape(encodeURIComponent(jsonText)));
        } catch(e) {
          self.pushInProgress = false;
          self.setStatus('error', 'Encode error: ' + e.message);
          return Promise.resolve(false);
        }

        var body = {
          message: 'Update ' + CLOUD_CONFIG.dataPath + ' ' + new Date().toISOString(),
          content: contentBase64,
          branch: CLOUD_CONFIG.branch
        };
        if(self.sha) body.sha = self.sha;

        return fetch(self.apiUrl(), {
          method: 'PUT',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + self.pat,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        .then(function(r) {
          if(r.status === 409 || r.status === 422) {
            // Another device pushed since our base: merge its data, then push again.
            self.conflictRetries++;
            if(self.conflictRetries > 3) throw new Error('Xung đột dữ liệu (HTTP ' + r.status + ')');
            return self._fetchRemote().then(function(remote) {
              var needPush = true;
              if(remote && remote.text) needPush = self._mergeRemote(stateRef, remote);
              else if(remote) self.sha = remote.sha;
              self.pushInProgress = false;
              if(needPush) return self.push(stateRef);
              self.conflictRetries = 0;
              self.setStatus('synced');
              return true;
            });
          }
          if(!r.ok) {
            return r.text().then(function(t) {
              throw new Error('HTTP ' + r.status + ': ' + t.substring(0, 200));
            });
          }
          return r.json().then(function(resp) {
            if(resp && resp.content) self.sha = resp.content.sha;
            self.baseText = jsonText;
            self.lastSyncedHash = newHash;
            self.conflictRetries = 0;
            self.pushInProgress = false;
            self.setStatus('synced');
            return true;
          });
        })
        .catch(function(err) {
          console.error('CloudSync.push failed:', err);
          self.pushInProgress = false;
          self.conflictRetries = 0;
          self.setStatus('error', String(err.message || err));
          if(typeof toast === 'function') toast('❌ Đồng bộ lên server thất bại');
          return false;
        });
      },

      // Latest committed file: {sha, text} (text null when sha equals ours).
      _fetchRemote: function() {
        var self = this;
        var auth = 'Bearer ' + self.pat;
        var url = self.apiUrl() + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now();
        return fetch(url, { headers: { 'Accept': 'application/vnd.github.object', 'Authorization': auth }, cache: 'no-store' })
          .then(function(r) {
            if(r.status === 404) return null;
            if(!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function(meta) {
            if(!meta || !meta.sha) return null;
            if(meta.sha === self.sha) return { sha: meta.sha, text: null };
            var blobUrl = 'https://api.github.com/repos/' + CLOUD_CONFIG.owner + '/' + CLOUD_CONFIG.repo + '/git/blobs/' + meta.sha;
            return fetch(blobUrl, { headers: { 'Accept': 'application/vnd.github.raw', 'Authorization': auth }, cache: 'no-store' })
              .then(function(r) {
                if(!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
              })
              .then(function(text) { return { sha: meta.sha, text: text }; });
          });
      },

      // Merge remote into stateRef (in place). Returns true if the result still
      // differs from remote, i.e. this device has changes to push.
      _mergeRemote: function(stateRef, remote) {
        var local = JSON.parse(JSON.stringify(stateRef));
        var remoteObj = JSON.parse(remote.text);
        var base;
        try { base = this.baseText ? JSON.parse(this.baseText) : undefined; } catch(_) { base = undefined; }
        var merged = cloudMerge3(base, local, remoteObj);
        this.sha = remote.sha;
        this.baseText = remote.text;
        this.lastSyncedHash = this.hash(remote.text);
        if(!cloudJsonEqual(merged, local)) {
          cloudApplyInPlace(stateRef, merged);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef)); } catch(_){}
          try { if(typeof refreshAll === 'function') refreshAll(); } catch(e) { console.warn('refresh after merge failed:', e); }
        }
        return !cloudJsonEqual(merged, remoteObj);
      },

      // Bring this device up to date with the cloud (login, returning to the tab).
      pull: function() {
        var self = this;
        if(!self.canPush() || self.pushInProgress || self._pulling) return Promise.resolve(false);
        if(typeof state === 'undefined' || !state || !state.seasons) return Promise.resolve(false);
        self._pulling = true;
        return self._fetchRemote()
          .then(function(remote) {
            if(!remote || !remote.text) return false;
            if(self.pushInProgress) return false;
            if(self._mergeRemote(state, remote)) self.schedulePush(state);
            else self.setStatus('synced');
            return true;
          })
          .catch(function(e) { console.warn('CloudSync.pull failed:', e); return false; })
          .then(function(r) { self._pulling = false; return r; });
      },

      _refreshSha: function() {
        var self = this;
        var url = self.apiUrl() + '?ref=' + encodeURIComponent(CLOUD_CONFIG.branch) + '&_t=' + Date.now();
        var headers = { 'Accept': 'application/vnd.github+json' };
        if(self.pat) headers['Authorization'] = 'Bearer ' + self.pat;
        return fetch(url, { headers: headers, cache: 'no-store' })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) { if(data) self.sha = data.sha; })
          .catch(function(){});
      },

      // Force an immediate push (ignore debounce, ignore hash check)
      pushNow: function(stateRef) {
        if(!this.enabled) return Promise.resolve(false);
        if(this.pushTimer) { clearTimeout(this.pushTimer); this.pushTimer = null; }
        this.lastSyncedHash = null; // force push
        return this.push(stateRef);
      },

      hash: function(s) {
        var h = 0;
        for(var i = 0; i < s.length; i++) {
          h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        }
        return h;
      }
    };
