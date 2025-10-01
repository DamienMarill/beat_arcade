<script>
	let { map, onSelect, showPlayCount = false } = $props();

	// Informations de la map
	let metadata = $derived(map?.metadata || {});
	let coverUrl = $derived(map?.version?.coverUrl || map?.versions?.[0]?.coverURL || '');
	let songName = $derived(metadata.songName || 'Unknown');
	let artistName = $derived(metadata.songAuthorName || 'Unknown Artist');
	let mapper = $derived(metadata.levelAuthorName || 'Unknown Mapper');
	let bpm = $derived(metadata.bpm || 0);
	let duration = $derived(metadata.duration || 0);
	let stats = $derived(map?.stats || {});

	// Formater la durée (secondes → mm:ss)
	function formatDuration(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Formater les nombres (ex: 12345 → 12.3K)
	function formatNumber(num) {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toString();
	}
</script>

<div
	data-nav-item
	class="card card-side bg-base-200 border-2 border-base-300 hover:border-primary transition-all duration-300 cursor-pointer group h-32"
	onclick={() => onSelect(map)}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && onSelect(map)}
>
	<!-- Cover image à gauche -->
	<figure class="relative w-32 h-32 overflow-hidden flex-shrink-0">
		{#if coverUrl}
			<img
				src={coverUrl}
				alt={songName}
				class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
			/>
		{:else}
			<div class="w-full h-full bg-gradient-beat flex items-center justify-center">
				<span class="text-4xl">🎵</span>
			</div>
		{/if}
	</figure>

	<!-- Contenu à droite -->
	<div class="card-body py-3 px-4 flex-1 min-w-0">
		<h3 class="card-title text-base line-clamp-1 group-hover:text-primary transition-colors">
			{songName}
		</h3>

		<div class="flex flex-col gap-1 text-xs opacity-80 flex-1">
			<p class="flex items-center gap-2 truncate">
				<span class="text-accent">🎤</span>
				<span class="truncate">{artistName}</span>
			</p>
			<p class="flex items-center gap-2 truncate">
				<span class="text-secondary">🗺️</span>
				<span class="truncate">{mapper}</span>
			</p>
		</div>

		<div class="flex gap-2 items-center justify-between text-xs">
			<div class="badge badge-outline badge-sm">
				⏱️ {formatDuration(duration)}
			</div>

			{#if stats.score}
				<div class="flex gap-2 items-center">
					<span class="opacity-70">👍 {formatNumber(stats.upvotes || 0)}</span>
					<span class="opacity-70">👎 {formatNumber(stats.downvotes || 0)}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
