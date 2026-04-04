<script>
	import ChampionCard from '$lib/components/atoms/ChampionCard.svelte';

	/**
	 * @typedef {{ id: string, name: string, role: string }} Champion
	 * @typedef {{ championId: string, action: string }} SubmitPayload
	 */

	/** @type {{ champions: Champion[], usedIds: string[], isActiveCaptain: boolean, currentAction: 'pick' | 'ban', onSubmit: (payload: SubmitPayload) => void }} */
	let { champions, usedIds, isActiveCaptain, currentAction, onSubmit } = $props();

	/** @type {string | null} */
	let selectedId = $state(null);

	/**
	 * @param {Champion} champion
	 * @returns {'disabled' | 'selected' | 'default'}
	 */
	function cardState(champion) {
		if (usedIds.includes(champion.id)) return 'disabled';
		if (isActiveCaptain && champion.id === selectedId) return 'selected';
		return 'default';
	}

	/**
	 * @param {Champion} champion
	 */
	function handleCardClick(champion) {
		if (!isActiveCaptain) return;
		if (usedIds.includes(champion.id)) return;
		if (selectedId === champion.id) {
			selectedId = null;
		} else {
			selectedId = champion.id;
		}
	}

	const submitLabel = $derived(currentAction === 'pick' ? 'Submit Pick' : 'Submit Ban');

	const showSubmit = $derived(isActiveCaptain && selectedId != null);

	function handleSubmit() {
		if (!selectedId) return;
		onSubmit({ championId: selectedId, action: currentAction });
		selectedId = null;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="grid grid-cols-4 md:grid-cols-7 gap-4">
		{#each champions as champion (champion.id)}
			<ChampionCard
				{champion}
				state={cardState(champion)}
				onclick={() => handleCardClick(champion)}
			/>
		{/each}
	</div>

	{#if showSubmit}
		<button
			type="button"
			class="mt-4 w-full rounded-md bg-amber-500 px-6 py-2 font-semibold text-white hover:bg-amber-400"
			onclick={handleSubmit}
		>
			{submitLabel}
		</button>
	{/if}
</div>
