<script>
	import { nanoid } from 'nanoid';
	import ScriptTurnRow from '$lib/components/atoms/ScriptTurnRow.svelte';

	/**
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/** @type {{ script: ScriptTurn[], timerSeconds: number }} */
	let { script = $bindable([]), timerSeconds = $bindable(30) } = $props();

	let dragSrcIndex = $state(-1);

	function addTurn() {
		script = [...script, { id: nanoid(8), team: 'A', action: 'ban' }];
	}

	/** @param {number} i */
	function removeTurn(i) {
		script = script.filter((_, idx) => idx !== i);
	}

	/**
	 * @param {number} i
	 * @param {'team'|'action'} field
	 * @param {string} value
	 */
	function updateTurn(i, field, value) {
		script = script.map((t, idx) => (idx === i ? { ...t, [field]: value } : t));
	}

	/** @param {DragEvent} e @param {number} i */
	function handleDragStart(e, i) {
		dragSrcIndex = i;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	/** @param {DragEvent} e @param {number} _i */
	function handleDragOver(e, _i) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	/** @param {DragEvent} e @param {number} dropIndex */
	function handleDrop(e, dropIndex) {
		e.preventDefault();
		if (dragSrcIndex === -1 || dragSrcIndex === dropIndex) return;
		const next = [...script];
		const [moved] = next.splice(dragSrcIndex, 1);
		next.splice(dropIndex, 0, moved);
		script = next;
		dragSrcIndex = -1;
	}
</script>

<div
	id="draft-settings-panel"
	class="mt-3 flex flex-col gap-4 rounded-md border border-bg-secondary bg-bg-primary p-4"
>
	<span class="text-xs font-semibold uppercase text-text-tertiary">Draft settings</span>

	<!-- Turn timer -->
	<div class="flex flex-col gap-1">
		<label for="turn-timer-input" class="text-sm font-medium text-text-tertiary"
			>Turn timer (seconds)</label
		>
		<input
			id="turn-timer-input"
			type="number"
			min="10"
			max="120"
			step="5"
			bind:value={timerSeconds}
			class="w-24 rounded-md border border-bg-secondary bg-bg-primary px-2 py-2 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
		/>
	</div>

	<!-- Script editor -->
	<div class="flex flex-col gap-2">
		<span class="text-xs font-semibold uppercase text-text-tertiary">Pick / Ban order</span>
		{#if script.length === 0}
			<p class="text-sm text-text-tertiary">No turns configured. Add a turn to begin.</p>
		{:else}
			<ul id="script-editor-list" class="mt-2 flex flex-col gap-2" aria-label="Pick/ban turn order">
				{#each script as turn, i (turn.id)}
					<ScriptTurnRow
						{turn}
						index={i}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						onRemove={removeTurn}
						onUpdate={updateTurn}
					/>
				{/each}
			</ul>
		{/if}
		<button
			type="button"
			class="mt-1 rounded-md border border-bg-secondary px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary"
			onclick={addTurn}
		>
			Add turn
		</button>
	</div>
</div>
