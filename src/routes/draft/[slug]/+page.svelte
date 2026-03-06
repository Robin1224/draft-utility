<script lang="ts">
	import { onDestroy } from 'svelte';
	import Lobby from '$lib/components/organisms/Lobby.svelte';
	// import Drafting from '$lib/components/organisms/Drafting.svelte';
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
	<Lobby />
{:else if globalState.data.phase === 'drafting'}
	<!-- <Drafting /> -->
{:else if globalState.data.phase === 'done'}
	<h1>Done</h1>
	<p>Drafting is done...</p>
{/if}
