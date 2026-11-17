// Marvell PES Club - features/season-backup.js
// Admin: Backup/Restore the results of ONE season (protects against an accidental "clear").
// Stored in state.seasonBackups[seasonId][backupId] -> part of data.json, synced to cloud.

var SEASON_BACKUP_MAX = 5;
// Images are not part of the results and can be large -> not snapshotted, kept on restore.
var SEASON_BACKUP_SKIP = { logo: 1, teamLogos: 1 };

function sbL(vi, en){ return localStorage.getItem('pesLang') === 'vi' ? vi : en; }

function sbFmtDate(ts){
  try { return new Date(ts).toLocaleString(sbL('vi-VN', 'en-GB')); } catch(_) { return String(ts); }
}

function seasonBackupsOf(sid){
  var all = (state.seasonBackups && state.seasonBackups[sid]) || {};
  return Object.keys(all).map(function(id){ return all[id]; })
    .filter(function(b){ return b && b.data; })
    .sort(function(a, b){ return b.createdAt - a.createdAt; });
}

function countSeasonResults(results){
  return Object.keys(results || {}).length;
}

// Snapshot the season (everything except images). Keeps the newest SEASON_BACKUP_MAX.
function createSeasonBackup(sid, note){
  var s = state.seasons[sid];
  if(!s) return null;
  var data = {};
  Object.keys(s).forEach(function(k){ if(!SEASON_BACKUP_SKIP[k]) data[k] = s[k]; });
  data = JSON.parse(JSON.stringify(data));

  if(!state.seasonBackups || typeof state.seasonBackups !== 'object') state.seasonBackups = {};
  var store = state.seasonBackups;
  // Drop backups of seasons that no longer exist.
  Object.keys(store).forEach(function(k){ if(!state.seasons[k]) delete store[k]; });
  var list = store[sid] || (store[sid] = {});

  var now = Date.now();
  var id = 'sb' + now.toString(36) + Math.random().toString(36).slice(2, 6);
  var who = authSession();
  list[id] = {
    id: id,
    createdAt: now,
    by: who ? who.u : '',
    note: String(note || '').trim().slice(0, 80),
    results: countSeasonResults(data.results),
    data: data
  };
  var ids = Object.keys(list).sort(function(a, b){ return list[a].createdAt - list[b].createdAt; });
  while(ids.length > SEASON_BACKUP_MAX) delete list[ids.shift()];
  return list[id];
}

// Replace the season's content with the backup (name/logos stay as they are now).
// The current content is backed up first so the restore itself can be undone.
function restoreSeasonBackup(sid, id){
  var s = state.seasons[sid];
  var b = state.seasonBackups && state.seasonBackups[sid] && state.seasonBackups[sid][id];
  if(!s || !b || !b.data) return false;
  var data = JSON.parse(JSON.stringify(b.data));
  createSeasonBackup(sid, sbL('Tự động: trước khi khôi phục', 'Auto: before restore'));
  var keep = { name: s.name, logo: s.logo, teamLogos: s.teamLogos };
  Object.keys(s).forEach(function(k){ delete s[k]; });
  Object.keys(data).forEach(function(k){ s[k] = data[k]; });
  Object.keys(keep).forEach(function(k){ if(keep[k] !== undefined) s[k] = keep[k]; });
  migrateState(state);
  return true;
}

function deleteSeasonBackup(sid, id){
  var list = state.seasonBackups && state.seasonBackups[sid];
  if(!list || !list[id]) return;
  delete list[id];
  if(!Object.keys(list).length) delete state.seasonBackups[sid];
}

function showSeasonBackupDialog(){
  if(!ensureAdmin()) return;
  var sid = state.current;
  var s = activeSeason();
  if(!s){ toast(sbL('Chưa chọn mùa giải', 'No season selected')); return; }

  var dlg = document.createElement('dialog');
  dlg.style.cssText = 'width:600px;max-width:92vw;border:none;border-radius:12px;padding:0;background:var(--card);color:var(--text);';
  document.body.appendChild(dlg);
  dlg.addEventListener('close', function(){ dlg.remove(); });

  var btnCss = 'padding:6px 12px;border:none;border-radius:6px;cursor:pointer;white-space:nowrap;color:#fff;';

  function render(){
    var list = seasonBackupsOf(sid);
    var rows = list.length ? list.map(function(b){
      var meta = b.results + sbL(' kết quả', ' results') + (b.by ? ' • ' + escapeHtml(b.by) : '');
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:600;">🗂️ ' + escapeHtml(sbFmtDate(b.createdAt)) + '</div>' +
          '<div class="no-i18n" style="font-size:12px;color:var(--muted);margin-top:2px;">' + meta + '</div>' +
          (b.note ? '<div class="no-i18n" style="font-size:12px;margin-top:2px;overflow-wrap:anywhere;">📝 ' + escapeHtml(b.note) + '</div>' : '') +
        '</div>' +
        '<button type="button" data-act="restore" data-id="' + escapeHtml(b.id) + '" style="' + btnCss + 'background:var(--accent);">↩️ Restore</button>' +
        '<button type="button" data-act="delete" data-id="' + escapeHtml(b.id) + '" style="' + btnCss + 'background:#c0392b;" title="' + sbL('Xoá', 'Delete') + '">🗑️</button>' +
      '</div>';
    }).join('') : '<div style="text-align:center;color:var(--muted);padding:20px;">' + sbL('Mùa này chưa có bản sao lưu nào.', 'This season has no backups yet.') + '</div>';

    dlg.innerHTML =
      '<div style="padding:20px;">' +
        '<h3 style="margin:0 0 4px 0;color:var(--accent);">🗂️ ' + sbL('Backup/Restore mùa giải', 'Season Backup/Restore') + '</h3>' +
        '<div class="no-i18n" style="font-weight:600;margin-bottom:6px;">' + escapeHtml(s.name || sid) + '</div>' +
        '<p style="margin:0 0 14px 0;color:var(--muted);font-size:13px;">' + sbL(
          'Lưu toàn bộ tỉ số / kết quả của riêng mùa này (đồng bộ cloud). Tối đa ' + SEASON_BACKUP_MAX + ' bản, bản cũ nhất tự xoá. Hiện có ' + countSeasonResults(s.results) + ' kết quả.',
          'Saves all scores / results of this season only (synced to the cloud). Up to ' + SEASON_BACKUP_MAX + ' backups, the oldest is removed automatically. Currently ' + countSeasonResults(s.results) + ' results.') + '</p>' +
        '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
          '<input type="text" data-role="note" maxlength="80" placeholder="' + sbL('Ghi chú (tuỳ chọn)', 'Note (optional)') + '" style="flex:1;min-width:0;" />' +
          '<button type="button" data-act="create" style="' + btnCss + 'background:var(--accent);padding:8px 14px;">➕ ' + sbL('Tạo bản sao lưu', 'Create backup') + '</button>' +
        '</div>' +
        '<div style="max-height:50vh;overflow-y:auto;">' + rows + '</div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:12px;">' +
          '<button type="button" data-act="close" style="padding:8px 16px;background:var(--border);color:var(--text);border:none;border-radius:6px;cursor:pointer;">' + sbL('Đóng', 'Close') + '</button>' +
        '</div>' +
      '</div>';
  }

  dlg.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('button[data-act]');
    if(!btn) return;
    var act = btn.getAttribute('data-act');
    var id = btn.getAttribute('data-id');
    if(act === 'close'){ dlg.close(); return; }
    if(act === 'create'){
      var noteIn = dlg.querySelector('[data-role="note"]');
      if(createSeasonBackup(sid, noteIn ? noteIn.value : '')){
        saveAll();
        toast(sbL('Đã tạo bản sao lưu', 'Backup created'));
      }
      render();
      return;
    }
    var b = state.seasonBackups && state.seasonBackups[sid] && state.seasonBackups[sid][id];
    if(!b) { render(); return; }
    if(act === 'restore'){
      var msg = sbL(
        'Khôi phục mùa "' + s.name + '" về bản sao lưu lúc ' + sbFmtDate(b.createdAt) + ' (' + b.results + ' kết quả)?\n\n' +
          'Dữ liệu hiện tại của mùa này (' + countSeasonResults(s.results) + ' kết quả) sẽ được tự động sao lưu trước khi khôi phục. Các mùa khác không bị ảnh hưởng.',
        'Restore season "' + s.name + '" to the backup from ' + sbFmtDate(b.createdAt) + ' (' + b.results + ' results)?\n\n' +
          'The current data of this season (' + countSeasonResults(s.results) + ' results) will be backed up automatically first. Other seasons are not affected.');
      if(!confirm(msg)) return;
      if(restoreSeasonBackup(sid, id)){
        saveAll();
        refreshSeasonUI();
        toast(sbL('✅ Đã khôi phục mùa giải', '✅ Season restored'));
      } else {
        alert(sbL('❌ Khôi phục thất bại.', '❌ Restore failed.'));
      }
      render();
      return;
    }
    if(act === 'delete'){
      if(!confirm(sbL('Xoá bản sao lưu lúc ' + sbFmtDate(b.createdAt) + '? Không thể hoàn tác.',
        'Delete the backup from ' + sbFmtDate(b.createdAt) + '? This cannot be undone.'))) return;
      deleteSeasonBackup(sid, id);
      saveAll();
      render();
    }
  });

  render();
  if(typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
}

document.addEventListener('click', function(e){
  if(e.target && e.target.closest && e.target.closest('#btnSeasonBackup')) showSeasonBackupDialog();
});
