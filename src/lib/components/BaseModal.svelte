<script>
	/**
	 * BaseModal - Composant modal réutilisable avec backdrop transparent
	 * Affiche la scène 3D derrière (bg-black/50 backdrop)
	 */
	let {
		visible = false,
		onClose = null,
		size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
		children
	} = $props();

	let dialogElement = $state();

	// Mapping des tailles
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl',
		'4xl': 'max-w-4xl'
	};

	$effect(() => {
		if (dialogElement) {
			if (visible) {
				dialogElement.showModal();
			} else {
				dialogElement.close();
			}
		}
	});

	function handleClose() {
		if (onClose) {
			onClose();
		}
	}
</script>

<dialog bind:this={dialogElement} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box bg-base-200/95 backdrop-blur-sm border-4 border-primary shadow-neon {sizeClasses[size]}">
		{@render children()}
	</div>

	<!-- Backdrop avec 3D visible -->
	<form method="dialog" class="modal-backdrop bg-black/50">
		<button onclick={handleClose}>close</button>
	</form>
</dialog>
