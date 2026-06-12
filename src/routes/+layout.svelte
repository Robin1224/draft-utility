<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import CyShell from '$lib/components/chrome/CyShell.svelte';
	import { page } from '$app/state';
	import { fromStore } from 'svelte/store';
	import { lobby } from '$live/room';

	let { children } = $props();

	// Room code from the route param (room screens are /draft/[id]); null on Home/Login → shows —.
	const code = $derived(page.params.id ?? null);

	// Phase derived READ-ONLY from the existing live lobby snapshot's frozen .phase field.
	// Subscribe ONLY when a code exists; guard against undefined / error snapshots like the draft page does.
	// NO snapshot field is added — this only reads the existing .phase.
	const snap = $derived.by(() => (code ? fromStore(lobby(code)).current : null));
	const phase = $derived(
		snap && typeof snap === 'object' && !('error' in snap) && snap.phase ? snap.phase : 'lobby'
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<CyShell {phase} {code}>{@render children()}</CyShell>
