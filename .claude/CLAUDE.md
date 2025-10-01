# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beat Borner** is a Beat Saber-inspired arcade rhythm game built with **Babylon.js 7** for 3D rendering and **SvelteKit 2** for UI/routing. Players hit notes synchronized to music using keyboard controls on a 4×2 grid, with maps loaded from the BeatSaver API.

## Development Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Build production bundle (adapter-static)
npm run preview  # Preview production build locally
npm run check    # Run svelte-check for type/syntax validation
```

## Architecture Overview

### Separation of Concerns

**Frontend (Svelte)**: Handles UI components, routing, and reactive state management
**Game Engine (Babylon.js)**: Manages 3D scene, notes, audio, and gameplay logic

### Core Orchestration Pattern

`BeatBornerGame.js` orchestrates all game systems through dependency injection of specialized managers:

- **SceneManager**: Babylon.js scene initialization and render loop
- **CameraController**: Camera movement and positioning
- **TunnelGenerator**: Procedural tunnel background generation
- **NotesManager**: Note spawning, hit detection, and lifecycle
- **AudioManager**: Audio playback with offset compensation for latency
- **LightingManager**: Scene lighting setup
- **InputManager**: Keyboard input handling with grid mapping
- **GridHelper**: Visual grid guides and hit zone display

### Data Flow

```
BeatSaverService → BeatMapParser → BeatBornerGame
                                        ↓
                    [Managers work independently via callbacks]
                                        ↓
                    Svelte UI ← callbacks ← BeatBornerGame
```

### Key Files

- `src/lib/game/BeatBornerGame.js` - Main orchestrator class
- `src/lib/game/GameConfig.js` - Centralized configuration (timing, speeds, grid layout, controls)
- `src/services/BeatSaverService.js` - API client for fetching Beat Saber maps
- `src/services/BeatMapParser.js` - Parses `.dat` files from BeatSaver zips into gameplay data

## Critical Concepts

### Audio Synchronization System

Web audio has inherent latency (20-200ms) that varies by system. The game compensates via `AudioManager.setAudioOffset(seconds)`:

- **Negative offset** = notes spawn earlier (compensates for delayed audio)
- **Positive offset** = notes spawn later (compensates for early audio)
- Access via console: `game.setAudioOffset(ms)` / `game.getAudioOffset()`
- See `CALIBRATION.md` for detailed calibration workflow

### Timing Architecture

```javascript
// Key timing constants (GameConfig.js)
lookaheadTime: 6.0,      // Notes appear 6s before hit
hitWindow: 0.15,         // ±150ms hit tolerance
audioStartDelay: 3.0,    // 3s countdown before music starts

// NotesManager calculates spawn based on:
const timeUntilHit = noteTime - audioManager.getCurrentTime();
const targetZ = cameraZ + (timeUntilHit * cameraSpeedPerSecond);
```

### Grid Mapping System

4×2 grid controlled by `GameConfig.keyBindings`:

```
Row 1 (top):    R(x:2) | T(x:3) | I(x:0) | O(x:1)
Row 0 (bottom): F(x:2) | G(x:3) | K(x:0) | L(x:1)
```

Babylon.js world positions: `grid.positions.x = [-1.5, -0.5, 0.5, 1.5]`, `grid.positions.y = [0.8, 2.0]`

### Note Lifecycle States

1. **Spawned**: Created beyond camera view at `lookaheadTime` distance
2. **Active**: Traveling toward hit zone
3. **Hittable**: Within `hitWindow` (±150ms) of expected time
4. **Hit**: Player pressed correct key in window → destroy with effect
5. **Missed**: Passed hit zone + `despawnTime` → destroy silently

## Important Implementation Details

- **JSZip** is used to extract `.dat` and audio files from BeatSaver zips in-browser
- **songTimeOffset** from `info.dat` is parsed in milliseconds and automatically applied as audio offset
- All managers receive **callbacks** object in constructor for UI communication (e.g., `onNoteHit`, `onGameStart`)
- Camera moves forward continuously; notes/tunnel move backward relatively
- Pause system (`game.pauseGame()`/`game.resumeGame()`) exists but currently requires Escape key integration

## Debugging & Calibration

Enable detailed timing logs in console via `GameConfig.enableDebugLogs: true`:

```
🎵 PREMIÈRE NOTE SPAWN - Audio brut: X.XXXs | Offset: ±X.XXXs | Audio final: X.XXXs
🎯 NOTE EN ZONE FRAPPE - Audio: X.XXXs | Note attendue: X.XXXs | Delta: ±X.XXXs
❌ Note manquée: X.XXXs (audio: X.XXXs)
```

Delta indicates sync accuracy:
- **Positive delta** = notes late → use negative offset
- **Negative delta** = notes early → use positive offset

## SvelteKit Structure

```
src/routes/
  +layout.svelte         # Global layout with Tailwind/DaisyUI
  +page.svelte           # Main menu (map selection)
  game/+page.svelte      # Game canvas with callbacks to UI
```

Uses `@sveltejs/adapter-static` for deployment as static site.

## Configuration Tuning

All gameplay constants live in `GameConfig.js`:

- **Difficulty**: Adjust `hitWindow` (smaller = harder), `lookaheadTime` (less warning time)
- **Speed**: Modify `cameraSpeed` (higher = faster scrolling)
- **Controls**: Remap keys in `keyBindings` object
- **Visual**: Change `noteSize`, `colors`, `emissiveIntensity`

## Known Limitations

- No persistent audio offset storage (resets on page reload)
- Single difficulty support (loads first difficulty from map)
- No scoring system implemented yet
- No obstacles/bombs support (only notes)
