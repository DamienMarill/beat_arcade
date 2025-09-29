# 🎵 BeatSaver Service pour Beat Borner

Service complet pour intégrer l'API BeatSaver dans ton jeu Beat Saber/borne d'arcade avec conversion automatique de la grille 4×3 vers 4×2.

## 📁 Structure

```
src/services/
├── BeatSaverService.js     # Service principal API BeatSaver
├── BeatMapParser.js        # Parser avec conversion 4×3 → 4×2
└── README.md              # Cette documentation

src/game/
└── GridHelper.js           # Helper grille 4×2 pour Babylon.js

src/examples/
└── BeatSaverExample.js     # Exemples d'utilisation

src/
├── test-beatsaver.html     # Page de test API
└── test-grid-conversion.html # Test conversion grille
```

## 🚀 Utilisation Rapide

### 1. Import du Service

```javascript
import { beatSaverService } from './services/BeatSaverService.js';
import { beatMapParser } from './services/BeatMapParser.js';
```

### 2. Recherche de Maps

```javascript
// Maps populaires
const popularMaps = await beatSaverService.searchMaps('', 0, 'Rating');

// Recherche par mot-clé
const results = await beatSaverService.searchMaps('electronic', 0, 'Latest');

// Par genre
const electroMaps = await beatSaverService.searchByGenre('electronic');

// Maps récentes
const latest = await beatSaverService.getLatestMaps();
```

### 3. Sélection d'une Map

```javascript
// Par ID
const map = await beatSaverService.getMapById('2f2a4');

// Informations importantes
console.log(map.metadata.songName);    // Titre
console.log(map.metadata.bpm);         // BPM
console.log(map.version.downloadUrl);  // URL de téléchargement
console.log(map.difficulties);         // Difficultés disponibles
```

### 4. Parsing des Maps avec Conversion 4×3 → 4×2

```javascript
// Parser les données .dat
const parsedData = beatMapParser.parseDifficulty(difficultyFileData);

// Optimiser pour le gameplay 3D (conversion automatique 4×3 → 4×2)
const gameplayData = beatMapParser.optimizeForGameplay(parsedData, map.metadata.bpm);

// Les notes sont automatiquement converties
gameplayData.notes.forEach(note => {
    console.log(`Note: ${note.originalX},${note.originalY} → ${note.x},${note.y}`);
    console.log(`Position 3D: (${note.position3D.x}, ${note.position3D.y}, ${note.position3D.z})`);
    // note.originalX/originalY = position Beat Saber originale
    // note.x/y = position convertie pour ton jeu 4×2
});
```

### 5. Helper Grille pour Babylon.js

```javascript
import GridHelper from './game/GridHelper.js';

const gridHelper = new GridHelper(scene);

// Afficher la grille de guidage (debug)
gridHelper.showGridGuides();

// Convertir position grille → monde
const worldPos = gridHelper.gridToWorldPosition(2, 1); // Colonne 2, Ligne 1

// Toutes les positions disponibles
const allPositions = gridHelper.getAllGridPositions();
console.log('Positions 4×2:', allPositions);
```

## 🎮 Intégration dans ton Jeu

### Exemple d'intégration dans BeatBornerGame

```javascript
import { beatSaverService } from './services/BeatSaverService.js';
import { beatMapParser } from './services/BeatMapParser.js';

class BeatBornerGame {
    constructor() {
        // ... ton code existant ...
        this.currentMap = null;
        this.gameplayData = null;
    }

    async loadMapFromBeatSaver(mapId) {
        try {
            // 1. Récupérer les infos de la map
            const map = await beatSaverService.getMapById(mapId);
            this.currentMap = map;

            // 2. Ici tu devrais télécharger et extraire le ZIP
            // avec JSZip pour récupérer les fichiers .dat
            // const zipData = await fetch(map.version.downloadUrl);
            // const zip = await JSZip.loadAsync(zipData.arrayBuffer());

            // 3. Parser les données (exemple avec mock data)
            const mockDifficultyData = this.getMockDifficultyData();
            const parsedData = beatMapParser.parseDifficulty(mockDifficultyData);

            // 4. Optimiser pour le gameplay 3D
            this.gameplayData = beatMapParser.optimizeForGameplay(parsedData, map.metadata.bpm);

            // 5. Créer les notes en 3D
            this.createNotesFromGameplayData();

            console.log(`Map chargée: ${map.metadata.songName} (${this.gameplayData.notes.length} notes)`);

        } catch (error) {
            console.error('Erreur chargement map:', error);
        }
    }

    createNotesFromGameplayData() {
        this.gameplayData.notes.forEach((noteData, index) => {
            // Créer les cubes/notes à leur position 3D
            const note = MeshBuilder.CreateBox(`note_${index}`, { size: 0.5 }, this.scene);

            // Position initiale (loin devant, arriveront au bon moment)
            const spawnDistance = noteData.time * this.speed * 60; // Distance basée sur le timing
            note.position.set(
                noteData.position3D.x,
                noteData.position3D.y,
                noteData.position3D.z + spawnDistance
            );

            // Couleur selon le type (rouge/bleu)
            const material = new StandardMaterial(`noteMat_${index}`, this.scene);
            material.emissiveColor = noteData.type === 0
                ? new Color3(1, 0, 0)  // Rouge
                : new Color3(0, 0, 1); // Bleu
            note.material = material;

            // Ajouter à une liste pour la gestion
            this.gameNotes = this.gameNotes || [];
            this.gameNotes.push({
                mesh: note,
                data: noteData,
                hit: false
            });
        });
    }
}
```

## 🔄 Conversion Grille 4×3 → 4×2

### Logique de Conversion

```
Beat Saber (4×3)          Ton Jeu (4×2)
┌─────────────────┐       ┌─────────────────┐
│ Y=2  Haut       │  →    │ Y=1  Haut       │
│ Y=1  Milieu     │  →    │ Y=0  Bas        │
│ Y=0  Bas        │  →    │ Y=0  Bas        │
└─────────────────┘       └─────────────────┘
```

### Positions 3D Babylon.js

```javascript
// Grille 4×2 → Positions Monde
const positions = {
    // Ligne du bas (Y=0) → hauteur 0.8
    '(0,0)': { x: -1.5, y: 0.8, z: 0 },
    '(1,0)': { x: -0.5, y: 0.8, z: 0 },
    '(2,0)': { x:  0.5, y: 0.8, z: 0 },
    '(3,0)': { x:  1.5, y: 0.8, z: 0 },

    // Ligne du haut (Y=1) → hauteur 2.0
    '(0,1)': { x: -1.5, y: 2.0, z: 0 },
    '(1,1)': { x: -0.5, y: 2.0, z: 0 },
    '(2,1)': { x:  0.5, y: 2.0, z: 0 },
    '(3,1)': { x:  1.5, y: 2.0, z: 0 }
};
```

### Test de la Conversion

```bash
# Lancer le test visuel
npm run dev
# → http://localhost:5173/src/test-grid-conversion.html
```

## 🔧 API Reference

### BeatSaverService

#### Méthodes principales

- `searchMaps(query, page, sortOrder)` - Recherche générale
- `getLatestMaps(page)` - Maps récentes
- `getMapById(mapId)` - Map spécifique
- `searchByGenre(genre, page)` - Recherche par genre
- `downloadMapData(hash)` - URL de téléchargement
- `clearCache()` - Vider le cache
- `getCacheStats()` - Stats du cache

#### Format des données retournées

```javascript
{
    id: "2f2a4",
    name: "Song Title",
    metadata: {
        songName: "Artist - Song",
        songAuthorName: "Artist",
        levelAuthorName: "Mapper",
        bpm: 128,
        duration: 180
    },
    version: {
        hash: "abc123...",
        downloadUrl: "https://cdn.beatsaver.com/...",
        previewUrl: "https://cdn.beatsaver.com/preview/...",
        coverUrl: "https://cdn.beatsaver.com/.../cover.jpg"
    },
    difficulties: [...],
    stats: { upvotes, downloads, score }
}
```

### BeatMapParser

#### Méthodes principales

- `parseInfo(infoData)` - Parser info.dat
- `parseDifficulty(diffData)` - Parser fichier difficulté
- `optimizeForGameplay(parsed, bpm)` - Optimiser pour 3D
- `generateDifficultyStats(gameplay)` - Stats de difficulté

#### Données optimisées pour le gameplay

```javascript
{
    bpm: 128,
    secondsPerBeat: 0.469,
    notes: [{
        time: 1.875,           // Temps en secondes
        x: 1, y: 0,           // Position grille Beat Saber
        type: 0,              // 0=rouge, 1=bleu
        direction: 1,         // Direction de coupe
        position3D: {         // Position Babylon.js
            x: -0.5,
            y: 0.5,
            z: 0
        }
    }],
    obstacles: [...],
    bombs: [...]
}
```

## 🧪 Test et Développement

### Lancer la page de test

```bash
npm run dev
# Puis aller sur http://localhost:5173/src/test-beatsaver.html
```

### Exemple complet

```javascript
import { beatSaverExample } from './examples/BeatSaverExample.js';

// Lance tous les exemples
await beatSaverExample.fullExample();
```

## 🔮 Prochaines Étapes

1. **Téléchargement ZIP** : Intégrer JSZip pour extraire les vrais fichiers .dat
2. **Audio** : Gérer la synchronisation audio avec Web Audio API
3. **Interface** : Créer un sélecteur de maps dans ton jeu
4. **Cache persistant** : Utiliser IndexedDB pour persister le cache
5. **Mode offline** : Sauvegarder des maps localement

## 💡 Tips

- **Performance** : Utilise le cache pour éviter les appels API répétés
- **CORS** : L'API BeatSaver supporte CORS, pas de problème côté client
- **Rate Limiting** : Respecte les limites de l'API (évite le spam)
- **Erreurs** : Gère les cas où les maps sont supprimées/indisponibles

Bon développement ! (≧◡≦)