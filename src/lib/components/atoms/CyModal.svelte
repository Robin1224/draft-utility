<script>
	/** @import { Snippet } from 'svelte' */

	/**
	 * @type {{
	 *   open?: boolean,
	 *   title: string,
	 *   onAttemptClose?: () => boolean,
	 *   children: Snippet,
	 *   footer?: Snippet
	 * }}
	 */
	let { open = $bindable(false), title, onAttemptClose, children, footer } = $props();
</script>

<!-- RED stub: dialog lifecycle + titlebar chrome implemented in the GREEN step -->
<dialog class="cy-modal" aria-label={title}>
	{#if open && onAttemptClose}
		{@render children()}
		{#if footer}{@render footer()}{/if}
	{/if}
</dialog>
