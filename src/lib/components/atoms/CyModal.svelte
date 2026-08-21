<script>
	/** @import { Snippet } from 'svelte' */

	/**
	 * Shared terminal-modal wrapper on the native <dialog> element (D-07).
	 * esc, scrim-click and the esc ✕ button all dismiss (D-08); an optional
	 * onAttemptClose veto (return false) can block any of the three (D-05).
	 * Focus trap, inert background and focus-return are browser-owned.
	 * @type {{
	 *   open?: boolean,
	 *   title: string,
	 *   onAttemptClose?: () => boolean,
	 *   children: Snippet,
	 *   footer?: Snippet
	 * }}
	 */
	let { open = $bindable(false), title, onAttemptClose, children, footer } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let dialogEl = $state();

	// WR-01: `click` retargets to the nearest common ancestor of pointerdown and
	// pointerup — a text-selection drag from the body released over the backdrop
	// would look like a scrim click. Only dismiss when the press STARTED on the
	// dialog element too. Plain variable: never read by the template.
	let pressOnScrim = false;

	// Dialog stays mounted permanently (never conditionally mounted — focus-return
	// is tied to close(), not DOM removal); sync open ↔ showModal()/close().
	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	// Scrim click and the esc ✕ button route through one veto path (D-08).
	function requestDismiss() {
		if (onAttemptClose && onAttemptClose() === false) return;
		dialogEl?.close();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="cy-modal"
	aria-label={title}
	oncancel={(e) => {
		// esc → native cancel is the veto interception point (D-07). No cleanup
		// here: Chromium may skip cancel or force-close past preventDefault on a
		// second Escape — the close event below is the single source of truth.
		if (onAttemptClose && onAttemptClose() === false) e.preventDefault();
	}}
	onclose={() => (open = false)}
	onpointerdown={(e) => (pressOnScrim = e.target === dialogEl)}
	onclick={(e) => {
		// Backdrop clicks target the dialog element itself; with padding: 0 the
		// inner chrome covers the whole box, so target === dialog ⇒ scrim click —
		// but only when the interaction also began on the dialog (WR-01).
		if (pressOnScrim && e.target === dialogEl) requestDismiss();
		pressOnScrim = false;
	}}
>
	<div class="cy-modal-bar">
		<span class="cy-dot cy-dot-r" aria-hidden="true"></span>
		<span class="cy-dot cy-dot-a" aria-hidden="true"></span>
		<span class="cy-dot cy-dot-g" aria-hidden="true"></span>
		<span class="cy-modal-title">{title}</span>
		<button type="button" class="cy-modal-x" onclick={requestDismiss}>esc ✕</button>
	</div>
	<div class="cy-modal-body">{@render children()}</div>
	{#if footer}
		<div class="cy-modal-foot">{@render footer()}</div>
	{/if}
</dialog>
