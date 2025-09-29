# 🎵 Beat Borner - Refactored Edition

Jeu de rythme arcade inspiré de Beat Saber, construit avec **Babylon.js** et **SvelteKit**.

## 🏗️ Architecture Refactorisée

### Structure du Projet

```
beat_borner/
├── src/
│   ├── lib/
│   │   ├── components/          # Composants Svelte UI
│   │   │   ├── LoadingScreen.svelte
│   │   │   ├── PlayButton.svelte
│   │   │   └── GameUI.svelte
│   │   └── game/                # Logique Babylon.js (modules)
│   │       ├── BeatBornerGame.js      # Orchestrateur principal
│   │       ├── SceneManager.js        # Gestion de la scène
│   │       ├── CameraController.js    # Contrôle caméra
│   │       ├── TunnelGenerator.js     # Génération tunnel
│   │       ├── NotesManager.js        # Gestion des notes
│   │       ├── AudioManager.js        # Gestion audio
│   │       ├── LightingManager.js     # Éclairage
│   │       └── GridHelper.js          # Helper grille
│   ├── routes/                  # Routes SvelteKit
│   │   ├── +layout.svelte       # Layout global
│   │   ├── +page.svelte         # Menu principal
│   │   └── game/
│   │       └── +page.svelte     # Page de jeu
│   ├── services/                # Services API
│   │   ├── BeatSaverService.js
│   │   └── BeatMapParser.js
│   ├── app.html                 # Template HTML
│   └── app.css                  # Styles globaux
└── svelte.config.js             # Config SvelteKit
```

## 🎮 Séparation des Responsabilités

### Frontend UI (Svelte)
- **Routing** - Navigation entre menu et jeu (SvelteKit)
- **Composants UI** - LoadingScreen, PlayButton, GameUI
- **State Management** - Gestion des états UI réactifs
- **Callbacks** - Communication avec le moteur de jeu

### Moteur de Jeu (Babylon.js - Vanilla JS)
- **SceneManager** - Initialisation et gestion de la scène
- **CameraController** - Mouvement et contrôle caméra
- **TunnelGenerator** - Génération procédurale du tunnel
- **NotesManager** - Spawn, animation et détection des notes
- **AudioManager** - Chargement et lecture audio
- **LightingManager** - Éclairage de la scène

## 🚀 Commandes

```bash
# Développement
npm run dev

# Build production
npm run build

# Prévisualiser le build
npm run preview

# Vérifier le code Svelte
npm run check
```

## 📦 Technologies

- **SvelteKit** - Framework frontend avec routing intégré
- **Svelte 5** - Composants UI réactifs
- **Babylon.js 7** - Moteur 3D WebGL
- **Vite 7** - Build tool ultra-rapide
- **BeatSaver API** - Récupération des maps

## 🎯 Avantages de l'Architecture

### Modularité
- Chaque manager a une responsabilité unique (Single Responsibility)
- Facile d'ajouter de nouvelles fonctionnalités
- Code réutilisable et testable

### Performance
- Svelte compile en JS pur (pas de Virtual DOM)
- Babylon.js gère le WebGL natif
- Séparation claire UI/3D = optimisations ciblées

### Maintenabilité
- Code organisé par domaine fonctionnel
- Couplage faible entre modules
- Documentation claire des responsabilités

### Évolutivité
- Ajout facile de nouvelles routes (leaderboard, settings)
- Extension simple des managers
- Support multi-joueurs potentiel

## 🛠️ Prochaines Étapes

- [ ] Système de scoring
- [ ] Détection des frappes (input)
- [ ] Effets visuels sur les hits
- [ ] Page paramètres
- [ ] Leaderboard local
- [ ] Support multi-difficultés
- [ ] Sélection de maps custom

## 📝 Notes de Migration

### Ancien Code (Monolithique)
- Tout dans `main.js` (~800 lignes)
- HTML/CSS inline dans `index.html`
- Pas de routing, pas de structure

### Nouveau Code (Modulaire)
- Logique séparée en 8 modules distincts
- Composants Svelte réutilisables
- Routing SvelteKit natif
- Architecture SOLID appliquée

## 🎨 Conventions de Code

- **Svelte** - PascalCase pour composants (`.svelte`)
- **JS Modules** - PascalCase pour classes
- **Callbacks** - Préfixe `on` (onLoadingStart, onGameStart)
- **Getters** - Préfixe `get` (getCamera, getScene)

---

Développé avec ❤️ et Babylon.js + SvelteKit