/* ==========================================================================
   MON CHANTIER — démarrage de l'application
   ========================================================================== */
(function () {
  var FS = window.FS, UI = FS.UI, $ = UI.$, C = FS.CONFIG;
  var view = 'atelier', lastCalots = null;

  function go(v) {
    view = v;
    UI.$$('.view').forEach(function (el) { el.classList.toggle('active', el.id === 'view-' + v); });
    UI.$$('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.view === v); });
    if (v === 'atelier') { FS.UI.Atelier.fit(); setTimeout(FS.UI.Atelier.fit, 30); }
    if (v === 'boutique') FS.UI.Shop.render();
    if (v === 'collection') FS.UI.Collection.render(true);
    refresh();
    var el = $('#view-' + v); if (el) el.scrollTop = 0;
  }
  FS.UI.go = go;

  function refresh() {
    var S = FS.State.get(), w = $('#wallet');
    $('#calots').textContent = S.calots;
    if (lastCalots !== null && S.calots > lastCalots) {
      w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump');
    }
    lastCalots = S.calots;
    $('#newDot').hidden = S.newIds.length === 0 || view === 'collection';
    FS.UI.Atelier.renderTray();
    FS.UI.Atelier.refreshSelection();
    if (view === 'boutique') FS.UI.Shop.render();
    if (view === 'collection') FS.UI.Collection.render();
  }

  function welcome() {
    var d = C.dedicace;
    var m = UI.modal(
      '<div class="big-emoji">🎉</div><h2>' + UI.esc(d.message) + ' ' + UI.esc(d.nom) + ' !</h2>' +
      '<p>' + d.age + ' ans, ça se fête… au surligneur ! 🖍️</p>' +
      '<ul><li>Génère un plan et <b>repasse ses contours</b> avec tes fluos.</li>' +
      '<li>Valide-le pour gagner des <b>calots</b> 🪙</li>' +
      '<li>Ouvre des <b>boîtes</b> pour débloquer de nouveaux fluos… jusqu\'au Super Saiyen Claudo !</li></ul>' +
      '<p><b style="color:var(--yellow)">' + C.startCalots + ' calots</b> offerts pour bien commencer.</p>' +
      '<div class="row"><button class="btn gold" data-act="go">C\'est parti !</button></div>',
      { persistent: true });
    UI.confetti(['#FFE600', '#FF3DCB', '#22D3EE', '#39FF14', '#FF9500'], 70);
    m.el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-act]')) return;
      FS.State.markWelcomed(); m.close();
    });
  }

  function start() {
    FS.State.load();
    FS.UI.Atelier.init();
    FS.UI.Shop.init();
    FS.UI.Collection.init();
    FS.State.onChange(refresh);

    UI.$$('.tab').forEach(function (t) { t.addEventListener('click', function () { go(t.dataset.view); }); });

    /* évite le zoom / les gestes parasites sur mobile */
    ['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });

    refresh();
    if (!FS.State.get().welcomed) welcome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
