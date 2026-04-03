<script>
	import Header from '$lib/components/molecules/Header.svelte';
	import Create from '$lib/components/molecules/Create.svelte';
	import Join from '$lib/components/molecules/Join.svelte';
</script>

<Header />

<main
	class="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-8 px-4 py-6"
>
	<div class="flex w-full max-w-4xl flex-col gap-6 md:flex-row md:items-stretch md:justify-center">
		<div class="min-w-0 flex-1 md:max-w-md">
			<Create />
		</div>
		<div class="min-w-0 flex-1 md:max-w-md">
			<Join />
		</div>
	</div>
</main>
