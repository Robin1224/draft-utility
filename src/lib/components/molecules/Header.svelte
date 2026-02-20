<script lang="ts">
	import logo from '$lib/assets/logo.svg';

	let { session, supabase } = $props();
</script>

<header class="flex flex-row items-center justify-between gap-2 bg-stone-800 p-2 text-stone-100">
	<div class="flex flex-row items-center gap-2">
		<img src={logo} alt="Logo" class="h-6 w-6 text-stone-100" />
		<h1 class="text-lg">Draft Utility</h1>
	</div>
	<div class="flex flex-row items-center gap-2">
		{#if session}
			<img src={session.user.identities[0].identity_data.avatar_url} alt="Avatar" class="h-6 w-6 rounded-full" />
			<p>{session.user.identities[0].identity_data.full_name}</p>
			<button class="cursor-pointer rounded-md bg-stone-800 p-2 px-4 text-stone-100">Logout</button>
		{:else}
			<button
				onclick={() => {
					supabase.auth.signInWithOAuth({
						provider: 'discord',
						options: {
							redirectTo: window.location.href
						}
					});
				}}
				class="cursor-pointer rounded-md bg-stone-800 p-2 px-4 text-stone-100"
				>Login with Discord</button
			>
		{/if}
	</div>
</header>
