// Marvell PES Club - core/util.js (split from app.js; shared global scope, load order set in index.html)
// Debug logging is silenced unless localStorage.pesDebug === '1' (warn/error always shown).
(function(c){
  var dbg = false;
  try { dbg = localStorage.getItem('pesDebug') === '1'; } catch(_) {}
  if (dbg) return;
  var noop = function(){};
  c.log = noop; c.info = noop; c.debug = noop;
})(window.console);

// Escape user-provided text (team/season names) before inserting into innerHTML.
function escapeHtml(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(ch){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}

    function $(id){return document.getElementById(id)}
    function uid(){return 's'+Math.random().toString(36).slice(2,9)}
    // isAdmin / ensureAdmin / openAdminLogin live in core/auth.js
    function showAdmin(on){
      [].forEach.call(document.querySelectorAll('.adminOnly'),function(el){el.classList.toggle('hidden',!on)});
      var sup = !!on && isSuperAdmin();
      [].forEach.call(document.querySelectorAll('.superAdminOnly'),function(el){el.classList.toggle('hidden',!sup)});
      if(typeof CloudSync !== 'undefined') CloudSync.updateUI();
    }
    function toast(msg){var t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){t.classList.remove('show')},1400)}
    function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

    // Helper function to calculate max team name width
    function getMaxTeamNameWidth(teamNames) {
      if (!teamNames || !teamNames.length) return 150; // Default fallback
      
      var maxWidth = 0;
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      
      teamNames.forEach(function(teamName) {
        var width = ctx.measureText(teamName).width;
        maxWidth = Math.max(maxWidth, width);
      });
      
      return Math.ceil(maxWidth + 8);
    }

    // Theme colors live in styles.css (:root[data-theme=...]); JS only switches the attribute.
    function applyTheme(mode, persist){
      var m=mode||localStorage.getItem(THEME_KEY)||'blue';
      if(m!=='dark' && m!=='white' && m!=='blue') m='blue';
      if(persist){ try{localStorage.setItem(THEME_KEY,m)}catch(_){}}
      var attr = m==='white' ? 'light' : m;
      document.documentElement.dataset.theme = attr;
      document.body.dataset.theme = attr;
      var tc=document.querySelector('meta[name="theme-color"]');
      if(tc) tc.setAttribute('content', attr==='light' ? '#ffffff' : (attr==='dark' ? '#0b1020' : '#0b1533'));
      var sel=$('themeSel'); if(sel) sel.value=m;
    }
