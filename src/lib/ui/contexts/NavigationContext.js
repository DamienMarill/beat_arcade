/**
 * Classe abstraite de base pour tous les contexts de navigation
 * Chaque écran/modal a son propre context qui gère sa navigation
 */
export class NavigationContext {
	/**
	 * @param {string} name - Nom du context (pour debug)
	 * @param {boolean} isModal - true si c'est une modal (layer au-dessus)
	 */
	constructor(name, isModal = false) {
		this.name = name;
		this.isModal = isModal;
		this.focusableElements = [];
		this.currentIndex = 0;
	}

	/**
	 * Appelé quand le context devient actif (au sommet de la stack)
	 * C'est ici qu'on découvre les éléments et qu'on set le focus initial
	 */
	activate() {
		console.log(`[NavigationContext] Activating: ${this.name}`);
		this.discoverElements();
		this.setInitialFocus();
	}

	/**
	 * Appelé quand le context n'est plus au sommet (modal ouverte par-dessus ou destruction)
	 */
	deactivate() {
		console.log(`[NavigationContext] Deactivating: ${this.name}`);
		this.clearFocus();
	}

	/**
	 * Appelé quand le context redevient actif après qu'une modal au-dessus se ferme
	 */
	reactivate() {
		console.log(`[NavigationContext] Reactivating: ${this.name}`);
		this.refresh();
	}

	/**
	 * Redécouvre les éléments (utile si le DOM a changé)
	 */
	refresh() {
		const previousElement = this.focusableElements[this.currentIndex];
		this.discoverElements();

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
	 * Découvre les éléments navigables dans le DOM
	 * À surcharger par les classes enfants pour custom la logique
	 */
	discoverElements() {
		// Default: chercher [data-nav-item]
		const elements = document.querySelectorAll('[data-nav-item]');
		console.log(`[NavigationContext] discoverElements() in ${this.name}: found ${elements.length} total [data-nav-item] elements`);
		
		this.focusableElements = Array.from(elements).filter(el => {
			const visible = this.isElementActuallyVisible(el);
			if (!visible) {
				console.log(`[NavigationContext] Filtered out: ${el.textContent?.trim().substring(0, 30)} (visible: ${visible})`);
			}
			return visible;
		});
		
		console.log(`[NavigationContext] discoverElements() in ${this.name}: ${this.focusableElements.length} visible elements after filter`);
	}

	/**
	 * Vérifie si un élément est réellement visible et interactable
	 */
	isElementActuallyVisible(el) {
		if (el.disabled) return false;

		const closestDialog = el.closest('dialog');
		if (closestDialog && !closestDialog.open) {
			return false;
		}

		if (el.offsetParent === null) {
			return false;
		}

		const styles = window.getComputedStyle(el);
		if (styles.display === 'none' ||
			styles.visibility === 'hidden' ||
			styles.opacity === '0') {
			return false;
		}

		const rect = el.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) {
			return false;
		}

		return true;
	}

	/**
	 * Set le focus initial (par défaut: premier élément)
	 * À surcharger par les classes enfants si besoin
	 */
	setInitialFocus() {
		if (this.focusableElements.length > 0) {
			this.setFocus(0);
		}
	}

	/**
	 * Gère une touche clavier
	 * @param {string} key - La touche pressée (lowercase)
	 * @returns {boolean} true si la touche a été consommée, false sinon
	 */
	handleKey(key) {
		// À implémenter par les classes enfants
		throw new Error(`handleKey() must be implemented by ${this.constructor.name}`);
	}

	/**
	 * Navigation vers le haut
	 */
	navigateUp() {
		if (this.focusableElements.length === 0) return;

		const newIndex = this.currentIndex - 1;
		if (newIndex >= 0) {
			this.setFocus(newIndex);
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
		}
	}

	/**
	 * Valide l'élément actuel (déclenche un click)
	 */
	validate() {
		if (this.focusableElements.length === 0) return;

		const element = this.focusableElements[this.currentIndex];
		if (element) {
			element.click();
		}
	}

	/**
	 * Change le focus vers un index donné
	 */
	setFocus(index) {
		if (index < 0 || index >= this.focusableElements.length) return;

		this.clearFocus();

		this.currentIndex = index;
		const element = this.focusableElements[index];
		element.setAttribute('data-nav-focused', 'true');
		element.classList.add('nav-focused');

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
	 * Retourne l'élément actuellement focusé
	 */
	getFocusedElement() {
		return this.focusableElements[this.currentIndex] || null;
	}

	/**
	 * Cleanup des ressources
	 */
	dispose() {
		this.clearFocus();
		this.focusableElements = [];
	}
}
