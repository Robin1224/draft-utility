<script>
	import { resolve } from '$app/paths';

    let { children = undefined } = $props();
</script>

<header
	class="flex h-16 items-center justify-between border-b-2 border-bg-secondary bg-bg-primary px-8 text-text-secondary"
>
	<a href={resolve('/')}>
		<h1 class="w-32 text-xl font-bold">DRAFT</h1>
	</a>

	{#if children}
		{@render children()}
	{/if}

	<div class="flex w-32 items-center justify-end gap-4 justify-self-end">
		<button>
			<span class="sr-only">Toggle theme</span>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
				/>
			</svg>
		</button>
	</div>
</header>
