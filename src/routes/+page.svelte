<script>
	import CyLogo from '$lib/components/effects/CyLogo.svelte';
	import CyShader from '$lib/components/effects/CyShader.svelte';
	import { createTypedLog, CY_BOOT_LINES } from '$lib/components/effects/cyTypedLog.svelte.js';
	import Create from '$lib/components/molecules/Create.svelte';
	import Join from '$lib/components/molecules/Join.svelte';

	const boot = createTypedLog(CY_BOOT_LINES);
</script>

<div class="cy-home">
	<CyShader hot={true} />

	<div class="cy-hero">
		<div class="cy-frame">
			<span class="cy-frame-label">DRAFT_NET · v1.0</span>

			<div class="cy-boot" aria-hidden="true">{boot.text}</div>

			<CyLogo rendered={boot.done} />

			<div class="cy-hero-tagline">
				<span class="cy-prompt">&gt;</span> REAL-TIME PICK<span class="cy-slash">/</span>BAN
				PROTOCOL
			</div>
		</div>
	</div>

	<div class="cy-home-grid">
		<Create />
		<Join />
	</div>
</div>
