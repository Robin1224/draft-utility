<script>
	import { enhance } from '$app/forms';
</script>

<section
	class="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-bg-secondary p-6 text-text-primary"
>
	<h2 class="text-xl font-semibold">Create a Draft</h2>
	<form method="POST" action="?/createRoom" use:enhance>
		<button
			type="submit"
			class="w-full cursor-pointer rounded-md bg-amber-500 p-2 text-text-primary transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:text-slate-50 disabled:opacity-50 disabled:hover:bg-amber-500"
			>Create</button
		>
	</form>
</section>
