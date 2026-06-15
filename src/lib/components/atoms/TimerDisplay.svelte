<script>
	/** @type {{ turnEndsAt: string, timerMs?: number, accent?: 'lime' | 'violet' }} */
	let { turnEndsAt, timerMs = 30000, accent = 'lime' } = $props();

	let secondsLeft = $state(30);

	$effect(() => {
		function tick() {
			const remaining = Math.max(
				0,
				Math.ceil((new Date(turnEndsAt).getTime() - Date.now()) / 1000)
			);
			secondsLeft = remaining;
		}
		tick();
		const id = setInterval(tick, 250);
		return () => clearInterval(id);
	});

	const urgency = $derived(secondsLeft <= 5);

	const barWidth = $derived(
		timerMs > 0 ? Math.max(0, Math.min(100, ((secondsLeft * 1000) / timerMs) * 100)) : 100
	);
</script>

<div class="cy-turn-clock {urgency ? 'is-urgent' : ''}" style="--accent: var(--cy-{accent})">
	<div class="cy-turn-clock-num" aria-live="polite" aria-label="{secondsLeft} seconds remaining">
		{String(secondsLeft).padStart(2, '0')}<span>s</span>
	</div>
	<div class="cy-turn-clock-bar">
		<div style="width: {barWidth}%"></div>
	</div>
</div>
