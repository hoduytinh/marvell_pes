// Marvell PES Club - core/cloud.js (split from app.js; shared global scope, load order set in index.html)
    // =================== CLOUD SYNC (GitHub Pages) ===================
    var CLOUD_CONFIG = {
      owner: 'hoduytinh',
      repo: 'marvell_pes',
      branch: 'main',
      dataPath: 'data.json'
    };

    var CloudSync = {
      pat: null,
      enabled: true,
      sha: null,
      lastSyncedHash: null,
      pushTimer: null,
      pushInProgress: false,
      pendingState: null,
      status: 'idle',
      statusText: '',

      init: function() {
        try { this.pat = localStorage.getItem('pesGitHubPAT') || null; } catch(_){}
        try { this.enabled = localStorage.getItem('pesCloudSyncEnabled') !== '0'; } catch(_) { this.enabled = true; }
        this.updateUI();
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

      setPAT: function(pat) {
        this.pat = pat ? pat.trim() : null;
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
          // sha is only needed for admin PUT writes. Skip the extra Contents API
          // call for plain viewers (no PAT) so they don't consume the 60 req/hour
          // unauthenticated API rate limit at all.
          if(self.pat) {
            self._refreshSha().finally(function() {
              self.setStatus('synced');
            });
          } else {
            self.setStatus('synced');
          }
          return parsed;
        }

        // Fallback: GitHub Contents API (raw media type). Used only if the raw
        // CDN read fails. Works for files up to 100 MB but is rate-limited for
        // unauthenticated viewers, so it is the secondary option.
        function loadViaApi() {
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
              if(r.status === 401 || r.status === 403) {
                self.setStatus('error', 'PAT không hợp lệ hoặc thiếu quyền (HTTP ' + r.status + ')');
                return null;
              }
              if(!r.ok) throw new Error('HTTP ' + r.status);
              return r.text();
            })
            .then(handleJsonText)
            .catch(function(err) {
              console.warn('CloudSync.load (API) failed:', err);
              self.setStatus('offline', String(err.message || err));
              return null;
            });
        }

        // PRIMARY: read directly from raw.githubusercontent.com (no 1 MB cap,
        // no per-IP API rate limit) with cache-busting so viewers always get the
        // latest committed data.json.
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
            console.warn('CloudSync.load (raw CDN) failed, trying Contents API:', err);
            return loadViaApi();
          });
      },

      schedulePush: function(stateRef) {
        var self = this;
        if(!self.pat || !self.enabled) return;
        self.pendingState = stateRef;
        if(self.pushTimer) clearTimeout(self.pushTimer);
        self.pushTimer = setTimeout(function() {
          self.pushTimer = null;
          self.push(self.pendingState);
        }, 2000);
      },

      push: function(stateRef) {
        var self = this;
        if(!self.pat || !self.enabled) return Promise.resolve(false);
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
          message: 'Update data.json ' + new Date().toISOString(),
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
            // SHA conflict — refresh sha then retry once
            return self._refreshSha().then(function() {
              self.pushInProgress = false;
              self.schedulePush(stateRef);
              return false;
            });
          }
          if(!r.ok) {
            return r.text().then(function(t) {
              throw new Error('HTTP ' + r.status + ': ' + t.substring(0, 200));
            });
          }
          return r.json().then(function(resp) {
            if(resp && resp.content) self.sha = resp.content.sha;
            self.lastSyncedHash = newHash;
            self.pushInProgress = false;
            self.setStatus('synced');
            return true;
          });
        })
        .catch(function(err) {
          console.error('CloudSync.push failed:', err);
          self.pushInProgress = false;
          self.setStatus('error', String(err.message || err));
          return false;
        });
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
