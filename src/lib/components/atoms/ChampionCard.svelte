<script>
	/**
	 * @typedef {{ id: string, name: string, role: string }} Champion
	 */

	/** @type {{ champion: Champion, state?: 'default' | 'selected' | 'picked' | 'banned' | 'disabled', onclick?: () => void }} */
	let { champion, state = 'default', onclick } = $props();

	const isInteractive = $derived(state === 'default' || state === 'selected');
	const isDisabled = $derived(state === 'picked' || state === 'banned' || state === 'disabled');

	const cardClass = $derived(() => {
		const base =
			'flex min-h-[44px] w-full flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors';
		if (isDisabled) {
			return `${base} cursor-not-allowed border-bg-secondary bg-bg-primary opacity-40 pointer-events-none`;
		}
		if (state === 'selected') {
			return `${base} cursor-pointer border-amber-500 bg-bg-primary ring-2 ring-amber-500`;
		}
		return `${base} cursor-pointer border-bg-secondary bg-bg-primary hover:border-amber-500`;
	});
</script>

<button
	type="button"
	class={cardClass()}
	disabled={isDisabled}
	aria-pressed={state === 'selected' ? 'true' : undefined}
	onclick={isInteractive ? onclick : undefined}
>
	<span class="text-sm font-normal text-text-primary">{champion.name}</span>
	<span class="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-semibold text-text-secondary capitalize"
		>{champion.role}</span
	>
</button>
