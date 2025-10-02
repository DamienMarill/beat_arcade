import { GameConfig } from '$lib/game/GameConfig.js';

/**
 * Gère la navigation au clavier pour l'UI (borne d'arcade)
 * AUTOMATIQUE: Détecte et met à jour les éléments [data-nav-item] en temps réel
 */
export class NavigationManager {
	constructor() {
		this.enabled = false;
		this.focusableElements = [];
		this.currentIndex = 0;
		this.selector = '[data-nav-item]';
		this.observer = null;
		this.callbacks = {
			onNavigate: null,
			onValidate: null,
			onSelect: null,  // W ou B
			onStart: null    // X ou N
		};

		// Binding des événements
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleMutation = this.handleMutation.bind(this);
	}

	/**
	 * Active la navigation AUTOMATIQUE avec détection temps réel du DOM
	 */
	enable(selector = '[data-nav-item]') {
		if (this.enabled) return;

		this.selector = selector;

		// Découvrir les éléments initiaux
		this.discoverElements();

		// Activer les événements clavier
		window.addEventListener('keydown', this.handleKeyDown);
		this.enabled = true;

		// Démarrer l'observation automatique du DOM
		this.startObserving();

		// Focus initial
		if (this.focusableElements.length > 0) {
			this.setFocus(0);
		}
	}

	/**
	 * Désactive la navigation
	 */
	disable() {
		if (!this.enabled) return;

		// Arrêter l'observation du DOM
		this.stopObserving();

		window.removeEventListener('keydown', this.handleKeyDown);
		this.enabled = false;

		// Retirer le focus
		this.clearFocus();
	}

	/**
	 * Démarre l'observation automatique du DOM (MutationObserver)
	 */
	startObserving() {
		if (this.observer) return;

		this.observer = new MutationObserver(this.handleMutation);
		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['disabled', 'style', 'class', 'hidden']
		});
	}

	/**
	 * Arrête l'observation du DOM
	 */
	stopObserving() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	/**
	 * Gère les mutations du DOM (ajout/retrait/modification d'éléments)
	 */
	handleMutation(mutations) {
		// Redécouvrir les éléments si le DOM a changé
		this.autoRefresh();
	}

	/**
	 * Découvre automatiquement TOUS les éléments [data-nav-item] visibles
	 */
	discoverElements() {
		const elements = document.querySelectorAll(this.selector);
		this.focusableElements = Array.from(elements).filter(el => {
			// Filtrer: disabled, invisibles, ou dans des conteneurs cachés
			return !el.disabled &&
			       el.offsetParent !== null &&
			       !el.hasAttribute('hidden') &&
			       window.getComputedStyle(el).display !== 'none' &&
			       window.getComputedStyle(el).visibility !== 'hidden';
		});
	}

	/**
	 * Rafraîchissement automatique (appelé par MutationObserver)
	 */
	autoRefresh() {
		const previousElement = this.focusableElements[this.currentIndex];
		const previousCount = this.focusableElements.length;

		this.discoverElements();

		// Si le nombre d'éléments a changé ou si l'élément précédent n'existe plus
		if (this.focusableElements.length !== previousCount ||
		    !this.focusableElements.includes(previousElement)) {

			// Essayer de maintenir le focus sur le même élément
			if (previousElement && this.focusableElements.includes(previousElement)) {
				const newIndex = this.focusableElements.indexOf(previousElement);
				this.currentIndex = newIndex;
			} else {
				// Réinitialiser au premier élément
				this.currentIndex = 0;
			}

			// Appliquer le focus
			if (this.focusableElements.length > 0) {
				this.setFocus(this.currentIndex);
			} else {
				this.clearFocus();
			}
		}
	}

	/**
	 * Rafraîchissement manuel (legacy, utilisé par les anciens composants)
	 */
	refresh(selector = null) {
		if (selector) this.selector = selector;
		this.autoRefresh();
	}

	/**
	 * Gère les touches de navigation
	 */
	handleKeyDown(event) {
		if (!this.enabled) return;

		const key = event.key.toLowerCase();
		const bindings = GameConfig.navigationBindings;

		// Return (B button) - Toujours actif même sans éléments focusables
		if (bindings.return && bindings.return.includes(key)) {
			event.preventDefault();
			this.notifySelect();
			return;
		}
		// Start (X button) - Toujours actif même sans éléments focusables
		else if (bindings.start && bindings.start.includes(key)) {
			event.preventDefault();
			this.notifyStart();
			return;
		}

		// Les touches suivantes nécessitent des éléments focusables
		if (this.focusableElements.length === 0) return;

		// Navigation haut
		if (bindings.up && bindings.up.includes(key)) {
			event.preventDefault();
			this.navigateUp();
		}
		// Navigation bas
		else if (bindings.down && bindings.down.includes(key)) {
			event.preventDefault();
			this.navigateDown();
		}
		// Navigation gauche (optionnel pour grilles)
		else if (bindings.left && bindings.left.includes(key)) {
			event.preventDefault();
			this.navigateLeft();
		}
		// Navigation droite (optionnel pour grilles)
		else if (bindings.right && bindings.right.includes(key)) {
			event.preventDefault();
			this.navigateRight();
		}
		// Validation (A button)
		else if (bindings.validate && bindings.validate.includes(key)) {
			event.preventDefault();
			this.validate();
		}
	}

	/**
	 * Navigation vers le haut
	 */
	navigateUp() {
		if (this.focusableElements.length === 0) return;

		const newIndex = this.currentIndex - 1;
		if (newIndex >= 0) {
			this.setFocus(newIndex);
			this.notifyNavigate('up');
		}
	}

	/**
	 * Navigation vers le bas
	 */
	navigateDown() {
		if (this.focusableElements.length === 0) return;

		const newIndex = this.currentIndex + 1;
		if (newIndex < this.focusableElements.length) {
			this.setFocus(newIndex);
			this.notifyNavigate('down');
		}
	}

	/**
	 * Navigation vers la gauche (pour grilles)
	 */
	navigateLeft() {
		// Pour l'instant, même comportement que haut
		this.navigateUp();
		this.notifyNavigate('left');
	}

	/**
	 * Navigation vers la droite (pour grilles)
	 */
	navigateRight() {
		// Pour l'instant, même comportement que bas
		this.navigateDown();
		this.notifyNavigate('right');
	}

	/**
	 * Valide l'élément actuel
	 */
	validate() {
		if (this.focusableElements.length === 0) return;

		const element = this.focusableElements[this.currentIndex];
		if (element) {
			// Déclencher le clic sur l'élément
			element.click();
			this.notifyValidate(element);
		}
	}

	/**
	 * Change le focus vers un index donné
	 */
	setFocus(index) {
		if (index < 0 || index >= this.focusableElements.length) return;

		// Retirer l'ancien focus
		this.clearFocus();

		// Appliquer le nouveau focus
		this.currentIndex = index;
		const element = this.focusableElements[index];
		element.setAttribute('data-nav-focused', 'true');
		element.classList.add('nav-focused');

		// Scroll si nécessaire
		element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	/**
	 * Retire le focus de tous les éléments
	 */
	clearFocus() {
		this.focusableElements.forEach(el => {
			el.removeAttribute('data-nav-focused');
			el.classList.remove('nav-focused');
		});
	}

	/**
	 * Enregistre un callback pour la navigation
	 */
	onNavigate(callback) {
		this.callbacks.onNavigate = callback;
	}

	/**
	 * Enregistre un callback pour la validation
	 */
	onValidate(callback) {
		this.callbacks.onValidate = callback;
	}

	/**
	 * Enregistre un callback pour Select (W/B)
	 */
	onSelect(callback) {
		this.callbacks.onSelect = callback;
	}

	/**
	 * Enregistre un callback pour Start (X/N)
	 */
	onStart(callback) {
		this.callbacks.onStart = callback;
	}

	/**
	 * Notifie la navigation
	 */
	notifyNavigate(direction) {
		if (this.callbacks.onNavigate) {
			this.callbacks.onNavigate(direction, this.currentIndex);
		}
	}

	/**
	 * Notifie la validation
	 */
	notifyValidate(element) {
		if (this.callbacks.onValidate) {
			this.callbacks.onValidate(element, this.currentIndex);
		}
	}

	/**
	 * Notifie l'appui sur Select
	 */
	notifySelect() {
		if (this.callbacks.onSelect) {
			this.callbacks.onSelect();
		}
	}

	/**
	 * Notifie l'appui sur Start
	 */
	notifyStart() {
		if (this.callbacks.onStart) {
			this.callbacks.onStart();
		}
	}

	/**
	 * Retourne l'élément actuellement focusé
	 */
	getCurrentElement() {
		return this.focusableElements[this.currentIndex] || null;
	}

	/**
	 * Nettoie les ressources
	 */
	dispose() {
		this.disable();
		this.focusableElements = [];
		this.callbacks = {};
	}
}