<script>
	/** @type {{ message: string, variant?: 'positive' | 'warning', onDismiss?: () => void }} */
	let { message, variant = 'positive', onDismiss } = $props();

	$effect(() => {
		const id = setTimeout(() => {
			onDismiss?.();
		}, 3000);
		return () => clearTimeout(id);
	});

	const bannerClass = $derived(
		variant === 'positive'
			? 'fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-md border border-green-600 bg-white px-4 py-2 text-sm font-semibold text-green-600 shadow-md'
			: 'fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-md border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-md'
	);
</script>

<div class={bannerClass} role="status" aria-live="polite">
	{message}
</div>
