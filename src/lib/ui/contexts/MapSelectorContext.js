import { NavigationContext } from './NavigationContext.js';

/**
 * Context de navigation pour le sélecteur de maps
 * Navigation complexe: Gauche/Droite pour tabs, Haut/Bas pour maps
 */
export class MapSelectorContext extends NavigationContext {
	constructor(callbacks = {}) {
		super('MapSelector', true); // true = modal
		this.callbacks = callbacks;
		
		// State spécifique au sélecteur
		this.tabs = [];
		this.activeTabIndex = 0;
		this.maps = [];
		this.selectedMapIndex = 0;
	}

	/**
	 * Active le context et découvre les tabs + maps
	 */
	activate() {
		console.log(`[NavigationContext] Activating: ${this.name}`);
		this.discoverTabs();
		this.discoverMaps();
		this.setInitialFocus();
	}

	/**
	 * Découvre les tabs disponibles
	 */
	discoverTabs() {
		const tabElements = document.querySelectorAll('[role="tablist"] [role="tab"]');
		this.tabs = Array.from(tabElements).filter(el => {
			// @ts-ignore - disabled existe sur HTMLButtonElement
			return !el.disabled;
		});
		
		// Trouver l'onglet actif
		this.activeTabIndex = this.tabs.findIndex(tab => tab.classList.contains('tab-active'));
		if (this.activeTabIndex === -1) this.activeTabIndex = 0;
	}

	/**
	 * Découvre les maps affichées
	 */
	discoverMaps() {
		const mapElements = document.querySelectorAll('[data-map-card]');
		// Filtrer seulement les cartes visibles (onglet actif)
		this.maps = Array.from(mapElements).filter(el => {
			return this.isElementActuallyVisible(el);
		});
		
		// Reset la sélection si plus de maps
		if (this.selectedMapIndex >= this.maps.length) {
			this.selectedMapIndex = 0;
		}
	}

	/**
	 * Focus initial sur la première map
	 */
	setInitialFocus() {
		this.selectedMapIndex = 0;
		this.updateMapFocus();
	}

	/**
	 * Rafraîchit les éléments
	 */
	refresh() {
		this.discoverTabs();
		this.discoverMaps();
		this.updateMapFocus();
	}

	/**
	 * Réactivation après fermeture d'une autre modal
	 */
	reactivate() {
		console.log(`[NavigationContext] Reactivating: ${this.name}`);
		this.refresh();
	}

	/**
	 * Met à jour le focus visuel sur la map sélectionnée
	 */
	updateMapFocus() {
		// Retirer le focus de toutes les maps
		this.maps.forEach(map => {
			map.classList.remove('ring-4', 'ring-primary', 'scale-105');
		});

		// Ajouter le focus sur la map sélectionnée
		if (this.maps[this.selectedMapIndex]) {
			const map = this.maps[this.selectedMapIndex];
			map.classList.add('ring-4', 'ring-primary', 'scale-105');
			map.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	/**
	 * Gère les touches clavier du sélecteur
	 */
	handleKey(key) {
		// Gauche/Droite: changer d'onglet
		if (key === 'q' || key === 'arrowleft') {
			this.navigateTabLeft();
			return true;
		}
		if (key === 'd' || key === 'arrowright') {
			this.navigateTabRight();
			return true;
		}

		// Haut/Bas: naviguer dans les maps
		if (key === 'z' || key === 'arrowup') {
			this.navigateMapUp();
			return true;
		}
		if (key === 's' || key === 'arrowdown') {
			this.navigateMapDown();
			return true;
		}

		// R/I: valider la sélection
		if (key === 'r' || key === 'i') {
			this.validateSelection();
			return true;
		}

		// W/B ou X/N: annuler
		if (key === 'w' || key === 'b' || key === 'x' || key === 'n') {
			if (this.callbacks.onCancel) {
				this.callbacks.onCancel();
			}
			return true;
		}

		// Touche non gérée
		return false;
	}

	/**
	 * Navigue vers l'onglet de gauche
	 */
	navigateTabLeft() {
		if (this.tabs.length === 0) return;

		const newIndex = this.activeTabIndex - 1;
		if (newIndex >= 0) {
			this.changeTab(newIndex);
		}
	}

	/**
	 * Navigue vers l'onglet de droite
	 */
	navigateTabRight() {
		if (this.tabs.length === 0) return;

		const newIndex = this.activeTabIndex + 1;
		if (newIndex < this.tabs.length) {
			this.changeTab(newIndex);
		}
	}

	/**
	 * Change d'onglet
	 */
	changeTab(index) {
		if (index < 0 || index >= this.tabs.length) return;

		this.activeTabIndex = index;
		const tab = this.tabs[index];
		
		// Cliquer sur le tab pour changer (Svelte se chargera du refresh via l'$effect)
		tab.click();
	}

	/**
	 * Navigue vers la map du haut
	 */
	navigateMapUp() {
		if (this.maps.length === 0) return;

		const newIndex = this.selectedMapIndex - 1;
		if (newIndex >= 0) {
			this.selectedMapIndex = newIndex;
			this.updateMapFocus();
		}
	}

	/**
	 * Navigue vers la map du bas
	 */
	navigateMapDown() {
		if (this.maps.length === 0) return;

		const newIndex = this.selectedMapIndex + 1;
		if (newIndex < this.maps.length) {
			this.selectedMapIndex = newIndex;
			this.updateMapFocus();
		}
	}

	/**
	 * Valide la sélection de la map
	 */
	validateSelection() {
		if (this.maps.length === 0) return;

		const mapCard = this.maps[this.selectedMapIndex];
		if (mapCard) {
			// Trouver le bouton de sélection dans la card
			const selectButton = mapCard.querySelector('button');
			if (selectButton) {
				selectButton.click();
			}
			
			if (this.callbacks.onSelect) {
				this.callbacks.onSelect(this.selectedMapIndex);
			}
		}
	}

	/**
	 * Cleanup
	 */
	clearFocus() {
		this.maps.forEach(map => {
			map.classList.remove('ring-4', 'ring-primary', 'scale-105');
		});
	}

	/**
	 * Pas d'éléments focusables standards (on gère custom)
	 */
	discoverElements() {
		// Override: on ne cherche pas de [data-nav-item] ici
		this.focusableElements = [];
	}
}
