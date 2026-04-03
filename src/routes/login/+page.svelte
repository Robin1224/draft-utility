<script>
	import Header from '$lib/components/molecules/Header.svelte';
	import LoginCard from '$lib/components/molecules/LoginCard.svelte';

	let { form } = $props();

	// mode is bindable from LoginCard — drives the page <title>
	let mode = $state('signin');
</script>

<svelte:head>
	<title>{mode === 'register' ? 'Create account' : 'Sign in'} — Draft</title>
</svelte:head>

<Header />

<main class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-8">
	<LoginCard bind:mode {form} />
</main>
