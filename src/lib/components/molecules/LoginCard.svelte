<script>
	import { enhance } from '$app/forms';

	/** @type {{ form?: { error?: string } | null, mode?: string }} */
	let { form = null, mode = $bindable('signin') } = $props();

	let loading = $state(false);

	/** @param {string} newMode */
	function setMode(newMode) {
		mode = newMode;
	}
</script>

<section
	class="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-bg-secondary p-6 text-text-primary"
>
	<!-- Heading: changes with mode per UI-SPEC -->
	<h2 class="text-xl font-semibold text-text-primary">
		{mode === 'signin' ? 'Sign in' : 'Create account'}
	</h2>

	<!-- Discord OAuth button: submits to ?/signin or ?/register depending on mode -->
	<form
		method="POST"
		action={mode === 'signin' ? '?/signin' : '?/register'}
		class="w-full"
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
			disabled={loading}
			aria-label={mode === 'signin' ? 'Sign in with Discord' : 'Sign up with Discord'}
			aria-busy={loading}
			class="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-md py-3 text-white transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			style="background-color: {loading ? '#4752C4' : '#5865F2'};"
			onmouseenter={(e) => {
				if (!loading) e.currentTarget.style.backgroundColor = '#4752C4';
			}}
			onmouseleave={(e) => {
				if (!loading) e.currentTarget.style.backgroundColor = '#5865F2';
			}}
		>
			{#if loading}
				<!-- Spinner SVG: 16px white animate-spin -->
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Connecting&hellip;
			{:else}
				{mode === 'signin' ? 'Sign in with Discord' : 'Sign up with Discord'}
			{/if}
		</button>
	</form>

	<!-- Mode toggle link -->
	<p class="text-sm text-text-tertiary">
		{#if mode === 'signin'}
			New here?
			<a
				href="#register"
				class="text-text-secondary underline hover:text-amber-500 hover:no-underline"
				onclick={(e) => {
					e.preventDefault();
					setMode('register');
				}}
			>Create an account</a>
		{:else}
			Already have an account?
			<a
				href="#signin"
				class="text-text-secondary underline hover:text-amber-500 hover:no-underline"
				onclick={(e) => {
					e.preventDefault();
					setMode('signin');
				}}
			>Sign in</a>
		{/if}
	</p>

	<!-- Error message: renders only when form?.error is present (AUTH-03 error display) -->
	{#if form?.error}
		<p role="alert" class="text-sm text-red-600">{form.error}</p>
	{/if}
</section>
