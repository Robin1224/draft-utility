<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/**
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 */

	/** @type {{ label: string, members?: LobbyMember[], teamKey: 'A' | 'B', isGuest: boolean, canJoin: boolean, full: boolean, onJoin: () => void }} */
	let { label, members = [], teamKey, isGuest, canJoin, full, onJoin } = $props();

	const loginHref = $derived(
		`${resolve('/login')}?redirect=${encodeURIComponent(page.url.pathname + page.url.search)}`
	);

	const accent = $derived(teamKey === 'A' ? 'lime' : 'violet');

	const slotIndices = [0, 1, 2];
</script>

<div class="cy-team cy-team-{accent}" aria-label={label}>
	<div class="cy-team-head">
		<span class="cy-bracket">[</span>TEAM_{teamKey}<span class="cy-bracket">]</span><span
			class="cy-team-status">{members.length}/3</span
		>
	</div>
	<ul class="cy-slot-list">
		{#each slotIndices as slot (slot)}
			{#if members[slot]}
				<li class="cy-slot">
					<span class="cy-slot-num">[{String(slot).padStart(2, '0')}]</span>
					<span class="cy-slot-name">{members[slot].displayName}</span>
					{#if members[slot].isCaptain}
						<span class="cy-tag cy-tag-cap">CAPTAIN</span>
					{/if}
					{#if members[slot].isHost}
						<span class="cy-tag">HOST</span>
					{/if}
				</li>
			{:else}
				<li class="cy-slot cy-slot-empty">
					<span class="cy-slot-num">[{String(slot).padStart(2, '0')}]</span>
					<span class="cy-slot-name">&lt;EMPTY&gt;</span>
				</li>
			{/if}
		{/each}
	</ul>

	{#if canJoin && !full && !isGuest}
		<button type="button" class="cy-btn cy-btn-{accent} cy-btn-block" onclick={onJoin}>
			JOIN_TEAM_{teamKey}()
		</button>
	{:else if isGuest}
		<a href={loginHref} class="cy-btn cy-btn-ghost cy-btn-block">SIGN_IN_TO_JOIN()</a>
	{:else if full && !isGuest && canJoin}
		<p class="cy-foot">// team full</p>
	{/if}
</div>
