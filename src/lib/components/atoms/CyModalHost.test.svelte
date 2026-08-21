<script>
	import CyModal from './CyModal.svelte';

	/**
	 * Browser-spec fixture for CyModal: a launcher button owning the bound `open`
	 * state, plus footer-present / footer-absent variants for the snippet contract.
	 * (`.test.svelte` is safe from the client project glob `*.svelte.{test,spec}.{js,ts}`.)
	 * @type {{
	 *   title: string,
	 *   onAttemptClose?: () => boolean,
	 *   withFooter?: boolean
	 * }}
	 */
	let { title, onAttemptClose = undefined, withFooter = true } = $props();

	let open = $state(false);
</script>

<button type="button" onclick={() => (open = true)}>CONFIG()</button>

{#if withFooter}
	<CyModal bind:open {title} {onAttemptClose}>
		<p>terminal modal body</p>
		{#snippet footer()}
			<button type="button">OK()</button>
		{/snippet}
	</CyModal>
{:else}
	<CyModal bind:open {title} {onAttemptClose}>
		<p>terminal modal body</p>
	</CyModal>
{/if}
