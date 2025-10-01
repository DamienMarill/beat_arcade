/**
 * Gestionnaire de navigation global avec système de stack
 * Route les événements clavier vers le context actif (sommet de la stack)
 * Garantit l'isolation stricte entre les layers (menu, modals, etc.)
 */
export class NavigationManager {
	constructor() {
		this.contextStack = []; // Stack de NavigationContext
		this.enabled = false;

		// Binding du handler
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	/**
	 * Retourne le context actif (sommet de la stack)
	 */
	get activeContext() {
		return this.contextStack.length > 0
			? this.contextStack[this.contextStack.length - 1]
			: null;
	}

	/**
	 * Active le système de navigation global
	 */
	enable() {
		if (this.enabled) return;

		window.addEventListener('keydown', this.handleKeyDown);
		this.enabled = true;
		console.log('[NavigationManager] Enabled');
	}

	/**
	 * Désactive le système de navigation global
	 */
	disable() {
		if (!this.enabled) return;

		window.removeEventListener('keydown', this.handleKeyDown);
		this.enabled = false;
		console.log('[NavigationManager] Disabled');
	}

	/**
	 * Ajoute un context à la stack et l'active
	 * Le context précédent (si existe) est désactivé mais reste dans la stack
	 */
	pushContext(context) {
		if (!context) {
			console.warn('[NavigationManager] Attempted to push null context');
			return;
		}

		// Désactiver le context précédent (s'il existe)
		if (this.activeContext) {
			this.activeContext.deactivate();
		}

		// Ajouter le nouveau context à la stack
		this.contextStack.push(context);

		// Activer le nouveau context immédiatement
		context.activate();

		// S'assurer que le manager global est enabled
		if (!this.enabled) {
			this.enable();
		}

		console.log(`[NavigationManager] Pushed context: ${context.name} (stack depth: ${this.contextStack.length})`);
	}

	/**
	 * Retire le context au sommet de la stack
	 * Le context précédent (si existe) est réactivé
	 */
	popContext() {
		if (this.contextStack.length === 0) {
			console.warn('[NavigationManager] Attempted to pop from empty stack');
			return;
		}

		// Retirer et désactiver le context au sommet
		const poppedContext = this.contextStack.pop();
		poppedContext.deactivate();

		console.log(`[NavigationManager] Popped context: ${poppedContext.name} (stack depth: ${this.contextStack.length})`);

		// Réactiver le context précédent immédiatement
		if (this.activeContext) {
			this.activeContext.reactivate();
		} else {
			// Plus de contexts: désactiver le manager
			this.disable();
		}
	}

	/**
	 * Vide complètement la stack
	 */
	clearAllContexts() {
		while (this.contextStack.length > 0) {
			this.popContext();
		}
		console.log('[NavigationManager] Cleared all contexts');
	}

	/**
	 * Gère les événements clavier globaux
	 * Route UNIQUEMENT vers le context au sommet de la stack
	 */
	handleKeyDown(event) {
		if (!this.enabled) {
			console.log('[NavigationManager] handleKeyDown called but manager is DISABLED');
			return;
		}
		console.log(`[NavigationManager] handleKeyDown: ${event.key}, activeContext: ${this.activeContext?.name}`);

		const context = this.activeContext;
		if (!context) return;

		const key = event.key.toLowerCase();

		// Router vers le context actif
		const consumed = context.handleKey(key);

		// Si le context a consommé la touche, empêcher le comportement par défaut
		if (consumed) {
			event.preventDefault();
		}
	}

	/**
	 * Cleanup complet
	 */
	dispose() {
		this.clearAllContexts();
		this.disable();
	}
}

// Instance singleton
export const navManager = new NavigationManager();
