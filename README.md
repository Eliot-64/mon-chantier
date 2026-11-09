# 🖍️ Mon chantier

Un petit jeu de **métreur-concepteur** : on génère un plan de bâtiment « comme en ingénierie »,
on **repasse ses contours au surligneur fluo**, on gagne des **calots** (comme les billes 🪙),
et on les dépense en **boîtes** pour débloquer de nouveaux fluos — jusqu'au plus rare, le
*Fluo Super Saiyen Claudo*.

Site 100 % statique (HTML / CSS / JavaScript, **aucune dépendance, aucune installation**),
pensé **mobile d'abord** et adapté au PC. La progression est **sauvegardée automatiquement** dans le navigateur (voir « Sauvegarde »).

## ▶️ Jouer

- **En ligne** (GitHub Pages) : voir « Mettre en ligne » plus bas.
- **En local** : double-cliquer sur `index.html`, ou `npm start` puis http://localhost:8000.

## 🎮 Comment ça marche

| Étape | Détail |
|---|---|
| **Générer le plan** | Un plan aléatoire (rectangle, L ou T : murs, portes, fenêtres, cotes, axes, cartouche du métreur). |
| **Repasser les contours** | Souris, doigt ou stylet. Une jauge montre la part du contour repassée. |
| **Valider** | Dès 60 % du contour. Gain en **calots** selon la longueur du plan, la couverture et la précision du trait. |
| **Boîtes** | 🟡 Basique (12) → fluos communs · 🔵 Rare (35) → fluos rares · 🟣 Exclusive (80) → fluos exclusifs. |
| **Collection** | Tous les fluos, ceux qu'on n'a pas encore sont en **ombre**. 4 niveaux de rareté : Commun, Rare, Exclusif, Légendaire. |

On démarre avec **41 calots** et **4 fluos** (jaune, rose, vert, bleu), chacun avec une trace différente.
Le jeu n'est pas fait pour s'éterniser : le 1er plan rapporte ~100 calots, donc une Box Exclusive dès le 1er plan ;
tous les exclusifs arrivent en ~13 plans et la collection complète (122 fluos) en ~34 plans.
Les tirages favorisent les fluos qu'on n'a pas encore, et un doublon rembourse la moitié de la boîte.

### Les 122 fluos

- **64 communs** — 64 couleurs, 8 traces simples (classique, pointe biseau, tirets, pointillés, double trait, vagues, zigzag, pixels).
- **42 rares** — 42 couleurs, 9 traces spéciales (halo, néon, étincelles, arc-en-ciel, bulles, hachures, spray, cœurs, étoiles).
- **16 exclusifs** (15 exclusifs + 1 légendaire), chacun avec sa trace unique :

| Fluo | Rareté | Trace |
|---|---|---|
| Fluo Diego | Exclusif | Flammes |
| Fluo Reine | Exclusif | Couronnes |
| Fluo Chloé | Exclusif | Fleurs |
| Fluo 41 ans | Exclusif | Des « 41 » tout le long du trait |
| Fluo SNK | Exclusif | Lames croisées |
| Fluo Pompier-Cambrioleur | Exclusif | Flammes de pompier + masques de cambrioleur |
| Fluo 25 *(pour ceux qui se voilent la face)* | Exclusif | Voiles marqués « 25 » |
| Fluo Cajoux | Exclusif | Noix de cajou |
| Fluo Fisi'ihoi *(#mongrosbébé)* | Exclusif | Ballons de rugby |
| Fluo Manteau volé | Exclusif | Manteaux sur cintre |
| Fluo Coquillette | Exclusif | Coquillettes |
| Fluo Cristiano Ronaldo *(Siuuuuuuuuuu)* | Exclusif | « 7 » et étoiles |
| Fluo P’tite clito *(une vieille Renault Clio blanche)* | Exclusif | Vieilles Clio blanches (avec un peu de rouille) |
| Fluo Gandalf | Exclusif | Chapeaux pointus et étoiles |
| Fluo Batibat | Exclusif | Briques de chantier |
| Fluo Super Saiyen Claudo | **Légendaire** (le plus rare) | Aura dorée et éclairs |

Chaque fluo a une couleur **et** une trace différentes (vérifié par les tests).

## 🗂️ Architecture

```
mon-chantier/
├── index.html              Page unique (3 vues : Atelier, Boutique, Collection)
├── css/
│   ├── style.css           Base + mise en page PC / mobile (barre d'onglets en bas sur mobile)
│   └── components.css      Boutique, collection, fenêtres, animations
├── js/
│   ├── config.js           ⚙️ Réglages : prix, calots de départ, raretés, récompenses, dédicace
│   ├── fluos.js            📒 Catalogue des 122 fluos (couleur, rareté, mode de trace)
│   ├── strokes.js          🖍️ Moteur de traces : une fonction de dessin par mode
│   ├── plans.js            📐 Générateur de plans (déterministe par graine) + rendu
│   ├── state.js            💾 État du jeu, sauvegarde localStorage, boîtes, récompenses
│   ├── engine.js           ✍️ Canvas, pointeur, couverture du contour, précision, annuler
│   ├── main.js             🚀 Démarrage, navigation, portefeuille
│   └── ui/
│       ├── common.js       Fenêtres, toasts, confettis, aperçus
│       ├── atelier.js      Plan, outils, plateau de fluos
│       ├── shop.js         Boîtes + animation d'ouverture
│       └── collection.js   Grille, filtres, silhouettes
├── assets/favicon.svg
├── tests/run.js            Tests automatiques (Node, sans dépendance)
├── .github/workflows/test.yml
├── package.json  .gitignore  .nojekyll
└── README.md
```

Les scripts sont de simples `<script>` partageant un espace de noms global `FS` : pas de build, et
ça fonctionne aussi en ouvrant `index.html` directement.

**Dessin** : deux canvas superposés — le plan en dessous, l'encre en dessus en `mix-blend-mode: multiply`,
comme un vrai surligneur (le noir des murs reste visible sous la couleur).

## 💾 Sauvegarde

Tout est enregistré **automatiquement dans le navigateur** (calots, fluos débloqués, fluo choisi, statistiques
**et même le plan en cours avec les traits déjà tracés**). Quand on quitte le site et qu'on revient, on retrouve exactement sa partie.

- Elle **survit aux mises à jour du site** : les nouveaux fluos arrivent simplement « pas encore débloqués ».
  Pour que ça marche, **ne change jamais `saveKey`** dans `js/config.js`.
- Une **copie de secours** est gardée à côté de la sauvegarde principale.
- La sauvegarde est propre à chaque **appareil et navigateur** (elle ne passe pas du téléphone à l'ordinateur) et disparaît si on
  vide les données du site ou si on joue en navigation privée.

## 🔧 Personnaliser

- **Prix, calots de départ, récompenses, nom sur le message d'accueil** → `js/config.js`.
- **Ajouter / modifier un fluo** → `js/fluos.js` (id, nom, couleur, rareté, `mode`).
- **Inventer une nouvelle trace** → ajouter une fonction `M.monmode = function (ctx, f, a, b, st, w) { … }`
  dans `js/strokes.js`, son libellé dans `FS.MODE_LABELS` (`js/fluos.js`), puis l'utiliser dans un fluo.
- Astuces dans la console du navigateur : `FS.State.addCalots(500)` · `FS.State.reset()` (repart de zéro).

## 🧪 Tests

```bash
node tests/run.js        # ou : npm test
```

Vérifie le catalogue (≥ 100 fluos, couleurs et traces toutes différentes), le dessin des 122 traces, la sauvegarde (y compris d'anciennes sauvegardes),
800 plans générés, le suivi des contours (couverture / précision / annuler) et l'équilibrage de l'économie.

## 🌍 Mettre en ligne (GitHub Pages)

```bash
cd mon-chantier
git init -b main
git add .
git commit -m "Mon chantier"
git remote add origin https://github.com/<ton-compte>/mon-chantier.git
git push -u origin main
```

Puis sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
Le jeu sera disponible à `https://<ton-compte>.github.io/mon-chantier/`.
