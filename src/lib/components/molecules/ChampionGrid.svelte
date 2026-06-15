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

	const total = $derived(champions.length);
	const available = $derived(champions.length - usedIds.length);
	const selectedName = $derived(champions.find((c) => c.id === selectedId)?.name ?? '');

	const showSubmit = $derived(isActiveCaptain && selectedId != null);

	function handleSubmit() {
		if (!selectedId) return;
		onSubmit({ championId: selectedId, action: currentAction });
		selectedId = null;
	}
</script>

<main class="cy-roster">
	<div class="cy-roster-head">
		<h3>&gt; SELECT_TARGET[ {available} / {total} available ]</h3>
		<div class="cy-roster-filters">
			<button type="button" class="cy-chip is-active">all</button>
			<button type="button" class="cy-chip">.melee</button>
			<button type="button" class="cy-chip">.ranged</button>
			<button type="button" class="cy-chip">.support</button>
		</div>
	</div>

	<div class="cy-champ-grid">
		{#each champions as champion (champion.id)}
			<ChampionCard
				{champion}
				state={cardState(champion)}
				onclick={() => handleCardClick(champion)}
			/>
		{/each}
	</div>

	{#if showSubmit}
		<button type="button" class="cy-submit cy-submit-{currentAction}" onclick={handleSubmit}>
			$ {currentAction}({selectedName}) [LOCK_IN]
		</button>
	{/if}
</main>
