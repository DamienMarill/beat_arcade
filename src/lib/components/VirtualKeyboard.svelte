<script>
	import { onMount, onDestroy } from 'svelte';
	import { GameConfig } from '$lib/game/GameConfig.js';
	import { keyboardStore } from '$lib/stores/keyboardStore.js';

	export let visible = false;
	export let value = '';
	export let onSubmit = (text) => {};
	export let onCancel = () => {};
	export let placeholder = 'Tapez votre texte...';

	let dialogElement;
	let initialValue = value; // Valeur initiale pour annulation
	let currentValue = value;
	let currentRow = 0;
	let currentCol = 0;
	let shiftActive = false;
	let capsLockActive = false;

	// Layout du clavier (AZERTY)
	const keyboardLayout = [
		['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '←'],
		['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
		['⇧', 'W', 'X', 'C', 'V', 'B', 'N', '?', '!', '.'],
		['␣', '⏎', '✕']
	];

	// Largeurs spéciales pour certaines touches
	const keyWidths = {
		'␣': 'col-span-6',
		'⏎': 'col-span-3',
		'✕': 'col-span-3',
		'←': 'col-span-2',
		'⇧': 'col-span-2'
	};

	// Générer les instructions d'aide
	$: instructionsText = (() => {
		const b = GameConfig.navigationBindings;
		const nav = [b.up?.[0], b.down?.[0], b.left?.[0], b.right?.[0]]
			.filter(Boolean)
			.map(k => k.toUpperCase())
			.join('');
		const val = b.validate?.[0]?.toUpperCase() || 'R';
		const cancel = b.cancel?.[0]?.toUpperCase() || 'F';
		return `${nav} pour naviguer • ${val} pour saisir • ${cancel} pour annuler`;
	})();

	$: if (visible) {
		initialValue = value; // Sauvegarder la valeur initiale
		currentValue = value;
		currentRow = 0;
		currentCol = 0;
	}

	// Gérer l'ouverture/fermeture du dialog
	$: if (dialogElement) {
		if (visible && !dialogElement.open) {
			dialogElement.showModal();
		} else if (!visible && dialogElement.open) {
			dialogElement.close();
		}
	}

	function handleKeyDown(event) {
		if (!visible) return;

		const key = event.key.toLowerCase();
		const bindings = GameConfig.navigationBindings;

		// Navigation
		if (bindings.up && bindings.up.includes(key)) {
			event.preventDefault();
			navigateUp();
		} else if (bindings.down && bindings.down.includes(key)) {
			event.preventDefault();
			navigateDown();
		} else if (bindings.left && bindings.left.includes(key)) {
			event.preventDefault();
			navigateLeft();
		} else if (bindings.right && bindings.right.includes(key)) {
			event.preventDefault();
			navigateRight();
		} else if (bindings.validate && bindings.validate.includes(key)) {
			event.preventDefault();
			pressCurrentKey();
		} else if (bindings.return && bindings.return.includes(key)) {
			event.preventDefault();
			// Return = Backspace (effacer le dernier caractère)
			currentValue = currentValue.slice(0, -1);
		} else if (bindings.cancel && bindings.cancel.includes(key)) {
			event.preventDefault();
			handleCancel();
		}
		// Touches spéciales du clavier
		else if (bindings.enter && bindings.enter.includes(key)) {
			event.preventDefault();
			handleSubmit();
		} else if (bindings.close && bindings.close.includes(key)) {
			event.preventDefault();
			handleCancel();
		}
	}

	function navigateUp() {
		if (currentRow > 0) {
			currentRow--;
			// S'assurer que currentCol est valide pour la nouvelle ligne
			const maxCol = keyboardLayout[currentRow].length - 1;
			if (currentCol > maxCol) currentCol = maxCol;
		}
	}

	function navigateDown() {
		if (currentRow < keyboardLayout.length - 1) {
			currentRow++;
			// S'assurer que currentCol est valide pour la nouvelle ligne
			const maxCol = keyboardLayout[currentRow].length - 1;
			if (currentCol > maxCol) currentCol = maxCol;
		}
	}

	function navigateLeft() {
		if (currentCol > 0) {
			currentCol--;
		} else if (currentRow > 0) {
			// Aller à la fin de la ligne précédente
			currentRow--;
			currentCol = keyboardLayout[currentRow].length - 1;
		}
	}

	function navigateRight() {
		if (currentCol < keyboardLayout[currentRow].length - 1) {
			currentCol++;
		} else if (currentRow < keyboardLayout.length - 1) {
			// Aller au début de la ligne suivante
			currentRow++;
			currentCol = 0;
		}
	}

	function pressCurrentKey() {
		const key = keyboardLayout[currentRow][currentCol];
		handleKeyPress(key);
	}

	function handleKeyPress(key) {
		switch (key) {
			case '←': // Backspace
				currentValue = currentValue.slice(0, -1);
				break;
			case '⇧': // Shift/Caps
				if (shiftActive) {
					capsLockActive = !capsLockActive;
					shiftActive = false;
				} else {
					shiftActive = true;
				}
				break;
			case '␣': // Space
				currentValue += ' ';
				break;
			case '⏎': // Enter
				handleSubmit();
				break;
			case '✕': // Close
				handleCancel();
				break;
			default:
				// Lettre ou chiffre
				let charToAdd = key;
				if ((shiftActive || capsLockActive) && /[A-Z]/.test(key)) {
					charToAdd = key.toUpperCase();
				} else if (!/[0-9?!.]/.test(key)) {
					charToAdd = key.toLowerCase();
				}
				currentValue += charToAdd;
				
				// Désactiver shift après une frappe
				if (shiftActive && !capsLockActive) {
					shiftActive = false;
				}
				break;
		}
	}

	function handleSubmit() {
		onSubmit(currentValue);
		closeWithAnimation();
	}

	function handleCancel() {
		// Retourner la valeur initiale (comme si on annulait)
		onSubmit(initialValue);
		closeWithAnimation();
	}

	function closeWithAnimation() {
		if (dialogElement && dialogElement.open) {
			// Fermer le dialog avec l'animation native
			dialogElement.close();
			// Attendre la fin de l'animation avant de fermer le store
			setTimeout(() => {
				keyboardStore.close();
			}, 300); // Durée de l'animation CSS
		} else {
			keyboardStore.close();
		}
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleKeyDown);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeyDown);
		}
	});
</script>

<dialog bind:this={dialogElement} class="modal modal-bottom bg-transparent">
	<div class="fixed inset-0 flex items-end justify-center pointer-events-none">
		<div class="w-full max-w-4xl bg-base-200 border-t-4 border-primary shadow-neon rounded-t-3xl p-6 pointer-events-auto">
			<!-- Champ de saisie -->
			<div class="mb-4">
				<input
					type="text"
					bind:value={currentValue}
					{placeholder}
					class="input input-bordered input-lg w-full text-2xl text-center bg-base-300 font-mono"
					readonly
				/>
			</div>

			<!-- Clavier -->
			<div class="grid grid-cols-12 gap-2">
				{#each keyboardLayout as row, rowIndex}
					{#each row as key, colIndex}
						<button
							class="kbd kbd-lg {keyWidths[key] || 'col-span-1'} 
								{rowIndex === currentRow && colIndex === currentCol ? 'ring-4 ring-accent scale-110' : ''}
								{key === '⇧' && (shiftActive || capsLockActive) ? 'bg-accent text-accent-content' : ''}
								transition-all duration-200 hover:scale-105 flex items-center justify-center text-lg font-bold"
							on:click={() => handleKeyPress(key)}
						>
							{key === '␣' ? 'ESPACE' : key === '⏎' ? 'ENTRER' : key === '✕' ? 'ANNULER' : key}
						</button>
					{/each}
				{/each}
			</div>

			<!-- Instructions -->
			<div class="text-center mt-4 text-sm opacity-70">
				<p>{instructionsText}</p>
			</div>
		</div>
	</div>
</dialog>

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}
</style>
