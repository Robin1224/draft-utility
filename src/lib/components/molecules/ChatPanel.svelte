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
	const roleTabLabel = $derived(role === 'player' ? 'Team' : 'Spectator');
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
</script>

<section
	aria-label="Chat"
	class="flex h-full w-[280px] flex-shrink-0 flex-col rounded-md border border-bg-secondary bg-bg-primary"
>
	<div role="tablist" aria-label="Chat channels" class="flex gap-0 border-b border-bg-secondary px-3 pt-2">
		{#if showAllTab}
			<button
				role="tab"
				aria-selected={activeTab === 'all'}
				tabindex={activeTab === 'all' ? 0 : -1}
				type="button"
				class="mr-4 pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 {activeTab === 'all'
					? 'border-b-2 border-amber-500 text-sm font-semibold text-text-primary'
					: 'text-sm font-normal text-text-tertiary hover:text-text-primary'}"
				onclick={() => (activeTab = 'all')}
			>All</button>
		{/if}
		<button
			role="tab"
			aria-selected={activeTab === roleTabKey}
			tabindex={activeTab === roleTabKey ? 0 : -1}
			type="button"
			class="pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 {activeTab === roleTabKey
				? 'border-b-2 border-amber-500 text-sm font-semibold text-text-primary'
				: 'text-sm font-normal text-text-tertiary hover:text-text-primary'}"
			onclick={() => (activeTab = roleTabKey)}
		>{roleTabLabel}</button>
	</div>

	<div
		bind:this={listEl}
		role="log"
		aria-live="polite"
		aria-label="Messages"
		class="flex-1 overflow-y-auto px-3 py-2"
	>
		{#if messages.length === 0}
			<div class="flex h-full flex-col items-center justify-center gap-1 text-center">
				<p class="text-sm font-semibold text-text-primary">No messages yet</p>
				<p class="text-sm text-text-tertiary">Be the first to say something.</p>
			</div>
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
	</div>

	<div class="border-t border-bg-secondary p-3">
		<ChatInput {onSend} bind:error={inputError} />
	</div>
</section>
