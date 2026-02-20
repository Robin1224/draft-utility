<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/molecules/Header.svelte';
	import '$lib/css/fonts.css';

	let { data, children } = $props();

	const supabase = $derived(data.supabase);
	const session = $derived(data.session);

	// console.log(session);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Header {session} {supabase} />

{@render children()}

<style>
	:global(body) {
		font-family: 'IBM Plex Sans', sans-serif;
	}
</style>
