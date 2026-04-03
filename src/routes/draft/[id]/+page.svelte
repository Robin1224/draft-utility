<script>
	import { resolve } from '$app/paths';
	import Phases from '$lib/components/atoms/Phases.svelte';
	import LobbyHostBar from '$lib/components/molecules/LobbyHostBar.svelte';
	import Header from '$lib/components/molecules/Header.svelte';
	import SpectatorsPanel from '$lib/components/molecules/SpectatorsPanel.svelte';
	import TeamColumn from '$lib/components/molecules/TeamColumn.svelte';
	import { fromStore } from 'svelte/store';
	import { lobby, joinTeam, kickMember, movePlayer, startDraft, cancelRoom } from '$live/room';
	import { nanoid } from 'nanoid';
	import { DEFAULT_SCRIPT, DEFAULT_TIMER_MS } from '$lib/draft-script.js';

	let { data } = $props();

	const code = $derived(data.room.public_code);

	let streamVal = $derived.by(() => fromStore(lobby(code)).current);

	let actionError = $state(/** @type {string | null} */ (null));
	let copied = $state(false);

	// Settings state — lifted here so handleStart can read it for the RPC payload
	let draftScript = $state(
		DEFAULT_SCRIPT.map((turn) => ({ ...turn, id: nanoid(8) }))
	);
	let timerSeconds = $state(DEFAULT_TIMER_MS / 1000); // 30
	/** @type {ReturnType<typeof setTimeout> | null} */
	let copyTimer = null;

	/** @param {string} phase */
	function phaseForPhases(phase) {
		if (phase === 'drafting' || phase === 'review') return phase;
		return 'lobby';
	}

	const roomPhaseForStrip = $derived(
		streamVal && typeof streamVal === 'object' && !('error' in streamVal)
			? phaseForPhases(streamVal.phase)
			: phaseForPhases(data.room.phase)
	);

	const snapshot = $derived(
		streamVal && typeof streamVal === 'object' && !('error' in streamVal) ? streamVal : null
	);

	const loadError = $derived(
		streamVal && typeof streamVal === 'object' && 'error' in streamVal ? streamVal.error : null
	);

	const loading = $derived(streamVal === undefined);

	const isGuest = $derived(data.userId == null);
	const isHost = $derived(data.userId != null && data.userId === data.room.host_user_id);

	const onTeam = $derived(
		snapshot && data.userId
			? [...snapshot.teams.A, ...snapshot.teams.B].some((m) => m.userId === data.userId)
			: false
	);

	const canJoin = $derived(!!snapshot && !!data.userId && !onTeam && snapshot.phase === 'lobby');

	const fullA = $derived(snapshot ? snapshot.teams.A.length >= 3 : false);
	const fullB = $derived(snapshot ? snapshot.teams.B.length >= 3 : false);

	const draftPath = $derived(resolve('/draft/[id]', { id: code }));
	const fullUrl = $derived(`${data.appOrigin}${draftPath}`);

	/** @param {unknown} e */
	function errMsg(e) {
		if (e && typeof e === 'object' && 'message' in e)
			return String(/** @type {{ message: unknown }} */ (e).message);
		return 'Something went wrong';
	}

	async function copyLink() {
		actionError = null;
		try {
			await navigator.clipboard.writeText(fullUrl);
			if (copyTimer) clearTimeout(copyTimer);
			copied = true;
			copyTimer = setTimeout(() => {
				copied = false;
				copyTimer = null;
			}, 2000);
		} catch {
			actionError = 'Could not copy link';
		}
	}

	async function handleJoinA() {
		actionError = null;
		try {
			await joinTeam(code, 'A');
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	async function handleJoinB() {
		actionError = null;
		try {
			await joinTeam(code, 'B');
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	async function handleKick(/** @type {{ userId?: string, guestId?: string }} */ payload) {
		actionError = null;
		try {
			await kickMember(code, payload);
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	async function handleMove(/** @type {string} */ userId, /** @type {'A' | 'B'} */ toTeam) {
		actionError = null;
		try {
			await movePlayer(code, { userId, toTeam });
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	async function handleStart() {
		actionError = null;
		try {
			// Strip client-only 'id' field; convert timerSeconds to ms
			const script = draftScript.map(({ team, action }) => ({ team, action }));
			const timerMs = timerSeconds * 1000;
			await startDraft(code, { script, timerMs });
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	async function handleCancel() {
		actionError = null;
		try {
			await cancelRoom(code);
		} catch (e) {
			actionError = errMsg(e);
		}
	}
</script>

<Header>
	<Phases roomPhase={roomPhaseForStrip} />
</Header>

<main class="mx-auto max-w-4xl px-4 py-6 text-text-primary">
	{#if actionError}
		<p class="mb-4 text-sm text-red-600">{actionError}</p>
	{/if}

	{#if loading}
		<p class="text-text-secondary">Loading room…</p>
	{:else if loadError}
		{#if isGuest}
			<p class="text-text-secondary">
				<a href="/login?redirect=/draft/{code}" class="underline hover:text-text-primary"
					>Sign in</a
				> to join this draft, or wait for the host to start it.
			</p>
		{:else}
			<p class="text-red-600">{errMsg(loadError)}</p>
		{/if}
	{:else if snapshot}
		<LobbyHostBar
			isHost={isHost}
			{snapshot}
			onKick={handleKick}
			onMove={handleMove}
			onStartDraft={handleStart}
			onCancelRoom={handleCancel}
			bind:script={draftScript}
			bind:timerSeconds={timerSeconds}
		/>

		<div class="mb-6 flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="rounded-md border border-bg-secondary px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary"
				onclick={copyLink}
				aria-label="Copy room link"
			>
				Copy link
			</button>
			{#if copied}
				<span class="text-sm text-green-600">Copied</span>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<TeamColumn
				label="Team A"
				members={snapshot.teams.A}
				teamKey="A"
				{isGuest}
				{canJoin}
				full={fullA}
				onJoin={handleJoinA}
			/>
			<TeamColumn
				label="Team B"
				members={snapshot.teams.B}
				teamKey="B"
				{isGuest}
				{canJoin}
				full={fullB}
				onJoin={handleJoinB}
			/>
		</div>

		<SpectatorsPanel spectators={snapshot.spectators} />
	{/if}
</main>
