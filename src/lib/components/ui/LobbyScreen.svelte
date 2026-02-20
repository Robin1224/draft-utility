<script lang="ts">
    import { globalState } from '$lib/state/state.svelte';
</script>

<main>
    <h1>Lobby</h1>
    <p>Waiting for players to join...</p>
    <ul>
        {#each globalState.data.players as player}
            <li>{player.id} - {player.username ?? 'Anonymous'}</li>
        {/each}
    </ul>
</main>