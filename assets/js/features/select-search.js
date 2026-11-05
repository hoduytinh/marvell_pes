// Marvell PES Club - features/select-search.js (split from app.js; shared global scope, load order set in index.html)
    // Normalize a string for searching: lowercase, strip diacritics (Vietnamese
    // accents, đ -> d), and keep only alphanumeric characters. Lets users match
    // by plain letters regardless of case, accents, spaces or punctuation.
    function normalizeSearch(str){
      return String(str == null ? '' : str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }

    // Insert a live search box right above `listEl` and filter its items
    // (matched by `itemSelector`) using normalizeSearch. Hidden items get the
    // `ls-hidden` class so their own inline display (flex, etc.) is preserved.
    function addListSearch(listEl, itemSelector, getText, opts) {
      opts = opts || {};
      if(!listEl || !listEl.parentNode) return null;
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'list-search-input';
      input.placeholder = '🔍 Tìm theo tên...';
      input.setAttribute('autocomplete', 'off');
      listEl.parentNode.insertBefore(input, listEl);
      var empty = document.createElement('div');
      empty.className = 'list-search-empty';
      empty.textContent = 'Không có kết quả';
      empty.style.display = 'none';
      listEl.appendChild(empty);
      input.addEventListener('input', function() {
        var q = normalizeSearch(this.value);
        var visible = 0;
        listEl.querySelectorAll(itemSelector).forEach(function(el) {
          var match = !q || normalizeSearch(getText(el)).indexOf(q) !== -1;
          el.classList.toggle('ls-hidden', !match);
          if(match) visible++;
        });
        empty.style.display = visible === 0 ? 'block' : 'none';
      });
      if(opts.autofocus !== false) setTimeout(function() { try { input.focus(); } catch(_) {} }, 50);
      return input;
    }

    // ===== Searchable <select> =====
    // Any single-choice <select> with >= SELECT_SEARCH_MIN options opens a
    // popup with a search box instead of the native dropdown. The <select>
    // stays the source of truth: picking an item sets selectedIndex and fires
    // 'change', so every existing listener keeps working. Opt out with
    // the `data-no-search` attribute.
    var SELECT_SEARCH_MIN = 8;
    var selectSearchState = null;

    function isSearchableSelect(sel) {
      return !!sel && sel.tagName === 'SELECT' && !sel.multiple && !(sel.size > 1) && !sel.disabled &&
        !sel.hasAttribute('data-no-search') && sel.options.length >= SELECT_SEARCH_MIN;
    }

    function closeSelectSearch() {
      var st = selectSearchState;
      if(!st) return;
      selectSearchState = null;
      try { if(st.pop.hidePopover && st.pop.matches(':popover-open')) st.pop.hidePopover(); } catch(_) {}
      if(st.pop.parentNode) st.pop.parentNode.removeChild(st.pop);
      document.removeEventListener('mousedown', st.onOutside, true);
      document.removeEventListener('touchstart', st.onOutside, true);
      window.removeEventListener('scroll', st.onScroll, true);
      window.removeEventListener('resize', st.onResize);
    }

    function openSelectSearch(sel, fromTouch) {
      closeSelectSearch();
      var pop = document.createElement('div');
      pop.className = 'sel-search-pop';
      var usePopover = typeof pop.showPopover === 'function';
      if(usePopover) pop.setAttribute('popover', 'manual');

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'sel-search-input';
      input.placeholder = '🔍 Tìm theo tên...';
      input.setAttribute('autocomplete', 'off');
      var list = document.createElement('div');
      list.className = 'sel-search-list';
      var empty = document.createElement('div');
      empty.className = 'sel-search-empty';
      empty.textContent = 'Không có kết quả';
      empty.style.display = 'none';
      pop.appendChild(input);
      pop.appendChild(list);
      pop.appendChild(empty);

      var items = [];
      Array.prototype.forEach.call(sel.options, function(opt, i) {
        if(opt.hidden) return;
        var el = document.createElement('div');
        el.className = 'sel-search-item';
        if(opt.disabled) el.classList.add('disabled');
        if(i === sel.selectedIndex) el.classList.add('selected');
        el.textContent = opt.text;
        var grp = (opt.parentNode && opt.parentNode.tagName === 'OPTGROUP') ? opt.parentNode.label : '';
        var item = { el: el, idx: i, disabled: opt.disabled, key: normalizeSearch(opt.text + ' ' + grp) };
        el.addEventListener('mousedown', function(e) { e.preventDefault(); });
        el.addEventListener('click', function() { choose(item); });
        items.push(item);
        list.appendChild(el);
      });

      var visible = items.slice();
      var active = -1;
      function ensureVisible(el) {
        var top = el.offsetTop, bottom = top + el.offsetHeight;
        if(top < list.scrollTop) list.scrollTop = top;
        else if(bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
      }
      function setActive(n) {
        if(active >= 0 && visible[active]) visible[active].el.classList.remove('active');
        active = n;
        if(active >= 0 && visible[active]) {
          visible[active].el.classList.add('active');
          ensureVisible(visible[active].el);
        }
      }
      function filter() {
        var q = normalizeSearch(input.value);
        visible = [];
        items.forEach(function(it) {
          var match = !q || it.key.indexOf(q) !== -1;
          it.el.style.display = match ? '' : 'none';
          it.el.classList.remove('active');
          if(match) visible.push(it);
        });
        empty.style.display = visible.length ? 'none' : 'block';
        active = -1;
        var firstEnabled = -1;
        for(var k = 0; k < visible.length; k++) { if(!visible[k].disabled) { firstEnabled = k; break; } }
        if(q && firstEnabled >= 0) setActive(firstEnabled);
      }
      function choose(item) {
        if(!item || item.disabled) return;
        var changed = sel.selectedIndex !== item.idx;
        closeSelectSearch();
        if(changed) {
          sel.selectedIndex = item.idx;
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        try { sel.focus({ preventScroll: true }); } catch(_) {}
      }
      input.addEventListener('input', filter);
      input.addEventListener('keydown', function(e) {
        if(e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if(!visible.length) return;
          var step = e.key === 'ArrowDown' ? 1 : -1;
          var n = active;
          for(var tries = 0; tries < visible.length; tries++) {
            n = (n + step + visible.length) % visible.length;
            if(!visible[n].disabled) break;
          }
          setActive(n);
        } else if(e.key === 'Enter') {
          e.preventDefault();
          if(active >= 0) choose(visible[active]);
          else if(visible.length === 1) choose(visible[0]);
        } else if(e.key === 'Escape' || e.key === 'Tab') {
          if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
          closeSelectSearch();
          try { sel.focus({ preventScroll: true }); } catch(_) {}
        }
      });

      // Mount: popover → browser top layer (above modal dialogs / widgets).
      // Must live INSIDE an open modal dialog: everything outside the modal
      // (incl. popovers appended to <body>) is inert and can't be clicked.
      var host = sel.closest('dialog[open]') || document.body;
      host.appendChild(pop);
      if(usePopover) { try { pop.showPopover(); } catch(_) {} }

      // Position under (or above) the select, clamped to the viewport.
      var r = sel.getBoundingClientRect();
      var vw = window.innerWidth, vh = window.innerHeight;
      var width = Math.min(Math.max(r.width, 240), 360, vw - 16);
      var left = Math.max(8, Math.min(r.left, vw - width - 8));
      pop.style.width = width + 'px';
      pop.style.left = left + 'px';
      var spaceBelow = vh - r.bottom - 8, spaceAbove = r.top - 8;
      if(spaceBelow < 220 && spaceAbove > spaceBelow) {
        pop.style.bottom = (vh - r.top + 2) + 'px';
        pop.style.maxHeight = Math.min(360, spaceAbove) + 'px';
      } else {
        pop.style.top = (r.bottom + 2) + 'px';
        pop.style.maxHeight = Math.min(360, Math.max(160, spaceBelow)) + 'px';
      }

      var selItem = items.filter(function(it) { return it.idx === sel.selectedIndex; })[0];
      if(selItem) list.scrollTop = Math.max(0, selItem.el.offsetTop - list.clientHeight / 2);

      var startWidth = vw;
      var st = {
        pop: pop,
        sel: sel,
        onOutside: function(e) {
          if(pop.contains(e.target) || e.target === sel) return;
          closeSelectSearch();
        },
        onScroll: function(e) {
          if(e.target && e.target.nodeType === 1 && pop.contains(e.target)) return;
          // Mobile keyboard opening may scroll the page while typing
          if(document.activeElement === input) return;
          closeSelectSearch();
        },
        onResize: function() {
          if(window.innerWidth !== startWidth) closeSelectSearch();
        }
      };
      selectSearchState = st;
      document.addEventListener('mousedown', st.onOutside, true);
      document.addEventListener('touchstart', st.onOutside, true);
      window.addEventListener('scroll', st.onScroll, true);
      window.addEventListener('resize', st.onResize);

      if(!fromTouch) setTimeout(function() { try { input.focus(); } catch(_) {} }, 0);
    }

    (function initSearchableSelects() {
      // Desktop: replace the native dropdown on left mouse button
      document.addEventListener('mousedown', function(e) {
        if(e.button !== 0) return;
        var sel = e.target && e.target.closest ? e.target.closest('select') : null;
        if(!sel) return;
        if(selectSearchState && selectSearchState.sel === sel) {
          e.preventDefault();
          closeSelectSearch();
          return;
        }
        if(!isSearchableSelect(sel)) return;
        e.preventDefault();
        try { sel.focus({ preventScroll: true }); } catch(_) {}
        openSelectSearch(sel, false);
      }, true);

      // Touch: open on tap (not on scroll gestures)
      var touchStart = null;
      document.addEventListener('touchstart', function(e) {
        var t = e.touches && e.touches[0];
        touchStart = t ? { x: t.clientX, y: t.clientY } : null;
      }, { capture: true, passive: true });
      document.addEventListener('touchend', function(e) {
        var sel = e.target && e.target.closest ? e.target.closest('select') : null;
        if(!sel || !isSearchableSelect(sel) || !touchStart) return;
        var t = e.changedTouches && e.changedTouches[0];
        if(t && (Math.abs(t.clientX - touchStart.x) > 10 || Math.abs(t.clientY - touchStart.y) > 10)) return;
        e.preventDefault();
        openSelectSearch(sel, true);
      }, { capture: true, passive: false });

      // Keyboard: Space / Enter / Alt+ArrowDown / F4 open the search popup
      document.addEventListener('keydown', function(e) {
        var sel = e.target;
        if(!sel || sel.tagName !== 'SELECT' || !isSearchableSelect(sel)) return;
        if(e.key === ' ' || e.key === 'Enter' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown')) {
          e.preventDefault();
          openSelectSearch(sel, false);
        }
      }, true);
    })();
