<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import PlayButton from '$lib/components/PlayButton.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	import { BeatBornerGame } from '$lib/game/BeatBornerGame.js';

	let canvas;
	let game;

	// État UI
	let showLoading = true;
	let showPlayButton = false;
	let showGameUI = false;

	let mapInfo = null;
	let songName = 'Loading...';
	let gameTime = '00:00';
	let notesCount = 0;

	onMount(() => {
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
				},
				onLoadingError: (error) => {
					console.error('Erreur:', error);
					showLoading = false;
					alert('Erreur de chargement de la map');
				},
				onGameStart: () => {
					showPlayButton = false;
					showGameUI = true;
					startGameTimeUpdate();
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
		goto('/');
	}
</script>

<div data-theme="beatborner" class="w-screen h-screen relative overflow-hidden">
	<canvas bind:this={canvas} id="gameCanvas" class="w-full h-full block"></canvas>

	<LoadingScreen visible={showLoading} {mapInfo} />
	<PlayButton visible={showPlayButton} onPlay={handlePlay} />
	<GameUI visible={showGameUI} {songName} {gameTime} {notesCount} />

	{#if showGameUI}
		<button
			class="btn btn-accent btn-sm fixed top-5 right-5 z-50 border-neon hover:scale-105 transition-all duration-300"
			on:click={handleBackToMenu}
		>
			⬅️ Menu
		</button>
	{/if}
</div>
