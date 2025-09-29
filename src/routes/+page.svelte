<script>
	import { goto } from '$app/navigation';

	function navigateToGame() {
		goto('/game');
	}
</script>

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
				class="btn btn-primary btn-lg px-16 py-4 text-xl font-bold rounded-full shadow-neon hover:scale-105 transition-all duration-300 animate-bounce-in"
				on:click={navigateToGame}
			>
				▶️ JOUER
			</button>

			<button
				class="btn btn-outline btn-secondary btn-lg px-16 py-4 text-xl font-bold rounded-full"
				disabled
			>
				⚙️ PARAMÈTRES
			</button>

			<button
				class="btn btn-outline btn-accent btn-lg px-16 py-4 text-xl font-bold rounded-full"
				disabled
			>
				🏆 SCORES
			</button>
		</div>

		<div class="text-sm opacity-70 mt-8">
			<p>Propulsé par Babylon.js & SvelteKit</p>
		</div>
	</div>
</div>
