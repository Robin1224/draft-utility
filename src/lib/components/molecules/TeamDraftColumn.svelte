<script>
	import DraftSlot from '$lib/components/atoms/DraftSlot.svelte';

	/**
	 * @typedef {{ team: 'A' | 'B', action: 'pick' | 'ban' }} ScriptEntry
	 * @typedef {{ turn_index: number, team: string, action: string, champion_id: string | null, created_at: string }} DraftAction
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 */

	/** @type {{ team: 'A' | 'B', label: string, script: ScriptEntry[], actions: DraftAction[], members: LobbyMember[] }} */
	let { team, label, script, actions, members } = $props();

	const accent = $derived(team === 'A' ? 'lime' : 'violet');

	const banSlots = $derived(() => {
		return script
			.map((entry, index) => ({ entry, index }))
			.filter(({ entry }) => entry.team === team && entry.action === 'ban')
			.map(({ index }) => {
				const act = actions.find((a) => a.turn_index === index);
				return { scriptIndex: index, championName: act?.champion_id ?? null };
			});
	});

	const pickSlots = $derived(() => {
		return script
			.map((entry, index) => ({ entry, index }))
			.filter(({ entry }) => entry.team === team && entry.action === 'pick')
			.map(({ index }) => {
				const act = actions.find((a) => a.turn_index === index);
				return { scriptIndex: index, championName: act?.champion_id ?? null };
			});
	});
</script>

<aside class="cy-draft-col cy-draft-col-{accent}">
	<div class="cy-draft-col-head">// TEAM_{team}</div>

	<div class="cy-draft-col-section">
		<div class="cy-draft-col-label">&gt; bans</div>
		{#each banSlots() as slot (slot.scriptIndex)}
			<DraftSlot action="ban" championName={slot.championName} {team} />
		{/each}
	</div>

	<div class="cy-draft-col-section">
		<div class="cy-draft-col-label">&gt; picks</div>
		{#each pickSlots() as slot (slot.scriptIndex)}
			<DraftSlot action="pick" championName={slot.championName} {team} />
		{/each}
	</div>
</aside>
