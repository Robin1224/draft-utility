<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let draftId = $state('');
	let disabled = $derived(draftId.length === 0);

	/** @param {MouseEvent} event */
	async function handleSubmit(event) {
		event.preventDefault();
		goto(resolve(`/draft/${draftId}`), { replaceState: true });
	}
</script>

<section
	class="m-auto flex flex-col items-center justify-center gap-4 rounded-lg border border-bg-secondary p-6 text-text-primary"
>
	<h2 class="text-xl font-semibold">Join a Draft</h2>
	<form class="flex flex-col items-center justify-center gap-2">
		<input
			type="text"
			placeholder="Draft ID"
			class="w-full rounded-md border border-gray-300 p-2"
			bind:value={draftId}
		/>
		<button
			type="submit"
			{disabled}
			class="w-full cursor-pointer rounded-md bg-amber-500 p-2 text-text-primary transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:text-slate-50 disabled:opacity-50 disabled:hover:bg-amber-500"
			onclick={handleSubmit}>Join</button
		>
	</form>
</section>
