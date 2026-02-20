<script lang="ts">
	import { PartySocket } from 'partysocket';
	import { onDestroy } from 'svelte';
	import LobbyScreen from '$lib/components/ui/LobbyScreen.svelte';
	import { globalState } from '$lib/state/state.svelte.js';
	import UsernameModal from '$lib/components/ui/UsernameModal.svelte';

	let { data } = $props();

	const roomId = $derived(data.roomId);

	let socket: PartySocket | null = $state(null);
	// let username = $state(data.username ?? undefined);

    // let isUsernameModalOpen = $derived(username ? false : true);

	function connectToParty(): void {
		const s = new PartySocket({
			host: import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999',
			room: roomId
		});
		s.onmessage = (event: MessageEvent) => {
			const json = JSON.parse(event.data);
			console.log(json);
			switch (json.type) {
				case 'initial_state':
					globalState.data = json.data;
					break;
				case 'new_connection':
					globalState.data = json.data;
					break;
			    case 'connection_closed':
					globalState.data = json.data;
					break;
				default:
					console.error('Unknown message type:', json.type);
					break;
			}
			console.log($state.snapshot(globalState).data);
		};

		s.onopen = () => {
			s.send(
				JSON.stringify({
					type: 'join',
					// username: username
				})
			);
		};
		socket = s;
	}



	$effect(() => {
		// if (!isUsernameModalOpen) {
			connectToParty();
        // }
	});

	onDestroy(() => {
		socket?.close();
	});
</script>

<!-- {#if !username}
	<UsernameModal bind:isOpen={isUsernameModalOpen} />
{/if} -->

{#if globalState.data.phase === 'lobby'}
	<LobbyScreen />
{:else if globalState.data.phase === 'drafting'}
	<h1>Drafting</h1>
	<p>Drafting in progress...</p>
{:else if globalState.data.phase === 'done'}
	<h1>Done</h1>
	<p>Drafting is done...</p>
{/if}
