/* ==========================================================================
   MON CHANTIER — vue "Boutique" : les 3 boîtes + animation d'ouverture
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});
  var UI = FS.UI, $ = UI.$, C = FS.CONFIG;

  function poolSize(box) {
    return FS.FLUOS.filter(function (f) { return box.rarities.indexOf(f.rarity) >= 0; }).length;
  }

  function render() {
    var S = FS.State.get();
    $('#boxes').innerHTML = C.boxes.map(function (b) {
      var remain = FS.State.boxRemaining(b), missing = b.price - S.calots, label, off = false;
      if (remain === 0) { label = 'Tout débloqué ✓'; off = true; }
      else if (missing > 0) { label = 'Il te manque ' + missing + ' calot' + (missing > 1 ? 's' : ''); off = true; }
      else label = 'Ouvrir la box';
      var pills = b.rarities.map(function (r) {
        return '<span class="pill" style="--rc:' + UI.rarity(r).color + '">' + UI.rarity(r).label + '</span>';
      }).join('');
      return '<article class="box' + (b.id === 'exclusive' ? ' exclusive' : '') + '" style="--c:' + b.color + ';--a:' + b.accent + '">' +
        UI.boxArt(b) +
        '<div class="box-info"><h3>' + UI.esc(b.name) + '</h3><p class="tagline">' + UI.esc(b.tagline) + '</p>' +
        '<div class="drops">' + pills + '</div>' +
        '<div class="price"><span class="calot"></span>' + b.price + '</div>' +
        '<div class="remain">' + (remain ? remain + ' / ' + poolSize(b) + ' fluos à découvrir' : 'Série complète !') + '</div>' +
        '<button class="btn ' + (off ? '' : 'gold') + '" data-box="' + b.id + '"' + (off ? ' disabled' : '') + '>' + label + '</button></div></article>';
    }).join('');

    var hint = $('#shopHint');
    if (!hint) {
      hint = document.createElement('div'); hint.id = 'shopHint'; hint.className = 'hint';
      $('#boxes').parentNode.appendChild(hint);
    }
    hint.innerHTML = 'Il te faut plus de calots ? Repasse des plans à l\'atelier !<br><button class="btn primary" data-go="atelier">🖍️ Retour à l\'atelier</button>';
  }

  function reveal(m, res) {
    var f = res.fluo, r = UI.rarity(f.rarity), S = FS.State.get(), box = res.box;
    var again = S.calots >= box.price && FS.State.boxRemaining(box) > 0;
    m.persistent = false;
    m.setHTML(
      '<div class="reveal"><span class="badge" style="--rc:' + r.color + '">' + r.label + '</span>' +
      '<div class="reveal-card" style="--rc:' + r.color + '">' + UI.previewCanvas(f.id, 480, 160) +
      '<h3>' + UI.esc(f.name) + '</h3><div class="tr">Trace : ' + UI.esc(f.traceLabel) + '</div>' + (f.note ? '<div class="tr note">' + UI.esc(f.note) + '</div>' : '') + '</div>' +
      (res.duplicate ? '<div class="tag-dup">Doublon… +' + res.refund + ' calots remboursés</div>' : '<div class="tag-new">✨ NOUVEAU FLUO !</div>') +
      '<div class="row" style="flex-direction:column">' +
      (res.duplicate ? '' : '<button class="btn primary" data-act="use">🖍️ Utiliser ce fluo</button>') +
      '<div class="row" style="margin-top:0"><button class="btn" data-act="close">Fermer</button>' +
      '<button class="btn gold" data-act="again"' + (again ? '' : ' disabled') + '>Rouvrir · ' + box.price + '</button></div></div></div>');
    UI.paintPreviews(m.el);
    if (!res.duplicate && r.order >= 2) {
      UI.confetti([f.hex, '#FFE600', '#FF3DCB', '#FFFFFF', '#22D3EE'], f.rarity === 'legendaire' ? 140 : 70);
      UI.vibrate([60, 40, 60, 40, 120]);
    } else UI.vibrate(25);
  }

  function open(boxId, m) {
    var res = FS.State.buyBox(boxId);
    if (!res) { UI.toast('Pas assez de calots !'); return; }
    var html = '<div class="opening"><h2>' + UI.esc(res.box.name) + '</h2><p>Ouverture en cours…</p>' + UI.boxArt(res.box) + '</div>';
    if (!m) {
      m = UI.modal(html, { persistent: true });
      m.el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-act]');
        if (!a || a.disabled) return;
        if (a.dataset.act === 'close') m.close();
        else if (a.dataset.act === 'again') open(res.box.id, m);
        else if (a.dataset.act === 'use') {
          var id = m.lastId;
          FS.State.markSeen(id); FS.State.select(id);
          m.close(); FS.UI.go('atelier');
        }
      });
    } else { m.persistent = true; m.setHTML(html); }
    m.lastId = res.fluo.id;
    m.el.querySelector('.box-art').classList.add('shake');
    UI.vibrate([40, 60, 40, 60, 80]);
    setTimeout(function () { UI.flash(); reveal(m, res); }, 950);
  }

  function init() {
    $('#boxes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-box]');
      if (b && !b.disabled) open(b.dataset.box);
    });
    $('#view-boutique').addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]');
      if (g) FS.UI.go(g.dataset.go);
    });
    render();
  }

  FS.UI.Shop = { init: init, render: render };
})();
