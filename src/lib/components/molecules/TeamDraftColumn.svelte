<script>
	import DraftSlot from '$lib/components/atoms/DraftSlot.svelte';

	/**
	 * @typedef {{ team: 'A' | 'B', action: 'pick' | 'ban' }} ScriptEntry
	 * @typedef {{ turn_index: number, team: string, action: string, champion_id: string | null, created_at: string }} DraftAction
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 */

	/** @type {{ team: 'A' | 'B', label: string, script: ScriptEntry[], actions: DraftAction[], members: LobbyMember[] }} */
	let { team, label, script, actions, members } = $props();

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

<div class="flex flex-col gap-4">
	<h2 class="text-xl font-semibold text-text-primary mb-2">{label}</h2>

	{#if banSlots().length > 0}
		<div class="flex flex-col gap-2">
			<span class="text-xs font-semibold uppercase text-text-secondary">BANS</span>
			{#each banSlots() as slot (slot.scriptIndex)}
				<DraftSlot action="ban" championName={slot.championName} {team} />
			{/each}
		</div>
	{/if}

	{#if pickSlots().length > 0}
		<div class="flex flex-col gap-2">
			<span class="text-xs font-semibold uppercase text-text-secondary">PICKS</span>
			{#each pickSlots() as slot (slot.scriptIndex)}
				<DraftSlot action="pick" championName={slot.championName} {team} />
			{/each}
		</div>
	{/if}
</div>
