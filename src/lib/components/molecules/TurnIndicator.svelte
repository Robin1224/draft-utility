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

	const captainName = $derived(() => {
		const captain = teams[activeTeam]?.find((m) => m.isCaptain);
		return captain ? captain.displayName : 'Captain';
	});

	const turnHeading = $derived(
		`Team ${activeTeam} \u2014 ${currentTurn.action === 'pick' ? 'Pick' : 'Ban'}`
	);
</script>

<div class="flex flex-col items-center gap-2 py-4 text-center">
	<h2 class="text-xl font-semibold text-text-primary">{turnHeading}</h2>
	<p class="text-sm text-text-secondary">{captainName()}'s turn</p>
	<div class="w-48">
		<TimerDisplay turnEndsAt={draftState.turnEndsAt} timerMs={draftState.timerMs} />
	</div>
</div>
