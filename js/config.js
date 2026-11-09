/* ==========================================================================
   MON CHANTIER — configuration générale
   Tout ce qui touche à l'économie, aux raretés et aux boîtes se règle ici.
   ========================================================================== */
window.FS = window.FS || {};

FS.CONFIG = {
  appName: 'Mon chantier',
  saveKey: 'mon-chantier-save-v1',

  /* Petit mot d'accueil (modifiable) */
  dedicace: {
    nom: 'Papa',
    age: 41,
    message: 'Joyeux anniversaire !'
  },

  /* Économie : les "calots" (comme les billes) */
  currencyName: 'calots',
  startCalots: 41,                 // clin d'oeil aux 41 ans
  /* Les 4 fluos de départ (ids du catalogue "commun") */
  starterFluos: ['c01', 'c25', 'c52', 'c41'],

  /* Les 3 boîtes. Le jeu n'est pas fait pour s'éterniser : prix bas. */
  boxes: [
    {
      id: 'basique', name: 'Box Basique', price: 12,
      tagline: 'Des fluos tout simples',
      rarities: ['commun'],
      color: '#FFE600', accent: '#FF9500'
    },
    {
      id: 'rare', name: 'Box Rare', price: 35,
      tagline: 'Des fluos qui brillent',
      rarities: ['rare'],
      color: '#22D3EE', accent: '#7C3AED'
    },
    {
      id: 'exclusive', name: 'Box Exclusive', price: 80,
      tagline: 'Les fluos de la famille',
      rarities: ['exclusif', 'legendaire'],
      color: '#C026D3', accent: '#FFC400'
    }
  ],

  /* Poids de tirage par rareté (dans une même boîte) */
  dropWeights: { commun: 1, rare: 1, exclusif: 1, legendaire: 0.3 },

  /* Anti-frustration : chance de tirer un fluo qu'on n'a pas encore */
  unownedBias: 0.9,
  /* Doublon : on récupère une part du prix de la boîte en calots */
  duplicateRefund: 0.5,

  /* Raretés (ordre croissant) */
  rarities: {
    commun:     { label: 'Commun',     color: '#9AA4B2', order: 0 },
    rare:       { label: 'Rare',       color: '#3B82F6', order: 1 },
    exclusif:   { label: 'Exclusif',   color: '#A855F7', order: 2 },
    legendaire: { label: 'Légendaire', color: '#FFC400', order: 3 }
  },

  /* Plans : tracer les contours rapporte des calots */
  plan: {
    tolerance: 18,        // distance max (px logiques) pour considérer un contour "repassé"
    sampleStep: 8,        // pas d'échantillonnage le long des murs
    minCoverage: 0.6,     // couverture minimale pour valider
    autoCompleteAt: 0.93, // proposition de validation automatique
    baseReward: 30,
    lengthDivisor: 50     // plus le plan est long, plus il rapporte
  },

  /* Trait */
  brush: { min: 0.6, max: 2.2, default: 1 }
};
