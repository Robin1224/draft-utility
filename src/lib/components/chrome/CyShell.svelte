<script>
	import CyShader from '$lib/components/effects/CyShader.svelte';

	let { phase = 'lobby', code = null, children } = $props();

	const TRACKER = ['lobby', 'drafting', 'review']; // cyber.jsx:154
	const LABEL = { lobby: '01_LOBBY', drafting: '02_DRAFTING', review: '03_REVIEW' };

	// -1 for cancelled/unknown → no active step, no crash (D-07)
	const idx = $derived(TRACKER.indexOf(phase));

	async function copyCode() {
		if (!code) return; // no-op when there is no room (D-09)
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			/* clipboard unavailable / denied — silently ignore */
		}
	}
</script>

<div class="cy-app">
	<!-- Ambient ASCII plasma shader, app-wide (D-02). NO hot prop — Home wires hot in Phase 10. -->
	<CyShader />
	<div class="cy-scanlines"></div>
	<header class="cy-header">
		<div class="cy-brand">
			<span class="cy-brand-bracket">[</span>
			<span class="cy-brand-name">DRAFT_EM</span>
			<span class="cy-brand-bracket">]</span>
			<span class="cy-brand-cur" aria-hidden="true">▮</span>
		</div>
		<div class="cy-phases">
			{#each TRACKER as p, i (p)}
				<span class="cy-phase" class:is-active={i === idx} class:is-done={idx > -1 && i < idx}>
					{LABEL[p]}
				</span>
			{/each}
		</div>
		<div class="cy-meta">
			<span class="cy-meta-key">$ ROOM=</span>
			<span class="cy-meta-val">{code ?? '—'}</span>
			<button class="cy-meta-copy" type="button" onclick={copyCode} disabled={!code}>[copy]</button>
		</div>
	</header>
	<div class="cy-body">{@render children?.()}</div>
</div>
