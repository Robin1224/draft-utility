<script>
	import TimerDisplay from '$lib/components/atoms/TimerDisplay.svelte';

	/**
	 * @typedef {{ team: 'A' | 'B', action: 'pick' | 'ban' }} ScriptEntry
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 * @typedef {{ script: ScriptEntry[], turnIndex: number, turnEndsAt: string, timerMs: number, paused?: boolean, graceEndsAt?: string }} DraftState
	 */

	/** @type {{ draftState: DraftState, teams: { A: LobbyMember[], B: LobbyMember[] } }} */
	let { draftState, teams } = $props();

	const currentTurn = $derived(draftState.script[draftState.turnIndex]);
	const activeTeam = $derived(currentTurn.team);
	const accent = $derived(activeTeam === 'A' ? 'lime' : 'violet');

	const captainName = $derived(() => {
		const captain = teams[activeTeam]?.find((m) => m.isCaptain);
		return captain ? captain.displayName : 'Captain';
	});
</script>

<div class="cy-turn cy-turn-{accent}">
	<div class="cy-turn-readout">
		<span class="cy-turn-label"
			>$ TURN_{String(draftState.turnIndex + 1).padStart(2, '0')}/{draftState.script.length}</span
		>
		<span class="cy-turn-team">TEAM_{activeTeam} :: {currentTurn.action.toUpperCase()}</span>
		<span class="cy-turn-cap">cap=&gt;{captainName()}</span>
	</div>
	<TimerDisplay turnEndsAt={draftState.turnEndsAt} timerMs={draftState.timerMs} {accent} />
	<div class="cy-turn-pips">
		{#each draftState.script as t, i (i)}
			<span
				class="cy-pip cy-pip-{t.team === 'A' ? 'lime' : 'violet'} cy-pip-{t.action} {i <
				draftState.turnIndex
					? 'is-done'
					: i === draftState.turnIndex
						? 'is-active'
						: ''}">{t.action === 'ban' ? '▲' : '■'}</span
			>
		{/each}
	</div>
</div>
