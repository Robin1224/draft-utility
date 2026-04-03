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

	const joinLabel = $derived(teamKey === 'A' ? 'Join Team A' : 'Join Team B');

	const slotIndices = [0, 1, 2];
</script>

<h2 class="text-xl font-semibold text-text-primary">{label}</h2>
<ul class="mt-3 flex flex-col gap-2">
	{#each slotIndices as slot (slot)}
		<li
			class="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-bg-secondary bg-bg-primary px-3 py-2"
		>
			{#if members[slot]}
				<span class="font-medium text-text-primary">{members[slot].displayName}</span>
				{#if members[slot].isCaptain}
					<span
						class="rounded-full border border-bg-secondary bg-bg-secondary px-2 py-0.5 text-xs text-text-secondary"
						>Captain</span
					>
				{/if}
				{#if members[slot].isHost}
					<span
						class="rounded-full border border-text-tertiary px-2 py-0.5 text-xs text-text-secondary"
						>Host</span
					>
				{/if}
			{:else}
				<span class="text-sm text-text-tertiary">Open</span>
			{/if}
		</li>
	{/each}
</ul>

{#if canJoin && !full && !isGuest}
	<button
		type="button"
		class="mt-4 w-full cursor-pointer rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
		onclick={onJoin}
	>
		{joinLabel}
	</button>
{:else if isGuest}
	<p class="mt-4 text-sm text-text-tertiary">
		<a href={loginHref} class="font-medium text-amber-600 underline hover:text-amber-500"
			>Sign in</a
		>
		to join a team.
	</p>
{:else if full && !isGuest && canJoin}
	<p class="mt-4 text-sm text-text-tertiary">Team full</p>
{/if}
