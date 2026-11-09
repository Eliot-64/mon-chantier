/* ==========================================================================
   MON CHANTIER — outils d'interface communs
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});
  var UI = (FS.UI = {});

  UI.$ = function (s, r) { return (r || document).querySelector(s); };
  UI.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  UI.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  UI.rarity = function (r) { return FS.CONFIG.rarities[r]; };
  UI.vibrate = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };

  /* ---------- toast ---------- */
  var toastTimer;
  UI.toast = function (msg, ms) {
    var t = UI.$('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2800);
  };

  /* ---------- aperçus de traces ---------- */
  UI.paintPreviews = function (root) {
    UI.$$('canvas[data-fluo]', root).forEach(function (c) {
      var f = FS.fluoById(c.dataset.fluo);
      if (f) FS.Strokes.preview(c, f);
    });
  };
  UI.previewCanvas = function (id, w, h) {
    return '<canvas data-fluo="' + id + '" width="' + (w || 240) + '" height="' + (h || 72) + '"></canvas>';
  };

  /* ---------- fenêtres ---------- */
  UI.modal = function (html, opts) {
    opts = opts || {};
    var root = UI.$('#modal-root'), bd = document.createElement('div'), m = document.createElement('div');
    bd.className = 'backdrop'; m.className = 'modal' + (opts.cls ? ' ' + opts.cls : '');
    m.innerHTML = html; bd.appendChild(m); root.appendChild(bd);
    var api = { el: m, persistent: !!opts.persistent };
    function onKey(e) { if (e.key === 'Escape' && !api.persistent) api.close(); }
    api.close = function () {
      if (bd.parentNode) bd.parentNode.removeChild(bd);
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    };
    api.setHTML = function (h) { m.innerHTML = h; };
    bd.addEventListener('pointerdown', function (e) { if (e.target === bd && !api.persistent) api.close(); });
    document.addEventListener('keydown', onKey);
    return api;
  };

  UI.confirm = function (title, text, okLabel, cb) {
    var m = UI.modal('<div class="big-emoji">🤔</div><h2>' + title + '</h2><p>' + text + '</p>' +
      '<div class="row"><button class="btn" data-act="no">Annuler</button><button class="btn primary" data-act="yes">' + okLabel + '</button></div>');
    m.el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (!a) return;
      m.close();
      if (a.dataset.act === 'yes') cb();
    });
  };

  /* ---------- effets ---------- */
  UI.confetti = function (colors, n) {
    n = n || 60;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      s.className = 'confetti';
      s.style.setProperty('--x', Math.random() * 100 + 'vw');
      s.style.setProperty('--dx', Math.random() * 200 - 100 + 'px');
      s.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg');
      s.style.setProperty('--d', 1.6 + Math.random() * 1.6 + 's');
      s.style.setProperty('--col', colors[i % colors.length]);
      document.body.appendChild(s);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3600); })(s);
    }
  };
  UI.flash = function () {
    var d = document.createElement('div');
    d.className = 'flash'; document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 800);
  };

  /* Quelle boîte contient cette rareté ? */
  UI.boxFor = function (rarity) {
    var b = FS.CONFIG.boxes.filter(function (x) { return x.rarities.indexOf(rarity) >= 0; })[0];
    return b || null;
  };

  /* Illustration CSS d'une boîte */
  UI.boxArt = function (box) {
    return '<div class="box-art" style="--c:' + box.color + ';--a:' + box.accent + '"><div class="cube"></div><div class="lid"></div><div class="ribbon"></div><div class="q">?</div></div>';
  };
})();
