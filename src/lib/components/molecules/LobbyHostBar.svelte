<script>
	import DraftSettingsPanel from './DraftSettingsPanel.svelte';

	/**
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 * @typedef {{ phase: string, teams: { A: LobbyMember[], B: LobbyMember[] } }} LobbySnap
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/**
	 * @type {{
	 *   isHost: boolean,
	 *   snapshot: LobbySnap,
	 *   onKick: (p: { userId?: string, guestId?: string }) => void,
	 *   onMove: (userId: string, toTeam: 'A' | 'B') => void,
	 *   onStartDraft: () => void,
	 *   onCancelRoom: () => void,
	 *   script: ScriptTurn[],
	 *   timerSeconds: number
	 * }}
	 */
	let {
		isHost,
		snapshot,
		onKick,
		onMove,
		onStartDraft,
		onCancelRoom,
		script = $bindable([]),
		timerSeconds = $bindable(30)
	} = $props();

	let moveUserId = $state('');

	/** @type {'A' | 'B'} */
	let moveTarget = $state('A');

	let settingsOpen = $state(false);

	const hasCaptainA = $derived(snapshot.teams.A.some((m) => m.isCaptain));
	const hasCaptainB = $derived(snapshot.teams.B.some((m) => m.isCaptain));

	const startDisabled = $derived(snapshot.phase !== 'lobby' || !hasCaptainA || !hasCaptainB);

	const showCaptainHint = $derived(snapshot.phase === 'lobby' && (!hasCaptainA || !hasCaptainB));

	const rosterForKick = $derived([
		...snapshot.teams.A.map((m) => ({ ...m, side: 'A' })),
		...snapshot.teams.B.map((m) => ({ ...m, side: 'B' }))
	]);

	const movableUsers = $derived([...snapshot.teams.A, ...snapshot.teams.B].filter((m) => m.userId));

	/** @param {LobbyMember} m */
	function kickPayload(m) {
		if (m.userId) return { userId: m.userId };
		if (m.guestId) return { guestId: m.guestId };
		return {};
	}

	function submitMove() {
		if (!moveUserId) return;
		onMove(moveUserId, moveTarget);
	}
</script>

{#if isHost}
	<section class="cy-host-panel" aria-label="Host controls">
		<div class="cy-host-head">[HOST_CONSOLE]</div>
		<div class="cy-host-row">
			<select id="host-move-user" bind:value={moveUserId} class="cy-input" aria-label="Move player">
				<option value="">--move--</option>
				{#each movableUsers as m (m.userId)}
					<option value={m.userId}>{m.displayName}</option>
				{/each}
			</select>
			<select id="host-move-team" bind:value={moveTarget} class="cy-input" aria-label="To team">
				<option value="A">A</option>
				<option value="B">B</option>
			</select>
			<button
				type="button"
				class="cy-btn cy-btn-sm"
				onclick={submitMove}
				disabled={!moveUserId || snapshot.phase !== 'lobby'}
			>
				EXEC
			</button>

			{#if snapshot.phase === 'lobby'}
				<button
					type="button"
					class="cy-btn cy-btn-sm"
					aria-expanded={settingsOpen}
					aria-controls="draft-settings-panel"
					onclick={() => (settingsOpen = !settingsOpen)}
				>
					CONFIG
				</button>
			{/if}

			<div class="cy-grow"></div>

			<button type="button" class="cy-btn cy-btn-sm cy-btn-danger" onclick={onCancelRoom}>
				CANCEL
			</button>
			<button
				type="button"
				class="cy-btn cy-btn-primary"
				disabled={startDisabled}
				aria-disabled={startDisabled}
				onclick={onStartDraft}
			>
				▶ START_DRAFT()
			</button>
		</div>

		{#if showCaptainHint}
			<span class="cy-foot">// both teams need a captain</span>
		{/if}

		{#if snapshot.phase === 'lobby' && settingsOpen}
			<DraftSettingsPanel bind:script bind:timerSeconds />
		{/if}

		{#if snapshot.phase === 'lobby'}
			<div class="cy-spec">
				<div class="cy-spec-head">// KICK</div>
				<div class="cy-spec-list">
					{#each rosterForKick as m (`${m.userId ?? ''}-${m.guestId ?? ''}-${m.side}`)}
						{#if !m.isHost}
							<div class="cy-spec-pill">
								{m.displayName} · Team {m.side}
								<button
									type="button"
									class="cy-btn cy-btn-sm cy-btn-danger"
									aria-label="Kick {m.displayName}"
									onclick={() => onKick(kickPayload(m))}
								>
									KICK
								</button>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</section>
{/if}
