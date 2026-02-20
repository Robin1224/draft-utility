<script lang="ts">
	import { onDestroy } from 'svelte';
	import LobbyCard from '$lib/components/organisms/LobbyCard.svelte';
	import { globalState, connectToParty, getSocket } from '$lib/state/state.svelte.js';

	let { data } = $props();

	const roomId = $derived(data.roomId);
	const session = $derived(data.session);

	$effect(() => {
		if (session) {
			connectToParty(session, roomId);
		}
	});

	onDestroy(() => {
		getSocket()?.close();
	});
</script>

<!-- {#if !username}
	<UsernameModal bind:isOpen={isUsernameModalOpen} />
{/if} -->

{#if globalState.data.phase === 'lobby'}
	<LobbyCard />
{:else if globalState.data.phase === 'drafting'}
	<h1>Drafting</h1>
	<p>Drafting in progress...</p>
{:else if globalState.data.phase === 'done'}
	<h1>Done</h1>
	<p>Drafting is done...</p>
{/if}
