<script>
	export let visible = true;
	export let mapInfo = null;
</script>

{#if visible}
	<div class="fixed inset-0 bg-gradient-neon flex items-center justify-center z-[1000]">
		<div class="text-center text-base-content animate-fade-in">
			<h1 class="text-5xl font-bold mb-8 text-neon animate-pulse-glow">
				🎵 Beat Borner
			</h1>

			<div class="loading loading-spinner loading-lg text-accent mb-6"></div>

			<p class="text-xl mb-8 font-medium">
				Chargement de la map BeatSaver...
			</p>

			{#if mapInfo && mapInfo.songName}
				<div class="card bg-base-200/80 shadow-xl backdrop-blur-sm border border-accent/30 max-w-md mx-auto animate-bounce-in">
					<div class="card-body text-left">
						<h3 class="card-title text-accent text-xl mb-4">
							{mapInfo.songName}
						</h3>

						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-lg">🎤</span>
								<span class="font-medium">{mapInfo.artistName || 'Artiste inconnu'}</span>
							</div>

							<div class="flex items-center gap-2">
								<span class="text-lg">👤</span>
								<span>Mapper: {mapInfo.mapperName || 'Mapper inconnu'}</span>
							</div>

							<div class="flex items-center gap-2">
								<span class="text-lg">🎼</span>
								<div class="badge badge-primary badge-lg">
									{mapInfo.bpm || '---'} BPM
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
