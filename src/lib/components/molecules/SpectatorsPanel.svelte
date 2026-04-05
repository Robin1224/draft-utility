<script>
	/**
	 * Spectators list: collapsed by default at all breakpoints (per 02-05 plan; desktop-open was optional).
	 * Toggle via button — native button handles Enter/Space.
	 *
	 * @typedef {{ displayName: string, userId?: string | null, guestId?: string | null }} SpectatorRow
	 */

	import MuteButton from '$lib/components/atoms/MuteButton.svelte';

	/** @type {{ spectators?: SpectatorRow[], isHost?: boolean, mutedIds?: string[], onMute?: (p: { userId?: string, guestId?: string }) => void, onUnmute?: (p: { userId?: string, guestId?: string }) => void }} */
	let { spectators = [], isHost = false, mutedIds = [], onMute = () => {}, onUnmute = () => {} } = $props();

	let open = $state(false);
</script>

<div class="mt-6 border-t border-bg-secondary pt-4">
	<button
		type="button"
		class="flex w-full items-center justify-between gap-2 rounded-md py-2 text-left text-base font-semibold text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
		aria-expanded={open}
		aria-controls="spectators-panel"
		id="spectators-toggle"
		onclick={() => (open = !open)}
	>
		<span>Spectators ({spectators.length})</span>
		<svg
			class="h-5 w-5 shrink-0 text-text-tertiary transition-transform {open ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	<ul
		id="spectators-panel"
		class="mt-2 flex flex-col gap-1 rounded-md border border-bg-secondary p-3"
		aria-labelledby="spectators-toggle"
		hidden={!open}
	>
		{#if spectators.length === 0}
			<li class="text-sm text-text-tertiary">No spectators yet.</li>
		{:else}
			{#each spectators as row, i (`${row.userId ?? ''}-${row.guestId ?? ''}-${i}`)}
				{@const isMuted = mutedIds.includes(row.userId ?? '') || mutedIds.includes(row.guestId ?? '')}
				<li class="flex min-h-11 items-center justify-between gap-2 text-sm text-text-primary">
					<span>
						{row.displayName}
						{#if isMuted}
							<span class="text-xs italic text-text-tertiary"> (muted)</span>
						{/if}
					</span>
					{#if isHost}
						<MuteButton
							{isMuted}
							displayName={row.displayName}
							onMute={() => onMute({ userId: row.userId ?? undefined, guestId: row.guestId ?? undefined })}
							onUnmute={() => onUnmute({ userId: row.userId ?? undefined, guestId: row.guestId ?? undefined })}
						/>
					{/if}
				</li>
			{/each}
		{/if}
	</ul>
</div>
