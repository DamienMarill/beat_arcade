<script>
	let { onPlay, visible = false } = $props();
</script>

{#if visible}
	<div class="fixed inset-0 flex items-center justify-center z-[2000] pointer-events-none">
		<button
			data-nav-item
			class="btn btn-primary btn-lg px-12 py-4 text-2xl font-bold rounded-full shadow-neon hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce-in pointer-events-auto"
			onclick={onPlay}
		>
			🎵 JOUER
		</button>
	</div>
{/if}
