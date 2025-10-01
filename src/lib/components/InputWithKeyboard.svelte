<script>
	import { keyboardStore } from '$lib/stores/keyboardStore.js';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let value = '';
	export let placeholder = 'Tapez votre texte...';
	export let label = '';
	export let className = '';
	export let inputClass = '';
	export let disabled = false;

	let inputElement;

	// Exposer l'input pour le parent
	export function getInputElement() {
		return inputElement;
	}

	export function triggerClick() {
		handleInputFocus();
	}

	function handleInputFocus() {
		if (!disabled) {
			// Ouvrir le clavier global avec les callbacks
			keyboardStore.open({
				value,
				placeholder,
				onSubmit: (text) => {
					value = text;
					dispatch('submit', { value: text });
				},
				onCancel: () => {
					// Juste fermer, pas de changement
				}
			});
		}
	}
</script>

<div class={className}>
	{#if label}
		<label class="label">
			<span class="label-text text-lg font-semibold">{label}</span>
		</label>
	{/if}

	<input
		bind:this={inputElement}
		data-nav-item
		type="text"
		bind:value
		{placeholder}
		{disabled}
		class="input input-bordered w-full {inputClass}"
		on:focus={handleInputFocus}
		on:click={handleInputFocus}
		readonly
	/>
</div>
