<script>
	import { page } from '$app/state';
	import LoginCard from '$lib/components/molecules/LoginCard.svelte';

	let { form } = $props();

	// mode is bindable from LoginCard — drives the page <title> (stays 'signin')
	let mode = $state('signin');

	// Guest spectate path returns to the room the user came from (or /)
	const redirect = $derived(page.url.searchParams.get('redirect') ?? '/');
</script>

<svelte:head>
	<title>{mode === 'register' ? 'Create account' : 'Sign in'} — Draft</title>
</svelte:head>

<!-- CyShell chrome (header/shader/scanlines) is rendered by the layout; the card centers itself via .cy-login -->
<LoginCard bind:mode {form} {redirect} />
