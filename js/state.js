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

  /* Lit la sauvegarde principale, ou la copie de secours si elle est illisible */
  function readSave() {
    var keys = [C.saveKey, C.saveKey + '-backup'];
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (raw) { var d = JSON.parse(raw); if (d && typeof d === 'object') return d; }
      } catch (e) { /* on essaie la copie suivante */ }
    }
    return null;
  }

  /* Charge la partie. Compatible avec les anciennes sauvegardes : les champs manquants
     reprennent leur valeur de départ, les fluos disparus sont ignorés, les nouveaux
     fluos sont simplement "pas encore débloqués". */
  function load() {
    var d = readSave(), base = fresh();
    if (!d) { S = base; return; }
    S = Object.assign(base, d);
    S.stats = Object.assign(fresh().stats, d.stats || {});
    S.calots = isFinite(S.calots) && S.calots >= 0 ? Math.floor(S.calots) : base.calots;
    var seen = {};
    S.owned = (Array.isArray(S.owned) ? S.owned : []).filter(function (id) {
      if (!FS.fluoById(id) || seen[id]) return false;
      seen[id] = 1; return true;
    });
    C.starterFluos.forEach(function (id) { if (!seen[id]) S.owned.push(id); });
    S.newIds = (Array.isArray(S.newIds) ? S.newIds : []).filter(function (id) { return seen[id]; });
    if (S.owned.indexOf(S.selected) < 0) S.selected = S.owned[0];
    if (!(S.brush >= C.brush.min && S.brush <= C.brush.max)) S.brush = C.brush.default;
  }
  function save() {
    var s = JSON.stringify(S);
    try { localStorage.setItem(C.saveKey, s); localStorage.setItem(C.saveKey + '-backup', s); } catch (e) { /* mode privé */ }
  }

  /* Plan en cours (pour le retrouver en revenant sur le site) */
  function savePlan(o) {
    try { var s = JSON.stringify(o); if (s.length < 900000) localStorage.setItem(C.saveKey + '-plan', s); } catch (e) { /* ignore */ }
  }
  function loadPlan() {
    try { var r = localStorage.getItem(C.saveKey + '-plan'); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function clearPlan() { try { localStorage.removeItem(C.saveKey + '-plan'); } catch (e) { /* ignore */ } }
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
    savePlan: savePlan, loadPlan: loadPlan, clearPlan: clearPlan,
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
