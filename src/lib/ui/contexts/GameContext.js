import { NavigationContext } from './NavigationContext.js';

/**
 * Context de navigation pour l'écran de jeu
 * Navigation minimale: juste la touche pause
 */
export class GameContext extends NavigationContext {
	constructor(callbacks = {}) {
		super('Game', false);
		this.callbacks = callbacks;
	}

	/**
	 * Pas d'éléments à découvrir (navigation désactivée en jeu)
	 */
	activate() {
		console.log(`[NavigationContext] Activating: ${this.name}`);
		// Pas de découverte d'éléments, pas de focus
	}

	/**
	 * Gère les touches clavier en jeu
	 */
	handleKey(key) {
		console.log(`[GameContext] handleKey called with: ${key}`);
		
		// X/N = Ouvrir la pause
		if (key === 'x' || key === 'n') {
			console.log('[GameContext] Pause key detected, calling onPause callback');
			if (this.callbacks.onPause) {
				this.callbacks.onPause();
			}
			return true;
		}

		// Toutes les autres touches ne sont pas gérées par la navigation
		// (elles vont au gameplay: RTFGIKOL)
		return false;
	}

	/**
	 * Pas d'éléments à découvrir
	 */
	discoverElements() {
		this.focusableElements = [];
	}

	/**
	 * Pas de focus en jeu
	 */
	setInitialFocus() {
		// Rien
	}

	/**
	 * Pas de focus à nettoyer
	 */
	clearFocus() {
		// Rien
	}
}
