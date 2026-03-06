<script lang="ts">
	import { resolve } from '$app/paths';

	let draftId = $state('');
</script>

<main class="flex h-screen flex-col items-center justify-center gap-24">
	<form class="flex flex-col items-center justify-center gap-4">
		<h2 class="text-2xl font-bold">Create a new draft</h2>
		<div class="flex flex-row items-center justify-center gap-4">
			<input
				type="text"
				placeholder="Enter your username"
				class="rounded-md border border-stone-300 p-2"
			/>
			<button type="submit" class="cursor-pointer rounded-md bg-stone-800 p-2 px-4 text-stone-100">
				Create
			</button>
		</div>
	</form>
    <div class="flex flex-col items-center justify-center gap-4">
		<h2 class="text-2xl font-bold">Join existing draft</h2>
        <div class="flex flex-row items-center justify-center gap-4">
			<input
				type="text"
				placeholder="Enter draft ID"
				class="rounded-md border border-stone-300 p-2"
				bind:value={draftId}
			/>
			<a href={resolve(`/draft/${draftId}`)} class="cursor-pointer rounded-md bg-stone-800 p-2 px-4 text-stone-100">
				Join
			</a>
		</div>
	</div>
</main>

<style>
</style>
