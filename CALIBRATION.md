# 🎯 Système de Calibration Audio

## Problème Résolu

Les jeux de rythme nécessitent une synchronisation PARFAITE entre l'audio et les notes visuelles. Les navigateurs web peuvent avoir des latences audio variables (typiquement 20-200ms) selon:
- Le système audio de l'OS
- Les drivers audio
- Le buffer audio du navigateur
- La charge système

Ce système permet de compenser automatiquement cette latence.

## Utilisation

### 1. Ouvrir la Console du Navigateur
`F12` ou `Ctrl+Shift+I` → onglet "Console"

### 2. Lancer le Jeu et Observer
Les logs montrent:
```
🎵 PREMIÈRE NOTE SPAWN
   Audio brut: 0.123s | Offset: +0.000s | Audio final: 0.123s
   Note temps: 0.857s | Lookahead: 0.734s

🎯 NOTE EN ZONE FRAPPE - Audio: 0.857s | Note attendue: 0.857s | Delta: +0.000s
```

Le **Delta** indique le décalage:
- **Positif** (ex: +0.100s) = Notes arrivent 100ms APRÈS le beat → **audio en retard**
- **Négatif** (ex: -0.100s) = Notes arrivent 100ms AVANT le beat → **audio en avance**

### 3. Ajuster l'Offset

Dans la console:

```javascript
// Notes trop tard (audio en retard) → Valeur NÉGATIVE pour accélérer
game.setAudioOffset(-100)  // Avance les notes de 100ms

// Notes trop tôt (audio en avance) → Valeur POSITIVE pour ralentir
game.setAudioOffset(50)    // Retarde les notes de 50ms

// Affiner par petits incréments
game.setAudioOffset(-120)  // -100ms pas assez, essayer -120ms
game.setAudioOffset(-80)   // -100ms trop, essayer -80ms

// Vérifier l'offset actuel
game.getAudioOffset()      // Retourne la valeur en ms
```

### 4. Trouver la Valeur Parfaite

1. Jouer quelques secondes
2. Observer le Delta dans les logs `🎯 NOTE EN ZONE FRAPPE`
3. Si Delta est positif → `game.setAudioOffset(-[Delta en ms])`
4. Si Delta est négatif → `game.setAudioOffset(+[Delta en ms])`
5. Répéter jusqu'à Delta proche de 0.000s

**Exemple:**
```
🎯 NOTE EN ZONE FRAPPE - Audio: 1.234s | Note attendue: 1.134s | Delta: +0.100s
// Delta +100ms = notes en retard
> game.setAudioOffset(-100)
```

## Comprendre les Logs

### Au Spawn de la Première Note
```
🎵 PREMIÈRE NOTE SPAWN
   Audio brut: 0.015s      // Temps audio HTML5 réel
   Offset: -0.100s         // Compensation appliquée
   Audio final: -0.085s    // Temps utilisé pour calculs (brut + offset)
   Note temps: 0.857s      // Quand la note doit être frappée
   Lookahead: 0.942s       // Temps avant frappe (2.0s lookahead)
```

### En Zone de Frappe
```
🎯 NOTE EN ZONE FRAPPE
   Audio: 0.857s           // Temps audio actuel (avec offset)
   Note attendue: 0.857s   // Temps prévu pour cette note
   Delta: +0.000s          // Différence (idéalement 0.000s)
```

### Notes Manquées
```
❌ Note manquée: 0.857s (audio: 0.907s)
// Indique que la note était prévue à 0.857s mais l'audio était à 0.907s
// Delta de +50ms → notes en retard → utiliser offset NÉGATIF
```

## Valeurs Typiques

- **Casque filaire**: 0 à -20ms
- **Casque Bluetooth**: -100 à -200ms
- **Haut-parleurs PC**: -20 à -50ms
- **Haut-parleurs externes**: -50 à -150ms

## Persistance

⚠️ L'offset est réinitialisé à chaque rechargement de page. Pour un système permanent, il faudrait:
- Sauvegarder dans localStorage
- Ajouter un menu de calibration en jeu
- Détecter automatiquement la latence

## API Technique

```typescript
// AudioManager.js
audioManager.setAudioOffset(offsetSeconds: number)  // Offset en secondes
audioManager.getAudioOffset(): number               // Retourne offset en secondes
audioManager.getCurrentTime(): number               // Temps avec offset appliqué
audioManager.getRawCurrentTime(): number            // Temps brut sans offset

// BeatBornerGame.js
game.setAudioOffset(offsetMs: number)  // Offset en millisecondes (plus pratique)
game.getAudioOffset(): number          // Retourne offset en millisecondes
```

## Comment Ça Marche

```javascript
// Dans NotesManager.update()
const currentAudioTime = audioManager.getCurrentTime();
// = audioManager.getRawCurrentTime() + audioManager.audioOffset

const timeUntilHit = noteTime - currentAudioTime;
// Si offset négatif → currentAudioTime plus petit → timeUntilHit plus grand → notes spawn plus tôt
// Si offset positif → currentAudioTime plus grand → timeUntilHit plus petit → notes spawn plus tard

const targetZ = cameraZ + (timeUntilHit * cameraSpeedPerSecond);
// Position basée sur temps restant jusqu'à la frappe
```

## Troubleshooting

**Q: Les notes sont toujours en retard/avance même avec offset**
A: Vérifier que l'offset a bien été appliqué avec `game.getAudioOffset()`

**Q: Le Delta varie beaucoup (+50ms, -20ms, +30ms...)**
A: Latence variable = problème système (fermer applications, redémarrer navigateur)

**Q: Pas de logs dans la console**
A: Vérifier que le jeu est bien lancé (bouton Play cliqué)

**Q: Comment sauvegarder mon offset?**
A: Actuellement manuel, noter la valeur et la rentrer à chaque session