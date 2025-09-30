import { GameConfig } from './GameConfig.js';

/**
 * Gère les entrées clavier pour le jeu
 * Mapping des touches sur la grille 4×2
 */
export class InputManager {
	constructor() {
		this.keyBindings = GameConfig.keyBindings;
		this.activeKeys = new Set();
		this.keyPressCallbacks = [];

		// Binding des événements
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleKeyUp = this.handleKeyUp.bind(this);

		// État
		this.isEnabled = false;
	}

	/**
	 * Active la capture des inputs
	 */
	enable() {
		if (this.isEnabled) return;

		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
		this.isEnabled = true;
		console.log('⌨️ InputManager activé');
	}

	/**
	 * Désactive la capture des inputs
	 */
	disable() {
		if (!this.isEnabled) return;

		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		this.activeKeys.clear();
		this.isEnabled = false;
		console.log('⌨️ InputManager désactivé');
	}

	/**
	 * Gère l'appui sur une touche
	 * @private
	 */
	handleKeyDown(event) {
		const key = event.key.toLowerCase();

		// Ignorer les répétitions (maintien de touche)
		if (this.activeKeys.has(key)) return;

		// Vérifier si la touche est mappée
		const gridPosition = this.keyBindings[key];
		if (!gridPosition) return;

		// Marquer la touche comme active
		this.activeKeys.add(key);

		// Empêcher le comportement par défaut
		event.preventDefault();

		// Notifier tous les callbacks
		this.notifyKeyPress(gridPosition.x, gridPosition.y, key);
	}

	/**
	 * Gère le relâchement d'une touche
	 * @private
	 */
	handleKeyUp(event) {
		const key = event.key.toLowerCase();
		this.activeKeys.delete(key);
	}

	/**
	 * Enregistre un callback pour les frappes de touches
	 * @param {Function} callback - (x, y, key) => void
	 */
	onKeyPress(callback) {
		this.keyPressCallbacks.push(callback);
	}

	/**
	 * Notifie tous les callbacks d'une frappe
	 * @private
	 */
	notifyKeyPress(x, y, key) {
		this.keyPressCallbacks.forEach(callback => {
			try {
				callback(x, y, key);
			} catch (error) {
				console.error('❌ Erreur dans callback input:', error);
			}
		});
	}

	/**
	 * Vérifie si une touche est actuellement enfoncée
	 */
	isKeyPressed(key) {
		return this.activeKeys.has(key.toLowerCase());
	}

	/**
	 * Retourne la position grille pour une touche donnée
	 */
	getGridPosition(key) {
		return this.keyBindings[key.toLowerCase()] || null;
	}

	/**
	 * Retourne toutes les touches mappées
	 */
	getMappedKeys() {
		return Object.keys(this.keyBindings);
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		this.disable();
		this.keyPressCallbacks = [];
	}
}