<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/ui/Header.svelte';
	import '$lib/css/fonts.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Header />

{@render children()}

<style>
	:global(body) {
		font-family: 'IBM Plex Sans', sans-serif;
	}
</style>
