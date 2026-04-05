<script>
	/** @type {{ onSend: (p: { body: string }) => void, disabled?: boolean, error?: string | null }} */
	let { onSend, disabled = false, error = $bindable(null) } = $props();

	let body = $state('');
	const charCount = $derived(body.length);
	const showCount = $derived(charCount >= 451);
	const canSend = $derived(body.trim().length > 0 && !disabled);

	function handleSend() {
		if (!canSend) return;
		onSend({ body: body.trim() });
		body = '';
		error = null;
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<div class="flex flex-col gap-2">
	<textarea
		aria-label="Message"
		aria-describedby={showCount ? 'chat-char-count' : undefined}
		rows="2"
		class="w-full resize-none rounded-md border border-bg-secondary bg-bg-primary px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
		bind:value={body}
		onkeydown={handleKeydown}
		{disabled}
	></textarea>
	{#if showCount}
		<span id="chat-char-count" class="text-right text-xs text-text-tertiary">{charCount}/500</span>
	{/if}
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
	<button
		type="button"
		aria-label="Send message"
		disabled={!canSend}
		class="min-h-[44px] w-full rounded-md text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 {canSend
			? 'bg-amber-500 hover:bg-amber-400'
			: 'cursor-not-allowed bg-amber-500 opacity-50'}"
		onclick={handleSend}
	>
		Send Message
	</button>
</div>
