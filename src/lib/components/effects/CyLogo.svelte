<script>
	// Shaded-ASCII DRAFT wordmark — verbatim port of cyber.jsx §CY_LOGO_LINES +
	// the CYHome reveal markup (242–251), reimplemented as Svelte 5.
	// The 9 block-art strings are load-bearing: every glyph and leading/trailing
	// space is preserved byte-for-byte (these ARE the art). The base .cy-logo is
	// ALWAYS visible; the `rendered` prop toggles `is-rendered` to fire the
	// line-by-line reveal, which animates transform + brightness ONLY (never
	// opacity), so the logo can never get stuck hidden. All .cy-logo* CSS lives
	// in src/app.css. Honors D-01: the wordmark stays DRAFT (aria-label="DRAFT").

	// prettier-ignore
	const CY_LOGO_LINES = [
		' ▓█████▄  ██▀███   ▄▄▄        █████▒▄▄▄█████▓',
		' ▒██▀ ██▌▓██ ▒ ██▒▒████▄    ▓██   ▒▓  ██▒ ▓▒',
		' ░██   █▌▓██ ░▄█ ▒▒██  ▀█▄  ▒████ ░▒ ▓██░ ▒░',
		' ░▓█▄   ▌▒██▀▀█▄  ░██▄▄▄▄██ ░▓█▒  ░░ ▓██▓ ░ ',
		' ░▒████▓ ░██▓ ▒██▒ ▓█   ▓██▒░▒█░     ▒██▒ ░ ',
		'  ░▒▒▓  ▒ ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░ ▒ ░     ▒ ░░   ',
		'  ░ ▒  ▒   ░▒ ░ ▒░  ▒   ▒▒ ░ ░         ░    ',
		'  ░ ░  ░   ░░   ░   ░   ▒    ░ ░     ░      ',
		'    ░       ░           ░  ░               '
	];

	/** @type {{ rendered?: boolean }} */
	let { rendered = false } = $props();
</script>

<div class="cy-logo-wrap" class:is-rendered={rendered} role="img" aria-label="DRAFT">
	<pre class="cy-logo">{#each CY_LOGO_LINES as line}<span class="cy-logo-line">{line + '\n'}</span
			>{/each}</pre>
	<div class="cy-logo-glitch" aria-hidden="true"><pre>{CY_LOGO_LINES.join('\n')}</pre></div>
</div>
