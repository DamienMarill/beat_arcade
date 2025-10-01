<script>
	import { onMount, tick } from 'svelte';
	import { navManager } from '$lib/ui/NavigationManager.js';
	import { MapSelectorContext } from '$lib/ui/contexts/MapSelectorContext.js';
	import BaseModal from './BaseModal.svelte';
	import MapCard from './MapCard.svelte';

	let { onSelectMap, onCancel, visible = true } = $props();

	// Navigation context
	let context = $state();
	let contextPushed = $state(false);

	let activeTab = $state('popular'); // 'recent' | 'popular' | 'search'
	let maps = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let selectedMapIndex = $state(0);

	// Récents (localStorage)
	let recentMaps = $state([]);

	// Tabs disponibles
	const tabs = [
		{ id: 'recent', label: '📋 Récents', enabled: true },
		{ id: 'popular', label: '🔥 Plus Joués', enabled: true },
		{ id: 'search', label: '🔍 Recherche', enabled: false }
	];
	let activeTabIndex = $state(1); // Commencer sur "Plus Joués"

	onMount(() => {
		loadRecentMaps();
		loadPopularMaps();

		// Créer le context de navigation
		context = new MapSelectorContext({
			onSelect: (index) => {
				// Récupérer la map data depuis l'index passé par le context
				if (displayedMaps[index]) {
					handleSelectMap(displayedMaps[index]);
				}
			},
			onCancel: handleCancelMapSelection
		});
	});

	// Activer/désactiver le context selon visible
	$effect(() => {
		if (!context) return;

		if (visible && !contextPushed) {
			// Attendre que le dialog soit complètement rendu et ouvert
			tick().then(() => tick()).then(() => {
				navManager.pushContext(context);
				contextPushed = true;
			});
		} else if (!visible && contextPushed) {
			navManager.popContext();
			contextPushed = false;
		}
	});

	// Observer les changements de displayedMaps pour refresh le context
	$effect(() => {
		if (!context) return;
		if (!visible) return;
		
		// Observer displayedMaps (déclenché quand l'onglet change)
		const mapsCount = displayedMaps.length;
		
		// Attendre que le DOM soit mis à jour avec les nouvelles cartes
		tick().then(() => {
			if (context && navManager.activeContext === context) {
				context.refresh();
			}
		});
	});

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

	function handleCancelMapSelection() {
		onCancel();
	}

	let displayedMaps = $derived(activeTab === 'recent' ? recentMaps : maps);
</script>

<BaseModal {visible} size="4xl" onClose={onCancel}>
	<!-- Custom layout pour le sélecteur de maps -->
	<div class="h-[80vh] flex flex-col -m-6">
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
					onclick={onCancel}
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
					onclick={() => tab.enabled && changeTabByIndex(index)}
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
</BaseModal>
