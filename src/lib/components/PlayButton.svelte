<script>
	export let onPlay;
	export let visible = false;
</script>

{#if visible}
	<div class="fixed inset-0 flex items-center justify-center z-[2000] pointer-events-none">
		<button
			class="btn btn-primary btn-lg px-12 py-4 text-2xl font-bold rounded-full shadow-neon hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce-in pointer-events-auto"
			on:click={onPlay}
		>
			🎵 JOUER
		</button>
	</div>
{/if}
