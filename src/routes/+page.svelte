<script>
	import { onMount, onDestroy } from 'svelte';
	import { NavigationManager } from '$lib/ui/NavigationManager.js';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import PlayButton from '$lib/components/PlayButton.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	import PauseModal from '$lib/components/PauseModal.svelte';
	import { BeatBornerGame } from '$lib/game/BeatBornerGame.js';

	// États de l'application
	let currentScreen = 'menu'; // 'menu' | 'game'

	// Navigation
	let navManager;

	// Game
	let canvas;
	let game;
	let showLoading = false;
	let showPlayButton = false;
	let showGameUI = false;
	let showPauseModal = false;
	let mapInfo = null;
	let songName = 'Loading...';
	let gameTime = '00:00';
	let notesCount = 0;
	let gameTimeInterval;

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

	function navigateToGame() {
		currentScreen = 'game';

		// Désactiver temporairement la navigation pendant le changement
		navManager.disable();

		// Initialiser le jeu après que le canvas soit dans le DOM
		setTimeout(() => {
			if (canvas && !game) {
				initGame();
			}
		}, 100);
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

		// Retour au menu
		currentScreen = 'menu';

		// Redécouvrir les éléments du menu et réactiver la navigation
		setTimeout(() => {
			navManager.refresh('[data-nav-item]');
		}, 100);
	}

	function initGame() {
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
				showPlayButton = true;
				notesCount = info.notesCount;
				// Activer la navigation pour le bouton Play
				setTimeout(() => navManager.enable('[data-nav-item]'), 100);
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
				// Activer la navigation pour la modal de pause
				setTimeout(() => navManager.enable('[data-nav-item]'), 150);
			},
			onGameResume: () => {
				showPauseModal = false;
				// Désactiver la navigation, retour au jeu
				navManager.disable();
			}
		});

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

	function handleGamePauseKey(event) {
		const key = event.key.toLowerCase();
		// X ou N pour pause uniquement pendant le jeu actif
		if ((key === 'x' || key === 'n') && currentScreen === 'game' && game && game.isPlaying && !showPauseModal) {
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
					on:click={navigateToGame}
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

		<LoadingScreen visible={showLoading} {mapInfo} />
		<PlayButton visible={showPlayButton} onPlay={handlePlay} />
		<GameUI visible={showGameUI} {songName} {gameTime} {notesCount} />
		<PauseModal visible={showPauseModal} onResume={handleResume} onQuit={handleQuitFromPause} {songName} />
	</div>
{/if}