/* ==========================================================================
   MON CHANTIER — état du jeu + sauvegarde (localStorage) + économie
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});
  var C = FS.CONFIG;

  function fresh() {
    return {
      v: 1,
      calots: C.startCalots,
      owned: C.starterFluos.slice(),          // ids possédés
      newIds: [],                              // fluos gagnés pas encore "vus"
      selected: C.starterFluos[0],
      brush: C.brush.default,
      stats: { plans: 0, boxes: 0, earned: 0, spent: 0 },
      welcomed: false
    };
  }

  var S = fresh();
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(C.saveKey);
      if (raw) {
        var d = JSON.parse(raw), base = fresh();
        S = Object.assign(base, d);
        S.stats = Object.assign(base.stats, d.stats || {});
        S.owned = (S.owned || []).filter(function (id) { return !!FS.fluoById(id); });
        C.starterFluos.forEach(function (id) { if (S.owned.indexOf(id) < 0) S.owned.push(id); });
        if (S.owned.indexOf(S.selected) < 0) S.selected = S.owned[0];
      }
    } catch (e) { S = fresh(); }
  }
  function save() { try { localStorage.setItem(C.saveKey, JSON.stringify(S)); } catch (e) { /* mode privé */ } }
  function emit() { listeners.forEach(function (fn) { fn(S); }); }
  function change() { save(); emit(); }

  function has(id) { return S.owned.indexOf(id) >= 0; }

  function addCalots(n) {
    S.calots += n; if (n > 0) S.stats.earned += n;
    change();
  }

  /* ----- tirage d'une boîte ----- */
  function pickFromBox(box, rand) {
    rand = rand || Math.random;
    var pool = FS.FLUOS.filter(function (f) { return box.rarities.indexOf(f.rarity) >= 0; });
    var unowned = pool.filter(function (f) { return !has(f.id); });
    var src = unowned.length && rand() < C.unownedBias ? unowned : pool;
    var total = 0;
    src.forEach(function (f) { total += C.dropWeights[f.rarity] || 1; });
    var r = rand() * total;
    for (var i = 0; i < src.length; i++) {
      r -= C.dropWeights[src[i].rarity] || 1;
      if (r <= 0) return src[i];
    }
    return src[src.length - 1];
  }

  function boxRemaining(box) {
    return FS.FLUOS.filter(function (f) { return box.rarities.indexOf(f.rarity) >= 0 && !has(f.id); }).length;
  }

  /* Achète une boîte : renvoie {fluo, duplicate, refund} ou null si impossible */
  function buyBox(boxId, rand) {
    var box = C.boxes.filter(function (b) { return b.id === boxId; })[0];
    if (!box || S.calots < box.price) return null;
    S.calots -= box.price; S.stats.spent += box.price; S.stats.boxes++;
    var f = pickFromBox(box, rand), dup = has(f.id), refund = 0;
    if (dup) {
      refund = Math.round(box.price * C.duplicateRefund);
      S.calots += refund;
    } else {
      S.owned.push(f.id);
      S.newIds.push(f.id);
    }
    change();
    return { fluo: f, duplicate: dup, refund: refund, box: box };
  }

  /* Calots gagnés pour un plan repassé */
  function planReward(plan, coverage, precision) {
    var P = C.plan;
    var base = P.baseReward + plan.totalLength / P.lengthDivisor;
    var r = base * (0.5 + 0.5 * coverage) * (0.85 + 0.3 * precision);
    return Math.max(1, Math.round(r));
  }

  function validatePlan(plan, coverage, precision) {
    var gain = planReward(plan, coverage, precision);
    S.stats.plans++;
    addCalots(gain);
    return gain;
  }

  FS.State = {
    get: function () { return S; },
    load: load, save: save, change: change, has: has,
    onChange: function (fn) { listeners.push(fn); },
    addCalots: addCalots, buyBox: buyBox, boxRemaining: boxRemaining,
    planReward: planReward, validatePlan: validatePlan,
    select: function (id) { if (has(id)) { S.selected = id; change(); } },
    setBrush: function (v) { S.brush = v; save(); },
    markSeen: function (id) { S.newIds = S.newIds.filter(function (x) { return x !== id; }); save(); },
    markWelcomed: function () { S.welcomed = true; save(); },
    reset: function () { S = fresh(); change(); }
  };
})();
