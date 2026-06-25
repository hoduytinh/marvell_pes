/* =====================================================================
   MARVELL PES — CHAT WIDGET (floating, giống Tèo Robot)
   - Nút thả nổi ở góc phải dưới (phía trên nút Tèo Robot)
   - Bắt buộc chọn tên (tên phải có trong Team list) trước khi chat
   - Có bảng emoji (emoticon)
   - Đồng bộ tin nhắn qua Firebase Realtime Database (đọc/ghi 1 "file" JSON
     trên cloud). Cấu hình URL ở CHAT_CONFIG bên dưới.

   ====== CÁCH BẬT ĐỒNG BỘ (1 lần) ======
   1) Vào https://console.firebase.google.com → tạo project miễn phí.
   2) Build → Realtime Database → Create Database (chọn vùng gần, bắt đầu ở
      "test mode" để đọc/ghi được ngay; có thể siết rules sau).
   3) Copy URL database, dạng:  https://<project>-default-rtdb.firebaseio.com
   4) Dán vào CHAT_CONFIG.firebaseUrl bên dưới rồi commit/push.
   Lưu ý: URL này KHÔNG phải mật khẩu, lộ ra vẫn an toàn (Firebase bảo vệ bằng
   Database Rules). Tuyệt đối KHÔNG dán GitHub PAT vào code phía client.
   ===================================================================== */
(function(){
  'use strict';

  var CHAT_CONFIG = {
    // VD: 'https://marvell-pes-default-rtdb.firebaseio.com'
    firebaseUrl: 'https://pes-chat-box-default-rtdb.asia-southeast1.firebasedatabase.app',
    // Đường dẫn nhánh lưu tin nhắn trong database
    path: 'chat/messages',
    // Số tin nhắn tối đa hiển thị
    maxMessages: 200,
    // Chu kỳ làm mới (ms) khi panel đang mở
    pollMs: 3000
  };

  var STORAGE_KEY = 'pes-league-v15';
  var THEME_KEY = 'pes-theme';
  var NAME_KEY = 'pesChatName';

  var EMOJIS = [
    // Bóng đá / thể thao
    '⚽','🥅','🧤','🏟️','👟','🥇','🥈','🥉','🏆','🎖️','🏅','📣','🚩','🟥','🟨','⏱️','🤾','🏃','🙌','🫡','🤺','🏑','🥊','🎽','🏆','📊','🆙','🔝',
    // Game / PlayStation
    '🎮','🕹️','👾','🎯','🏁','💥','⚡','🔌','🆚','🔥','💀','☠️','🤖','🧠','🛡️','⚔️','🎲','🥷','🐐','🎰','🧩','♟️','🎳','🪙','💣','🚀','👑','🏴‍☠️',
    // Biểu cảm hài hước / cười
    '😀','😁','😂','🤣','😆','😅','😄','😋','😎','🤩','🥳','😜','😝','🤪','😏','🙃','🫠','😹','🤡','🃏','😸','😺','🤭','😼','🫨','🤠','🥸','😇',
    // Troll / kích động / toxic
    '😈','👿','🤬','😡','😤','🖕','👎','🤏','🙄','😒','🤨','🧐','😬','💩','🐔','🐢','🤮','🥱','😴','💤','🫵','🤙','🖐️','✋','🙅','🤷','🫥','😑','😐','🫤','🤐','🙊',
    // Cảm xúc khác
    '😍','😘','🥰','😭','😱','🤯','🥲','😩','😢','😳','🫣','🫢','🙏','💪','👍','👏','🤝','👀','💯','❤️','💔','⭐','✅','❌','🥹','😔','😞','😟','🥺','😬','🤗','😮','😲','🤤','🫶','💖','💕','💢','💨','💫','🎉','🎊','🍻','🍺','☕','🤑','🤓','🫡','🫰'
  ];

  function loadTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'blue'; }
    catch(_) { return 'blue'; }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  }

  function uniqSorted(arr) {
    var seen = Object.create(null);
    var out = [];
    arr.forEach(function(v) {
      var k = (v || '').trim();
      if(!k) return;
      var lk = k.toLowerCase();
      if(seen[lk]) return;
      seen[lk] = true;
      out.push(k);
    });
    out.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    return out;
  }

  function getAllTeamNames(state) {
    var names = [];
    if(!state || !state.seasons) return names;
    Object.keys(state.seasons).forEach(function(sk) {
      var s = state.seasons[sk];
      if(!s) return;
      if(Array.isArray(s.teams)) names = names.concat(s.teams);
    });
    if(state && Array.isArray(state.teamMasterList)) names = names.concat(state.teamMasterList);
    return uniqSorted(names).filter(function(n){ return n && n.toLowerCase() !== 'bye'; });
  }

  // Danh sách tên cấu hình dùng chung với Tèo Robot (state.teoVisibleTeams,
  // sync qua cloud cho mọi người). Nếu chưa cấu hình -> dùng toàn bộ team list.
  var VISIBLE_TEAMS_KEY = 'teoVisibleTeams';
  function loadVisibleTeamsSet(state) {
    try {
      // Ưu tiên cấu hình LIVE trong bộ nhớ app (luôn mới nhất sau khi đồng bộ
      // cloud) qua bridge của app.js; tránh đọc localStorage bị trễ/cũ.
      var arr = null;
      if(typeof window.pesGetTeoVisibleTeams === 'function') {
        try { arr = window.pesGetTeoVisibleTeams(); } catch(_) { arr = null; }
      }
      if(!Array.isArray(arr) || !arr.length) {
        arr = (state && Array.isArray(state.teoVisibleTeams)) ? state.teoVisibleTeams : null;
      }
      if(!Array.isArray(arr) || !arr.length) {
        var raw = localStorage.getItem(VISIBLE_TEAMS_KEY);
        if(raw) {
          var parsed = JSON.parse(raw);
          if(Array.isArray(parsed)) arr = parsed;
        }
      }
      if(!Array.isArray(arr) || !arr.length) return null;
      var set = Object.create(null);
      arr.forEach(function(name) { set[String(name).toLowerCase()] = true; });
      return set;
    } catch(_) { return null; }
  }

  function getVisibleTeamNames(state) {
    var all = getAllTeamNames(state);
    var selectedSet = loadVisibleTeamsSet(state);
    if(!selectedSet) return all;
    var filtered = all.filter(function(name){ return !!selectedSet[String(name).toLowerCase()]; });
    return filtered.length ? filtered : all;
  }

  function isValidTeamName(name) {
    if(!name) return false;
    var all = getVisibleTeamNames(loadState());
    var lk = String(name).toLowerCase();
    return all.some(function(t){ return t.toLowerCase() === lk; });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- Animated emoji (Noto Animated Emoji, host trên fonts.gstatic.com) ----------
  // Mỗi emoji -> ảnh GIF động; nếu không có bản động (404) thì onerror tự
  // thay <img> bằng ký tự tĩnh gốc (this.alt). Không cần API key.
  function emojiCodeSeq(str) {
    return Array.from(str).map(function(ch){ return ch.codePointAt(0).toString(16); }).join('_');
  }
  function animatedEmojiUrl(seq) {
    return 'https://fonts.gstatic.com/s/e/notoemoji/latest/' + emojiCodeSeq(seq) + '/512.gif';
  }
  function emojiImg(seq) {
    var safe = escapeHtml(seq);
    return '<img class="chat-emoji" src="' + animatedEmojiUrl(seq) + '" alt="' + safe +
      '" title="' + safe + '" loading="lazy" onerror="this.replaceWith(this.alt)">';
  }
  // Bắt emoji (kèm variation selector, skin tone, chuỗi ZWJ) trong text đã escape.
  var EMOJI_SEQ_RE = /\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}]|\u200D\p{Extended_Pictographic})*/gu;
  function emojifyHtml(safeText) {
    return safeText.replace(EMOJI_SEQ_RE, function(seq){ return emojiImg(seq); });
  }

  function fmtTime(ts) {
    if(!ts) return '';
    try {
      var d = new Date(ts);
      var hh = ('0' + d.getHours()).slice(-2);
      var mm = ('0' + d.getMinutes()).slice(-2);
      var today = new Date();
      var sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      if(sameDay) return hh + ':' + mm;
      var DD = ('0' + d.getDate()).slice(-2);
      var MO = ('0' + (d.getMonth() + 1)).slice(-2);
      return DD + '/' + MO + ' ' + hh + ':' + mm;
    } catch(e) { return ''; }
  }

  // ---------- Backend (Firebase Realtime DB REST) ----------
  function backendReady() {
    return !!(CHAT_CONFIG.firebaseUrl && /^https?:\/\//.test(CHAT_CONFIG.firebaseUrl));
  }

  function baseUrl() {
    return CHAT_CONFIG.firebaseUrl.replace(/\/+$/, '') + '/' + CHAT_CONFIG.path.replace(/^\/+/, '');
  }

  function fetchMessages() {
    if(!backendReady()) return Promise.reject(new Error('not-configured'));
    var url = baseUrl() + '.json?limitToLast=' + CHAT_CONFIG.maxMessages + '&orderBy=%22ts%22';
    // orderBy requires an index rule; fall back to plain fetch if it fails.
    return fetch(url).then(function(r){
      if(!r.ok) {
        // Retry without orderBy (no index configured)
        return fetch(baseUrl() + '.json').then(function(r2){
          if(!r2.ok) throw new Error('HTTP ' + r2.status);
          return r2.json();
        });
      }
      return r.json();
    }).then(function(obj){
      var list = [];
      if(obj && typeof obj === 'object') {
        Object.keys(obj).forEach(function(k){
          var m = obj[k];
          if(m && typeof m === 'object') list.push({ id: k, name: m.name, text: m.text, ts: m.ts || 0 });
        });
      }
      list.sort(function(a, b){ return (a.ts || 0) - (b.ts || 0); });
      if(list.length > CHAT_CONFIG.maxMessages) list = list.slice(list.length - CHAT_CONFIG.maxMessages);
      return list;
    });
  }

  function postMessage(name, text) {
    if(!backendReady()) return Promise.reject(new Error('not-configured'));
    var payload = { name: name, text: text, ts: Date.now() };
    return fetch(baseUrl() + '.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ---------- UI ----------
  function createEl(tag, className, html) {
    var el = document.createElement(tag);
    if(className) el.className = className;
    if(html != null) el.innerHTML = html;
    return el;
  }

  function ensureStyles() {
    if(document.getElementById('chat-widget-style')) return;
    var style = document.createElement('style');
    style.id = 'chat-widget-style';
    style.textContent = [
      '#chatFab,#chatPanel{--c-bg1:#f7fbff;--c-bg2:#eef6ff;--c-bg3:#e8f3ff;--c-text:#0f172a;--c-border:rgba(14,116,144,.22);--c-head1:rgba(186,230,253,.85);--c-head2:rgba(165,243,252,.7);--c-head-text:#0b3a66;--c-label:#0c4a6e;--c-control-bg:#ffffff;--c-control-border:#93c5fd;--c-control-text:#0f172a;--c-muted:#475569;--c-bubble-bg:#ffffff;--c-bubble-border:rgba(125,211,252,.55);--c-bubble-me1:#22c55e;--c-bubble-me2:#06b6d4;--c-fab1:#8b5cf6;--c-fab2:#ec4899;--c-fab-shadow:rgba(139,92,246,.4);--c-send1:#22c55e;--c-send2:#06b6d4}',
      '#chatPanel[data-theme="dark"],#chatFab[data-theme="dark"]{--c-bg1:#081120;--c-bg2:#0d1730;--c-bg3:#132142;--c-text:#e7eeff;--c-border:rgba(59,130,246,.22);--c-head1:rgba(30,64,175,.42);--c-head2:rgba(8,145,178,.34);--c-head-text:#f8fbff;--c-label:#9fd2ff;--c-control-bg:#0b1530;--c-control-border:#2a466d;--c-control-text:#eaf1ff;--c-muted:#9fb2d6;--c-bubble-bg:#0b1327;--c-bubble-border:rgba(71,85,105,.6);--c-fab1:#7c3aed;--c-fab2:#db2777;--c-fab-shadow:rgba(0,0,0,.35)}',
      '#chatPanel[data-theme="blue"],#chatFab[data-theme="blue"]{--c-bg1:#eaf4ff;--c-bg2:#dbeafe;--c-bg3:#d7ebff;--c-text:#102544;--c-border:rgba(30,58,95,.22);--c-head1:rgba(125,211,252,.72);--c-head2:rgba(147,197,253,.5);--c-head-text:#10386b;--c-label:#0c4a6e;--c-control-bg:#ffffff;--c-control-border:#93c5fd;--c-control-text:#102544;--c-muted:#47627f;--c-bubble-bg:#ffffff;--c-bubble-border:rgba(96,165,250,.45)}',
      '#chatFab{position:fixed;right:18px;bottom:74px;z-index:9999;border:none;background:linear-gradient(135deg,var(--c-fab1),var(--c-fab2));color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;font-size:14px;letter-spacing:.2px;cursor:pointer;box-shadow:0 10px 24px var(--c-fab-shadow);display:flex;align-items:center;gap:6px}',
      '#chatFab .chat-badge{background:#ef4444;color:#fff;border-radius:999px;font-size:11px;font-weight:800;padding:1px 6px;min-width:18px;text-align:center;display:none}',
      '#chatFab .chat-badge.show{display:inline-block}',
      // Attention: pulsing glow ring + occasional wiggle to draw the eye
      '#chatFab.chat-attn{animation:chatWiggle 1.1s ease-in-out infinite}',
      '#chatFab.chat-attn::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:2px solid var(--c-fab2,#ec4899);opacity:.0;animation:chatRing 1.6s ease-out infinite;pointer-events:none}',
      '@keyframes chatWiggle{0%,88%,100%{transform:translateY(0) rotate(0)}90%{transform:translateY(-3px) rotate(-7deg)}93%{transform:translateY(-3px) rotate(7deg)}96%{transform:translateY(-2px) rotate(-4deg)}}',
      '@keyframes chatRing{0%{transform:scale(.85);opacity:.55}100%{transform:scale(1.5);opacity:0}}',
      '#chatFab.chat-ping{animation:chatPing .5s ease-out 2}',
      '@keyframes chatPing{0%{transform:scale(1)}30%{transform:scale(1.16)}60%{transform:scale(.94)}100%{transform:scale(1)}}',
      // Invite speech bubble that pops near the FAB
      '#chatInvite{position:fixed;right:18px;bottom:120px;z-index:9998;max-width:230px;background:linear-gradient(135deg,var(--c-fab1,#8b5cf6),var(--c-fab2,#ec4899));color:#fff;padding:10px 30px 10px 12px;border-radius:14px;font-size:13px;font-weight:600;line-height:1.4;box-shadow:0 12px 28px rgba(139,92,246,.4);cursor:pointer;opacity:0;transform:translateY(8px) scale(.96);transition:opacity .25s,transform .25s;pointer-events:none}',
      '#chatInvite.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
      '#chatInvite::after{content:"";position:absolute;right:30px;bottom:-7px;width:14px;height:14px;background:var(--c-fab2,#ec4899);transform:rotate(45deg)}',
      '#chatInvite .chat-invite-x{position:absolute;top:5px;right:8px;font-size:14px;font-weight:800;opacity:.85;line-height:1}',
      '#chatPanel{position:fixed;right:18px;bottom:132px;z-index:9999;width:380px;max-width:calc(100vw - 24px);height:520px;max-height:72vh;overflow:hidden;background:linear-gradient(160deg,var(--c-bg1) 0%,var(--c-bg2) 45%,var(--c-bg3) 100%);color:var(--c-text);border:1px solid var(--c-border);border-radius:16px;box-shadow:0 24px 50px rgba(2,132,199,.22);display:none;flex-direction:column}',
      '#chatPanel.open{display:flex;animation:chatPop .16s ease-out}',
      '@keyframes chatPop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#chatHead{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--c-border);background:linear-gradient(90deg,var(--c-head1),var(--c-head2));flex:0 0 auto}',
      '#chatHead strong{font-size:15px;color:var(--c-head-text)}',
      '#chatHead .chat-who{font-size:12px;color:var(--c-head-text);opacity:.85;display:flex;align-items:center;gap:6px}',
      '#chatHead .chat-change{cursor:pointer;text-decoration:underline;font-size:11px}',
      '#chatBody{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}',
      // Name gate
      '#chatGate{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;padding:18px 16px;gap:10px}',
      '#chatGate h4{margin:0;color:var(--c-label);font-size:15px}',
      '#chatGate p{margin:0;color:var(--c-muted);font-size:12px;line-height:1.5}',
      '#chatGate label{font-size:12px;font-weight:700;color:var(--c-label);text-transform:uppercase;letter-spacing:.4px}',
      '#chatGate select,#chatGate button{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--c-control-border);background:var(--c-control-bg);color:var(--c-control-text);font-size:14px}',
      '#chatGateBtn{background:linear-gradient(135deg,var(--c-send1,#22c55e),var(--c-send2,#06b6d4));color:#fff;border:none;font-weight:800;cursor:pointer}',
      '#chatGateErr{color:#ef4444;font-size:12px;min-height:16px}',
      // Conversation
      '#chatConvo{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}',
      '#chatMessages{flex:1 1 auto;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px}',
      '#chatMessages .chat-empty{color:var(--c-muted);font-size:13px;text-align:center;margin:auto}',
      '.chat-msg{max-width:80%;padding:7px 10px;border-radius:12px;background:var(--c-bubble-bg);border:1px solid var(--c-bubble-border);align-self:flex-start;word-break:break-word}',
      '.chat-msg.me{align-self:flex-end;background:linear-gradient(135deg,var(--c-bubble-me1,#22c55e),var(--c-bubble-me2,#06b6d4));border-color:transparent;color:#fff}',
      '.chat-msg .chat-meta{font-size:10px;opacity:.8;margin-bottom:2px;display:flex;gap:6px;justify-content:space-between}',
      '.chat-msg .chat-name{font-weight:800}',
      '.chat-msg .chat-text{font-size:13.5px;line-height:1.45}',
      // Input bar
      '#chatInputBar{flex:0 0 auto;border-top:1px solid var(--c-border);padding:8px;display:flex;flex-direction:column;gap:6px}',
      '#chatEmojiBar{display:none;flex-wrap:wrap;gap:2px;max-height:96px;overflow:auto;padding:4px;background:var(--c-control-bg);border:1px solid var(--c-control-border);border-radius:10px}',
      '#chatEmojiBar.open{display:flex}',
      '#chatEmojiBar button{border:none;background:transparent;font-size:18px;line-height:1;padding:4px;cursor:pointer;border-radius:6px}',
      '#chatEmojiBar button:hover{background:rgba(125,211,252,.25)}',
      '#chatEmojiBar button img.chat-emoji{width:24px;height:24px;display:block}',
      '.chat-text img.chat-emoji{width:20px;height:20px;vertical-align:-4px;margin:0 1px}',
      '#chatInputRow{display:flex;gap:6px;align-items:flex-end}',
      '#chatEmojiToggle{flex:0 0 auto;border:1px solid var(--c-control-border);background:var(--c-control-bg);border-radius:10px;font-size:18px;cursor:pointer;padding:8px 10px;line-height:1}',
      '#chatText{flex:1 1 auto;box-sizing:border-box;resize:none;min-height:40px;max-height:90px;padding:9px 11px;border-radius:10px;border:1px solid var(--c-control-border);background:var(--c-control-bg);color:var(--c-control-text);font-size:14px;font-family:inherit}',
      '#chatSendBtn{flex:0 0 auto;border:none;border-radius:10px;padding:9px 14px;background:linear-gradient(135deg,var(--c-send1,#22c55e),var(--c-send2,#06b6d4));color:#fff;font-weight:800;cursor:pointer}',
      '#chatSendBtn:disabled{opacity:.5;cursor:not-allowed}',
      '#chatNotice{font-size:11px;color:var(--c-muted);padding:0 2px}',
      '@media (max-width:700px){#chatFab{right:12px;bottom:64px}#chatPanel{right:12px;bottom:118px;width:calc(100vw - 16px);height:70vh}#chatInvite{right:12px;bottom:110px;max-width:200px}}'
    ].join('');
    document.head.appendChild(style);
  }

  var pollTimer = null;
  var lastRenderedCount = 0;
  var bgTimer = null;
  var inviteTimer = null;
  var SEEN_KEY = 'pesChatSeenTs';
  var INVITE_MSGS = [
    '💬 Vào tám chuyện nào!',
    '🔥 Có người đang chờ bạn chat!',
    '⚽ Cùng chém gió bóng đá đi!',
    '🎮 Khẩu chiến PES tại đây!',
    '😎 Đừng im lặng, vào chat thôi!',
    '🏆 Trash-talk trước trận nào!'
  ];

  function mountChat() {
    if(document.getElementById('chatFab')) return;
    ensureStyles();

    var theme = loadTheme();

    var fab = createEl('button', '', '💬 Chat <span class="chat-badge" id="chatBadge"></span>');
    fab.id = 'chatFab';
    fab.setAttribute('data-theme', theme);

    var panel = createEl('div');
    panel.id = 'chatPanel';
    panel.setAttribute('data-theme', theme);
    panel.innerHTML = [
      '<div id="chatHead">',
        '<strong>💬 Chat phòng chung</strong>',
        '<span class="chat-who" id="chatWho"></span>',
      '</div>',
      '<div id="chatBody">',
        // Name gate
        '<div id="chatGate">',
          '<h4>Nhập tên trước khi chat</h4>',
          '<p>Tên phải có trong <b>Team list</b>. Hãy chọn tên của bạn từ danh sách bên dưới.</p>',
          '<label for="chatNameSel">Chọn tên</label>',
          '<select id="chatNameSel"></select>',
          '<div id="chatGateErr"></div>',
          '<button id="chatGateBtn" type="button">Vào phòng chat</button>',
        '</div>',
        // Conversation
        '<div id="chatConvo" style="display:none;">',
          '<div id="chatMessages"><div class="chat-empty">Đang tải tin nhắn…</div></div>',
          '<div id="chatInputBar">',
            '<div id="chatNotice"></div>',
            '<div id="chatEmojiBar"></div>',
            '<div id="chatInputRow">',
              '<button id="chatEmojiToggle" type="button" title="Emoji">😊</button>',
              '<textarea id="chatText" rows="1" placeholder="Nhập tin nhắn… (Enter để gửi)"></textarea>',
              '<button id="chatSendBtn" type="button">Gửi</button>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // Bong bóng lời mời chat (gây chú ý)
    var invite = createEl('div', '', '<span class="chat-invite-x" id="chatInviteX">×</span><span id="chatInviteText"></span>');
    invite.id = 'chatInvite';
    invite.setAttribute('data-theme', theme);
    document.body.appendChild(invite);

    // Tránh nút Chat đè lên panel Tèo Robot: khi panel Tèo mở thì ẩn nút Chat
    // (và đóng panel Chat nếu đang mở). Khi panel Chat mở thì ẩn nút Tèo.
    function syncFabVisibility() {
      var teoPanel = document.getElementById('teoPanel');
      var teoFab = document.getElementById('teoFab');
      var teoOpen = !!(teoPanel && teoPanel.classList.contains('open'));
      var chatOpen = panel.classList.contains('open');
      fab.style.display = teoOpen ? 'none' : '';
      if(teoFab) teoFab.style.display = chatOpen ? 'none' : '';
      if(teoOpen && chatOpen) {
        panel.classList.remove('open');
        stopPolling();
      }
    }
    function observeTeoPanel() {
      var teoPanel = document.getElementById('teoPanel');
      if(!teoPanel) { setTimeout(observeTeoPanel, 500); return; }
      try {
        new MutationObserver(syncFabVisibility).observe(teoPanel, { attributes: true, attributeFilter: ['class'] });
      } catch(_) {}
      syncFabVisibility();
    }
    observeTeoPanel();

    var whoEl = document.getElementById('chatWho');
    var gateEl = document.getElementById('chatGate');
    var gateErrEl = document.getElementById('chatGateErr');
    var nameSelEl = document.getElementById('chatNameSel');
    var gateBtnEl = document.getElementById('chatGateBtn');
    var convoEl = document.getElementById('chatConvo');
    var messagesEl = document.getElementById('chatMessages');
    var noticeEl = document.getElementById('chatNotice');
    var emojiBarEl = document.getElementById('chatEmojiBar');
    var emojiToggleEl = document.getElementById('chatEmojiToggle');
    var textEl = document.getElementById('chatText');
    var sendBtnEl = document.getElementById('chatSendBtn');
    var badgeEl = document.getElementById('chatBadge');

    // Build emoji buttons (dedupe giữ thứ tự)
    var seenEmoji = Object.create(null);
    var emojiList = EMOJIS.filter(function(e){ if(seenEmoji[e]) return false; seenEmoji[e] = true; return true; });
    emojiBarEl.innerHTML = emojiList.map(function(e){
      return '<button type="button" data-emoji="' + escapeHtml(e) + '" title="' + escapeHtml(e) + '">' + emojiImg(e) + '</button>';
    }).join('');
    emojiBarEl.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        insertAtCursor(textEl, b.getAttribute('data-emoji') || '');
        textEl.focus();
      });
    });

    function insertAtCursor(el, text) {
      var start = el.selectionStart || 0;
      var end = el.selectionEnd || 0;
      var val = el.value;
      el.value = val.slice(0, start) + text + val.slice(end);
      var pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
    }

    function getName() {
      try { return localStorage.getItem(NAME_KEY) || ''; } catch(e) { return ''; }
    }
    function setName(n) {
      try { localStorage.setItem(NAME_KEY, n); } catch(e) {}
    }

    function populateNameOptions() {
      var teams = getVisibleTeamNames(loadState());
      if(!teams.length) {
        nameSelEl.innerHTML = '<option value="">(chưa có dữ liệu Team list)</option>';
        return;
      }
      nameSelEl.innerHTML = '<option value="">— Chọn tên —</option>' +
        teams.map(function(t){ return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>'; }).join('');
      var cur = getName();
      if(cur && isValidTeamName(cur)) nameSelEl.value = cur;
    }

    function showGate() {
      gateEl.style.display = 'flex';
      convoEl.style.display = 'none';
      whoEl.innerHTML = '';
      populateNameOptions();
      gateErrEl.textContent = '';
    }

    function showConvo() {
      var name = getName();
      gateEl.style.display = 'none';
      convoEl.style.display = 'flex';
      whoEl.innerHTML = escapeHtml(name) + ' <span class="chat-change" id="chatChangeName">đổi tên</span>';
      var changeEl = document.getElementById('chatChangeName');
      if(changeEl) changeEl.addEventListener('click', showGate);
      if(!backendReady()) {
        noticeEl.textContent = '⚠️ Chưa cấu hình đồng bộ (Firebase). Tin nhắn chưa gửi/nhận được — xem hướng dẫn trong chat-widget.js.';
        sendBtnEl.disabled = true;
      } else {
        noticeEl.textContent = '';
        sendBtnEl.disabled = false;
      }
      refreshMessages(true);
      startPolling();
    }

    function renderMessages(list) {
      var me = (getName() || '').toLowerCase();
      if(!list || !list.length) {
        messagesEl.innerHTML = '<div class="chat-empty">Chưa có tin nhắn. Hãy là người đầu tiên!</div>';
        lastRenderedCount = 0;
        return;
      }
      var atBottom = (messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight) < 60;
      messagesEl.innerHTML = list.map(function(m){
        var mine = (m.name || '').toLowerCase() === me;
        return '<div class="chat-msg' + (mine ? ' me' : '') + '">' +
          '<div class="chat-meta"><span class="chat-name">' + escapeHtml(m.name || '?') + '</span>' +
          '<span class="chat-time">' + fmtTime(m.ts) + '</span></div>' +
          '<div class="chat-text">' + emojifyHtml(escapeHtml(m.text || '')) + '</div>' +
        '</div>';
      }).join('');
      if(atBottom || list.length !== lastRenderedCount) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      lastRenderedCount = list.length;
    }

    function refreshMessages(scrollDown) {
      if(!backendReady()) {
        messagesEl.innerHTML = '<div class="chat-empty">Chưa bật đồng bộ.</div>';
        return;
      }
      fetchMessages().then(function(list){
        renderMessages(list);
        if(scrollDown) messagesEl.scrollTop = messagesEl.scrollHeight;
        // Panel đang mở => coi như đã xem tới tin mới nhất
        if(list && list.length) {
          var maxTs = list.reduce(function(mx, m){ return Math.max(mx, (m && m.ts) || 0); }, 0);
          if(maxTs) { try { localStorage.setItem(SEEN_KEY, String(maxTs)); } catch(_) {} }
        }
      }).catch(function(err){
        if(err && err.message === 'not-configured') return;
        noticeEl.textContent = '⚠️ Lỗi tải tin nhắn: ' + (err && err.message ? err.message : 'không rõ');
      });
    }

    function startPolling() {
      stopPolling();
      if(!backendReady()) return;
      pollTimer = setInterval(function(){
        if(panel.classList.contains('open')) refreshMessages(false);
      }, CHAT_CONFIG.pollMs);
    }
    function stopPolling() {
      if(pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function doSend() {
      var name = getName();
      if(!name || !isValidTeamName(name)) { showGate(); return; }
      var text = (textEl.value || '').trim();
      if(!text) return;
      if(text.length > 1000) text = text.slice(0, 1000);
      sendBtnEl.disabled = true;
      postMessage(name, text).then(function(){
        textEl.value = '';
        emojiBarEl.classList.remove('open');
        refreshMessages(true);
      }).catch(function(err){
        noticeEl.textContent = '⚠️ Gửi thất bại: ' + (err && err.message ? err.message : 'không rõ');
      }).finally(function(){
        sendBtnEl.disabled = !backendReady();
        textEl.focus();
      });
    }

    // Events
    gateBtnEl.addEventListener('click', function(){
      var sel = nameSelEl.value;
      if(!sel) { gateErrEl.textContent = 'Vui lòng chọn tên của bạn.'; return; }
      if(!isValidTeamName(sel)) { gateErrEl.textContent = 'Tên này không có trong Team list.'; return; }
      setName(sel);
      showConvo();
      textEl.focus();
    });

    emojiToggleEl.addEventListener('click', function(){
      emojiBarEl.classList.toggle('open');
    });

    sendBtnEl.addEventListener('click', doSend);

    textEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
    textEl.addEventListener('input', function(){
      textEl.style.height = 'auto';
      textEl.style.height = Math.min(textEl.scrollHeight, 90) + 'px';
    });

    fab.addEventListener('click', function(){
      var willOpen = !panel.classList.contains('open');
      panel.classList.toggle('open');
      if(willOpen) {
        // Sync theme each open (user may have changed it)
        var th = loadTheme();
        fab.setAttribute('data-theme', th);
        panel.setAttribute('data-theme', th);
        badgeEl.classList.remove('show');
        badgeEl.textContent = '';
        var name = getName();
        if(name && isValidTeamName(name)) showConvo();
        else showGate();
      } else {
        stopPolling();
      }
      stopAttention();
      markAllSeen();
      hideInvite();
      syncFabVisibility();
    });

    // ---------- Tính năng gây chú ý ----------
    var inviteTextEl = document.getElementById('chatInviteText');
    var inviteXEl = document.getElementById('chatInviteX');

    function getSeenTs() {
      try { return Number(localStorage.getItem(SEEN_KEY) || 0) || 0; } catch(_) { return 0; }
    }
    function setSeenTs(ts) {
      try { localStorage.setItem(SEEN_KEY, String(ts || 0)); } catch(_) {}
    }
    function markAllSeen() {
      setSeenTs(Date.now());
      badgeEl.classList.remove('show');
      badgeEl.textContent = '';
    }

    function startAttention() {
      fab.classList.add('chat-attn');
    }
    function stopAttention() {
      fab.classList.remove('chat-attn');
    }
    function pingFab() {
      fab.classList.remove('chat-ping');
      // force reflow to restart animation
      void fab.offsetWidth;
      fab.classList.add('chat-ping');
    }

    function showInvite(text) {
      if(panel.classList.contains('open')) return;
      // Không hiện khi panel Tèo Robot đang mở (FAB đang ẩn)
      var teoPanel = document.getElementById('teoPanel');
      if(teoPanel && teoPanel.classList.contains('open')) return;
      if(inviteTextEl) inviteTextEl.textContent = text || INVITE_MSGS[0];
      invite.setAttribute('data-theme', loadTheme());
      invite.classList.add('show');
      clearTimeout(invite._hideT);
      invite._hideT = setTimeout(hideInvite, 6000);
    }
    function hideInvite() {
      invite.classList.remove('show');
    }
    if(inviteXEl) inviteXEl.addEventListener('click', function(e){
      e.stopPropagation();
      hideInvite();
      // Tắt lời mời tự động cho phiên này
      if(inviteTimer) { clearInterval(inviteTimer); inviteTimer = null; }
    });
    invite.addEventListener('click', function(){
      hideInvite();
      if(!panel.classList.contains('open')) fab.click();
    });

    // Poll nền: kiểm tra tin mới kể cả khi panel đóng → cập nhật badge + nảy FAB
    function backgroundCheck() {
      if(!backendReady()) return;
      if(panel.classList.contains('open')) return;
      fetchMessages().then(function(list){
        if(!list || !list.length) return;
        var me = (getName() || '').toLowerCase();
        var seen = getSeenTs();
        var unread = list.filter(function(m){
          return m && m.ts > seen && (m.name || '').toLowerCase() !== me;
        });
        if(unread.length) {
          badgeEl.textContent = unread.length > 99 ? '99+' : String(unread.length);
          badgeEl.classList.add('show');
          startAttention();
          pingFab();
          var last = unread[unread.length - 1];
          var preview = (last.name ? last.name + ': ' : '') + (last.text || '');
          if(preview.length > 60) preview = preview.slice(0, 60) + '…';
          showInvite('💬 ' + preview);
        }
      }).catch(function(){});
    }
    function startBackgroundPolling() {
      stopBackgroundPolling();
      if(!backendReady()) return;
      // Lần đầu set mốc "đã xem" nếu chưa có, để không báo dồn toàn bộ lịch sử
      if(!getSeenTs()) setSeenTs(Date.now());
      backgroundCheck();
      bgTimer = setInterval(backgroundCheck, Math.max(5000, CHAT_CONFIG.pollMs * 2));
    }
    function stopBackgroundPolling() {
      if(bgTimer) { clearInterval(bgTimer); bgTimer = null; }
    }

    // Lời mời định kỳ để kéo người dùng (chỉ khi panel đóng)
    function startInviteRotation() {
      if(inviteTimer) return;
      var idx = 0;
      // Lời chào đầu tiên sau khi tải trang ~3.5s
      setTimeout(function(){
        if(!panel.classList.contains('open')) { startAttention(); pingFab(); showInvite(INVITE_MSGS[0]); }
      }, 3500);
      inviteTimer = setInterval(function(){
        if(panel.classList.contains('open')) return;
        if(!badgeEl.classList.contains('show')) {
          idx = (idx + 1) % INVITE_MSGS.length;
          showInvite(INVITE_MSGS[idx]);
          pingFab();
        }
      }, 45000);
    }

    // Khởi động các tính năng chú ý
    startBackgroundPolling();
    startInviteRotation();
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountChat);
  } else {
    mountChat();
  }
})();
