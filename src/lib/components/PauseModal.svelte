<script>
	import { onMount, tick } from 'svelte';
	import { navManager } from '$lib/ui/NavigationManager.js';
	import { PauseContext } from '$lib/ui/contexts/PauseContext.js';
	import BaseModal from './BaseModal.svelte';

	let { visible = false, onResume, onQuit, songName = '' } = $props();

	// Navigation context
	let context = $state();
	let contextPushed = $state(false);

	onMount(() => {
		// Créer le context de navigation
		context = new PauseContext({
			onResume: onResume
		});
	});

	// Activer/désactiver le context selon visible
	$effect(() => {
		if (!context) return;

		if (visible && !contextPushed) {
			console.log('[PauseModal] visible=true, pushing context after tick');
			// Attendre que le dialog soit complètement rendu et ouvert
			tick().then(() => tick()).then(() => {
				console.log('[PauseModal] About to push PauseContext');
				navManager.pushContext(context);
				contextPushed = true;
				console.log('[PauseModal] Context pushed, contextPushed=true');
			});
		} else if (!visible && contextPushed) {
			navManager.popContext();
			contextPushed = false;
		}
	});
</script>

<BaseModal {visible} size="2xl">
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
			onclick={onResume}
		>
			▶️ REPRENDRE
		</button>

		<button
			data-nav-item
			class="btn btn-outline btn-accent btn-lg w-full text-2xl font-bold rounded-full hover:scale-105 transition-all duration-300"
			onclick={onQuit}
		>
			⬅️ QUITTER
		</button>
	</div>

	<!-- Instruction -->
	<div class="text-center mt-6 text-sm opacity-70">
		<p>ZQSD / ⬆️⬇️ pour naviguer • R/I pour valider</p>
	</div>
</BaseModal>