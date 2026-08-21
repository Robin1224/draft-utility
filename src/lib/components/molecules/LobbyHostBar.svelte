<script>
	import CyModal from '$lib/components/atoms/CyModal.svelte';
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
	 *   code: string,
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
		code,
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

	let consoleOpen = $state(false);

	const hasCaptainA = $derived(snapshot.teams.A.some((m) => m.isCaptain));
	const hasCaptainB = $derived(snapshot.teams.B.some((m) => m.isCaptain));

	const startDisabled = $derived(snapshot.phase !== 'lobby' || !hasCaptainA || !hasCaptainB);

	const showCaptainHint = $derived(snapshot.phase === 'lobby' && (!hasCaptainA || !hasCaptainB));

	const rosterForKick = $derived([
		...snapshot.teams.A.map((m) => ({ ...m, side: 'A' })),
		...snapshot.teams.B.map((m) => ({ ...m, side: 'B' }))
	]);

	const movableUsers = $derived([...snapshot.teams.A, ...snapshot.teams.B].filter((m) => m.userId));

	const removableMembers = $derived(rosterForKick.filter((m) => !m.isHost));

	// WR-06: the bound moveUserId can go stale when the selected member leaves
	// or is kicked while the console is open — EXEC must only fire for someone
	// still on the live roster.
	const moveTargetValid = $derived(
		moveUserId !== '' && movableUsers.some((m) => m.userId === moveUserId)
	);

	/** @param {LobbyMember} m */
	function kickPayload(m) {
		if (m.userId) return { userId: m.userId };
		if (m.guestId) return { guestId: m.guestId };
		return {};
	}

	function submitMove() {
		if (!moveTargetValid) return; // WR-06: never fire onMove for a departed member
		onMove(moveUserId, moveTarget);
	}
</script>

{#if isHost}
	<section class="cy-host-panel" aria-label="Host controls">
		<div class="cy-host-head">[HOST_CONSOLE]</div>
		<div class="cy-host-row">
			{#if snapshot.phase === 'lobby'}
				<button type="button" class="cy-btn cy-btn-sm" onclick={() => (settingsOpen = true)}>
					CONFIG()
				</button>
				<button type="button" class="cy-btn cy-btn-sm" onclick={() => (consoleOpen = true)}>
					HOST_CONSOLE()
				</button>
			{/if}

			<div class="cy-grow"></div>

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

		<DraftSettingsPanel bind:open={settingsOpen} bind:script bind:timerSeconds />

		<CyModal bind:open={consoleOpen} title="~/draft/host_console">
			<div class="cy-modal-head">
				<h3>&gt; HOST_CONSOLE</h3>
				<p>// root@{code} — manage rosters before launch</p>
			</div>

			<div class="cy-hc-section">
				<span class="cy-field-label">move_player</span>
				<div class="cy-hc-row">
					<div class="cy-field">
						<select bind:value={moveUserId} class="cy-input" aria-label="Move player">
							<option value="">--move--</option>
							{#each movableUsers as m (m.userId)}
								<option value={m.userId}>{m.displayName}</option>
							{/each}
						</select>
					</div>
					<div class="cy-field" style="flex: 0 0 90px">
						<select bind:value={moveTarget} class="cy-input" aria-label="To team">
							<option value="A">→ A</option>
							<option value="B">→ B</option>
						</select>
					</div>
					<button
						type="button"
						class="cy-btn cy-btn-sm"
						onclick={submitMove}
						disabled={!moveTargetValid || snapshot.phase !== 'lobby'}
					>
						EXEC
					</button>
				</div>
			</div>

			<div class="cy-hc-section">
				<span class="cy-field-label">kick</span>
				{#if removableMembers.length === 0}
					<p class="cy-foot">// no removable players</p>
				{:else}
					<ul class="cy-kick-list">
						{#each removableMembers as m (`${m.userId ?? ''}-${m.guestId ?? ''}-${m.side}`)}
							<li class="cy-kick-item">
								<span class="cy-kick-name">{m.displayName}</span>
								<span class="cy-kick-team">team_{m.side}{m.isCaptain ? ' · cap' : ''}</span>
								<span class="cy-grow"></span>
								<button
									type="button"
									class="cy-kick-btn"
									aria-label="kick {m.displayName}"
									onclick={() => onKick(kickPayload(m))}
								>
									kick()
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if showCaptainHint}
				<div class="cy-hc-hint">both teams need a captain before START_DRAFT() unlocks</div>
			{/if}

			{#snippet footer()}
				<button type="button" class="cy-btn cy-btn-sm cy-btn-danger" onclick={onCancelRoom}>
					CANCEL_ROOM
				</button>
				<div class="cy-grow"></div>
				<button
					type="button"
					class="cy-btn cy-btn-primary cy-btn-sm"
					disabled={startDisabled}
					aria-disabled={startDisabled}
					onclick={onStartDraft}
				>
					▶ START_DRAFT()
				</button>
			{/snippet}
		</CyModal>
	</section>
{/if}
