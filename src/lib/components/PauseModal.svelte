<script>
	import { onMount } from 'svelte';

	export let visible = false;
	export let onResume;
	export let onQuit;
	export let songName = '';

	let dialogElement;

	$: if (dialogElement) {
		if (visible) {
			dialogElement.showModal();
		} else {
			dialogElement.close();
		}
	}
</script>

<dialog bind:this={dialogElement} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box bg-base-200 border-4 border-primary shadow-neon max-w-2xl">
		<!-- Titre -->
		<h2 class="text-5xl font-bold text-center mb-8 text-neon animate-pulse-glow">
			⏸️ PAUSE
		</h2>

		<!-- Info chanson -->
		{#if songName}
			<p class="text-2xl text-center mb-8 opacity-90">
				{songName}
			</p>
		{/if}

		<!-- Boutons -->
		<div class="modal-action flex-col gap-4">
			<button
				data-nav-item
				class="btn btn-primary btn-lg w-full text-2xl font-bold rounded-full shadow-neon hover:scale-105 transition-all duration-300"
				on:click={onResume}
			>
				▶️ REPRENDRE
			</button>

			<button
				data-nav-item
				class="btn btn-outline btn-accent btn-lg w-full text-2xl font-bold rounded-full hover:scale-105 transition-all duration-300"
				on:click={onQuit}
			>
				⬅️ QUITTER
			</button>
		</div>

		<!-- Instruction -->
		<div class="text-center mt-6 text-sm opacity-70">
			<p>ZQSD / ⬆️⬇️ pour naviguer • R/I pour valider</p>
		</div>
	</div>

	<!-- Backdrop -->
	<form method="dialog" class="modal-backdrop bg-black bg-opacity-80">
		<button>close</button>
	</form>
</dialog>