<script>
	import { onMount, onDestroy } from 'svelte';
	import { scale, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { keyboardStore } from '$lib/stores/keyboardStore.js';

	export let visible = false;
	export let stats = {
		score: 0,
		accuracy: 0,
		rank: 'F',
		maxCombo: 0,
		notes: {
			perfect: 0,
			great: 0,
			good: 0,
			miss: 0,
			total: 0
		}
	};
	export let songName = '';
	export let onReplay = () => {};
	export let onBackToMenu = () => {};

	let pseudo = '';
	let animatedScore = 0;
	let animatedAccuracy = 0;
	let showConfetti = false;
	let pseudoInput;
	let isKeyboardOpen = false;
	let keyboardUnsubscribe;

	// Couleurs des ranks
	const rankColors = {
		S: 'text-yellow-400',
		A: 'text-green-400',
		B: 'text-blue-400',
		C: 'text-orange-400',
		D: 'text-red-400',
		F: 'text-gray-500'
	};

	onMount(() => {
		// S'abonner au keyboard store
		keyboardUnsubscribe = keyboardStore.subscribe(state => {
			isKeyboardOpen = state.visible;
		});

		// Écouter les touches R/I
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleKeyPress);
		}
	});

	onDestroy(() => {
		if (keyboardUnsubscribe) {
			keyboardUnsubscribe();
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeyPress);
		}
	});

	function handleKeyPress(event) {
		// Ne réagir que si le modal est visible et le clavier n'est pas déjà ouvert
		if (!visible || isKeyboardOpen) return;

		const key = event.key.toLowerCase();

		// R/I: ouvrir le clavier
		if (key === 'r' || key === 'i') {
			event.preventDefault();
			openKeyboard();
		}
	}

	// Animation des compteurs
	function animateValue(start, end, duration, callback) {
		const startTime = performance.now();

		function update(currentTime) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = cubicOut(progress);
			const current = Math.floor(start + (end - start) * easedProgress);

			callback(current);

			if (progress < 1) {
				requestAnimationFrame(update);
			}
		}

		requestAnimationFrame(update);
	}

	// Créer des confettis
	function createConfetti() {
		showConfetti = true;
		setTimeout(() => {
			showConfetti = false;
		}, 3000);
	}

	// Quand le modal devient visible
	$: if (visible) {
		setTimeout(() => {
			// Animer le score
			animateValue(0, stats.score, 1500, (val) => {
				animatedScore = val;
			});

			// Animer l'accuracy
			animateValue(0, stats.accuracy, 1500, (val) => {
				animatedAccuracy = val;
			});

			// Lancer les confettis si bon rank
			if (stats.rank === 'S' || stats.rank === 'A') {
				setTimeout(() => createConfetti(), 500);
			}

			// Focus l'input après l'animation du modal (400ms scale)
			setTimeout(() => {
				if (pseudoInput) {
					pseudoInput.focus();
				}
			}, 450);
		}, 300);
	}

	function handleSubmit() {
		// TODO: Sauvegarder le high score avec le pseudo
		console.log('High score:', { pseudo, ...stats });
		onBackToMenu();
	}

	function openKeyboard() {
		keyboardStore.open({
			value: pseudo,
			placeholder: 'Entre ton pseudo...',
			onSubmit: (text) => {
				pseudo = text;
				keyboardStore.close();
			},
			onCancel: () => {
				keyboardStore.close();
			}
		});
	}
</script>

{#if visible}
	<!-- Overlay sombre (non-interactif, juste visuel) -->
	<div class="fixed inset-0 bg-black/80 z-40 pointer-events-none" transition:fly={{ y: 100, duration: 300 }}>
	</div>

	<!-- Modal -->
	<div class="fixed inset-0 flex items-center justify-center z-50 p-8 pointer-events-none">
		<div
			id="results-modal"
			class="bg-base-200 rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative overflow-hidden pointer-events-auto"
			transition:scale={{ duration: 400, easing: cubicOut }}
		>
			<!-- Confettis -->
			{#if showConfetti}
				<div class="confetti-container">
					{#each Array(50) as _, i}
						<div
							class="confetti"
							style="
								left: {Math.random() * 100}%;
								animation-delay: {Math.random() * 0.5}s;
								background: hsl({Math.random() * 360}, 70%, 60%);
							"
						></div>
					{/each}
				</div>
			{/if}

			<!-- Titre chanson -->
			<h2 class="text-3xl font-bold text-center mb-6 text-primary">
				{songName}
			</h2>

			<!-- Rank géant -->
			<div class="text-center mb-8">
				<div class="text-9xl font-black {rankColors[stats.rank]} drop-shadow-2xl">
					{stats.rank}
				</div>
			</div>

			<!-- Stats principales -->
			<div class="grid grid-cols-2 gap-6 mb-8">
				<div class="text-center p-4 bg-base-300 rounded-xl">
					<div class="text-sm text-base-content/70 mb-1">Score</div>
					<div class="text-4xl font-bold text-primary">{animatedScore.toLocaleString()}</div>
				</div>
				<div class="text-center p-4 bg-base-300 rounded-xl">
					<div class="text-sm text-base-content/70 mb-1">Précision</div>
					<div class="text-4xl font-bold text-accent">{animatedAccuracy.toFixed(1)}%</div>
				</div>
			</div>

			<!-- Max combo -->
			<div class="text-center mb-6">
				<div class="text-sm text-base-content/70">Combo Maximum</div>
				<div class="text-3xl font-bold text-secondary">{stats.maxCombo}</div>
			</div>

			<!-- Détails des notes -->
			<div class="grid grid-cols-4 gap-3 mb-8 text-center">
				<div class="p-3 bg-base-300 rounded-lg">
					<div class="text-yellow-400 font-bold text-xl">{stats.notes.perfect}</div>
					<div class="text-xs text-base-content/70">Parfait</div>
				</div>
				<div class="p-3 bg-base-300 rounded-lg">
					<div class="text-cyan-400 font-bold text-xl">{stats.notes.great}</div>
					<div class="text-xs text-base-content/70">Super</div>
				</div>
				<div class="p-3 bg-base-300 rounded-lg">
					<div class="text-green-400 font-bold text-xl">{stats.notes.good}</div>
					<div class="text-xs text-base-content/70">Bien</div>
				</div>
				<div class="p-3 bg-base-300 rounded-lg">
					<div class="text-gray-500 font-bold text-xl">{stats.notes.miss}</div>
					<div class="text-xs text-base-content/70">Manqué</div>
				</div>
			</div>

			<!-- Input pseudo -->
			<div class="mb-6">
				<label class="block text-sm font-medium mb-2 text-center">
					Enregistrer ton score
				</label>
				<input
				data-nav-item
				type="text"
				bind:this={pseudoInput}
				bind:value={pseudo}
				placeholder="Entre ton pseudo..."
				maxlength="20"
				class="input input-bordered w-full text-center text-lg"
				on:click={openKeyboard}
				readonly
			/>
			</div>

			<!-- Boutons -->
			<div class="flex gap-4">
				<button
					data-nav-item
					class="btn btn-outline btn-secondary flex-1"
					on:click={onReplay}
				>
					🔄 Rejouer
				</button>
				<button
					data-nav-item
					class="btn btn-primary flex-1"
					on:click={handleSubmit}
				>
					✓ Menu Principal
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confetti-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
	}

	.confetti {
		position: absolute;
		width: 10px;
		height: 10px;
		top: -10px;
		animation: confetti-fall 3s linear forwards;
	}

	@keyframes confetti-fall {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(100vh) rotate(720deg);
			opacity: 0;
		}
	}
</style>
