<script>
	/** @type {{ turnEndsAt: string, timerMs?: number }} */
	let { turnEndsAt, timerMs = 30000 } = $props();

	let secondsLeft = $state(30);

	$effect(() => {
		function tick() {
			const remaining = Math.max(0, Math.ceil((new Date(turnEndsAt).getTime() - Date.now()) / 1000));
			secondsLeft = remaining;
		}
		tick();
		const id = setInterval(tick, 250);
		return () => clearInterval(id);
	});

	const urgency = $derived(secondsLeft <= 10);

	const barWidth = $derived(
		timerMs > 0 ? Math.max(0, Math.min(100, (secondsLeft * 1000 / timerMs) * 100)) : 100
	);
</script>

<div class="flex flex-col items-center gap-2 w-full">
	<span
		class={`text-5xl font-semibold leading-none ${urgency ? 'text-red-600' : 'text-text-primary'}`}
		aria-live="polite"
		aria-label="{secondsLeft} seconds remaining"
	>
		{secondsLeft}
	</span>
	<div class="w-full h-1 rounded-full bg-bg-secondary overflow-hidden">
		<div
			class={`h-full rounded-full transition-[width] duration-200 ${urgency ? 'bg-red-600' : 'bg-amber-500'}`}
			style="width: {barWidth}%"
		></div>
	</div>
</div>
