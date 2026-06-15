<script>
	import { tick } from 'svelte';
	import ChatMessage from '$lib/components/atoms/ChatMessage.svelte';
	import ChatInput from '$lib/components/atoms/ChatInput.svelte';

	/**
	 * @typedef {{ sender: string, body: string, ts: number }} ChatMsg
	 */

	/**
	 * @type {{
	 *   phase: string,
	 *   role: 'player' | 'guest',
	 *   messages?: ChatMsg[],
	 *   currentUserName?: string | null,
	 *   onSend: (p: { body: string }) => void,
	 *   activeTab?: string
	 * }}
	 */
	let {
		phase,
		role,
		messages = [],
		currentUserName = null,
		onSend,
		activeTab = $bindable('all')
	} = $props();

	/** @type {string | null} */
	let inputError = $state(null);

	/** @type {HTMLDivElement | undefined} */
	let listEl = $state();

	const showAllTab = $derived(phase === 'lobby');
	const roleTabLabel = $derived(role === 'player' ? 'team' : 'spec');
	const roleTabKey = $derived(role === 'player' ? 'team' : 'spectator');

	// If the "all" tab was active but we transition to draft phase, switch to role tab
	$effect(() => {
		if (!showAllTab && activeTab === 'all') {
			activeTab = roleTabKey;
		}
	});

	// Auto-scroll message list to bottom on new messages
	$effect(() => {
		// Depend on messages array length to trigger
		void messages.length;
		tick().then(() => {
			if (listEl) listEl.scrollTop = listEl.scrollHeight;
		});
	});

	// Responsive dock (D-02): sidebar on desktop, toggleable drawer on narrow widths.
	let narrow = $state(false);
	let drawerOpen = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 1100px)');
		const apply = () => {
			narrow = mq.matches;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});
</script>

{#snippet panelBody()}
	<div class="cy-chat-head">
		<span>// chat.{activeTab}</span>
		<div class="cy-chat-tabs" role="tablist" aria-label="Chat channels">
			{#if showAllTab}
				<button
					role="tab"
					type="button"
					aria-selected={activeTab === 'all'}
					tabindex={activeTab === 'all' ? 0 : -1}
					class={activeTab === 'all' ? 'is-active' : ''}
					onclick={() => (activeTab = 'all')}>all</button
				>
			{/if}
			<button
				role="tab"
				type="button"
				aria-selected={activeTab === roleTabKey}
				tabindex={activeTab === roleTabKey ? 0 : -1}
				class={activeTab === roleTabKey ? 'is-active' : ''}
				onclick={() => (activeTab = roleTabKey)}>{roleTabLabel}</button
			>
		</div>
	</div>

	<div bind:this={listEl} class="cy-chat-list" role="log" aria-live="polite" aria-label="Messages">
		{#if messages.length === 0}
			<div class="cy-chat-msg"><span class="cy-chat-body">// no messages yet</span></div>
		{:else}
			{#each messages as msg (msg.ts + msg.sender)}
				<ChatMessage
					sender={msg.sender}
					body={msg.body}
					ts={msg.ts}
					isSelf={currentUserName != null && msg.sender === currentUserName}
				/>
			{/each}
		{/if}
		<div class="cy-chat-cursor">$ _</div>
	</div>

	<ChatInput {onSend} bind:error={inputError} />
{/snippet}

{#if narrow}
	<button
		type="button"
		class="cy-btn cy-btn-sm"
		onclick={() => (drawerOpen = !drawerOpen)}
		aria-expanded={drawerOpen}
		aria-controls="cy-chat-drawer">// chat</button
	>
	{#if drawerOpen}
		<aside id="cy-chat-drawer" class="cy-chat cy-chat-drawer" aria-label="Chat">
			{@render panelBody()}
		</aside>
	{/if}
{:else}
	<aside class="cy-chat cy-chat-right" aria-label="Chat">
		{@render panelBody()}
	</aside>
{/if}
