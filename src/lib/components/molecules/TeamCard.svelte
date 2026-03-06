<script lang="ts">
	import Player from '$lib/components/molecules/Player.svelte';
	import type { Player as PlayerType, TeamState } from '$lib/shared/types';
	import {
		changeTeam,
		getCurrentPlayer,
		getUnassignedPlayers,
		getTeam1Players,
		getTeam2Players
	} from '$lib/state/state.svelte';

	let {
		team = undefined,
		teamId
	}: {
		team: TeamState | undefined;
		/** 0 = unassigned, 1 = Team A, 2 = Team B */
		teamId: 0 | 1 | 2;
	} = $props();

	const currentPlayer = $derived(getCurrentPlayer());
	const teamMembers = $derived.by((): PlayerType[] => {
		if (teamId === 0) return getUnassignedPlayers();
		if (teamId === 1) return getTeam1Players();
		return getTeam2Players();
	});
</script>

<section class="min-w-0 flex-1 rounded-xl border border-border-card bg-background p-4">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			{team?.name ?? 'Waiting'}
		</h2>
		{#if currentPlayer?.team === undefined && teamId !== 0}
			<button
				type="button"
				class="rounded-md border border-border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1"
				onclick={() => {
					if (currentPlayer?.id) changeTeam(teamId, currentPlayer.id);
				}}
			>
				Join {team?.name ?? 'Team A'}
			</button>
		{:else if currentPlayer?.team === teamId}
			<button
				type="button"
				class="rounded-md border border-border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1"
				onclick={() => {
					if (currentPlayer?.id) changeTeam(0, currentPlayer.id);
				}}
			>
				Leave
			</button>
		{/if}
		<span
			class="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground-alt tabular-nums"
		>
			{teamMembers.length}
		</span>
	</div>
	<ul class="space-y-1">
		{#each teamMembers as player (player.id)}
			{@const isYou = player.id === currentPlayer?.id}
			<li
				class="flex flex-wrap items-center gap-2 rounded-lg py-2 {isYou ? 'bg-accent/40 px-2' : ''}"
			>
				<Player {player} {isYou} />
			</li>
		{/each}
	</ul>
	{#if teamMembers.length === 0}
		<p class="py-4 text-center text-xs text-muted-foreground">Everyone has joined a team</p>
	{/if}
</section>
