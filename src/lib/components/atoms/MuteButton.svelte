<script>
	/** @type {{ isMuted?: boolean, displayName: string, onMute: () => void, onUnmute: () => void }} */
	let { isMuted = false, displayName, onMute, onUnmute } = $props();
</script>

{#if isMuted}
	<button
		type="button"
		aria-label="Unmute {displayName}"
		class="text-sm font-normal text-text-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
		onclick={onUnmute}
	>Unmute</button>
{:else}
	<button
		type="button"
		aria-label="Mute {displayName}"
		class="text-sm font-normal text-red-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
		onclick={onMute}
	>Mute</button>
{/if}
