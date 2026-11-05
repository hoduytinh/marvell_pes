// Marvell PES Club - features/logos.js (split from app.js; shared global scope, load order set in index.html)
    // =================== LOGO SCANNER (auto-discover logos/ folder) ===================
    // Lists files inside the repository's `logos/` folder via the GitHub
    // Contents API and merges them into state.logoMasterList so that simply
    // pushing an image file into logos/ makes it appear in the Logo Master List.
    var LogoScanner = {
      CACHE_KEY: 'pesLogoScanCache',
      CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
      IMAGE_RE: /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i,
      lastScan: 0,

      apiUrl: function() {
        return 'https://api.github.com/repos/' + CLOUD_CONFIG.owner +
               '/' + CLOUD_CONFIG.repo + '/contents/logos?ref=' +
               encodeURIComponent(CLOUD_CONFIG.branch);
      },

      // Convert a file name like "AC_Milan.png" to display name "AC_Milan"
      nameFromFile: function(filename) {
        return filename.replace(/\.[^.]+$/, '');
      },

      readCache: function() {
        try {
          var raw = localStorage.getItem(this.CACHE_KEY);
          if(!raw) return null;
          var c = JSON.parse(raw);
          if(!c || !c.ts || !Array.isArray(c.items)) return null;
          if(Date.now() - c.ts > this.CACHE_TTL_MS) return null;
          return c.items;
        } catch(_) { return null; }
      },

      writeCache: function(items) {
        try {
          localStorage.setItem(this.CACHE_KEY, JSON.stringify({ ts: Date.now(), items: items }));
        } catch(_) {}
      },

      // Resolve with array of { name, data } entries (data is a relative path like "logos/X.png")
      fetchList: function(useCache) {
        var self = this;
        if(useCache !== false) {
          var cached = self.readCache();
          if(cached) return Promise.resolve(cached);
        }
        var headers = { 'Accept': 'application/vnd.github+json' };
        // Use PAT if available to lift the 60 req/hour anonymous limit
        if(typeof CloudSync !== 'undefined' && CloudSync.pat) {
          headers['Authorization'] = 'Bearer ' + CloudSync.pat;
        }
        return fetch(self.apiUrl(), { headers: headers, cache: 'no-store' })
          .then(function(r) {
            if(r.status === 404) return [];
            if(!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function(list) {
            if(!Array.isArray(list)) return [];
            var items = list
              .filter(function(f) {
                return f && f.type === 'file' && self.IMAGE_RE.test(f.name);
              })
              .map(function(f) {
                return {
                  name: self.nameFromFile(f.name),
                  data: 'logos/' + f.name,
                  source: 'scan'
                };
              });
            self.writeCache(items);
            self.lastScan = Date.now();
            return items;
          })
          .catch(function(err) {
            console.warn('LogoScanner.fetchList failed:', err);
            var cached = self.readCache();
            return cached || [];
          });
      },

      // Merge scanned files into state.logoMasterList. Scan entries take
      // priority over manually-added entries that share the same name (so a
      // new file on disk replaces the cached base64 reference). Stale
      // entries that point at logos/ but no longer exist on disk are pruned.
      mergeInto: function(items) {
        if(!state.logoMasterList) state.logoMasterList = [];
        var scanNames = {};
        items.forEach(function(it) { scanNames[it.name] = true; });

        var byName = {};
        // Keep only manual entries (base64) — drop stale logos/ references
        state.logoMasterList.forEach(function(l) {
          if(!l || !l.name) return;
          var isFileRef = typeof l.data === 'string' && l.data.indexOf('logos/') === 0;
          if(isFileRef) {
            // Only keep if still present in scan (will be overwritten below)
            if(!scanNames[l.name]) return;
          }
          byName[l.name] = l;
        });
        // Scan results overwrite by name
        items.forEach(function(item) {
          byName[item.name] = item;
        });
        var merged = Object.keys(byName).map(function(k) { return byName[k]; });
        merged.sort(function(a, b) {
          return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        });
        state.logoMasterList = merged;
      },

      // Full convenience: fetch + merge. Returns Promise<itemsCount>.
      run: function(useCache) {
        var self = this;
        return self.fetchList(useCache).then(function(items) {
          self.mergeInto(items);
          return items.length;
        });
      }
    };

    // Classify logos by filename prefix: entries whose name starts with
    // "season_" (case-insensitive) are league/season logos; everything else
    // is treated as a team logo. This keeps a single storage list but
    // exposes two independent pickers in the UI.
    function isSeasonLogoEntry(entry) {
      if(!entry || !entry.name) return false;
      return /^season[_\s-]/i.test(entry.name);
    }
    function getTeamLogoOptions() {
      return (state.logoMasterList || []).filter(function(l) { return !isSeasonLogoEntry(l); });
    }
    function getSeasonLogoOptions() {
      return (state.logoMasterList || []).filter(isSeasonLogoEntry);
    }

    // =================== REPO UPLOADER (admin push images to repo) ===================
    // Uploads a binary image to logos/ or photos/ in the GitHub repo via the
    // Contents API. Requires CloudSync.pat. Returns Promise<relativePath>.
    // Falls back to a data URL (base64) when no PAT is configured, so the
    // admin UI still works locally — but those will not persist to other
    // devices until the admin adds a PAT.
    var RepoUploader = {
      sanitize: function(s) {
        if(!s) return 'img';
        s = String(s).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');
        if(s.length > 64) s = s.substring(0, 64);
        return s || 'img';
      },

      extFromMime: function(mime) {
        if(!mime) return 'bin';
        if(/png/.test(mime)) return 'png';
        if(/jpe?g/.test(mime)) return 'jpg';
        if(/gif/.test(mime)) return 'gif';
        if(/webp/.test(mime)) return 'webp';
        if(/svg/.test(mime)) return 'svg';
        if(/bmp/.test(mime)) return 'bmp';
        if(/icon/.test(mime)) return 'ico';
        return 'bin';
      },

      // Read a File/Blob as raw base64 (no data URL prefix).
      readBase64: function(blob) {
        return new Promise(function(resolve, reject) {
          var r = new FileReader();
          r.onload = function() {
            var s = r.result || '';
            var i = s.indexOf(',');
            resolve(i >= 0 ? s.substring(i + 1) : s);
          };
          r.onerror = function() { reject(new Error('Failed to read file')); };
          r.readAsDataURL(blob);
        });
      },

      // Pick a unique filename inside `folder` (avoiding collisions with
      // already-known logoMasterList entries when uploading to logos/).
      pickName: function(baseName, ext, folder) {
        var clean = this.sanitize(baseName);
        var taken = {};
        if(folder === 'logos' && state.logoMasterList) {
          state.logoMasterList.forEach(function(l) {
            if(l && typeof l.data === 'string' && l.data.indexOf('logos/') === 0) {
              taken[l.data] = true;
            }
          });
        }
        var candidate = folder + '/' + clean + '.' + ext;
        if(!taken[candidate]) return candidate;
        for(var i = 2; i < 1000; i++) {
          candidate = folder + '/' + clean + '_' + i + '.' + ext;
          if(!taken[candidate]) return candidate;
        }
        return folder + '/' + clean + '_' + Date.now() + '.' + ext;
      },

      // PUT file to repo. opts: { folder, baseName, message }
      uploadBlob: function(blob, opts) {
        var self = this;
        if(typeof CloudSync === 'undefined' || !CloudSync.pat) {
          // No PAT — fall back to data URL so the UI still works on this
          // device; warn the admin.
          return self.readBase64(blob).then(function(b64) {
            console.warn('RepoUploader: no PAT, falling back to base64 (local only)');
            if(typeof toast === 'function') {
              toast('⚠️ Chưa có GitHub PAT — ảnh chỉ lưu local. Cấu hình PAT để đẩy lên repo.');
            }
            return 'data:' + (blob.type || 'image/png') + ';base64,' + b64;
          });
        }

        var ext  = self.extFromMime(blob.type);
        var path = self.pickName(opts.baseName || 'img', ext, opts.folder || 'logos');
        var msg  = opts.message || ('chore: upload ' + path);

        return self.readBase64(blob).then(function(b64) {
          var url = 'https://api.github.com/repos/' + CLOUD_CONFIG.owner +
                    '/' + CLOUD_CONFIG.repo + '/contents/' + path;
          return fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + CloudSync.pat,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: msg,
              content: b64,
              branch: CLOUD_CONFIG.branch
            })
          }).then(function(r) {
            if(!r.ok) {
              return r.text().then(function(t) {
                throw new Error('GitHub upload failed (HTTP ' + r.status + '): ' + t);
              });
            }
            // Invalidate logo scan cache so next list reflects the new file
            try { localStorage.removeItem(LogoScanner.CACHE_KEY); } catch(_) {}
            return path;
          });
        });
      },

      // Convenience: upload a File from <input type="file">
      uploadFile: function(file, opts) {
        var baseName = opts.baseName;
        if(!baseName && file && file.name) {
          baseName = file.name.replace(/\.[^.]+$/, '');
        }
        return this.uploadBlob(file, { folder: opts.folder, baseName: baseName, message: opts.message });
      },

      // Resize + recompress + upload (for timeline photos).
      // maxWidth defaults to 800px, target size 100KB (matches old resizeImage).
      uploadResizedFile: function(file, opts) {
        var self = this;
        var maxWidth = opts.maxWidth || 800;
        var maxBytes = opts.maxBytes || 100 * 1024;
        return new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
              var w = img.width, h = img.height;
              if(w > maxWidth) { h = h * maxWidth / w; w = maxWidth; }
              var canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);

              // Iteratively reduce quality to stay under maxBytes
              var q = 0.8;
              var blob;
              function tryBlob(cb) { canvas.toBlob(cb, 'image/jpeg', q); }
              function step() {
                tryBlob(function(b) {
                  blob = b;
                  if(!blob) { reject(new Error('Canvas toBlob failed')); return; }
                  if(blob.size > maxBytes && q > 0.2) {
                    q -= 0.1;
                    step();
                  } else {
                    var baseName = opts.baseName || (file && file.name ? file.name.replace(/\.[^.]+$/, '') : 'photo');
                    self.uploadBlob(blob, {
                      folder: opts.folder || 'photos',
                      baseName: baseName,
                      message: opts.message
                    }).then(resolve, reject);
                  }
                });
              }
              step();
            };
            img.onerror = function() { reject(new Error('Image decode failed')); };
            img.src = e.target.result;
          };
          reader.onerror = function() { reject(new Error('File read failed')); };
          reader.readAsDataURL(file);
        });
      }
    };
