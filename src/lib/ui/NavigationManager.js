/**
 * Gère la navigation au clavier pour l'UI (borne d'arcade)
 * Navigation: ZQSD ou Flèches directionnelles
 * Validation: R ou I
 */
export class NavigationManager {
	constructor() {
		this.enabled = false;
		this.focusableElements = [];
		this.currentIndex = 0;
		this.callbacks = {
			onNavigate: null,
			onValidate: null,
			onSelect: null,  // W ou B
			onStart: null    // X ou N
		};

		// Binding des événements
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	/**
	 * Active la navigation et découvre les éléments focusables
	 */
	enable(selector = '[data-nav-item]') {
		if (this.enabled) return;

		// Découvrir les éléments navigables
		this.discoverElements(selector);

		// Activer les événements
		window.addEventListener('keydown', this.handleKeyDown);
		this.enabled = true;

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

		window.removeEventListener('keydown', this.handleKeyDown);
		this.enabled = false;

		// Retirer le focus
		this.clearFocus();
	}

	/**
	 * Découvre les éléments navigables dans le DOM
	 */
	discoverElements(selector) {
		const elements = document.querySelectorAll(selector);
		this.focusableElements = Array.from(elements).filter(el => {
			// Filtrer les éléments disabled ou invisibles
			return !el.disabled && el.offsetParent !== null;
		});
	}

	/**
	 * Redécouvre les éléments (utile si le DOM change)
	 */
	refresh(selector = '[data-nav-item]') {
		const previousElement = this.focusableElements[this.currentIndex];
		this.discoverElements(selector);

		// Essayer de maintenir le focus sur le même élément
		if (previousElement) {
			const newIndex = this.focusableElements.indexOf(previousElement);
			if (newIndex !== -1) {
				this.currentIndex = newIndex;
			} else {
				this.currentIndex = 0;
			}
		}

		this.setFocus(this.currentIndex);
	}

	/**
	 * Gère les touches de navigation
	 */
	handleKeyDown(event) {
		if (!this.enabled) return;

		const key = event.key.toLowerCase();

		// Select (B button) - Toujours actif même sans éléments focusables
		if (key === 'w' || key === 'b') {
			event.preventDefault();
			this.notifySelect();
			return;
		}
		// Start (X button) - Toujours actif même sans éléments focusables
		else if (key === 'x' || key === 'n') {
			event.preventDefault();
			this.notifyStart();
			return;
		}

		// Les touches suivantes nécessitent des éléments focusables
		if (this.focusableElements.length === 0) return;

		// Navigation haut
		if (key === 'z' || key === 'arrowup') {
			event.preventDefault();
			this.navigateUp();
		}
		// Navigation bas
		else if (key === 's' || key === 'arrowdown') {
			event.preventDefault();
			this.navigateDown();
		}
		// Navigation gauche (optionnel pour grilles)
		else if (key === 'q' || key === 'arrowleft') {
			event.preventDefault();
			this.navigateLeft();
		}
		// Navigation droite (optionnel pour grilles)
		else if (key === 'd' || key === 'arrowright') {
			event.preventDefault();
			this.navigateRight();
		}
		// Validation (A button)
		else if (key === 'r' || key === 'i') {
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