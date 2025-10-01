<script>
	import { GameConfig } from '$lib/game/GameConfig.js';

	export let visible = false;
	export let onResume;
	export let onQuit;
	export let songName = '';
	export let navManager = null;

	// Générer le texte d'aide basé sur les bindings
	$: navigationHelp = `${GameConfig.navigationBindings.up[0].toUpperCase()}${GameConfig.navigationBindings.down[0].toUpperCase()}${GameConfig.navigationBindings.left[0].toUpperCase()}${GameConfig.navigationBindings.right[0].toUpperCase()} / ⬆️⬇️ pour naviguer • ${GameConfig.navigationBindings.validate[0].toUpperCase()}/${GameConfig.navigationBindings.validate[1].toUpperCase()} pour valider`;

	let dialogElement;

	$: if (dialogElement) {
		if (visible) {
			dialogElement.showModal();
			// Attendre que le DOM soit mis à jour puis réactiver la navigation
			setTimeout(() => {
				if (navManager) {
					// Utiliser un sélecteur spécifique au modal de pause uniquement
					navManager.enable('#pause-modal [data-nav-item]');
				}
			}, 150);
		} else {
			dialogElement.close();
			// Désactiver la navigation quand le modal se ferme
			if (navManager) {
				navManager.disable();
			}
		}
	}
</script>

<dialog bind:this={dialogElement} id="pause-modal" class="modal modal-bottom sm:modal-middle">
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
			<p>{navigationHelp}</p>
		</div>
	</div>

	<!-- Backdrop -->
	<form method="dialog" class="modal-backdrop bg-black bg-opacity-80">
		<button>close</button>
	</form>
</dialog>