<script>
	/**
	 * @typedef {{ id: string, name: string, role: string }} Champion
	 */

	/** @type {{ champion: Champion, state?: 'default' | 'selected' | 'picked' | 'banned' | 'disabled', onclick?: () => void }} */
	let { champion, state = 'default', onclick } = $props();

	const isInteractive = $derived(state === 'default' || state === 'selected');
	const isDisabled = $derived(state === 'picked' || state === 'banned' || state === 'disabled');
</script>

<button
	type="button"
	class="cy-champ cy-champ-{state}"
	disabled={isDisabled}
	aria-pressed={state === 'selected' ? 'true' : undefined}
	onclick={isInteractive ? onclick : undefined}
>
	<div class="cy-champ-art cy-champ-art-{champion.role}">
		<span>{champion.name.slice(0, 2)}</span>
		{#if state === 'banned'}<div class="cy-champ-x">✕</div>{/if}
	</div>
	<div class="cy-champ-meta">
		<span class="cy-champ-name">{champion.name}</span>
		<span class="cy-champ-role">.{champion.role}</span>
	</div>
</button>
