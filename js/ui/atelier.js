/* ==========================================================================
   MON CHANTIER — vue "Atelier" : plan, outils, plateau de fluos
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});
  var UI = FS.UI, $ = UI.$, C = FS.CONFIG;
  var engine = null, plan = null, notified = false, traySig = '';

  /* ---------- mise à l'échelle du papier ---------- */
  function fit() {
    if (!plan) return;
    var st = $('#stage'), p = $('#paper'), cs = getComputedStyle(st);
    var aw = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ah = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (aw <= 0 || ah <= 0) return;
    var k = Math.min(aw / plan.W, ah / plan.H);
    p.style.width = Math.floor(plan.W * k) + 'px';
    p.style.height = Math.floor(plan.H * k) + 'px';
  }

  /* ---------- plan ---------- */
  function newPlan() {
    var st = $('#stage');
    var portrait = st.clientHeight > st.clientWidth * 1.05;
    var W = portrait ? 700 : 1000, H = portrait ? 1000 : 700;
    plan = FS.Plans.generate(W, H, FS.Plans.newSeed());
    engine.setPlan(plan);
    notified = false;
    $('#planName').textContent = 'Plan n°' + plan.number + ' · ' + plan.title;
    fit();
    progress(0, 0);
  }

  function progress(cov, prec) {
    $('#coverageText').textContent = Math.round(cov * 100) + ' %';
    $('#coverageBar').style.width = Math.round(cov * 100) + '%';
    var ok = cov >= C.plan.minCoverage, btn = $('#btnValidate');
    btn.disabled = !ok;
    btn.textContent = ok ? '✅ Valider +' + FS.State.planReward(plan, cov, prec) : '✅ Valider';
    if (cov >= C.plan.autoCompleteAt && !notified) {
      notified = true;
      UI.toast('Contours repassés ! Valide ton plan pour gagner des calots chéris 🪙');
      UI.vibrate(30);
    }
  }

  function validate() {
    var cov = engine.coverage(), prec = engine.precision();
    if (cov < C.plan.minCoverage) {
      UI.toast('Repasse au moins ' + Math.round(C.plan.minCoverage * 100) + ' % des contours');
      return;
    }
    var gain = FS.State.validatePlan(plan, cov, prec);
    UI.vibrate([20, 40, 20]);
    var m = UI.modal(
      '<div class="big-emoji">📐</div><h2>Plan validé !</h2><p>' + UI.esc(plan.title) + ' · n°' + plan.number + '</p>' +
      '<div class="stats"><div class="stat"><b>' + Math.round(cov * 100) + ' %</b><span>Contours repassés</span></div>' +
      '<div class="stat"><b>' + Math.round(prec * 100) + ' %</b><span>Précision du trait</span></div></div>' +
      '<div class="gain"><span class="calot"></span>+' + gain + '</div>' +
      '<div class="row"><button class="btn" data-act="shop">🎁 Boutique</button><button class="btn primary" data-act="next">🏗️ Nouveau plan</button></div>',
      { persistent: true });
    UI.confetti(['#FFE600', '#FF3DCB', '#22D3EE', '#39FF14'], 40);
    m.el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (!a) return;
      m.close(); newPlan();
      if (a.dataset.act === 'shop') FS.UI.go('boutique');
    });
  }

  /* ---------- plateau de fluos ---------- */
  function renderTray(force) {
    var S = FS.State.get(), sig = S.owned.length + '|' + S.newIds.join(',');
    if (!force && sig === traySig) return;
    traySig = sig;
    var list = S.owned.map(FS.fluoById).filter(Boolean).sort(function (a, b) {
      return (UI.rarity(b.rarity).order - UI.rarity(a.rarity).order) || (a.index - b.index);
    });
    $('#trayCount').textContent = S.owned.length + ' / ' + FS.FLUOS.length;
    $('#tray').innerHTML = list.map(function (f) {
      var isNew = S.newIds.indexOf(f.id) >= 0;
      return '<button class="chip' + (f.id === S.selected ? ' sel' : '') + '" data-id="' + f.id + '" style="border-color:' +
        (f.id === S.selected ? '' : UI.rarity(f.rarity).color + '55') + '">' +
        UI.previewCanvas(f.id) + '<small>' + UI.esc(f.name) + '</small>' + (isNew ? '<span class="new">NEW</span>' : '') + '</button>';
    }).join('');
    UI.paintPreviews($('#tray'));
  }

  function refreshSelection() {
    var S = FS.State.get();
    UI.$$('.chip', $('#tray')).forEach(function (c) {
      var on = c.dataset.id === S.selected;
      c.classList.toggle('sel', on);
      c.style.borderColor = on ? '' : UI.rarity(FS.fluoById(c.dataset.id).rarity).color + '55';
    });
  }

  function init() {
    engine = new FS.Engine($('#planCanvas'), $('#inkCanvas'), { onProgress: progress });

    $('#btnNew').addEventListener('click', function () {
      if (engine.strokeCount() > 0 && engine.coverage() > 0.15) {
        UI.confirm('Abandonner ce plan ?', 'Tu perdras ta progression sur ce plan.', 'Nouveau plan', newPlan);
      } else newPlan();
    });
    $('#btnValidate').addEventListener('click', validate);
    $('#btnUndo').addEventListener('click', function () { engine.undo(); });
    $('#btnClear').addEventListener('click', function () {
      if (!engine.strokeCount()) return;
      UI.confirm('Tout effacer ?', 'Tous tes traits sur ce plan seront supprimés.', 'Effacer', function () { engine.clear(); });
    });
    $('#btnSave').addEventListener('click', function () {
      engine.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'mon-chantier-plan-' + plan.number + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        UI.toast('Image enregistrée 📷');
      });
    });

    var range = $('#brushRange');
    range.min = C.brush.min; range.max = C.brush.max;
    range.value = FS.State.get().brush;
    range.addEventListener('input', function () { FS.State.setBrush(parseFloat(range.value)); });

    $('#tray').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      FS.State.markSeen(chip.dataset.id);
      FS.State.select(chip.dataset.id);
      var nw = chip.querySelector('.new'); if (nw) nw.remove();
      UI.vibrate(8);
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && $('#view-atelier').classList.contains('active')) {
        e.preventDefault(); engine.undo();
      }
    });

    if (window.ResizeObserver) new ResizeObserver(fit).observe($('#stage'));
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(fit, 250); });

    renderTray(true);
    newPlan();
  }

  FS.UI.Atelier = {
    init: init, fit: fit, newPlan: newPlan,
    renderTray: renderTray, refreshSelection: refreshSelection,
    engine: function () { return engine; }
  };
})();
