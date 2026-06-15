<script>
	/** @type {{ onSend: (p: { body: string }) => void, disabled?: boolean, error?: string | null }} */
	let { onSend, disabled = false, error = $bindable(null) } = $props();

	let body = $state('');
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

<div class="cy-chat-input">
	<span>&gt;</span>
	<input
		type="text"
		aria-label="Message"
		placeholder="enter message"
		bind:value={body}
		onkeydown={handleKeydown}
		{disabled}
	/>
</div>
{#if error}
	<div class="cy-chat-msg"><span class="cy-chat-body">{error}</span></div>
{/if}
