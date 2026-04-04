<script>
	import TimerDisplay from '$lib/components/atoms/TimerDisplay.svelte';

	/** @type {{ captainName: string, graceEndsAt: string, timerMs?: number }} */
	let { captainName, graceEndsAt, timerMs = 30000 } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70">
	<div
		class="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-bg-primary p-8 text-center shadow-xl mx-4"
	>
		<h2 class="text-xl font-semibold text-text-primary">Draft paused</h2>
		<p class="text-sm text-text-secondary">{captainName} disconnected. Waiting for reconnect…</p>
		<TimerDisplay turnEndsAt={graceEndsAt} timerMs={timerMs} />
		<p class="text-xs font-semibold text-text-secondary">Grace period</p>
	</div>
</div>
