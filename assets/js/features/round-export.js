// Marvell PES Club - features/round-export.js
// Admin: export the round shown in "Lịch thi đấu" as a text line + PNG snapshot (for Slack).

var HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

// Shares the script tag id with teo-widget so the library is only loaded once.
function loadHtml2Canvas(){
  if(window.html2canvas) return Promise.resolve(window.html2canvas);
  return new Promise(function(resolve, reject){
    var existing = document.getElementById('teo-html2canvas-lib');
    if(existing){
      existing.addEventListener('load', function(){ resolve(window.html2canvas); }, { once: true });
      existing.addEventListener('error', function(){ reject(new Error('Không tải được thư viện chụp ảnh')); }, { once: true });
      return;
    }
    var script = document.createElement('script');
    script.id = 'teo-html2canvas-lib';
    script.src = HTML2CANVAS_URL;
    script.async = true;
    script.onload = function(){ resolve(window.html2canvas); };
    script.onerror = function(){ reject(new Error('Không tải được thư viện chụp ảnh')); };
    document.head.appendChild(script);
  });
}

// "Vòng 3" / "Group Stage - Round 1" / team name when the team filter is active.
function roundExportLabel(s){
  var teamFilter = $('teamFilter');
  if(teamFilter && teamFilter.value !== ''){
    var t = s.teams[Number(teamFilter.value)];
    if(t) return t;
  }
  if(getModeDef(s).roundSelector === 'tournament'){
    var sel = $('roundSel');
    var opt = sel && sel.options[sel.selectedIndex];
    return opt ? opt.textContent.trim() : '';
  }
  var rounds = [].map.call(document.querySelectorAll('#roundCheckboxes input[type="checkbox"]:checked'), function(cb){
    return Number(cb.value) + 1;
  });
  // Chess-Swiss shows the latest round when nothing is ticked.
  if(!rounds.length && s.mode === 'chess-swiss' && s.chessSwiss) rounds = [s.chessSwiss.rounds.length];
  rounds.sort(function(a, b){ return a - b; });
  var vi = localStorage.getItem('pesLang') === 'vi';
  return (vi ? 'Vòng ' : 'Round ') + rounds.join(', ');
}

// Off-screen copy of #fixtures (current score values, no admin buttons) under a title.
function buildRoundSnapshotNode(title, bg){
  var src = $('fixtures');
  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;width:860px;padding:16px;' +
    'box-sizing:border-box;background:' + bg + ';color:var(--text);font-family:inherit;';
  var head = document.createElement('div');
  head.className = 'no-i18n';
  head.textContent = title;
  head.style.cssText = 'font-size:18px;font-weight:700;margin:0 0 12px;color:var(--text);';
  var clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.style.marginTop = '0';
  var srcFields = src.querySelectorAll('input, select');
  var cloneFields = clone.querySelectorAll('input, select');
  for(var i = 0; i < cloneFields.length && i < srcFields.length; i++){
    if(cloneFields[i].tagName === 'SELECT') cloneFields[i].value = srcFields[i].value;
    else cloneFields[i].setAttribute('value', srcFields[i].value);
  }
  [].forEach.call(clone.querySelectorAll('button'), function(b){ b.remove(); });
  [].forEach.call(clone.querySelectorAll('[data-key]'), function(el){ el.removeAttribute('data-key'); });
  wrap.appendChild(head);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  return wrap;
}

var BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function hideSnapshotImage(img){
  img.src = BLANK_PIXEL;
  img.style.visibility = 'hidden';
}

function blobToDataUrl(blob){
  return new Promise(function(resolve, reject){
    var fr = new FileReader();
    fr.onload = function(){ resolve(fr.result); };
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

var snapshotImageCache = {};
function fetchDataUrlOnce(url){
  return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.blob();
  }).then(blobToDataUrl);
}

// Repo assets (logos/, photos/) are referenced by relative path. When the page
// cannot read them itself (e.g. opened via file://, where every image taints the
// canvas and fetch is blocked), fall back to the CORS-enabled raw GitHub copy.
function repoAssetFallbackUrl(url){
  var m = /\/((?:logos|photos)\/[^?#]+)$/.exec(url);
  if(!m || typeof ghRawFileUrl !== 'function') return null;
  var raw = ghRawFileUrl(m[1]);
  return raw === url ? null : raw;
}

function fetchAsDataUrl(url){
  if(!snapshotImageCache[url]){
    snapshotImageCache[url] = fetchDataUrlOnce(url).catch(function(err){
      var alt = repoAssetFallbackUrl(url);
      if(!alt) throw err;
      return fetchDataUrlOnce(alt);
    });
    snapshotImageCache[url].catch(function(){ delete snapshotImageCache[url]; });
  }
  return snapshotImageCache[url];
}

function cssBackgroundUrl(el){
  var m = /url\(\s*(["']?)(.*?)\1\s*\)/.exec(getComputedStyle(el).backgroundImage || '');
  return m ? m[2] : null;
}

// Logos are both <img> and CSS background-image (.fixture-logo). Rewrite all of
// them as data: URLs so html2canvas never draws a cross-origin (canvas-tainting)
// image; anything that cannot be fetched with CORS is dropped.
function inlineSnapshotImages(node){
  var jobs = [].map.call(node.querySelectorAll('img'), function(img){
    var src = img.src;
    if(!src || /^data:/i.test(src)) return null;
    return fetchAsDataUrl(src).then(function(d){ img.src = d; }, function(){ hideSnapshotImage(img); });
  });
  [].forEach.call(node.querySelectorAll('*'), function(el){
    var url = cssBackgroundUrl(el);
    if(!url || /^data:/i.test(url)) return;
    jobs.push(fetchAsDataUrl(url).then(function(d){
      el.style.backgroundImage = 'url("' + d + '")';
    }, function(){
      el.style.backgroundImage = 'none';
    }));
  });
  return Promise.all(jobs);
}

function stripSnapshotImages(node){
  [].forEach.call(node.querySelectorAll('img'), hideSnapshotImage);
  [].forEach.call(node.querySelectorAll('*'), function(el){
    if(cssBackgroundUrl(el)) el.style.backgroundImage = 'none';
  });
}

function renderSnapshotBlob(html2canvas, title, bg, withImages){
  var node = buildRoundSnapshotNode(title, bg);
  var prep = withImages ? inlineSnapshotImages(node) : Promise.resolve(stripSnapshotImages(node));
  return prep.then(function(){
    return html2canvas(node, { backgroundColor: bg, scale: 2, useCORS: true, allowTaint: false, logging: false, windowWidth: 1280 });
  }).then(function(canvas){
    return new Promise(function(resolve, reject){
      canvas.toBlob(function(blob){
        if(blob) resolve(blob); else reject(new Error('Không tạo được ảnh'));
      }, 'image/png');
    });
  }).then(function(blob){ node.remove(); return blob; }, function(err){ node.remove(); throw err; });
}

function captureRoundSnapshot(title){
  var bg = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#0e1b44';
  return loadHtml2Canvas().then(function(html2canvas){
    return renderSnapshotBlob(html2canvas, title, bg, true).catch(function(err){
      // Last resort: a canvas still got tainted -> export without logos.
      if(!err || err.name !== 'SecurityError') throw err;
      console.warn('Round export: retrying without images', err);
      return renderSnapshotBlob(html2canvas, title, bg, false);
    });
  });
}

function roundExportFileName(title){
  var base = String(title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return (base || 'round') + '.png';
}

function exportL(vi, en){ return localStorage.getItem('pesLang') === 'vi' ? vi : en; }

function downloadBlob(doc, blob, name){
  var url = URL.createObjectURL(blob);
  var a = doc.createElement('a');
  a.href = url;
  a.download = name;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

// Theme colours of the main page, reused by the export window.
function exportThemeCss(){
  var cs = getComputedStyle(document.documentElement);
  function v(name, def){ return cs.getPropertyValue(name).trim() || def; }
  return 'body{margin:0;padding:20px;background:' + v('--bg', '#0b1533') + ';color:' + v('--text', '#e7eeff') + ';' +
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}' +
    'h3{margin:0 0 12px;font-size:18px}' +
    'textarea{width:100%;box-sizing:border-box;resize:vertical;font:inherit;font-size:15px;padding:8px;border-radius:8px;' +
      'background:' + v('--panel', '#0e1b44') + ';color:inherit;border:1px solid ' + v('--border', '#1e3a5f') + '}' +
    'img.preview{display:block;max-width:100%;margin:12px 0;border:1px solid ' + v('--border', '#1e3a5f') + ';border-radius:8px}' +
    '.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    'button{font:inherit;font-size:14px;padding:8px 14px;border-radius:8px;cursor:pointer;color:inherit;' +
      'background:' + v('--surface-2', '#13244f') + ';border:1px solid ' + v('--border', '#1e3a5f') + '}' +
    'button.primary{background:' + v('--accent', '#38bdf8') + ';color:' + v('--on-accent', '#04203a') + ';border-color:transparent;font-weight:600}' +
    '.muted{color:' + v('--muted', '#7ba7d9') + ';font-size:13px}' +
    '.status{min-height:18px;margin-top:8px;font-size:14px}';
}

// Builds the export UI inside `doc` (the export window, or a <dialog> fallback).
function buildExportPanel(doc, title, blob, dataUrl, onClose){
  var win = doc.defaultView;
  function el(tag, props, kids){
    var e = doc.createElement(tag);
    Object.keys(props || {}).forEach(function(k){
      if(k === 'text') e.textContent = props[k];
      else if(k === 'class') e.className = props[k];
      else if(k === 'onclick') e.addEventListener('click', props[k]);
      else e[k] = props[k];
    });
    (kids || []).forEach(function(c){ e.appendChild(c); });
    return e;
  }
  var textIn = el('textarea', { class: 'no-i18n', rows: 2, value: title + '\n@channel', spellcheck: false });
  var status = el('div', { class: 'status' });
  function flash(msg){ status.textContent = msg; }
  function clip(){ return win.navigator.clipboard; }
  function canWrite(){ return !!(clip() && clip().write && win.ClipboardItem); }
  function fileName(){ return roundExportFileName(textIn.value.split('\n')[0]); }

  function copyText(){
    if(clip() && clip().writeText) return clip().writeText(textIn.value);
    textIn.focus(); textIn.select();
    return doc.execCommand('copy') ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }
  function copyImage(){
    if(!canWrite()) return Promise.reject(new Error('unsupported'));
    return clip().write([new win.ClipboardItem({ 'image/png': blob })]);
  }

  // Slack (like most chat apps) pastes only the text when the clipboard holds
  // both text and an image, so "Copy all" is a guided two-step copy:
  // click 1 copies the text, click 2 copies the image.
  var allStep = 1;
  var allLabel1 = exportL('📋 Copy tất cả (1/2: text)', '📋 Copy all (1/2: text)');
  var allLabel2 = exportL('🖼️ Copy tất cả (2/2: ảnh)', '🖼️ Copy all (2/2: image)');
  var allBtn = el('button', { type: 'button', class: 'primary', text: allLabel1, onclick: function(){
    if(allStep === 1){
      copyText().then(function(){
        allStep = 2;
        allBtn.textContent = allLabel2;
        flash(exportL('✅ Bước 1: đã copy text → dán (Ctrl+V) vào Slack, rồi quay lại bấm nút lần nữa để copy ảnh',
          '✅ Step 1: text copied → paste (Ctrl+V) into Slack, then come back and click again to copy the image'));
      }, function(){ flash(exportL('❌ Không copy được text', '❌ Could not copy text')); });
      return;
    }
    copyImage().then(function(){
      allStep = 1;
      allBtn.textContent = allLabel1;
      flash(exportL('✅ Bước 2: đã copy ảnh → dán (Ctrl+V) tiếp vào cùng tin nhắn Slack rồi gửi',
        '✅ Step 2: image copied → paste (Ctrl+V) into the same Slack message and send'));
    }, function(){
      downloadBlob(doc, blob, fileName());
      flash(exportL('Trình duyệt không cho copy ảnh, đã tải ảnh xuống', 'The browser does not allow copying images, the image was downloaded instead'));
    });
  } });

  var buttons = [
    allBtn,
    el('button', { type: 'button', text: '📝 Copy text', onclick: function(){
      copyText().then(function(){ flash(exportL('✅ Đã copy text', '✅ Text copied')); },
        function(){ flash(exportL('❌ Không copy được text', '❌ Could not copy text')); });
    } }),
    el('button', { type: 'button', text: exportL('🖼️ Copy ảnh', '🖼️ Copy image'), onclick: function(){
      copyImage().then(function(){ flash(exportL('✅ Đã copy ảnh', '✅ Image copied')); }, function(){
        downloadBlob(doc, blob, fileName());
        flash(exportL('Trình duyệt không cho copy ảnh, đã tải ảnh xuống', 'The browser does not allow copying images, the image was downloaded instead'));
      });
    } }),
    el('button', { type: 'button', text: exportL('⬇️ Tải ảnh', '⬇️ Download image'), onclick: function(){
      downloadBlob(doc, blob, fileName());
    } }),
    el('button', { type: 'button', text: exportL('Đóng', 'Close'), onclick: onClose })
  ];

  return el('div', {}, [
    el('h3', { text: exportL('📤 Export vòng đấu', '📤 Export round') }),
    textIn,
    el('div', { class: 'actions' }, buttons),
    status,
    el('img', { class: 'preview', src: dataUrl, alt: title }),
    el('p', { class: 'muted', text: exportL(
      'Slack chỉ dán được text HOẶC ảnh mỗi lần, nên "Copy tất cả" gồm 2 bước: bấm → dán text vào Slack → bấm lại → dán ảnh vào cùng tin nhắn → gửi.',
      'Slack pastes either text OR an image at a time, so "Copy all" has 2 steps: click → paste the text into Slack → click again → paste the image into the same message → send.') })
  ]);
}

function openExportWindow(){
  var w = window.open('', 'pesRoundExport', 'width=920,height=860,resizable=yes,scrollbars=yes');
  if(!w) return null;
  var doc = w.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Export</title><style>' + exportThemeCss() + '</style></head><body><p class="muted" id="loading"></p></body></html>');
  doc.close();
  doc.getElementById('loading').textContent = exportL('⏳ Đang tạo ảnh...', '⏳ Creating image...');
  return w;
}

function fillExportWindow(w, title, blob, dataUrl){
  if(!w || w.closed) return false;
  var doc = w.document;
  doc.title = title;
  doc.body.innerHTML = '';
  doc.body.appendChild(buildExportPanel(doc, title, blob, dataUrl, function(){ w.close(); }));
  w.focus();
  return true;
}

// Fallback when the popup is blocked: same panel inside a <dialog>.
function showRoundExportDialog(title, blob, dataUrl){
  var dlg = $('roundExportDialog');
  if(!dlg){
    dlg = document.createElement('dialog');
    dlg.id = 'roundExportDialog';
    dlg.className = 'round-export-dialog';
    document.body.appendChild(dlg);
  }
  dlg.innerHTML = '';
  dlg.appendChild(buildExportPanel(document, title, blob, dataUrl, function(){ dlg.close(); }));
  if(typeof dlg.showModal === 'function'){ if(!dlg.open) dlg.showModal(); }
  else dlg.setAttribute('open', '');
}

function openRoundExport(){
  if(!isAdmin()){ toast('Chỉ admin được phép sửa'); return; }
  var s = activeSeason();
  if(!s) return;
  if(!$('fixtures').querySelector('.fixture, .tournament-fixture')){ toast('Chưa có trận nào để export'); return; }

  var title = '[' + s.name + '] ' + roundExportLabel(s);
  var btn = $('btnExportRound');
  if(btn) btn.disabled = true;
  // Open the window synchronously inside the click so popup blockers allow it.
  var w = openExportWindow();
  if(!w) toast('Đang tạo ảnh...');

  captureRoundSnapshot(title).then(function(blob){
    return blobToDataUrl(blob).then(function(dataUrl){
      if(!fillExportWindow(w, title, blob, dataUrl)) showRoundExportDialog(title, blob, dataUrl);
    });
  }).catch(function(err){
    console.error('Round export failed:', err);
    if(w && !w.closed) w.close();
    alert('Không tạo được ảnh: ' + (err && err.message ? err.message : err));
  }).then(function(){
    if(btn) btn.disabled = false;
  });
}

document.addEventListener('click', function(e){
  if(e.target && e.target.closest && e.target.closest('#btnExportRound')) openRoundExport();
});
