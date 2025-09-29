<script>
	export let visible = false;
	export let songName = 'Loading...';
	export let gameTime = '00:00';
	export let notesCount = 0;
</script>

{#if visible}
	<div class="fixed top-5 left-5 z-50">
		<div class="card bg-base-200/90 border border-accent/50 shadow-xl backdrop-blur-sm">
			<div class="card-body p-4">
				<!-- Informations du jeu -->
				<div class="stats stats-vertical shadow-none bg-transparent">
					<div class="stat px-2 py-1">
						<div class="stat-figure text-accent">🎵</div>
						<div class="stat-title text-xs">Chanson</div>
						<div class="stat-value text-sm font-bold truncate max-w-[200px]">
							{songName}
						</div>
					</div>

					<div class="stat px-2 py-1">
						<div class="stat-figure text-secondary">⏱️</div>
						<div class="stat-title text-xs">Temps</div>
						<div class="stat-value text-lg font-mono">
							{gameTime}
						</div>
					</div>

					<div class="stat px-2 py-1">
						<div class="stat-figure text-primary">🎯</div>
						<div class="stat-title text-xs">Notes</div>
						<div class="stat-value text-lg">
							{notesCount}
						</div>
					</div>
				</div>

				<!-- Aide du jeu -->
				<div class="divider my-2"></div>
				<div class="text-xs opacity-70 space-y-1">
					<div class="flex items-center gap-2">
						<span>🎮</span>
						<span>Grille 4x2 (converti de 4x3)</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="badge badge-error badge-xs">Rouge</div>
						<div class="badge badge-info badge-xs">Bleu</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
