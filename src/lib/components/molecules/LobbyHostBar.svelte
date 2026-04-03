<script>
	/**
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 * @typedef {{ phase: string, teams: { A: LobbyMember[], B: LobbyMember[] } }} LobbySnap
	 */

	/** @type {{ isHost: boolean, snapshot: LobbySnap, onKick: (p: { userId?: string, guestId?: string }) => void, onMove: (userId: string, toTeam: 'A' | 'B') => void, onStartDraft: () => void, onCancelRoom: () => void }} */
	let { isHost, snapshot, onKick, onMove, onStartDraft, onCancelRoom } = $props();

	let moveUserId = $state('');

	/** @type {'A' | 'B'} */
	let moveTarget = $state('A');

	const hasCaptainA = $derived(snapshot.teams.A.some((m) => m.isCaptain));
	const hasCaptainB = $derived(snapshot.teams.B.some((m) => m.isCaptain));

	const startDisabled = $derived(
		snapshot.phase !== 'lobby' || !hasCaptainA || !hasCaptainB
	);

	const showCaptainHint = $derived(snapshot.phase === 'lobby' && (!hasCaptainA || !hasCaptainB));

	const rosterForKick = $derived([
		...snapshot.teams.A.map((m) => ({ ...m, side: 'A' })),
		...snapshot.teams.B.map((m) => ({ ...m, side: 'B' }))
	]);

	const movableUsers = $derived(
		[...snapshot.teams.A, ...snapshot.teams.B].filter((m) => m.userId)
	);

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
	<section
		class="mt-4 flex flex-col gap-4 border-b border-bg-secondary pb-4"
		aria-label="Host controls"
	>
		<div class="flex flex-wrap items-end gap-3">
			<div class="flex min-w-[10rem] flex-col gap-1">
				<label for="host-move-user" class="text-xs font-medium text-text-tertiary">Move player</label>
				<select
					id="host-move-user"
					bind:value={moveUserId}
					class="rounded-md border border-bg-secondary bg-bg-primary px-2 py-1.5 text-sm text-text-primary"
				>
					<option value="">Select player</option>
					{#each movableUsers as m (m.userId)}
						<option value={m.userId}>{m.displayName}</option>
					{/each}
				</select>
			</div>
			<div class="flex min-w-[6rem] flex-col gap-1">
				<label for="host-move-team" class="text-xs font-medium text-text-tertiary">To team</label>
				<select
					id="host-move-team"
					bind:value={moveTarget}
					class="rounded-md border border-bg-secondary bg-bg-primary px-2 py-1.5 text-sm text-text-primary"
				>
					<option value="A">A</option>
					<option value="B">B</option>
				</select>
			</div>
			<button
				type="button"
				class="rounded-md border border-bg-secondary px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-bg-secondary"
				onclick={submitMove}
				disabled={!moveUserId || snapshot.phase !== 'lobby'}
			>
				Move
			</button>

			<div class="flex flex-wrap items-center gap-2 sm:ml-auto">
				<div class="flex flex-col items-start gap-1">
					<button
						type="button"
						class="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={startDisabled}
						aria-disabled={startDisabled}
						onclick={onStartDraft}
					>
						Start draft
					</button>
					{#if showCaptainHint}
						<span class="text-sm text-text-tertiary">Both teams need a captain</span>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:underline"
					onclick={onCancelRoom}
				>
					Cancel room
				</button>
			</div>
		</div>

		{#if snapshot.phase === 'lobby'}
			<div class="flex flex-col gap-2">
				<span class="text-xs font-semibold uppercase text-text-tertiary">Kick</span>
				<ul class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
					{#each rosterForKick as m (`${m.userId ?? ''}-${m.guestId ?? ''}-${m.side}`)}
						{#if !m.isHost}
							<li class="flex items-center gap-2 rounded-md border border-bg-secondary px-2 py-1">
								<span class="text-sm text-text-primary">{m.displayName}</span>
								<span class="text-xs text-text-tertiary">Team {m.side}</span>
								<button
									type="button"
									class="text-sm font-medium text-red-600 hover:underline"
									aria-label="Kick {m.displayName}"
									onclick={() => onKick(kickPayload(m))}
								>
									Kick
								</button>
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		{/if}
	</section>
{/if}
