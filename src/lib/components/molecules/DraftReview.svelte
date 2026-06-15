<script>
	import classes from '$lib/catalog/classes.json' with { type: 'json' };

	/**
	 * @type {{
	 *   actions: Array<{ team: string, action: string, champion_id: string | null }>,
	 *   teams: { A: any[], B: any[] }
	 * }}
	 */
	let { actions, teams } = $props();

	/** @param {string} id */
	const lookup = (id) => classes.find((c) => c.id === id) ?? { id, name: id, role: 'melee' };

	// Resolve champion_id to full champ object {name, role}; skip null champion_id (timeout slots)
	const picksA = $derived(
		actions
			.filter((a) => a.team === 'A' && a.action === 'pick' && a.champion_id != null)
			.map((a) => lookup(/** @type {string} */ (a.champion_id)))
	);
	const bansA = $derived(
		actions
			.filter((a) => a.team === 'A' && a.action === 'ban' && a.champion_id != null)
			.map((a) => lookup(/** @type {string} */ (a.champion_id)))
	);
	const picksB = $derived(
		actions
			.filter((a) => a.team === 'B' && a.action === 'pick' && a.champion_id != null)
			.map((a) => lookup(/** @type {string} */ (a.champion_id)))
	);
	const bansB = $derived(
		actions
			.filter((a) => a.team === 'B' && a.action === 'ban' && a.champion_id != null)
			.map((a) => lookup(/** @type {string} */ (a.champion_id)))
	);

	const isEmpty = $derived(
		picksA.length === 0 && bansA.length === 0 && picksB.length === 0 && bansB.length === 0
	);

	/** @param {'A' | 'B'} t */
	const roster = (t) => (teams[t] ?? []).map((m) => '"' + m.displayName + '"').join(', ');

	const cols = $derived([
		{ team: /** @type {'A'} */ ('A'), accent: 'lime', picks: picksA, bans: bansA },
		{ team: /** @type {'B'} */ ('B'), accent: 'violet', picks: picksB, bans: bansB }
	]);
</script>

<div class="cy-review-grid">
	{#if isEmpty}
		<div class="cy-review-team">
			<div class="cy-review-team-head">// no_data — draft ended without picks or bans</div>
		</div>
	{:else}
		{#each cols as col (col.team)}
			<div class="cy-review-team cy-review-team-{col.accent}">
				<div class="cy-review-team-head">&gt; TEAM_{col.team}.roster = [{roster(col.team)}]</div>
				<div class="cy-review-picks">
					{#each col.picks as c, i (i)}
						<div class="cy-review-pick">
							<div class="cy-review-pick-art cy-champ-art-{c.role}">
								<span>{c.name.slice(0, 2)}</span>
							</div>
							<div class="cy-review-pick-name">{c.name}</div>
							<div class="cy-review-pick-role">.{c.role}</div>
						</div>
					{/each}
				</div>
				<div class="cy-review-bans">
					<span>BANS:</span>
					{#each col.bans as c, i (i)}
						<span class="cy-review-ban">{c.name}</span>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
