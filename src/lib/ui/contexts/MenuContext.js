import { NavigationContext } from './NavigationContext.js';

/**
 * Context de navigation pour le menu principal
 * Navigation simple haut/bas entre les boutons
 */
export class MenuContext extends NavigationContext {
	constructor(callbacks = {}) {
		super('Menu', false);
		this.callbacks = callbacks;
	}

	/**
	 * Gère les touches clavier du menu
	 */
	handleKey(key) {
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
