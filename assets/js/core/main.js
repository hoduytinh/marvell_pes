// Marvell PES Club - core/main.js (split from app.js; shared global scope, load order set in index.html)
    function ensureInitial(){ if(!state.current){ state.current=Object.keys(state.seasons)[0] } var s=activeSeason(); if(s && (!s.rounds||!s.rounds.length) && s.mode!=='cup' && s.mode!=='chess-swiss' && s.mode!=='swiss' && s.mode!=='double-elimination' && s.mode!=='tournament' && s.mode!=='legend' && s.mode!=='ranking'){ s.rounds=generateFixtures(s.teamCount) } saveAll() }

    function init(){ 
      loadAll().then(function() {
        ensureInitial(); 
        refreshAll(); 
        attachFilterListeners(); 
        initEvents();
        wireCloudConfigDialog();
        initSystems();

        // Auto-scan logos/ folder and merge into Logo Master List.
        // Use cached result first for instant UI, then refresh in background.
        try {
          LogoScanner.run(true).then(function(n) {
            console.log('LogoScanner (cached) merged', n, 'logos from logos/');
            // Background refresh to pick up newly pushed files
            LogoScanner.run(false).then(function(n2) {
              if(n2 !== n) {
                console.log('LogoScanner (live) merged', n2, 'logos from logos/');
              }
            });
          });
        } catch(e) {
          console.warn('LogoScanner failed to start:', e);
        }

        // Check for auto-refresh after F5
        try {
          var shouldAutoRefresh = sessionStorage.getItem('pesAutoRefresh');
          var wasAdmin = sessionStorage.getItem('pesAutoRefreshAdmin');
          
          if(shouldAutoRefresh === 'true') {
            sessionStorage.removeItem('pesAutoRefresh');
            sessionStorage.removeItem('pesAutoRefreshAdmin');
            setTimeout(function() {
              if(wasAdmin === 'true') {
                if(typeof showRefreshConfirmationDialog === 'function') {
                  showRefreshConfirmationDialog();
                } else {
                  refreshFromFile();
                }
              } else {
                refreshFromFile();
              }
            }, 500);
          }
        } catch(e) {
          console.log('Auto-refresh check failed:', e);
        }
      });
    }

    function wireCloudConfigDialog() {
      var btn = $('btnCloudConfig');
      var dialog = $('cloudConfigDialog');
      if(!btn || !dialog) return;
      var patInput = $('cloudPatInput');
      var saveBtn = $('cloudSaveBtn');
      var clearBtn = $('cloudClearBtn');
      var pushNowBtn = $('cloudPushNowBtn');

      btn.addEventListener('click', function() {
        if(!isSuperAdmin()) { toast('Chỉ admin được phép cấu hình cloud'); return; }
        patInput.value = CloudSync.pat || '';
        if(typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });

      saveBtn.addEventListener('click', function(e) {
        var val = patInput.value.trim();
        CloudSync.setPAT(val);
        if(val) {
          toast('Đã lưu PAT. Đang đồng bộ...');
          CloudSync.load().then(function(cloudData) {
            if(cloudData && cloudData.seasons) {
              // Merge or replace? For now: ask
              if(confirm('Đã tìm thấy data trên cloud. Thay thế dữ liệu local hiện tại bằng dữ liệu cloud?')) {
                state = migrateState(cloudData);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_){}
                refreshAll();
              }
            } else {
              // No cloud data yet — push current state if sync is enabled
              if(CloudSync.isEnabled()) {
                CloudSync.pushNow(state);
              } else {
                CloudSync.updateUI();
              }
            }
          });
        } else {
          toast('Đã xóa PAT (chế độ chỉ local)');
        }
      });

      clearBtn.addEventListener('click', function() {
        if(confirm('Xóa PAT khỏi trình duyệt? Bạn sẽ không sync lên cloud được nữa cho tới khi nhập lại.')) {
          CloudSync.setPAT(null);
          patInput.value = '';
          toast('Đã xóa PAT');
        }
      });

      pushNowBtn.addEventListener('click', function() {
        var val = patInput.value.trim();
        if(val && val !== CloudSync.pat) CloudSync.setPAT(val);
        if(!CloudSync.hasPAT()) { toast('Cần nhập PAT trước'); return; }
        if(!CloudSync.isEnabled()) { toast('Đang tắt sync. Bật Sync: ON để push.'); return; }
        toast('Đang push lên GitHub...');
        CloudSync.pushNow(state).then(function(ok) {
          if(ok) toast('✅ Push thành công');
          else toast('❌ Push thất bại - xem console');
        });
      });
    }

    // Initialize global variable for export directory persistence
    window.pesLastExportDirHandle = null;

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
