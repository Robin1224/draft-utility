<script lang="ts">
	import {
		globalState,
	} from '$lib/state/state.svelte';
	import TeamCard from '$lib/components/molecules/TeamCard.svelte';
</script>

<main class="flex min-h-[calc(100vh-48px)] items-center justify-center p-4">
	<div
		class="w-full max-w-6xl rounded-2xl border border-border-card bg-background-alt p-6 shadow-card"
	>
		<div class="mb-6 text-center">
			<h1 class="font-display text-2xl text-foreground">Lobby</h1>
			<p class="mt-1 text-sm text-foreground-alt">Pick your teams</p>
		</div>

		<div class="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-4">
			<!-- Unassigned -->
			<TeamCard team={undefined} teamId={0} />

			<!-- Team A -->
			<TeamCard team={globalState.data.teamA} teamId={1} />

			<!-- Team B -->
			<TeamCard team={globalState.data.teamB} teamId={2} />
		</div>
	</div>
</main>

<style>
</style>
