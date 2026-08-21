<script>
	import { resolve } from '$app/paths';
	import LobbyHostBar from '$lib/components/molecules/LobbyHostBar.svelte';
	import SpectatorsPanel from '$lib/components/molecules/SpectatorsPanel.svelte';
	import TeamColumn from '$lib/components/molecules/TeamColumn.svelte';
	import DraftBoard from '$lib/components/molecules/DraftBoard.svelte';
	import ChatPanel from '$lib/components/molecules/ChatPanel.svelte';
	import DraftReview from '$lib/components/molecules/DraftReview.svelte';
	import { fromStore } from 'svelte/store';
	import { lobby, joinTeam, kickMember, movePlayer, startDraft, cancelRoom } from '$live/room';
	import { pickBan } from '$live/draft';
	import {
		chatAll,
		chatTeamA,
		chatTeamB,
		chatSpectators,
		sendMessage,
		muteMember,
		unmuteMember
	} from '$live/chat';
	import { nanoid } from 'nanoid';
	import { DEFAULT_SCRIPT, DEFAULT_TIMER_MS } from '$lib/draft-script.js';

	let { data } = $props();

	const code = $derived(data.room.public_code);

	let streamVal = $derived.by(() => fromStore(lobby(code)).current);

	let actionError = $state(/** @type {string | null} */ (null));
	let copied = $state(false);

	// Settings state — lifted here so handleStart can read it for the RPC payload
	let draftScript = $state(DEFAULT_SCRIPT.map((turn) => ({ ...turn, id: nanoid(8) })));
	let timerSeconds = $state(DEFAULT_TIMER_MS / 1000); // 30
	/** @type {ReturnType<typeof setTimeout> | null} */
	let copyTimer = null;

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

	async function handlePickBan(/** @type {{ championId: string, action: string }} */ payload) {
		actionError = null;
		try {
			await pickBan(code, { championId: payload.championId, action: payload.action });
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	// ── Chat state ──

	// Tab state — controls which live stream is active (D-02, D-03)
	let activeTab = $state('all'); // 'all' | 'team' | 'spectator'

	// Derive user's role for chat channel selection
	const chatRole = $derived(isGuest ? 'guest' : 'player');

	// Determine the user's team from snapshot
	const userTeam = $derived(
		snapshot && data.userId
			? snapshot.teams.A.some((/** @type {any} */ m) => m.userId === data.userId)
				? 'A'
				: snapshot.teams.B.some((/** @type {any} */ m) => m.userId === data.userId)
					? 'B'
					: null
			: null
	);

	// Active chat stream based on tab selection
	const activeChatStream = $derived.by(() => {
		if (activeTab === 'all') return chatAll;
		if (activeTab === 'team') return userTeam === 'A' ? chatTeamA : chatTeamB;
		return chatSpectators; // 'spectator'
	});

	let chatStreamVal = $state(/** @type {any} */ (undefined));
	$effect(() => {
		const store = activeChatStream(code);
		// WR-04: drop the previous channel's messages immediately on resubscribe —
		// otherwise they render under the new tab until the new stream emits.
		chatStreamVal = undefined;
		const unsub = store.subscribe(
			/** @param {any} val */ (val) => {
				chatStreamVal = val;
			}
		);
		return unsub;
	});

	const chatMessages = $derived(
		chatStreamVal && typeof chatStreamVal === 'object' && 'messages' in chatStreamVal
			? (chatStreamVal.messages ?? [])
			: []
	);

	// mutedIds from lobby snapshot patch (published by muteMember/unmuteMember RPCs)
	const mutedIds = $derived(snapshot?.mutedIds ?? []);

	// Derive current user's display name from snapshot members
	const currentUserName = $derived(
		snapshot && data.userId
			? (snapshot.teams.A.concat(snapshot.teams.B ?? []).find(
					(/** @type {any} */ m) => m.userId === data.userId
				)?.displayName ?? null)
			: null
	);

	async function handleSendMessage(/** @type {{ body: string }} */ payload) {
		const channel =
			activeTab === 'all'
				? 'all'
				: activeTab === 'team'
					? userTeam === 'A'
						? 'teamA'
						: 'teamB'
					: 'spectators';
		try {
			await sendMessage(code, { body: payload.body, channel });
		} catch (e) {
			// Only surface VALIDATION errors (e.g. message too long) to the user
			if (e && typeof e === 'object' && 'code' in e && e.code === 'VALIDATION') {
				actionError = errMsg(e);
			}
			// Rate limit and slur drops are silent (no error shown)
		}
	}

	async function handleMute(/** @type {{ userId?: string, guestId?: string }} */ payload) {
		try {
			await muteMember(code, payload);
		} catch (e) {
			actionError = errMsg(e);
		}
	}

	async function handleUnmute(/** @type {{ userId?: string, guestId?: string }} */ payload) {
		try {
			await unmuteMember(code, payload);
		} catch (e) {
			actionError = errMsg(e);
		}
	}
</script>

<main>
	{#if actionError}
		<p class="cy-foot">{actionError}</p>
	{/if}

	{#if loading}
		<p class="cy-foot">// loading room…</p>
	{:else if loadError}
		{#if isGuest}
			<p class="cy-foot">
				<a href="/login?redirect=/draft/{code}">Sign in</a> to join this draft, or wait for the host to
				start it.
			</p>
		{:else}
			<p class="cy-foot">{errMsg(loadError)}</p>
		{/if}
	{:else if snapshot}
		{#if snapshot.phase === 'drafting' || snapshot.phase === 'cancelled'}
			<!-- Draft board: content area + ChatPanel sidebar (Plan 05 restyles the board itself) -->
			<div>
				<div>
					<DraftBoard {snapshot} userId={data.userId} onPickBan={handlePickBan} />
				</div>
			</div>
			<ChatPanel
				phase={snapshot.phase}
				role={chatRole}
				messages={chatMessages}
				{currentUserName}
				onSend={handleSendMessage}
				bind:activeTab
			/>
		{:else if snapshot.phase === 'review'}
			<!-- Review branch: full-width, no ChatPanel (D-09) -->
			<!-- Uses data.actions (SSR-loaded) as primary source; falls back to snapshot.actions -->
			<!-- for participants transitioning from live draft (Pitfall 2 / Open Question 3) -->
			<div class="cy-review">
				<div class="cy-review-head">
					<div>
						<div class="cy-review-eyebrow">// status: COMPLETE</div>
						<h2>$ DRAFT.RESULT()</h2>
					</div>
					<pre class="cy-review-receipt">code: {code}
turns: {(data.actions?.length ? data.actions : (snapshot.actions ?? [])).length}
status: complete</pre>
				</div>
				<DraftReview
					actions={data.actions?.length ? data.actions : (snapshot.actions ?? [])}
					teams={data.teams ?? snapshot.teams}
				/>
				<div class="cy-review-actions">
					<button type="button" class="cy-btn" onclick={copyLink} aria-label="Copy room link">
						$ COPY_LINK()
					</button>
					{#if copied}
						<span class="cy-foot" role="status">// copied</span>
					{/if}
					{#if actionError}
						<span class="cy-foot">{actionError}</span>
					{/if}
					<a href="/" class="cy-btn cy-btn-primary">$ NEW_DRAFT()</a>
				</div>
			</div>
		{:else}
			<!-- Lobby phase: cy-lobby content area + ChatPanel sidebar -->
			<div class="cy-lobby">
				<div class="cy-banner">
					<div>
						<div class="cy-banner-eyebrow">// status: AWAITING_HOST_SIGNAL</div>
						<h2>LOBBY.INIT()</h2>
						<p>&gt; assemble both teams. captains required. configure script via [CONFIG()].</p>
					</div>
					<div class="cy-banner-stats">
						<div>
							<b>{snapshot.teams.A.length + snapshot.teams.B.length}</b><span>PLAYERS</span>
						</div>
						<div><b>{snapshot.spectators.length}</b><span>SPECTATORS</span></div>
						<div><b>{snapshot.draftState?.script?.length ?? 10}</b><span>TURNS</span></div>
					</div>
				</div>

				<LobbyHostBar
					{isHost}
					{snapshot}
					{code}
					onKick={handleKick}
					onMove={handleMove}
					onStartDraft={handleStart}
					onCancelRoom={handleCancel}
					bind:script={draftScript}
					bind:timerSeconds
				/>

				<div>
					<button
						type="button"
						class="cy-btn cy-btn-sm"
						onclick={copyLink}
						aria-label="Copy room link"
					>
						$ COPY_LINK()
					</button>
					{#if copied}
						<span class="cy-foot">// copied</span>
					{/if}
				</div>

				<div class="cy-lobby-grid">
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

				<SpectatorsPanel
					spectators={snapshot.spectators}
					{isHost}
					{mutedIds}
					onMute={handleMute}
					onUnmute={handleUnmute}
				/>
			</div>
			<ChatPanel
				phase={snapshot.phase}
				role={chatRole}
				messages={chatMessages}
				{currentUserName}
				onSend={handleSendMessage}
				bind:activeTab
			/>
		{/if}
	{/if}
</main>
