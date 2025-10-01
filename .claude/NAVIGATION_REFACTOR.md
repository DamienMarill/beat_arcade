# Cahier des Charges - Refonte du Système de Navigation UI

## 📋 Contexte

Le système de navigation actuel présente plusieurs problèmes critiques:
- Navigation custom dans MapSelector qui entre en conflit avec NavigationManager
- Timeouts magiques (`setTimeout(100)`) pour gérer l'ouverture des dialogs
- Double écoute clavier (NavigationManager + composants individuels)
- Logique complexe et fragile dans les `$effect` de +page.svelte
- Incohérence entre composants (certains suivent le pattern, d'autres pas)

## 🎯 Objectifs

### Cohérence
Tous les composants UI utilisent le **même système de navigation** sans exception.

### Simplicité
- Logique centralisée dans NavigationManager
- Pas de duplication de code
- Pas de timeouts magiques
- Un seul listener clavier global

### Fiabilité
- Pas de race conditions
- Activation/désactivation automatique
- Gestion propre du lifecycle

### Extensibilité
Facile d'ajouter de nouveaux écrans ou modals sans toucher au core.

---

## ⚠️ RÈGLE D'OR: Isolation Stricte des Layers

### Principe Fondamental

**Les modals = pages à part entière**

Quand une modal est ouverte, elle doit:
- ✅ **Masquer complètement** la navigation de ce qu'il y a derrière
- ✅ **Intercepter toutes les touches** sans exception
- ✅ **Empêcher tout débordement** vers les layers inférieurs

Quand un composant est invisible (`visible=false`), il doit:
- ❌ **Ne JAMAIS réagir** aux touches clavier
- ❌ **Ne JAMAIS écouter** d'événements
- ❌ **Ne JAMAIS être dans** la navigation active

### Exemples Concrets

**❌ MAUVAIS (état actuel):**
```
Game actif + Modal Pause ouverte
    ↓
Utilisateur appuie sur "R" (valider)
    ↓
❌ GameContext réagit AUSSI (bug!)
❌ PauseContext réagit
    ↓
CONFLIT: Deux contexts réagissent en même temps
```

**✅ BON (avec stack):**
```
Stack: [GameContext, PauseContext]
              ↑           ↑
          inactif      ACTIF
    ↓
Utilisateur appuie sur "R" (valider)
    ↓
✅ Seul PauseContext.handleKey() est appelé
✅ GameContext ne reçoit RIEN
    ↓
Aucun conflit possible
```

---

## 🏗️ Architecture Proposée

### 1. System de Contexts

Chaque écran/modal a un **NavigationContext** dédié qui définit:
- Comment naviguer (haut/bas, gauche/droite, grille, etc.)
- Quels éléments sont navigables
- Comment gérer les touches spéciales

**Contexts disponibles:**
```
MenuContext          → Menu principal (navigation simple haut/bas)
MapSelectorContext   → Sélecteur de maps (tabs + liste)
PauseContext         → Modal pause (navigation simple haut/bas)
GameContext          → En jeu (pas de navigation UI, juste pause)
```

### 2. NavigationManager Refactoré

Le NavigationManager devient un **routeur de navigation avec stack**:
- Un seul listener clavier global
- Maintient une **stack de contexts** (dernier = actif)
- Route les touches **uniquement vers le context au sommet de la stack**
- Empêche tout débordement vers les layers inférieurs

```javascript
class NavigationManager {
  contextStack: NavigationContext[]  // Stack: [menu, mapSelector] → mapSelector actif

  pushContext(context: NavigationContext): void   // Ajouter et activer
  popContext(): void                              // Retirer le sommet et réactiver le précédent
  clearAllContexts(): void                        // Vider la stack
  
  handleKeyDown(event): void  // Route UNIQUEMENT vers stack.top().handleKey()
  
  get activeContext(): NavigationContext | null  // Retourne stack.top()
}
```

### 3. NavigationContext (nouvelle abstraction)

```javascript
class NavigationContext {
  name: string
  isModal: boolean  // true pour PauseContext, MapSelectorContext

  // Lifecycle
  activate(): void      // Appelé quand le context devient actif (au sommet de la stack)
  deactivate(): void    // Appelé quand le context n'est plus au sommet (pause ou destruction)
  reactivate(): void    // Appelé quand le context redevient actif après une modal fermée
  refresh(): void       // Appelé pour redécouvrir les éléments

  // Navigation
  handleKey(key: string): boolean  // Return true si consommé
                                   // Appelé UNIQUEMENT si le context est au sommet de la stack

  // State
  getFocusedElement(): HTMLElement | null
}
```

### 4. Implémentation des Contexts

#### MenuContext
- **Éléments**: Boutons `[data-nav-item]` dans le menu
- **Navigation**: Haut/Bas (Z/S ou Flèches)
- **Validation**: R/I
- **Focus initial**: Premier bouton

#### MapSelectorContext
- **Éléments**: Tabs + MapCards
- **Navigation**:
  - Gauche/Droite (Q/D ou Flèches) → Changer d'onglet
  - Haut/Bas (Z/S ou Flèches) → Naviguer dans les maps
- **Validation**: R/I → Sélectionner la map
- **Annulation**: W/B ou X/N → Retour menu
- **Focus initial**: Première map de l'onglet actif

#### PauseContext
- **Éléments**: Boutons `[data-nav-item]` dans la modal
- **Navigation**: Haut/Bas (Z/S ou Flèches)
- **Validation**: R/I
- **Raccourci**: X/N → Fermer pause (= reprendre)
- **Focus initial**: Bouton "Reprendre"

#### GameContext
- **Éléments**: Aucun (navigation désactivée)
- **Touches**: X/N → Ouvrir pause
- **Comportement**: Écoute minimale, juste pour la pause

---

## 🔄 Flux de Données

### Ouverture d'une page/modal

```
Composant devient visible (visible=true)
    ↓
Appelle navManager.pushContext(monContext)
    ↓
NavigationManager push le context sur la stack
    ↓
Context précédent (si existe) → deactivate() MAIS reste dans la stack
    ↓
Nouveau context → activate() → découvre les éléments, set focus initial
    ↓
Utilisateur appuie sur une touche
    ↓
NavigationManager.handleKeyDown() → route UNIQUEMENT vers stack.top().handleKey()
    ↓
Context traite la touche (navigation, validation, etc.)
    ↓
Context déclenche les callbacks vers le composant
```

### Fermeture d'une page/modal

```
Composant devient invisible (visible=false)
    ↓
Appelle navManager.popContext()
    ↓
NavigationManager pop le context du sommet
    ↓
Context au sommet → deactivate() → cleanup complet
    ↓
Context précédent dans la stack → reactivate() → redécouvre éléments, restore focus
    ↓
IMPORTANT: L'ancien context ne réagissait PAS aux touches pendant que la modal était ouverte
```

---

## 🎮 Comportements Attendus

### Menu Principal
```
ZQSD/Flèches Haut-Bas  → Naviguer entre les boutons
R/I                    → Valider le bouton sélectionné
Focus initial          → "▶️ JOUER"
```

### Sélecteur de Maps
```
Q/Gauche, D/Droite     → Changer d'onglet (Récents ↔ Plus Joués)
Z/Haut, S/Bas          → Naviguer dans les maps
R/I                    → Sélectionner la map
W/B ou X/N             → Annuler (retour menu)
Focus initial          → Première map de l'onglet actif
Visual feedback        → Ring primary sur la map sélectionnée
```

### Modal Pause
```
ZQSD/Flèches Haut-Bas  → Naviguer entre les boutons
R/I                    → Valider le bouton sélectionné
X/N                    → Raccourci reprendre (= fermer modal)
Focus initial          → "▶️ REPRENDRE"
```

### En Jeu
```
X/N                    → Ouvrir pause
Toutes autres touches  → Ignorées par la navigation
```

### Transitions
- **Pas de timeouts**: Activation synchrone quand le composant est visible
- **Pas de double écoute**: Un seul listener global
- **Cleanup automatique**: Context se désenregistre proprement
- **Refresh intelligent**: Context se met à jour quand le DOM change

---

## 🛠️ Modifications Techniques

### Fichiers à modifier

#### `src/lib/ui/NavigationManager.js`
- Refactorer en routeur de contexts
- Supprimer la logique de découverte d'éléments (déléguée aux contexts)
- Garder seulement le listener global et le routing

#### `src/lib/ui/contexts/` (nouveau dossier)
- `NavigationContext.js` (classe abstraite)
- `MenuContext.js`
- `MapSelectorContext.js`
- `PauseContext.js`
- `GameContext.js`

#### `src/routes/+page.svelte`
- Simplifier les `$effect`
- Utiliser `navManager.setContext()` au lieu de `enable()`/`disable()`
- Créer les instances de contexts au montage

#### `src/lib/components/MapSelector.svelte`
- **Supprimer** `handleCustomNavigation` (listener custom)
- **Supprimer** l'`$effect` qui écoute les touches
- Utiliser le MapSelectorContext via des callbacks

#### `src/lib/components/PauseModal.svelte`
- Garder les `data-nav-item`
- Peut rester simple (déjà compatible)

---

## 🚫 Hors Scope (Non-Objectifs)

- Refactoriser le game engine (Babylon.js)
- Modifier le système de routing SvelteKit
- Changer les touches clavier (garder ZQSD + RTFGIKOL + WBXN)
- Ajouter de nouvelles fonctionnalités (on reste sur la navigation)
- Modifier les composants visuels (GameUI, LoadingScreen, etc.)

---

## ✅ Critères de Validation

### Fonctionnels
- ✅ Navigation fluide sans conflits entre composants
- ✅ Pas de timeouts nécessaires pour l'activation
- ✅ Tous les composants suivent le même pattern
- ✅ Transitions menu ↔ game ↔ pause sans bugs

### Techniques
- ✅ Un seul listener clavier global
- ✅ Pas de double écoute
- ✅ Cleanup automatique du lifecycle
- ✅ Code testable et extensible

### Performance
- ✅ Activation instantanée (pas de setTimeout)
- ✅ Pas de memory leaks (removeEventListener propre)
- ✅ Refresh intelligent du DOM

---

## 📝 Notes d'Implémentation

### Pattern Svelte recommandé

**Pour une page normale:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { navManager } from '$lib/ui/NavigationManager';
  import { MenuContext } from '$lib/ui/contexts/MenuContext';

  let context;

  onMount(() => {
    context = new MenuContext({
      onSelect: handleMenuSelect
    });
  });

  // Activer quand visible, désactiver quand invisible
  $effect(() => {
    if (visible) {
      navManager.pushContext(context);  // Devient le context actif
    } else {
      navManager.popContext();          // Retire de la stack
    }
  });
</script>
```

**Pour une modal (CRITIQUE):**
```svelte
<script>
  import { onMount } from 'svelte';
  import { navManager } from '$lib/ui/NavigationManager';
  import { MapSelectorContext } from '$lib/ui/contexts/MapSelectorContext';

  let { visible = false } = $props();
  let context;

  onMount(() => {
    context = new MapSelectorContext({
      onSelect: handleMapSelect,
      onCancel: handleCancel
    });
  });

  // IMPORTANT: Le context ne s'active QUE si visible=true
  $effect(() => {
    if (visible) {
      // Push sur la stack → masque le context précédent (menu, game, etc.)
      navManager.pushContext(context);
    } else {
      // Pop de la stack → réactive le context précédent
      navManager.popContext();
    }
    
    // Cleanup automatique: si le composant unmount, retirer le context
    return () => {
      if (navManager.activeContext === context) {
        navManager.popContext();
      }
    };
  });
</script>

<!-- Le composant ne doit RIEN écouter lui-même, tout passe par le context -->
```

### Gestion des Dialogs

Les dialogs HTML natifs (`<dialog>`) s'ouvrent/ferment de manière synchrone, donc:
- Pas besoin de timeouts
- Le context peut découvrir les éléments immédiatement
- Focus automatique au bon moment

### Garanties d'Isolation

**Le système DOIT garantir:**

1. **Un seul context actif à la fois**
   - Seulement `stack.top()` reçoit les événements clavier
   - Tous les autres contexts dans la stack sont en pause

2. **Pas de fuites de touches**
   - Si MapSelectorContext est actif, GameContext ne voit RIEN
   - Si PauseContext est actif, GameContext ne voit RIEN

3. **Cleanup automatique**
   - Si un composant unmount avec son context encore actif → popContext() auto
   - Si visible=false → popContext() immédiat

4. **Pas de double écoute**
   - NavigationManager: UN SEUL `addEventListener('keydown')`
   - Composants: ZÉRO `addEventListener` (tout passe par contexts)

---

## 🎨 Visual Feedback

Garder le système actuel de classes CSS:
- `.nav-focused` → Bordure/ring primary sur l'élément focusé
- `data-nav-focused="true"` → Attribut pour le debug

---

## 🔧 Migration Progressive

1. ✅ Créer l'architecture des contexts (abstractions)
2. ✅ Refactorer NavigationManager en routeur
3. ✅ Implémenter MenuContext (simple)
4. ✅ Implémenter PauseContext (simple)
5. ✅ Implémenter MapSelectorContext (complexe)
6. ✅ Implémenter GameContext (minimal)
7. ✅ Adapter +page.svelte
8. ✅ Adapter MapSelector.svelte
9. ✅ Tests manuels de toutes les transitions
10. ✅ Cleanup du code obsolète

---

**Prêt à valider et démarrer l'implémentation ?** (๑•̀ㅂ•́)و✧
