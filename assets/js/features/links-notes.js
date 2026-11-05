// Marvell PES Club - features/links-notes.js (split from app.js; shared global scope, load order set in index.html)
  var homeLink = localStorage.getItem('pesHomeLink') || '';
  var homeLabel = localStorage.getItem('pesHomeLabel') || 'Home';
  var customLinks = JSON.parse(localStorage.getItem('pesCustomLinks') || '[]');
    function setHomeLink(link, label) {
      homeLink = link;
      homeLabel = label || 'Home';
      try { localStorage.setItem('pesHomeLink', link); } catch(e){}
      try { localStorage.setItem('pesHomeLabel', homeLabel); } catch(e){}
      updateCustomLinks();
    }

    function setCustomLinks(links) {
      customLinks = links;
      try { localStorage.setItem('pesCustomLinks', JSON.stringify(links)); } catch(e){}
      updateCustomLinks();
    }

    // Note dialog logic
    function showNoteDialog(idx) {
      window.showNoteDialog = showNoteDialog;
      var notes = JSON.parse(localStorage.getItem('pesNotes') || '[]');
      var note = notes[idx];
      if (!note) return;
      var dlg = document.getElementById('noteDialog');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'noteDialog';
        document.body.appendChild(dlg);
      }
      // Always set dialog content to ensure both fields appear
      dlg.innerHTML = `
        <form id="noteForm" style="width:min(1100px,88vw)">
          <h3>Ghi chú: <input id="noteLabelInput" type="text" style="width:70%;font-size:18px;padding:10px 12px" /></h3>
          <div style="margin-bottom:8px;font-size:15px">Nội dung (có thể định dạng HTML):</div>
          <textarea id="noteContentInput" style="width:100%;height:min(510px,60vh);font-size:16px;padding:12px"></textarea>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:18px">
            <button type="button" id="closeNoteBtn" style="font-size:16px;padding:10px 18px">Đóng</button>
            <button type="submit" id="saveNoteBtn" class="primary" style="font-size:16px;padding:10px 18px">Lưu</button>
          </div>
        </form>
      `;
      // Always show dialog, fallback for browsers without <dialog>
      if (typeof dlg.showModal === 'function') { dlg.showModal(); }
      else { dlg.setAttribute('open','open'); dlg.style.display = 'block'; dlg.style.position = 'fixed'; dlg.style.zIndex = 10000; dlg.style.left = '50%'; dlg.style.top = '20%'; dlg.style.transform = 'translate(-50%, 0)'; }

      function bindNoteDialogEvents() {
        var labelInput = dlg.querySelector('#noteLabelInput');
        var contentInput = dlg.querySelector('#noteContentInput');
        var saveBtn = dlg.querySelector('#saveNoteBtn');
        var closeBtn = dlg.querySelector('#closeNoteBtn');
        labelInput.value = note.label;
        contentInput.value = note.content;
        var admin = isAdmin();
        labelInput.disabled = !admin;
        contentInput.disabled = !admin ? true : false;
        saveBtn.style.display = admin ? '' : 'none';
        saveBtn.onclick = null;
        closeBtn.onclick = null;
        dlg.querySelector('#noteForm').onsubmit = null;
        dlg.querySelector('#noteForm').onsubmit = function(e) {
          e.preventDefault();
          if (!isAdmin()) return;
          note.label = labelInput.value;
          note.content = contentInput.value;
          notes[idx] = note;
          localStorage.setItem('pesNotes', JSON.stringify(notes));
          updateCustomLinks();
          if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
        };
        closeBtn.onclick = function() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
        if (admin) contentInput.focus();
      }
      bindNoteDialogEvents();
    }
    window.showNoteDialog = showNoteDialog;
    function updateCustomLinks() {
      var wrap = $('customLinks');
      if (!wrap) return;
      wrap.innerHTML = '';
      // Render note buttons
      var notes = JSON.parse(localStorage.getItem('pesNotes') || '[]');
      notes.forEach(function(note, idx) {
        var btnWrap = document.createElement('span');
        btnWrap.style.display = 'inline-flex';
        btnWrap.style.alignItems = 'center';
        var btn = document.createElement('button');
        btn.className = 'primary';
        btn.textContent = note.label || 'Note';
        btn.title = 'Ghi chú';
        btn.style.marginRight = '2px';
        btn.onclick = function(e) {
          if (typeof window.showNoteDialog === 'function') {
            window.showNoteDialog(idx);
          } else {
            showNoteDialog(idx);
          }
        };
        btnWrap.appendChild(btn);
        if (isAdmin()) {
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.title = 'Xoá ghi chú';
          delBtn.className = 'ghost';
          delBtn.style.marginLeft = '0px';
          delBtn.style.padding = '0 8px';
          delBtn.style.fontSize = '16px';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Xoá ghi chú này?')) {
              notes.splice(idx, 1);
              localStorage.setItem('pesNotes', JSON.stringify(notes));
              updateCustomLinks();
            }
          };
          btnWrap.appendChild(delBtn);
        }
        btnWrap.style.marginRight = '4px';
        wrap.appendChild(btnWrap);
      });
      // Only show Home button if it has a link or a custom label (not default/empty)
      if (homeLink || (homeLabel && homeLabel !== 'Home')) {
        var btnHomeWrap = document.createElement('span');
        btnHomeWrap.style.display = 'inline-flex';
        btnHomeWrap.style.alignItems = 'center';
        var btnHome = document.createElement('button');
        btnHome.id = 'btnHome';
        btnHome.className = homeLink ? 'primary' : 'ghost';
        btnHome.textContent = homeLabel || 'Home';
        btnHome.title = homeLink;
        btnHome.style.marginRight = '2px';
        btnHome.onclick = function(e) {
          if (isAdmin()) {
            var dlg = $('homeLinkDialog');
            $('homeLinkInput').value = homeLink;
            $('homeLabelInput').value = homeLabel;
            if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open','open'); }
          } else if (homeLink) {
            window.location.href = homeLink;
          } else {
            toast('Chưa đặt liên kết Home');
          }
        };
        btnHomeWrap.appendChild(btnHome);
        if (isAdmin()) {
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.title = 'Xoá nút Home';
          delBtn.className = 'ghost';
          delBtn.style.marginLeft = '0px';
          delBtn.style.padding = '0 8px';
          delBtn.style.fontSize = '16px';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Xoá nút Home?')) {
              homeLink = '';
              homeLabel = 'Home';
              try { localStorage.removeItem('pesHomeLink'); } catch(e){}
              try { localStorage.removeItem('pesHomeLabel'); } catch(e){}
              updateCustomLinks();
            }
          };
          btnHomeWrap.appendChild(delBtn);
        }
        btnHomeWrap.style.marginRight = '4px';
        wrap.appendChild(btnHomeWrap);
      }
      // Custom link buttons
      customLinks.forEach(function(link, idx) {
        var btnWrap = document.createElement('span');
        btnWrap.style.display = 'inline-flex';
        btnWrap.style.alignItems = 'center';
        var btn = document.createElement('button');
        btn.className = link.url ? 'primary' : 'ghost';
        btn.textContent = link.label || 'Link';
        btn.title = link.url;
        btn.style.marginRight = '2px';
        btn.onclick = function(e) {
          if (isAdmin()) {
            var dlg = $('homeLinkDialog');
            $('homeLinkInput').value = link.url;
            $('homeLabelInput').value = link.label;
            dlg.setAttribute('data-edit-idx', idx);
            if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); } else { dlg.setAttribute('open','open'); }
          } else if (link.url) {
            window.location.href = link.url;
          } else {
            toast('Chưa đặt liên kết');
          }
        };
        btnWrap.appendChild(btn);
        if (isAdmin()) {
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.title = 'Xoá liên kết';
          delBtn.className = 'ghost';
          delBtn.style.marginLeft = '0px';
          delBtn.style.padding = '0 8px';
          delBtn.style.fontSize = '16px';
          delBtn.style.lineHeight = '1';
          delBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Xoá liên kết này?')) {
              customLinks.splice(idx, 1);
              setCustomLinks(customLinks);
            }
          };
          btnWrap.appendChild(delBtn);
        }
        btnWrap.style.marginRight = '4px';
        wrap.appendChild(btnWrap);
      });
    }
