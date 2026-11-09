/* ==========================================================================
   MON CHANTIER — catalogue des fluos
   64 communs + 42 rares + 7 exclusifs = 113 modèles.
   Chaque fluo a sa couleur ET sa trace (mode de dessin) : voir strokes.js
   ========================================================================== */
(function () {
  var FS = (window.FS = window.FS || {});

  /* ---- 64 communs : [nom, couleur] ---- */
  var COMMUN = [
    ['Jaune Citron', '#F6FF00'], ['Jaune Soleil', '#FFEE00'], ['Jaune Banane', '#FFF200'], ['Jaune Moutarde', '#FFD500'],
    ['Jaune Poussin', '#FFFB3D'], ['Jaune Maïs', '#FFE233'], ['Jaune Néon', '#E6FF00'], ['Jaune Limonade', '#F2FF5E'],
    ['Orange Mandarine', '#FF9500'], ['Orange Abricot', '#FFAE42'], ['Orange Carotte', '#FF7A00'], ['Orange Sunset', '#FF6A1F'],
    ['Orange Mangue', '#FFB000'], ['Orange Papaye', '#FF8A3D'], ['Orange Braise', '#FF5E00'], ['Orange Clémentine', '#FF9F1C'],
    ['Rouge Tomate', '#FF3B30'], ['Rouge Fraise', '#FF2D55'], ['Rouge Cerise', '#FF1744'], ['Rouge Piment', '#FF3D00'],
    ['Rouge Pompier', '#FF2A2A'], ['Rouge Corail', '#FF5A5F'], ['Rouge Framboise', '#FF2E63'], ['Rouge Coquelicot', '#FF4136'],
    ['Rose Bonbon', '#FF69B4'], ['Rose Chewing-gum', '#FF8AD8'], ['Rose Barbe à papa', '#FFA6E7'], ['Rose Flamant', '#FF77A9'],
    ['Rose Fuchsia', '#FF00CC'], ['Rose Dragée', '#FF9ECF'], ['Rose Pivoine', '#FF5CAD'], ['Rose Magenta', '#FF00A8'],
    ['Violet Raisin', '#B026FF'], ['Violet Lavande', '#C77DFF'], ['Violet Orchidée', '#D84BFF'], ['Violet Prune', '#9B2FFF'],
    ['Violet Mauve', '#BF5AF2'], ['Violet Glycine', '#B388FF'], ['Violet Améthyste', '#A855F7'], ['Violet Électrique', '#8A2BFF'],
    ['Bleu Ciel', '#00B4FF'], ['Bleu Océan', '#0A84FF'], ['Bleu Piscine', '#00C2FF'], ['Bleu Azur', '#1E90FF'],
    ['Bleu Roi', '#2F5BFF'], ['Bleu Glacier', '#66E0FF'], ['Bleu Lagon', '#00D4FF'], ['Bleu Cobalt', '#2979FF'],
    ['Vert Anis', '#A8FF00'], ['Vert Pomme', '#7CFC00'], ['Vert Menthe', '#3DFFB0'], ['Vert Gazon', '#39FF14'],
    ['Vert Prairie', '#5CFF5C'], ['Vert Lime', '#BFFF00'], ['Vert Sapin', '#00E676'], ['Vert Jade', '#00F5A0'],
    ['Turquoise Caraïbes', '#00F5D4'], ['Turquoise Lagune', '#1DE9B6'], ['Turquoise Glaçon', '#7DF9FF'], ['Cyan Néon', '#00FFF0'],
    ['Cyan Aquarium', '#00E5FF'], ['Aigue-marine', '#64FFDA'], ['Vert Kiwi', '#AEEA00'], ['Vert Radioactif', '#76FF03']
  ];

  /* ---- 42 rares ---- */
  var RARE = [
    ['Rubis', '#FF0A54'], ['Saphir', '#1F51FF'], ['Émeraude', '#00FF7F'], ['Topaze', '#FFC400'],
    ['Opale', '#A0FFE6'], ['Quartz Rose', '#FFB3E6'], ['Améthyste Royale', '#9D4EDD'], ['Citrine', '#FFDD00'],
    ['Aurore Boréale', '#5CFFB1'], ['Lave', '#FF4500'], ['Plasma', '#FF00E5'], ['Comète', '#6EE7FF'],
    ['Nébuleuse', '#B14BFF'], ['Supernova', '#FFD60A'], ['Galaxie', '#5B5BFF'], ['Éclipse', '#7A00FF'],
    ['Mirage', '#FF8FA3'], ['Corail Lumineux', '#FF6F61'], ['Poison', '#4DFF00'], ['Acide', '#CCFF00'],
    ['Toxique', '#9DFF00'], ['Laser', '#FF0040'], ['Hologramme', '#8EF5FF'], ['Cyber Rose', '#FF2BD6'],
    ['Cyber Jaune', '#F9FF21'], ['Code Vert', '#00FF41'], ['Prisme', '#FF4D8D'], ['Bonbon Acidulé', '#FF4FA3'],
    ['Glacier Arctique', '#A5F3FF'], ['Pétrole', '#00B8D9'], ['Sunset Beach', '#FF7E5F'], ['Coucher de Soleil', '#FF9966'],
    ['Lagon Secret', '#00E0C6'], ['Orchidée Noire', '#7B2CBF'], ['Mangue Mûre', '#FFB347'], ['Menthe Glacée', '#98FFD9'],
    ['Pastèque', '#FF5C7A'], ['Cassis', '#E040FB'], ['Cobalt Profond', '#2D6BFF'], ['Citron Fou', '#B6FF00'],
    ['Rose Poudré', '#FFC2E2'], ['Bleu Nuit Fluo', '#3D5AFE']
  ];

  var SIMPLE_MODES = ['classic', 'chisel', 'dashed', 'dotted', 'double', 'wavy', 'zigzag', 'pixel'];
  var FANCY_MODES = ['glow', 'neon', 'sparkle', 'rainbow', 'bubbles', 'hatch', 'spray', 'hearts', 'stars'];

  /* Les 4 fluos de départ ont chacun un trait bien différent */
  var STARTER_MODES = { c01: 'classic', c25: 'chisel', c52: 'dashed', c41: 'dotted' };

  FS.MODE_LABELS = {
    classic: 'Classique', chisel: 'Pointe biseau', dashed: 'Tirets', dotted: 'Pointillés',
    double: 'Double trait', wavy: 'Vagues', zigzag: 'Zigzag', pixel: 'Pixels',
    glow: 'Halo', neon: 'Néon', sparkle: 'Étincelles', rainbow: 'Arc-en-ciel',
    bubbles: 'Bulles', hatch: 'Hachures', spray: 'Spray', hearts: 'Cœurs', stars: 'Étoiles',
    flames: 'Flammes', crowns: 'Couronnes', flowers: 'Fleurs', numbers: 'Chiffres 41',
    slash: 'Lames', heist: 'Flammes & cagoule', aura: 'Aura dorée'
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var list = [];

  COMMUN.forEach(function (c, i) {
    var id = 'c' + pad(i + 1);
    list.push({
      id: id, name: c[0], hex: c[1], rarity: 'commun',
      mode: STARTER_MODES[id] || SIMPLE_MODES[(i + Math.floor(i / 8)) % SIMPLE_MODES.length],
      w: 16 + (i % 4) * 3,
      alpha: 0.6
    });
  });

  RARE.forEach(function (c, i) {
    list.push({
      id: 'r' + pad(i + 1), name: c[0], hex: c[1], rarity: 'rare',
      mode: FANCY_MODES[(i + Math.floor(i / 9)) % FANCY_MODES.length],
      w: 18 + (i % 3) * 3,
      alpha: 0.75
    });
  });

  /* ---- 6 exclusifs (le plus rare : Claudo) ---- */
  list.push(
    { id: 'diego', name: 'Fluo Diego', hex: '#FF6B00', rarity: 'exclusif', mode: 'flames', w: 24, alpha: 0.85 },
    { id: 'reine', name: 'Fluo Reine', hex: '#BF6BFF', rarity: 'exclusif', mode: 'crowns', w: 22, alpha: 0.85 },
    { id: 'chloe', name: 'Fluo Chloé', hex: '#FF5FA8', rarity: 'exclusif', mode: 'flowers', w: 22, alpha: 0.85 },
    { id: 'age41', name: 'Fluo 41 ans', hex: '#FFCF00', rarity: 'exclusif', mode: 'numbers', w: 24, alpha: 0.9 },
    { id: 'snk', name: 'Fluo SNK', hex: '#2BFF88', rarity: 'exclusif', mode: 'slash', w: 20, alpha: 0.9 },
    { id: 'pompier', name: 'Fluo Pompier-Cambrioleur', hex: '#FF1F1F', rarity: 'exclusif', mode: 'heist', w: 24, alpha: 0.9 },
    { id: 'claudo', name: 'Fluo Super Saiyen Claudo', hex: '#FFD700', rarity: 'legendaire', mode: 'aura', w: 26, alpha: 0.95 }
  );

  list.forEach(function (f, i) {
    f.index = i;
    f.traceLabel = FS.MODE_LABELS[f.mode];
  });

  FS.FLUOS = list;
  FS.fluoById = function (id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  FS.fluosByRarity = function (r) { return list.filter(function (f) { return f.rarity === r; }); };
})();
