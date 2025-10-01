import { writable } from 'svelte/store';

/**
 * Store global pour le clavier virtuel
 */
function createKeyboardStore() {
	const { subscribe, set, update } = writable({
		visible: false,
		value: '',
		placeholder: 'Tapez votre texte...',
		onSubmit: null,
		onCancel: null
	});

	return {
		subscribe,
		open: (config) => {
			update(state => ({
				...state,
				visible: true,
				value: config.value || '',
				placeholder: config.placeholder || 'Tapez votre texte...',
				onSubmit: config.onSubmit,
				onCancel: config.onCancel
			}));
		},
		close: () => {
			update(state => ({ ...state, visible: false }));
		},
		reset: () => {
			set({
				visible: false,
				value: '',
				placeholder: 'Tapez votre texte...',
				onSubmit: null,
				onCancel: null
			});
		}
	};
}

export const keyboardStore = createKeyboardStore();
