<script>
	/** @type {{ sender: string, body: string, ts: number, isSelf?: boolean }} */
	let { sender, body, ts, isSelf = false } = $props();
	const timeStr = $derived(new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
</script>

<div class="py-1">
	<div class="flex items-center justify-between gap-2">
		<span class="text-xs font-semibold text-text-primary">{isSelf ? 'You' : sender}</span>
		<span class="text-xs text-text-tertiary">{timeStr}</span>
	</div>
	<p class="break-words text-sm font-normal text-text-secondary">{body}</p>
</div>
