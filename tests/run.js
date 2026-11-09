/* Tests de Mon chantier — lancer avec :  node tests/run.js
   Charge les scripts du jeu dans un faux "navigateur" et vérifie la logique. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const store = {};
const sandbox = {
  console, Math, Date, JSON, Object, Array, Uint8Array, Float32Array, Number, String, Set, Map, Proxy,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  navigator: {}, devicePixelRatio: 1
};
sandbox.window = sandbox;
vm.createContext(sandbox);
['config', 'fluos', 'strokes', 'plans', 'state', 'engine'].forEach((n) => {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', n + '.js'), 'utf8'), sandbox, { filename: n + '.js' });
});
const FS = sandbox.FS;

let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } }
function section(t) { console.log('\n' + t); }
function fakeCtx() { return new Proxy({}, { get(t, k) { return k in t ? t[k] : function () {}; }, set(t, k, v) { t[k] = v; return true; } }); }

/* ---------------- catalogue ---------------- */
section('Catalogue');
const F = FS.FLUOS;
ok(F.length >= 100, `au moins 100 fluos (${F.length})`);
ok(new Set(F.map((f) => f.id)).size === F.length, 'ids uniques');
ok(new Set(F.map((f) => f.name)).size === F.length, 'noms uniques');
ok(new Set(F.map((f) => f.hex.toLowerCase())).size === F.length, 'couleurs (hex) toutes différentes');
ok(new Set(F.map((f) => [f.mode, f.w, f.hex].join('|'))).size === F.length, 'traces (mode+largeur+couleur) toutes différentes');
ok(F.every((f) => /^#[0-9A-Fa-f]{6}$/.test(f.hex)), 'couleurs valides');
ok(F.every((f) => FS.CONFIG.rarities[f.rarity]), 'raretés valides');
ok(F.every((f) => FS.Strokes.modes[f.mode]), 'chaque fluo a un mode de trace codé');
ok(FS.fluosByRarity('commun').length === 64 && FS.fluosByRarity('rare').length === 42, '64 communs + 42 rares');
ok(FS.fluosByRarity('exclusif').length === 15 && FS.fluosByRarity('legendaire').length === 1, '15 exclusifs + 1 légendaire');
['Fluo Diego', 'Fluo Reine', 'Fluo Chloé', 'Fluo 41 ans', 'Fluo SNK', 'Fluo Super Saiyen Claudo', 'Fluo Pompier-Cambrioleur',
  'Fluo 25', 'Fluo Cajoux', "Fluo Fisi'ihoi", 'Fluo Manteau volé', 'Fluo Coquillette', 'Fluo Cristiano Ronaldo', 'Fluo P\u2019tite clito', 'Fluo Gandalf', 'Fluo Batibat']
  .forEach((n) => ok(F.some((f) => f.name === n && ['exclusif', 'legendaire'].includes(f.rarity)), `exclusif présent : ${n}`));
ok(FS.fluoById('claudo').rarity === 'legendaire', 'Claudo est le plus rare (légendaire)');
ok(FS.CONFIG.starterFluos.length === 4 && FS.CONFIG.starterFluos.every((id) => FS.fluoById(id)), '4 fluos de départ');
ok(new Set(FS.CONFIG.starterFluos.map((id) => FS.fluoById(id).mode)).size === 4, 'les 4 fluos de départ ont 4 traces différentes');

/* ---------------- traces ---------------- */
section('Traces');
let drawErr = 0;
F.forEach((f) => {
  try {
    const ctx = fakeCtx(), pts = [];
    for (let x = 10; x < 300; x += 3) pts.push({ x, y: 50 + Math.sin(x / 20) * 20 });
    FS.Strokes.drawPath(ctx, f, pts, 1);
    FS.Strokes.drawPath(ctx, f, [{ x: 5, y: 5 }], 1);                 // simple tap
    const cv = { width: 240, height: 72, getContext: () => ctx };
    FS.Strokes.preview(cv, f);
  } catch (e) { drawErr++; console.log('   erreur', f.id, e.message); }
});
ok(drawErr === 0, 'les ' + F.length + ' fluos se dessinent sans erreur (trait, tap, aperçu)');

/* ---------------- plans ---------------- */
section('Plans');
let bad = 0, withStairs = 0, shapes = {}, minWalls = 1e9, minLen = 1e9, maxLen = 0;
[[1000, 700], [700, 1000]].forEach(([W, H]) => {
  for (let seed = 1; seed <= 400; seed++) {
    const p = FS.Plans.generate(W, H, seed);
    shapes[p.shape] = (shapes[p.shape] || 0) + 1;
    if (p.stairs) withStairs++;
    minWalls = Math.min(minWalls, p.walls.length); minLen = Math.min(minLen, p.totalLength); maxLen = Math.max(maxLen, p.totalLength);
    const inside = p.walls.every((w) => w.x1 >= 0 && w.y1 >= 0 && w.x2 <= W && w.y2 <= H && (w.x1 === w.x2 || w.y1 === w.y2) &&
      [w.x1, w.y1, w.x2, w.y2].every(Number.isFinite));
    const samplesOk = p.samples.length > 50 && p.samples.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y));
    const cartoucheClear = p.bounds.y1 < H - 96;
    if (!inside || !samplesOk || !cartoucheClear || p.rooms.length < 2 || !p.doors.some((d) => d.entrance)) bad++;
  }
  const a = FS.Plans.generate(W, H, 42), b = FS.Plans.generate(W, H, 42);
  ok(JSON.stringify(a) === JSON.stringify(b), `génération déterministe pour une même graine (${W}x${H})`);
});
ok(bad === 0, `800 plans valides (murs droits, dans la page, ≥2 pièces, porte d'entrée) — ${bad} défectueux`);
ok(Object.keys(shapes).length === 3, `3 formes de bâtiment générées (${JSON.stringify(shapes)})`);
ok(withStairs > 100, `escaliers présents (${withStairs}/800)`);
console.log(`    longueur de contour : ${Math.round(minLen)} → ${Math.round(maxLen)} px, ≥ ${minWalls} murs`);
(function () {
  const ctx = fakeCtx();
  let err = null;
  try { for (let s = 1; s <= 50; s++) FS.Plans.render(ctx, FS.Plans.generate(s % 2 ? 1000 : 700, s % 2 ? 700 : 1000, s)); } catch (e) { err = e; }
  ok(!err, 'rendu de 50 plans sans erreur' + (err ? ' : ' + err.message : ''));
})();

/* ---------------- suivi des contours (moteur) ---------------- */
section('Moteur : couverture & précision');
function makeCanvas() {
  const ctx = fakeCtx(), L = {};
  return { width: 0, height: 0, getContext: () => ctx, addEventListener: (n, fn) => { L[n] = fn; }, setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }), L };
}
(function () {
  const pc = makeCanvas(), ic = makeCanvas();
  let last = null;
  const eng = new FS.Engine(pc, ic, { onProgress: (c, p) => { last = { c, p }; } });
  FS.State.load();
  const plan = FS.Plans.generate(1000, 700, 7);
  eng.setPlan(plan);
  ok(eng.coverage() === 0, 'couverture initiale = 0');
  const ev = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, preventDefault() {} });
  /* repasse tous les murs */
  plan.walls.forEach((w) => {
    ic.L.pointerdown(ev(w.x1, w.y1));
    const n = Math.max(2, Math.round((Math.abs(w.x2 - w.x1) + Math.abs(w.y2 - w.y1)) / 6));
    for (let i = 1; i <= n; i++) ic.L.pointermove(ev(w.x1 + ((w.x2 - w.x1) * i) / n, w.y1 + ((w.y2 - w.y1) * i) / n));
    ic.L.pointerup({});
  });
  ok(eng.coverage() > 0.97, `tout repassé → couverture ${(eng.coverage() * 100).toFixed(1)} %`);
  ok(eng.precision() > 0.95, `trait sur les murs → précision ${(eng.precision() * 100).toFixed(1)} %`);
  eng.undo(); eng.undo(); eng.undo();
  ok(eng.coverage() < 1, 'annuler fait baisser la couverture');
  eng.clear();
  ok(eng.coverage() === 0 && eng.strokeCount() === 0, 'effacer remet à zéro');
  /* gribouillis loin des murs : précision basse */
  ic.L.pointerdown(ev(0, 0));
  for (let i = 1; i < 40; i++) ic.L.pointermove(ev(i * 2, 0));
  ic.L.pointerup({});
  ok(eng.precision() < 0.3, `trait hors contour → précision ${(eng.precision() * 100).toFixed(0)} %`);
})();

/* ---------------- économie ---------------- */
section('Économie (calots, boîtes)');
(function () {
  const S = FS.State; S.reset();
  ok(S.get().calots === FS.CONFIG.startCalots, `départ : ${FS.CONFIG.startCalots} calots`);
  ok(S.get().owned.length === 4, 'départ : 4 fluos');
  ok(S.buyBox('exclusive') === null, "impossible d'acheter une box sans assez de calots");
  /* récompense d'un plan */
  let gains = [];
  for (let s = 1; s <= 200; s++) gains.push(S.planReward(FS.Plans.generate(s % 2 ? 1000 : 700, s % 2 ? 700 : 1000, s), 1, 1));
  const avg = gains.reduce((a, b) => a + b, 0) / gains.length;
  console.log(`    gain moyen par plan (100 % / 100 %) : ${avg.toFixed(0)} calots (min ${Math.min(...gains)}, max ${Math.max(...gains)})`);

  /* simulation d'un joueur : repasse des plans (~85 % / 80 %), achète tout ce qu'il peut */
  function simulate(seed) {
    let a = seed; const rand = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    S.reset();
    let plans = 0, firstExcl = null, allExcl = null, all = null;
    while (plans < 400) {
      const target = FS.CONFIG.boxes.slice().reverse().filter((b) => S.boxRemaining(b) > 0)[0];   // il économise pour la plus belle boîte
      while (target && S.boxRemaining(target) > 0 && S.get().calots >= target.price) S.buyBox(target.id, rand);
      const exOwned = FS.fluosByRarity('exclusif').concat(FS.fluosByRarity('legendaire')).filter((f) => S.has(f.id)).length;
      if (exOwned > 0 && firstExcl === null) firstExcl = plans;
      if (exOwned === 16 && allExcl === null) allExcl = plans;
      if (S.get().owned.length === F.length) { all = plans; break; }
      S.validatePlan(FS.Plans.generate(1000, 700, 1 + Math.floor(rand() * 9999)), 0.85, 0.8); plans++;
    }
    return { firstExcl, allExcl, all };
  }
  const runs = []; for (let i = 1; i <= 30; i++) runs.push(simulate(i * 977));
  const med = (k) => runs.map((r) => r[k]).sort((x, y) => x - y)[15];
  console.log(`    joueur type (médiane sur 30 parties) : 1er exclusif après ${med('firstExcl')} plans, tous les exclusifs après ${med('allExcl')}, collection complète après ${med('all')}`);
  ok(med('firstExcl') <= 2, 'un premier fluo exclusif arrive très vite (≤ 2 plans)');
  ok(med('allExcl') <= 25, 'tous les exclusifs en ≤ 25 plans');
  ok(runs.every((r) => r.all !== null), 'la collection complète est toujours atteignable');
  ok(med('all') <= 45, `jeu qui ne s'éternise pas : collection complète en ≈ ${med('all')} plans`);

  /* règles de tirage */
  S.reset(); S.addCalots(100000);
  const dropsBasic = new Set(), dropsRare = new Set(), dropsEx = {};
  for (let i = 0; i < 400; i++) {
    dropsBasic.add(S.buyBox('basique').fluo.rarity);
    dropsRare.add(S.buyBox('rare').fluo.rarity);
    const e = S.buyBox('exclusive'); dropsEx[e.fluo.id] = (dropsEx[e.fluo.id] || 0) + 1;
  }
  ok([...dropsBasic].join() === 'commun', 'Box Basique : uniquement des communs');
  ok([...dropsRare].join() === 'rare', 'Box Rare : uniquement des rares');
  ok(Object.keys(dropsEx).length === 16 && FS.fluosByRarity('exclusif').concat(FS.fluosByRarity('legendaire')).every((f) => dropsEx[f.id]), 'Box Exclusive : les 16 fluos exclusifs sortent');
  ok(Object.keys(dropsEx).every((id) => FS.fluosByRarity('exclusif').concat(FS.fluosByRarity('legendaire')).some((f) => f.id === id)), 'Box Exclusive : contenu cohérent');
  S.reset();
  S.addCalots(100000);
  const before = S.get().calots; let dup = null;
  for (let i = 0; i < 300 && !dup; i++) { const r = S.buyBox('basique'); if (r && r.duplicate) dup = r; }
  ok(dup && dup.refund === Math.round(FS.CONFIG.boxes[0].price * FS.CONFIG.duplicateRefund), 'doublon : remboursement partiel');
  S.reset();
})();

/* ---------------- sauvegarde ---------------- */
section('Sauvegarde (quitter / revenir / mise à jour)');
(function () {
  const S = FS.State, key = FS.CONFIG.saveKey;
  S.reset(); S.addCalots(300);
  S.buyBox('exclusive'); S.buyBox('rare'); S.select(FS.CONFIG.starterFluos[1]);
  const before = JSON.parse(JSON.stringify(S.get()));
  S.save(); S.load();
  ok(JSON.stringify(S.get()) === JSON.stringify(before), 'sauvegarde puis rechargement : partie identique (calots, fluos, sélection)');

  store[key] = '{ pas du json';                                   // sauvegarde principale corrompue
  S.load();
  ok(S.get().owned.length === before.owned.length && S.get().calots === before.calots, 'sauvegarde principale corrompue : la copie de secours prend le relais');

  /* ancienne sauvegarde (avant la mise à jour) : sans les nouveaux fluos, avec un fluo disparu et un champ manquant */
  const old = { v: 1, calots: 77, owned: ['c01', 'c25', 'c52', 'c41', 'diego', 'claudo', 'fluo-qui-nexiste-plus'], selected: 'diego', stats: { plans: 3 } };
  store[key] = JSON.stringify(old); delete store[key + '-backup'];
  S.load();
  const g = S.get();
  ok(g.calots === 77 && g.stats.plans === 3 && g.stats.boxes === 0, 'ancienne sauvegarde : calots et stats conservés, champs manquants complétés');
  ok(g.owned.includes('diego') && g.owned.includes('claudo') && !g.owned.includes('fluo-qui-nexiste-plus'), 'ancienne sauvegarde : fluos gardés, fluo disparu ignoré');
  ok(['v25', 'batibat', 'gandalf'].every((id) => !S.has(id)), 'les nouveaux fluos arrivent "pas encore débloqués"');
  S.addCalots(100);
  ok(S.buyBox('exclusive') !== null, 'la partie continue normalement après la mise à jour');

  delete store[key]; delete store[key + '-backup'];
  S.load();
  ok(S.get().calots === FS.CONFIG.startCalots && S.get().owned.length === 4, 'aucune sauvegarde : nouvelle partie propre');

  S.savePlan({ seed: 5, W: 1000, H: 700, sig: 'x', strokes: [{ id: 'c01', scale: 1, pts: [1, 2, 3, 4] }] });
  const sp = S.loadPlan();
  ok(sp && sp.seed === 5 && sp.strokes[0].pts.length === 4, 'plan en cours : enregistré puis relu');
  S.clearPlan();
  ok(S.loadPlan() === null, 'plan en cours : effaçable');
  S.reset();
})();

console.log(`\n${passes} tests réussis, ${fails} échec(s)`);
process.exit(fails ? 1 : 0);
