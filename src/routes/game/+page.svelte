<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import PlayButton from '$lib/components/PlayButton.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	import PauseModal from '$lib/components/PauseModal.svelte';
	import { BeatBornerGame } from '$lib/game/BeatBornerGame.js';
	import { NavigationManager } from '$lib/ui/NavigationManager.js';

	let canvas;
	let game;
	let navManager;

	// État UI
	let showLoading = true;
	let showPlayButton = false;
	let showGameUI = false;
	let showPauseModal = false;

	let mapInfo = null;
	let songName = 'Loading...';
	let gameTime = '00:00';
	let notesCount = 0;

	onMount(() => {
		// Créer le manager de navigation (désactivé par défaut)
		navManager = new NavigationManager();

		// Enregistrer le callback pour le bouton Start (X/N) pendant le jeu
		navManager.onStart(() => {
			if (game && game.isPlaying && !showPauseModal) {
				game.pauseGame();
			}
		});

		// Ajouter un listener direct pour X/N pendant le jeu (sans passer par la navigation)
		window.addEventListener('keydown', handleGamePauseKey);

		if (canvas) {
			// Créer le jeu avec callbacks
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
		window.removeEventListener('keydown', handleGamePauseKey);
	});

	function handlePlay() {
		if (game) {
			game.startGame();
		}
	}

	let gameTimeInterval;
	function startGameTimeUpdate() {
		gameTimeInterval = setInterval(() => {
			if (game) {
				gameTime = game.getGameTime();
			}
		}, 1000);
	}

	function handleBackToMenu() {
		// Réactiver la navigation avant de quitter
		if (navManager) {
			navManager.enable('[data-nav-item]');
		}
		goto('/');
	}

	function handleResume() {
		if (game) {
			game.resumeGame();
		}
	}

	function handleQuitFromPause() {
		handleBackToMenu();
	}

	function handleGamePauseKey(event) {
		const key = event.key.toLowerCase();
		// X ou N pour pause uniquement pendant le jeu actif
		if ((key === 'x' || key === 'n') && game && game.isPlaying && !showPauseModal) {
			event.preventDefault();
			game.pauseGame();
		}
	}
</script>

<div data-theme="beatborner" class="w-screen h-screen relative overflow-hidden">
	<canvas bind:this={canvas} id="gameCanvas" class="w-full h-full block"></canvas>

	<LoadingScreen visible={showLoading} {mapInfo} />
	<PlayButton visible={showPlayButton} onPlay={handlePlay} />
	<GameUI visible={showGameUI} {songName} {gameTime} {notesCount} />
	<PauseModal visible={showPauseModal} onResume={handleResume} onQuit={handleQuitFromPause} {songName} />
</div>
