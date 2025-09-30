<script>
	import { onMount, onDestroy } from 'svelte';
	import MapCard from './MapCard.svelte';
	import { beatSaverService } from '../../services/BeatSaverService.js';

	export let onSelectMap;
	export let onCancel;
	export let visible = true;

	let dialogElement;
	let activeTab = 'popular'; // 'recent' | 'popular' | 'search'
	let maps = [];
	let loading = true;
	let error = null;
	let selectedMapIndex = 0;

	// Récents (localStorage)
	let recentMaps = [];

	// Tabs disponibles
	const tabs = [
		{ id: 'recent', label: '📋 Récents', enabled: true },
		{ id: 'popular', label: '🔥 Plus Joués', enabled: true },
		{ id: 'search', label: '🔍 Recherche', enabled: false }
	];
	let activeTabIndex = 1; // Commencer sur "Plus Joués"

	onMount(() => {
		loadRecentMaps();
		loadPopularMaps();

		// Gérer la navigation personnalisée
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleCustomNavigation);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleCustomNavigation);
		}
	});

	// Gestion de la modal
	$: if (dialogElement) {
		if (visible) {
			dialogElement.showModal();
		} else {
			dialogElement.close();
		}
	}

	async function loadPopularMaps() {
		try {
			loading = true;
			error = null;

			// Utiliser l'endpoint /maps/plays pour les maps les plus jouées
			const response = await fetch('https://api.beatsaver.com/maps/plays/0');
			
			if (!response.ok) {
				throw new Error(`Erreur API: ${response.status}`);
			}

			const data = await response.json();
			maps = data.docs || [];
			loading = false;
		} catch (err) {
			console.error('Erreur chargement maps populaires:', err);
			error = 'Impossible de charger les maps populaires';
			loading = false;
		}
	}

	function loadRecentMaps() {
		try {
			const stored = localStorage.getItem('beat_borner_recent_maps');
			if (stored) {
				recentMaps = JSON.parse(stored);
			}
		} catch (err) {
			console.error('Erreur chargement récents:', err);
		}
	}

	function saveRecentMap(map) {
		try {
			// Ajouter en premier, supprimer les doublons
			const filtered = recentMaps.filter(m => m.id !== map.id);
			recentMaps = [map, ...filtered].slice(0, 20); // Garder max 20
			localStorage.setItem('beat_borner_recent_maps', JSON.stringify(recentMaps));
		} catch (err) {
			console.error('Erreur sauvegarde récent:', err);
		}
	}

	function handleSelectMap(map) {
		saveRecentMap(map);
		onSelectMap(map);
	}

	function changeTab(tab) {
		activeTab = tab;
		selectedMapIndex = 0; // Reset la sélection

		if (tab === 'popular') {
			loadPopularMaps();
		} else if (tab === 'recent') {
			loadRecentMaps();
		}
	}

	function changeTabByIndex(index) {
		const tab = tabs[index];
		if (tab && tab.enabled) {
			activeTabIndex = index;
			changeTab(tab.id);
		}
	}

	// Navigation personnalisée: Gauche/Droite = onglets, Haut/Bas = maps
	function handleCustomNavigation(event) {
		if (!visible) return;

		const key = event.key.toLowerCase();

		// Gauche/Droite: changer d'onglet
		if (key === 'q' || key === 'arrowleft') {
			event.preventDefault();
			const newIndex = activeTabIndex - 1;
			if (newIndex >= 0) {
				changeTabByIndex(newIndex);
			}
		} else if (key === 'd' || key === 'arrowright') {
			event.preventDefault();
			const newIndex = activeTabIndex + 1;
			if (newIndex < tabs.length) {
				changeTabByIndex(newIndex);
			}
		}
		// Haut/Bas: naviguer dans les maps
		else if (key === 'z' || key === 'arrowup') {
			event.preventDefault();
			if (selectedMapIndex > 0) {
				selectedMapIndex--;
				scrollToSelectedMap();
			}
		} else if (key === 's' || key === 'arrowdown') {
			event.preventDefault();
			if (selectedMapIndex < displayedMaps.length - 1) {
				selectedMapIndex++;
				scrollToSelectedMap();
			}
		}
		// R/I: valider la sélection
		else if (key === 'r' || key === 'i') {
			event.preventDefault();
			if (displayedMaps[selectedMapIndex]) {
				handleSelectMap(displayedMaps[selectedMapIndex]);
			}
		}
		// W/B ou X/N: annuler
		else if (key === 'w' || key === 'b' || key === 'x' || key === 'n') {
			event.preventDefault();
			onCancel();
		}
	}

	function scrollToSelectedMap() {
		const mapCards = document.querySelectorAll('[data-map-card]');
		if (mapCards[selectedMapIndex]) {
			mapCards[selectedMapIndex].scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
	}

	$: displayedMaps = activeTab === 'recent' ? recentMaps : maps;
	$: activeTab = tabs[activeTabIndex].id;
</script>

<dialog bind:this={dialogElement} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box bg-base-200/95 backdrop-blur-sm border-4 border-primary shadow-neon max-w-4xl h-[80vh] flex flex-col p-0">
		<!-- Header -->
		<div class="navbar bg-base-300/50 sticky top-0 z-10 border-b-2 border-primary/30">
			<div class="flex-1 px-6">
				<h1 class="text-2xl font-bold text-neon">
					🎵 Sélection de Musique
				</h1>
			</div>
			<div class="flex-none px-4">
				<button
					class="btn btn-ghost btn-circle text-xl hover:text-error"
					on:click={onCancel}
					title="Retour (W/B ou X/N)"
				>
					❌
				</button>
			</div>
		</div>

		<!-- Tabs -->
		<div role="tablist" class="tabs tabs-boxed bg-base-300/30 p-4 border-b border-primary/20">
			{#each tabs as tab, index}
				<button
					role="tab"
					class="tab tab-lg font-bold transition-all"
					class:tab-active={activeTabIndex === index}
					class:opacity-50={!tab.enabled}
					on:click={() => tab.enabled && changeTabByIndex(index)}
					disabled={!tab.enabled}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Content - Single column layout -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if loading}
				<div class="flex items-center justify-center h-full">
					<span class="loading loading-spinner loading-lg text-primary"></span>
				</div>
			{:else if error}
				<div class="alert alert-error shadow-lg">
					<span>⚠️ {error}</span>
				</div>
			{:else if displayedMaps.length === 0}
				<div class="flex flex-col items-center justify-center h-full gap-4 text-center">
					<span class="text-6xl opacity-50">📭</span>
					<p class="text-xl opacity-70">
						{#if activeTab === 'recent'}
							Aucune map récente. Joue pour en ajouter !
						{:else}
							Aucune map disponible
						{/if}
					</p>
				</div>
			{:else}
				<!-- Single column list -->
				<div class="flex flex-col gap-4 max-w-2xl mx-auto">
					{#each displayedMaps as map, index (map.id)}
						<div
							data-map-card
							class="transition-all duration-200"
							class:ring-4={index === selectedMapIndex}
							class:ring-primary={index === selectedMapIndex}
							class:scale-105={index === selectedMapIndex}
						>
							<MapCard
								{map}
								onSelect={handleSelectMap}
								showPlayCount={activeTab === 'popular'}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Backdrop avec 3D visible -->
	<form method="dialog" class="modal-backdrop bg-black/50">
		<button on:click={onCancel}>close</button>
	</form>
</dialog>
