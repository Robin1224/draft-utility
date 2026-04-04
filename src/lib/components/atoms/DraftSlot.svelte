<script>
	/** @type {{ action: 'pick' | 'ban', championName?: string | null, team: 'A' | 'B' }} */
	let { action, championName = null, team } = $props();

	const isEmpty = $derived(championName == null);
	const actionLabel = $derived(action === 'pick' ? 'Pick' : 'Ban');
</script>

{#if isEmpty}
	<div
		class="flex min-h-[44px] items-center rounded-md border-2 border-dashed border-bg-secondary p-3"
		aria-label="Empty {actionLabel} slot for Team {team}"
	>
		<span class="text-xs font-semibold uppercase text-text-secondary">{actionLabel}</span>
	</div>
{:else}
	<div
		class="flex min-h-[44px] flex-col justify-center rounded-md border border-bg-secondary bg-bg-secondary p-3"
		aria-label="{championName} — {actionLabel} for Team {team}"
	>
		<span class="text-sm text-text-primary">{championName}</span>
		<span class="text-xs font-semibold uppercase text-text-secondary">{actionLabel}</span>
	</div>
{/if}
