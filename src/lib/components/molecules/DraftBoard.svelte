<script>
	import { goto } from '$app/navigation';
	import classes from '$lib/catalog/classes.json' with { type: 'json' };
	import TurnIndicator from '$lib/components/molecules/TurnIndicator.svelte';
	import TeamDraftColumn from '$lib/components/molecules/TeamDraftColumn.svelte';
	import ChampionGrid from '$lib/components/molecules/ChampionGrid.svelte';
	import PauseOverlay from '$lib/components/molecules/PauseOverlay.svelte';
	import StatusBanner from '$lib/components/atoms/StatusBanner.svelte';

	/**
	 * @typedef {{ id: string, room_id: string, turn_index: number, team: string, action: string, champion_id: string | null, created_at: string }} DraftAction
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 * @typedef {{ script: Array<{ team: 'A' | 'B', action: 'pick' | 'ban' }>, turnIndex: number, turnEndsAt: string, timerMs: number, paused?: boolean, pausedUserId?: string, graceEndsAt?: string }} DraftState
	 * @typedef {{ publicCode: string, roomId: string, phase: string, hostUserId: string, teams: { A: LobbyMember[], B: LobbyMember[] }, spectators: LobbyMember[], draftState: DraftState, actions: DraftAction[] }} Snapshot
	 */

	/** @type {{ snapshot: Snapshot, userId: string | null, onPickBan: (payload: { championId: string, action: string }) => void, justReconnected?: boolean }} */
	let { snapshot, userId, onPickBan, justReconnected = false } = $props();

	const currentTurn = $derived(
		snapshot.draftState?.script?.[snapshot.draftState.turnIndex] ?? null
	);

	const usedIds = $derived(
		snapshot.actions.filter((a) => a.champion_id != null).map((a) => a.champion_id ?? '')
	);

	const isActiveCaptain = $derived((() => {
		if (!userId || !currentTurn) return false;
		const teamMembers = snapshot.teams[currentTurn.team] ?? [];
		return teamMembers.some((m) => m.userId === userId && m.isCaptain);
	})());

	const pausedCaptainName = $derived((() => {
		const pausedId = snapshot.draftState?.pausedUserId;
		if (!pausedId) return 'Captain';
		for (const t of /** @type {Array<'A' | 'B'>} */ (['A', 'B'])) {
			const found = (snapshot.teams[t] ?? []).find((m) => m.userId === pausedId);
			if (found) return found.displayName;
		}
		return 'Captain';
	})());

	/** @type {string | null} */
	let promotionBanner = $state(null);
	let prevPaused = $state(false);

	$effect(() => {
		const paused = snapshot.draftState?.paused ?? false;
		if (prevPaused && !paused) {
			// Grace resolved — find who is now captain of the previously-paused team
			const pausedTeam = currentTurn?.team;
			if (pausedTeam) {
				const newCaptain = (snapshot.teams[pausedTeam] ?? []).find((m) => m.isCaptain);
				if (newCaptain) {
					promotionBanner = `${newCaptain.displayName} is now captain for Team ${pausedTeam}. Draft resumes.`;
				}
			}
		}
		prevPaused = paused;
	});

	let showReconnectBanner = $state(false);

	$effect(() => {
		if (justReconnected) {
			showReconnectBanner = true;
		}
	});

	/** @param {string} team */
	function cancelledTeamLabel(team) {
		return team ? `Team ${team}` : 'a team';
	}

	const cancelledTeam = $derived((() => {
		if (snapshot.phase !== 'cancelled') return null;
		// Find which team had no available captain
		for (const t of /** @type {Array<'A' | 'B'>} */ (['A', 'B'])) {
			const hasCaptain = (snapshot.teams[t] ?? []).some((m) => m.isCaptain);
			if (!hasCaptain) return t;
		}
		return 'Unknown';
	})());
</script>

{#if showReconnectBanner}
	<StatusBanner
		message="Reconnected — syncing…"
		variant="positive"
		onDismiss={() => {
			showReconnectBanner = false;
		}}
	/>
{/if}
{#if promotionBanner}
	<StatusBanner
		message={promotionBanner}
		variant="positive"
		onDismiss={() => {
			promotionBanner = null;
		}}
	/>
{/if}

{#if snapshot.draftState?.paused}
	<PauseOverlay
		captainName={pausedCaptainName}
		graceEndsAt={snapshot.draftState.graceEndsAt ?? ''}
		timerMs={30000}
	/>
{/if}

{#if snapshot.phase === 'cancelled'}
	<div class="flex flex-col items-center gap-4 py-16 text-center">
		<h2 class="text-xl font-semibold text-text-primary">Draft cancelled</h2>
		<p class="text-sm text-text-secondary">
			No captain was available for {cancelledTeamLabel(cancelledTeam ?? '')}. The draft could not
			continue.
		</p>
		<button
			type="button"
			class="rounded-md border border-bg-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary"
			onclick={() => goto('/')}
		>
			Return to lobby
		</button>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#if currentTurn && snapshot.draftState}
			<TurnIndicator draftState={snapshot.draftState} teams={snapshot.teams} />
		{/if}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr_280px]">
			<TeamDraftColumn
				team="A"
				label="Team A"
				script={snapshot.draftState?.script ?? []}
				actions={snapshot.actions}
				members={snapshot.teams.A}
			/>
			<ChampionGrid
				champions={classes}
				usedIds={usedIds}
				isActiveCaptain={isActiveCaptain}
				currentAction={currentTurn?.action ?? 'pick'}
				onSubmit={onPickBan}
			/>
			<TeamDraftColumn
				team="B"
				label="Team B"
				script={snapshot.draftState?.script ?? []}
				actions={snapshot.actions}
				members={snapshot.teams.B}
			/>
		</div>
	</div>
{/if}
