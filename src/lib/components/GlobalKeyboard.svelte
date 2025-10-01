<script>
	import { onMount, onDestroy } from 'svelte';
	import { keyboardStore } from '$lib/stores/keyboardStore.js';
	import VirtualKeyboard from './VirtualKeyboard.svelte';

	let keyboardState;
	let unsubscribe;
	let portalContainer;

	onMount(() => {
		unsubscribe = keyboardStore.subscribe(state => {
			keyboardState = state;
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});

	function portal(node) {
		if (typeof document !== 'undefined') {
			// Créer le conteneur portail s'il n'existe pas
			if (!portalContainer) {
				portalContainer = document.createElement('div');
				portalContainer.id = 'global-keyboard-portal';
				portalContainer.style.position = 'fixed';
				portalContainer.style.top = '0';
				portalContainer.style.left = '0';
				portalContainer.style.width = '100%';
				portalContainer.style.height = '100%';
				portalContainer.style.pointerEvents = 'none';
				portalContainer.style.zIndex = '999999';
				document.body.appendChild(portalContainer);
			}

			// Déplacer le nœud dans le portail
			portalContainer.appendChild(node);

			return {
				destroy() {
					if (node.parentNode === portalContainer) {
						portalContainer.removeChild(node);
					}
					// Nettoyer le conteneur si vide
					if (portalContainer && portalContainer.childNodes.length === 0 && portalContainer.parentNode) {
						portalContainer.parentNode.removeChild(portalContainer);
						portalContainer = null;
					}
				}
			};
		}
		return { destroy() {} };
	}

	function handleSubmit(text) {
		if (keyboardState.onSubmit) {
			keyboardState.onSubmit(text);
		}
		// Ne pas fermer le store ici, laisser VirtualKeyboard le faire après l'animation
	}

	function handleCancel() {
		if (keyboardState.onCancel) {
			keyboardState.onCancel();
		}
		// Ne pas fermer le store ici, laisser VirtualKeyboard le faire après l'animation
	}
</script>

<div use:portal>
	<VirtualKeyboard
		visible={keyboardState?.visible || false}
		value={keyboardState?.value || ''}
		placeholder={keyboardState?.placeholder || 'Tapez votre texte...'}
		onSubmit={handleSubmit}
		onCancel={handleCancel}
	/>
</div>
