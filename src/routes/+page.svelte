<script>
	import { onMount, onDestroy } from 'svelte';
	import { navManager } from '$lib/ui/NavigationManager.js';
	import { MenuContext } from '$lib/ui/contexts/MenuContext.js';
	import { GameContext } from '$lib/ui/contexts/GameContext.js';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import PlayButton from '$lib/components/PlayButton.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	import PauseModal from '$lib/components/PauseModal.svelte';
	import MapSelector from '$lib/components/MapSelector.svelte';
	import { BeatBornerGame } from '$lib/game/BeatBornerGame.js';

	// États de l'application
	let currentScreen = $state('menu'); // 'menu' | 'game' (mapSelection est une modal dans game)

	// Navigation contexts
	let menuContext = $state();
	let gameContext = $state();

	// Game
	let canvas = $state();
	let game = $state();
	let selectedMap = $state(null);
	let showLoading = $state(false);
	let showPlayButton = $state(false);
	let showGameUI = $state(false);
	let showPauseModal = $state(false);
	let mapInfo = $state(null);
	let songName = $state('Loading...');
	let gameTime = $state('00:00');
	let notesCount = $state(0);
	let gameTimeInterval = $state();

	onMount(() => {
		// Créer les contexts de navigation
		menuContext = new MenuContext();
		gameContext = new GameContext({
			onPause: () => {
				if (game) {
					game.pauseGame();
				}
			}
		});
	});

	onDestroy(() => {
		if (game) {
			game.dispose();
		}
		if (gameTimeInterval) {
			clearInterval(gameTimeInterval);
		}
		// Cleanup de la navigation
		navManager.clearAllContexts();
	});

	// Gérer l'activation des contexts selon l'écran
	// IMPORTANT: Ce $effect doit UNIQUEMENT observer currentScreen, menuContext, gameContext
	// Ne PAS observer d'autres variables pour éviter les redéclenchements
	$effect(() => {
		// Observer explicitement ces 3 variables
		const screen = currentScreen;
		const menu = menuContext;
		const gameCtx = gameContext;
		
		if (!menu || !gameCtx) return;

		if (screen === 'menu') {
			console.log('[+page] Activating menu context');
			navManager.pushContext(menu);
			
			return () => {
				console.log('[+page] Cleanup menu context');
				navManager.popContext();
			};
		} else if (screen === 'game') {
			console.log('[+page] Activating game context');
			navManager.pushContext(gameCtx);
			
			return () => {
				console.log('[+page] Cleanup game context');
				navManager.popContext();
			};
		}
	});

	// Les modals (MapSelector, PauseModal) gèrent leurs propres contexts
	// via leurs composants respectifs

	let showMapSelector = $state(false);

	function navigateToMapSelection() {
		// Aller sur l'écran de jeu (tunnel 3D) puis afficher la modal
		currentScreen = 'game';

		// Initialiser le jeu d'abord (tunnel 3D)
		requestAnimationFrame(() => {
			if (canvas && !game) {
				initGameWithoutMap();
			}
			// Puis afficher le sélecteur après initialisation
			requestAnimationFrame(() => {
				showMapSelector = true;
			});
		});
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
		showMapSelector = false;

		// Retour au menu
		currentScreen = 'menu';

		// Le $effect gérera automatiquement la navigation
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
				// Le $effect désactivera automatiquement la navigation
				startGameTimeUpdate();
			},
			onGamePause: () => {
				showPauseModal = true;
				// Le $effect activera automatiquement la navigation
			},
			onGameResume: () => {
				showPauseModal = false;
				// Le $effect désactivera automatiquement la navigation
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
					onclick={navigateToMapSelection}
				>
					▶️ JOUER
				</button>

				<button
					data-nav-item
					class="btn btn-outline btn-secondary btn-lg px-16 py-4 text-xl font-bold rounded-full"
					onclick={() => alert('Paramètres - En développement')}
				>
					⚙️ PARAMÈTRES
				</button>

				<button
					data-nav-item
					class="btn btn-outline btn-accent btn-lg px-16 py-4 text-xl font-bold rounded-full"
					onclick={() => alert('Scores - En développement')}
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
		<GameUI visible={showGameUI} {songName} {gameTime} {notesCount} />
		<PauseModal visible={showPauseModal} onResume={handleResume} onQuit={handleQuitFromPause} {songName} />
	</div>
{/if}