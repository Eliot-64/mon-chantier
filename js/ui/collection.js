/* ==========================================================================
   MON CHANTIER — vue "Collection" : tous les fluos, les manquants en ombre
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});
  var UI = FS.UI, $ = UI.$, C = FS.CONFIG;
  var filter = 'all', lastSig = '';

  function counts(rarity) {
    var all = FS.FLUOS.filter(function (f) { return !rarity || f.rarity === rarity; });
    var own = all.filter(function (f) { return FS.State.has(f.id); });
    return { own: own.length, total: all.length };
  }

  function render(force) {
    var S = FS.State.get(), sig = S.owned.length + '|' + S.newIds.join(',') + '|' + filter;
    if (!force && sig === lastSig) return;
    lastSig = sig;

    var all = counts();
    $('#collOwned').textContent = all.own;
    $('#collTotal').textContent = all.total;
    $('#collBar').style.width = Math.round((all.own / all.total) * 100) + '%';

    var chips = '<button class="fchip' + (filter === 'all' ? ' on' : '') + '" data-f="all">Tous ' + all.own + '/' + all.total + '</button>';
    Object.keys(C.rarities).forEach(function (k) {
      var c = counts(k), r = C.rarities[k];
      chips += '<button class="fchip' + (filter === k ? ' on' : '') + '" data-f="' + k + '" style="--rc:' + r.color + '">' + r.label + ' ' + c.own + '/' + c.total + '</button>';
    });
    $('#filters').innerHTML = chips;

    var list = FS.FLUOS.filter(function (f) { return filter === 'all' || f.rarity === filter; });
    $('#grid').innerHTML = list.map(function (f) {
      var r = UI.rarity(f.rarity), own = FS.State.has(f.id), isNew = S.newIds.indexOf(f.id) >= 0;
      return '<button class="tile ' + f.rarity + (own ? '' : ' locked') + '" data-id="' + f.id + '" style="--rc:' + r.color + '">' +
        UI.previewCanvas(f.id) +
        '<b>' + (own ? UI.esc(f.name) : '? ? ?') + '</b><small>' + r.label + '</small>' +
        (isNew ? '<span class="new">NEW</span>' : '') + '</button>';
    }).join('');
    UI.paintPreviews($('#grid'));
  }

  function detail(f) {
    var r = UI.rarity(f.rarity);
    var m = UI.modal(
      '<span class="badge" style="--rc:' + r.color + '">' + r.label + '</span>' +
      '<div class="reveal-card" style="--rc:' + r.color + '">' + UI.previewCanvas(f.id, 480, 160) +
      '<h3>' + UI.esc(f.name) + '</h3><div class="tr">Trace : ' + UI.esc(f.traceLabel) + '</div></div>' +
      '<div class="row"><button class="btn" data-act="close">Fermer</button><button class="btn primary" data-act="use">🖍️ Utiliser</button></div>');
    UI.paintPreviews(m.el);
    m.el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (!a) return;
      m.close();
      if (a.dataset.act === 'use') { FS.State.select(f.id); FS.UI.go('atelier'); }
    });
  }

  function init() {
    $('#filters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]');
      if (!b) return;
      filter = b.dataset.f; render();
    });
    $('#grid').addEventListener('click', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      var f = FS.fluoById(t.dataset.id);
      if (!FS.State.has(f.id)) {
        var box = UI.boxFor(f.rarity), r = UI.rarity(f.rarity);
        UI.toast('🔒 Fluo mystère · ' + r.label + (box ? ' · à trouver dans la ' + box.name : ''));
        return;
      }
      FS.State.markSeen(f.id);
      detail(f);
      render(true);
    });
    render(true);
  }

  FS.UI.Collection = { init: init, render: render };
})();
