import { NavigationContext } from './NavigationContext.js';

/**
 * Context de navigation pour la modal de pause
 * Navigation simple haut/bas entre les boutons
 */
export class PauseContext extends NavigationContext {
	constructor(callbacks = {}) {
		super('Pause', true); // true = modal
		this.callbacks = callbacks;
	}

	/**
	 * Gère les touches clavier de la pause
	 */
	handleKey(key) {
		console.log(`[PauseContext] handleKey(${key}), focusableElements: ${this.focusableElements.length}`);
		
		// X/N = Raccourci pour reprendre (fermer la modal)
		if (key === 'x' || key === 'n') {
			if (this.callbacks.onResume) {
				this.callbacks.onResume();
			}
			return true;
		}

		// Navigation haut/bas
		if (key === 'z' || key === 'arrowup') {
			this.navigateUp();
			return true;
		}
		if (key === 's' || key === 'arrowdown') {
			this.navigateDown();
			return true;
		}

		// Validation
		if (key === 'r' || key === 'i') {
			this.validate();
			if (this.callbacks.onValidate) {
				this.callbacks.onValidate(this.getFocusedElement());
			}
			return true;
		}

		// Touche non gérée
		return false;
	}
}
