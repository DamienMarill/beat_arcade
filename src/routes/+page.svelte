<script>
	import { onMount, onDestroy } from 'svelte';
	import { NavigationManager } from '$lib/ui/NavigationManager.js';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import PlayButton from '$lib/components/PlayButton.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	import PauseModal from '$lib/components/PauseModal.svelte';
	import MapSelector from '$lib/components/MapSelector.svelte';
	import GlobalKeyboard from '$lib/components/GlobalKeyboard.svelte';
	import GradeDisplay from '$lib/components/GradeDisplay.svelte';
	import { BeatBornerGame } from '$lib/game/BeatBornerGame.js';
	import { GameConfig } from '$lib/game/GameConfig.js';

	// États de l'application
	let currentScreen = 'menu'; // 'menu' | 'game' (mapSelection est une modal dans game)

	// Navigation
	let navManager;

	// Game
	let canvas;
	let game;
	let selectedMap = null;
	let showLoading = false;
	let showPlayButton = false;
	let showGameUI = false;
	let showPauseModal = false;
	let mapInfo = null;
	let songName = 'Loading...';
	let gameTime = '00:00';
	let notesCount = 0;
	let gameTimeInterval;
	
	// Grade display
	let gradeDisplayComponent;
	
	// Score tracking
	let score = 0;
	let combo = 0;
	let multiplier = 1.0;

	onMount(() => {
		// Créer le manager de navigation
		navManager = new NavigationManager();
		navManager.enable('[data-nav-item]');

		// Listener pour X/N pendant le jeu (seulement côté client)
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleGamePauseKey);
		}
	});

	onDestroy(() => {
		if (game) {
			game.dispose();
		}
		if (gameTimeInterval) {
			clearInterval(gameTimeInterval);
		}
		if (navManager) {
			navManager.dispose();
		}
		// Cleanup listener (seulement côté client)
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleGamePauseKey);
		}
	});

	let showMapSelector = false;

	function navigateToMapSelection() {
		// Aller sur l'écran de jeu (tunnel 3D) puis afficher la modal
		currentScreen = 'game';
		navManager.disable();

		// Initialiser le jeu d'abord (tunnel 3D)
		setTimeout(() => {
			if (canvas && !game) {
				initGameWithoutMap();
			}
			// Puis afficher le sélecteur après initialisation
			setTimeout(() => {
				showMapSelector = true;
			}, 100);
		}, 100);
	}

	async function initGameWithoutMap() {
		// Initialiser seulement la scène 3D sans charger de map
		const { SceneManager } = await import('$lib/game/SceneManager.js');
		const { CameraController } = await import('$lib/game/CameraController.js');
		const { TunnelGenerator } = await import('$lib/game/TunnelGenerator.js');
		const { LightingManager } = await import('$lib/game/LightingManager.js');

		const sceneManager = new SceneManager(canvas);
		const scene = sceneManager.getScene();
		const cameraController = new CameraController(scene);
		const lightingManager = new LightingManager(scene);
		const tunnelGenerator = new TunnelGenerator(scene, cameraController);

		// Démarrer l'animation du tunnel
		cameraController.start();
		sceneManager.registerBeforeRender(() => {
			cameraController.update();
			tunnelGenerator.update();
			tunnelGenerator.updateMaterialsAnimation();
		});
	}

	function handleMapSelected(map) {
		selectedMap = map;
		showMapSelector = false;

		// Charger la map et démarrer directement le jeu
		setTimeout(() => {
			if (!game) {
				initGameAndStart();
			}
		}, 100);
	}

	function handleCancelMapSelection() {
		showMapSelector = false;
		navigateToMenu();
	}

	function navigateToMenu() {
		// Cleanup du jeu
		if (game) {
			game.dispose();
			game = null;
		}
		if (gameTimeInterval) {
			clearInterval(gameTimeInterval);
			gameTimeInterval = null;
		}

		// Réinitialiser les états
		showLoading = false;
		showPlayButton = false;
		showGameUI = false;
		showPauseModal = false;
		
		// Réinitialiser le score
		score = 0;
		combo = 0;
		multiplier = 1.0;

		// Retour au menu
		currentScreen = 'menu';

		// Redécouvrir les éléments du menu et réactiver la navigation
		setTimeout(() => {
			navManager.refresh('[data-nav-item]');
		}, 100);
	}

	async function initGameAndStart() {
		// Charger la map sélectionnée
		const mapId = selectedMap?.id || '3ba6'; // Fallback sur la map par défaut

		game = new BeatBornerGame(canvas, {
			onLoadingStart: () => {
				showLoading = true;
			},
			onMapInfoLoaded: (info) => {
				mapInfo = info;
				songName = info.songName;
			},
			onLoadingComplete: (info) => {
				showLoading = false;
				notesCount = info.notesCount;
				// Démarrer automatiquement le jeu
				setTimeout(() => {
					if (game) {
						game.startGame();
					}
				}, 500);
			},
			onLoadingError: (error) => {
				console.error('Erreur:', error);
				showLoading = false;
				alert('Erreur de chargement de la map');
			},
			onGameStart: () => {
				showPlayButton = false;
				showGameUI = true;
				// DÉSACTIVER complètement la navigation pendant le jeu
				navManager.disable();
				startGameTimeUpdate();
			},
			onGamePause: () => {
				showPauseModal = true;
			},
			onGameResume: () => {
				showPauseModal = false;
			},
			onNoteHit: (grade, timeOffset, gridX, gridY) => {
				// Afficher le grade visuel près de la case
				displayGrade(grade, gridX, gridY);
			},
			onNoteMiss: (note, gridX, gridY) => {
				// Afficher "MANQUÉ" près de la case
				displayGrade('miss', gridX, gridY);
			},
			onScoreUpdate: (data) => {
				// Mettre à jour le score, combo et multiplicateur
				score = data.score;
				combo = data.combo;
				multiplier = data.multiplier;
			},
			onComboUpdate: (comboValue, multiplierValue) => {
				combo = comboValue;
				multiplier = multiplierValue;
			},
			onComboBreak: (previousCombo) => {
				// Réinitialiser le combo à 0
				combo = 0;
				multiplier = 1.0;
			}
		}, mapId);

		// Exposer game globalement pour calibration via console
		if (typeof window !== 'undefined') {
			window.game = game;
			console.log('🎮 Game exposé globalement. Utilisez:');
			console.log('   game.setAudioOffset(-100) // Avancer notes de 100ms');
			console.log('   game.setAudioOffset(50)   // Retarder notes de 50ms');
		}
	}

	function handlePlay() {
		if (game) {
			game.startGame();
		}
	}

	function startGameTimeUpdate() {
		gameTimeInterval = setInterval(() => {
			if (game) {
				gameTime = game.getGameTime();
			}
		}, 1000);
	}

	function handleResume() {
		if (game) {
			game.resumeGame();
		}
	}

	function handleQuitFromPause() {
		navigateToMenu();
	}

	function displayGrade(grade, gridX, gridY) {
		if (!gradeDisplayComponent || !game) return;
		
		// Convertir les coordonnées de grille en coordonnées écran
		const screenPos = convertGridToScreen(gridX, gridY);
		if (screenPos) {
			gradeDisplayComponent.showGrade(grade, screenPos.x, screenPos.y);
		}
	}
	
	function convertGridToScreen(gridX, gridY) {
	if (!game || !canvas) return null;
	
	const scene = game.sceneManager?.getScene();
	const camera = game.cameraController?.getCamera();
	if (!scene || !camera) return null;
	
	// Accéder à BABYLON via le scene (pas de variable globale en Svelte)
	const engine = scene.getEngine();
	const BABYLON = scene.getEngine().constructor.prototype.constructor;
	
	// Récupérer les positions monde de la grille
	const gridPositions = GameConfig.grid.positions;
	const cameraZ = game.cameraController.getPositionZ();
	const hitBarZ = cameraZ + GameConfig.hitDistance;
	
	// Position 3D de la case de grille
	const worldPos = {
		x: gridPositions.x[gridX],
		y: gridPositions.y[gridY],
		z: hitBarZ
	};
	
	// Convertir en coordonnées écran via les méthodes du scene
	const viewport = camera.viewport.toGlobal(
		engine.getRenderWidth(),
		engine.getRenderHeight()
	);
	
	// Utiliser la projection matricielle directement
	const transformMatrix = scene.getTransformMatrix();
	const worldMatrix = scene.getEngine().getIdentityMatrix ? scene.getEngine().getIdentityMatrix() : null;
	
	// Projection manuelle si BABYLON n'est pas accessible
	const viewProjection = transformMatrix;
	
	// Créer un vecteur 4D pour la projection homogène
	const x = worldPos.x;
	const y = worldPos.y;
	const z = worldPos.z;
	
	// Transformation manuelle (projection perspective)
	const m = viewProjection.m;
	const w = x * m[3] + y * m[7] + z * m[11] + m[15];
	
	if (Math.abs(w) < 0.0001) return null;
	
	const screenX = (x * m[0] + y * m[4] + z * m[8] + m[12]) / w;
	const screenY = (x * m[1] + y * m[5] + z * m[9] + m[13]) / w;
	
	// Convertir de NDC [-1,1] vers pixels écran
	const finalX = viewport.x + (1 + screenX) * viewport.width * 0.5;
	const finalY = viewport.y + (1 - screenY) * viewport.height * 0.5;
	
	return { x: finalX, y: finalY };
}

	function handleGamePauseKey(event) {
		const key = event.key.toLowerCase();
		// Utiliser les touches configurées dans GameConfig pour la pause
		if (GameConfig.navigationBindings.pause && GameConfig.navigationBindings.pause.includes(key) && currentScreen === 'game' && game && game.isPlaying && !showPauseModal) {
			event.preventDefault();
			game.pauseGame();
		}
	}
</script>

{#if currentScreen === 'menu'}
	<!-- Menu Principal -->
	<div data-theme="beatborner" class="min-h-screen bg-gradient-beat flex items-center justify-center overflow-hidden">
		<div class="text-center text-base-content animate-fade-in">
			<h1 class="text-6xl font-bold mb-10 text-neon animate-pulse-glow">
				Beat Borner
			</h1>
			<p class="text-3xl mb-20 opacity-90 font-medium">
				Arcade Rhythm Game
			</p>

			<div class="flex flex-col gap-6 mb-12">
				<button
					data-nav-item
					class="btn btn-primary btn-lg px-16 py-4 text-xl font-bold rounded-full shadow-neon hover:scale-105 transition-all duration-300 animate-bounce-in"
					on:click={navigateToMapSelection}
				>
					▶️ JOUER
				</button>

				<button
					data-nav-item
					class="btn btn-outline btn-secondary btn-lg px-16 py-4 text-xl font-bold rounded-full"
					on:click={() => alert('Paramètres - En développement')}
				>
					⚙️ PARAMÈTRES
				</button>

				<button
					data-nav-item
					class="btn btn-outline btn-accent btn-lg px-16 py-4 text-xl font-bold rounded-full"
					on:click={() => alert('Scores - En développement')}
				>
					🏆 SCORES
				</button>
			</div>

			<div class="text-sm opacity-70 mt-8">
				<p>Propulsé par Babylon.js & SvelteKit</p>
			</div>
		</div>
	</div>
{:else if currentScreen === 'game'}
	<!-- Écran de jeu -->
	<div data-theme="beatborner" class="w-screen h-screen relative overflow-hidden">
		<canvas bind:this={canvas} id="gameCanvas" class="w-full h-full block"></canvas>

		<!-- Modal de sélection de musique (par-dessus la 3D) -->
		<MapSelector
			visible={showMapSelector}
			onSelectMap={handleMapSelected}
			onCancel={handleCancelMapSelection}
		/>

		<LoadingScreen visible={showLoading} {mapInfo} />
		<PlayButton visible={showPlayButton} onPlay={handlePlay} />
		<GameUI visible={showGameUI} {songName} {gameTime} {notesCount} {score} {combo} {multiplier} />
		<PauseModal visible={showPauseModal} onResume={handleResume} onQuit={handleQuitFromPause} {songName} {navManager} />
		
		<!-- Affichage du grade (PARFAIT/SUPER/BIEN) près de la case -->
		<GradeDisplay bind:this={gradeDisplayComponent} />
	</div>
{/if}

<!-- Clavier virtuel global (au-dessus de tout) -->
<GlobalKeyboard />