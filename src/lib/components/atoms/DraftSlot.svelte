<script>
	/** @type {{ action: 'pick' | 'ban', championName?: string | null, team: 'A' | 'B' }} */
	let { action, championName = null, team } = $props();

	const isEmpty = $derived(championName == null);
	const accent = $derived(team === 'A' ? 'lime' : 'violet');
</script>

{#if isEmpty}
	<div
		class="cy-pickslot cy-pickslot-empty cy-pickslot-{accent}"
		aria-label="Empty {action} slot for Team {team}"
	>
		<span class="cy-pickslot-action">{action}_</span>
		<span class="cy-pickslot-fill">──────</span>
	</div>
{:else}
	<div
		class="cy-pickslot cy-pickslot-{accent} {action === 'ban' ? 'is-ban' : ''}"
		aria-label="{championName} — {action} for Team {team}"
	>
		<div class="cy-pickslot-art"><span>{(championName ?? '').slice(0, 2)}</span></div>
		<div>
			<div class="cy-pickslot-name">{championName}</div>
			<div class="cy-pickslot-action">{action}</div>
		</div>
	</div>
{/if}
