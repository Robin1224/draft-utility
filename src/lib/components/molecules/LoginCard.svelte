<script>
	import { enhance } from '$app/forms';

	/** @type {{ form?: { error?: string } | null, mode?: string, redirect?: string }} */
	let { form = null, mode = $bindable('signin'), redirect = '/' } = $props();

	let loading = $state(false);
</script>

<div class="cy-login">
	<div class="cy-login-card">
		<div class="cy-login-eyebrow">$ ./auth --provider=discord</div>
		<h2>USER_AUTH_REQUIRED</h2>
		<p>// signed-in users can host or captain. guests = spectate only.</p>

		<!-- Discord OAuth: unchanged ?/signin action + loading state -->
		<form
			method="POST"
			action="?/signin"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			<button
				type="submit"
				class="cy-btn cy-btn-discord"
				disabled={loading}
				aria-busy={loading}
				aria-label="Continue with Discord"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
					><path
						d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
					/></svg
				>
				{loading ? 'CONNECTING…' : 'CONTINUE_DISCORD()'}
			</button>
		</form>

		<div class="cy-divider">--- // ---</div>

		<!-- Guest path: spectator only, no auth, navigates back to the room (?redirect target) -->
		<a class="cy-btn cy-btn-ghost" href={redirect}>SPECTATE_AS_GUEST()</a>

		<p class="cy-foot">// chat_filter: ENABLED · slur_block: ENABLED</p>

		<!-- AUTH-03 error display -->
		{#if form?.error}
			<p role="alert" class="cy-foot">[ERR] {form.error}</p>
		{/if}
	</div>
</div>
