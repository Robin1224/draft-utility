<script>
	/** @type {{ captainName: string, graceEndsAt: string, timerMs?: number }} */
	let { captainName, graceEndsAt, timerMs = 30000 } = $props();

	let secondsLeft = $state(0);

	$effect(() => {
		function tick() {
			secondsLeft = Math.max(0, Math.ceil((new Date(graceEndsAt).getTime() - Date.now()) / 1000));
		}
		tick();
		const id = setInterval(tick, 250);
		return () => clearInterval(id);
	});

	const totalGraceSeconds = $derived(Math.round(timerMs / 1000));
	const barWidth = $derived(
		timerMs > 0 ? Math.max(0, Math.min(100, ((secondsLeft * 1000) / timerMs) * 100)) : 100
	);
</script>

<div
	class="cy-pause"
	role="dialog"
	aria-modal="true"
	aria-label="Draft paused"
	style="position: fixed; inset: 0; z-index: 50; background: rgba(5, 4, 9, 0.8);"
>
	<div class="cy-pause-card">
		<div class="cy-pause-eyebrow">// CONNECTION_LOST</div>
		<h2>$ DRAFT.HOLD()</h2>
		<pre class="cy-pause-log">[ERR] {captainName}.socket: closed
[INF] grace_period: {totalGraceSeconds}s
[INF] awaiting reconnect…</pre>
		<div class="cy-pause-timer">
			<div
				class="cy-pause-timer-num"
				aria-live="polite"
				aria-label="{secondsLeft} seconds of grace remaining"
			>
				{String(secondsLeft).padStart(2, '0')}<span>s</span>
			</div>
			<div class="cy-pause-bar">
				<div style="width: {barWidth}%"></div>
			</div>
		</div>
		<p>&gt; if no reconnect, captaincy promotes to next team member</p>
	</div>
</div>
