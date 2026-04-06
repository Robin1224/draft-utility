<script>
	import classes from '$lib/catalog/classes.json' with { type: 'json' };
	import DraftSlot from '$lib/components/atoms/DraftSlot.svelte';

	/**
	 * @type {{
	 *   actions: Array<{ team: string, action: string, champion_id: string | null }>,
	 *   teams: { A: any[], B: any[] }
	 * }}
	 */
	let { actions, teams } = $props();

	// Resolve champion_id to display name; skip null champion_id (timeout slots)
	const resolvedBansA = $derived(
		actions
			.filter((a) => a.team === 'A' && a.action === 'ban' && a.champion_id != null)
			.map((a) => classes.find((c) => c.id === a.champion_id)?.name ?? a.champion_id)
	);

	const resolvedPicksA = $derived(
		actions
			.filter((a) => a.team === 'A' && a.action === 'pick' && a.champion_id != null)
			.map((a) => classes.find((c) => c.id === a.champion_id)?.name ?? a.champion_id)
	);

	const resolvedBansB = $derived(
		actions
			.filter((a) => a.team === 'B' && a.action === 'ban' && a.champion_id != null)
			.map((a) => classes.find((c) => c.id === a.champion_id)?.name ?? a.champion_id)
	);

	const resolvedPicksB = $derived(
		actions
			.filter((a) => a.team === 'B' && a.action === 'pick' && a.champion_id != null)
			.map((a) => classes.find((c) => c.id === a.champion_id)?.name ?? a.champion_id)
	);

	const isEmpty = $derived(
		resolvedBansA.length === 0 &&
			resolvedPicksA.length === 0 &&
			resolvedBansB.length === 0 &&
			resolvedPicksB.length === 0
	);
</script>

<div class="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
	{#if isEmpty}
		<p class="col-span-full text-center text-sm text-text-secondary">
			Draft ended without picks or bans.
		</p>
	{:else}
		<!-- Team A column -->
		<div class="flex flex-col gap-4">
			<h2 class="text-xl font-semibold text-text-primary">Team A</h2>
			{#if resolvedBansA.length > 0}
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase text-text-secondary">Bans</span>
					{#each resolvedBansA as ban}
						<DraftSlot action="ban" championName={ban} team="A" />
					{/each}
				</div>
			{/if}
			{#if resolvedPicksA.length > 0}
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase text-text-secondary">Picks</span>
					{#each resolvedPicksA as pick}
						<DraftSlot action="pick" championName={pick} team="A" />
					{/each}
				</div>
			{/if}
		</div>
		<!-- Team B column -->
		<div class="flex flex-col gap-4">
			<h2 class="text-xl font-semibold text-text-primary">Team B</h2>
			{#if resolvedBansB.length > 0}
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase text-text-secondary">Bans</span>
					{#each resolvedBansB as ban}
						<DraftSlot action="ban" championName={ban} team="B" />
					{/each}
				</div>
			{/if}
			{#if resolvedPicksB.length > 0}
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase text-text-secondary">Picks</span>
					{#each resolvedPicksB as pick}
						<DraftSlot action="pick" championName={pick} team="B" />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
