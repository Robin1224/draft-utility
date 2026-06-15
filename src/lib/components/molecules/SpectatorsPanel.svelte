<script>
	/**
	 * Spectators strip (Cyber). Collapsible via the head button — native button handles Enter/Space.
	 *
	 * @typedef {{ displayName: string, userId?: string | null, guestId?: string | null }} SpectatorRow
	 */

	import MuteButton from '$lib/components/atoms/MuteButton.svelte';

	/** @type {{ spectators?: SpectatorRow[], isHost?: boolean, mutedIds?: string[], onMute?: (p: { userId?: string, guestId?: string }) => void, onUnmute?: (p: { userId?: string, guestId?: string }) => void }} */
	let {
		spectators = [],
		isHost = false,
		mutedIds = [],
		onMute = () => {},
		onUnmute = () => {}
	} = $props();

	let open = $state(false);
</script>

<div class="cy-spec">
	<button
		type="button"
		class="cy-spec-head"
		aria-expanded={open}
		aria-controls="spectators-panel"
		id="spectators-toggle"
		onclick={() => (open = !open)}
	>
		// SPECTATORS [{spectators.length}]
	</button>
	<div
		id="spectators-panel"
		class="cy-spec-list"
		aria-labelledby="spectators-toggle"
		hidden={!open}
	>
		{#if spectators.length === 0}
			<div class="cy-spec-pill">// no_spectators</div>
		{:else}
			{#each spectators as row, i (`${row.userId ?? ''}-${row.guestId ?? ''}-${i}`)}
				{@const isMuted =
					mutedIds.includes(row.userId ?? '') || mutedIds.includes(row.guestId ?? '')}
				<div class="cy-spec-pill">
					{row.displayName}{#if isMuted}&nbsp;(muted){/if}
					{#if isHost}
						<MuteButton
							{isMuted}
							displayName={row.displayName}
							onMute={() =>
								onMute({ userId: row.userId ?? undefined, guestId: row.guestId ?? undefined })}
							onUnmute={() =>
								onUnmute({ userId: row.userId ?? undefined, guestId: row.guestId ?? undefined })}
						/>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>
