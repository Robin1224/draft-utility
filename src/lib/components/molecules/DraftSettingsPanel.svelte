<script>
	import { untrack } from 'svelte';
	import { nanoid } from 'nanoid';
	import CyModal from '$lib/components/atoms/CyModal.svelte';
	import ScriptTurnRow from '$lib/components/atoms/ScriptTurnRow.svelte';

	/**
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/**
	 * Draft Settings terminal modal (MOD-01) — ~/draft/config.sh.
	 * Edits hit a local draft copy (D-04); SAVE_CONFIG() is the ONLY place the
	 * bound script/timerSeconds are written; any dismissal discards. A dirty
	 * dismissal swaps the footer to the discard confirm (D-05/D-06).
	 * No phase awareness, no server calls.
	 * @type {{
	 *   open?: boolean,
	 *   script?: ScriptTurn[],
	 *   timerSeconds?: number
	 * }}
	 */
	let { open = $bindable(false), script = $bindable([]), timerSeconds = $bindable(30) } = $props();

	/** Local editable copy (D-04). */
	let draft = $state({ script: /** @type {ScriptTurn[]} */ ([]), timerSeconds: 30 });
	/**
	 * Open-time snapshot the dirty check compares against (plain, non-reactive).
	 * @type {{ script: ScriptTurn[], timerSeconds: number } | null}
	 */
	let base = null;
	let confirmingDiscard = $state(false);

	let dragSrcIndex = $state(-1);

	// On open: snapshot page state into the draft copy. On close: reset the
	// discard confirm — cleanup hangs on `open` flipping false, never on cancel
	// (RESEARCH Pattern 5; Chromium may force-close past preventDefault).
	$effect(() => {
		if (open) {
			untrack(() => {
				base = structuredClone($state.snapshot({ script, timerSeconds }));
				draft.script = structuredClone(base.script);
				draft.timerSeconds = base.timerSeconds;
			});
		}
		confirmingDiscard = false;
	});

	/**
	 * Semantic payload comparison — ids are client-only (stripped before
	 * startDraft), so id churn is NOT dirty; order/team/action + timer are.
	 * @param {ScriptTurn[]} s
	 */
	const canon = (s) => JSON.stringify(s.map((t) => [t.team, t.action]));
	const dirty = $derived.by(() => {
		if (base === null) return false;
		return draft.timerSeconds !== base.timerSeconds || canon(draft.script) !== canon(base.script);
	});

	// One veto path for esc / scrim / ✕ (via CyModal onAttemptClose) AND CANCEL.
	function attemptClose() {
		if (!dirty || confirmingDiscard) return true;
		confirmingDiscard = true;
		return false;
	}

	// SAVE_CONFIG(): the only writes to the bindable props (D-04).
	function save() {
		script = draft.script.map((t) => ({ ...t }));
		timerSeconds = draft.timerSeconds;
		open = false;
	}

	function addTurn() {
		draft.script = [...draft.script, { id: nanoid(8), team: 'A', action: 'ban' }];
	}

	/** @param {number} i */
	function removeTurn(i) {
		draft.script = draft.script.filter((_, idx) => idx !== i);
	}

	/**
	 * @param {number} i
	 * @param {'team'|'action'} field
	 * @param {string} value
	 */
	function updateTurn(i, field, value) {
		draft.script = draft.script.map((t, idx) => (idx === i ? { ...t, [field]: value } : t));
	}

	/**
	 * Single reorder data path (D-11) — drag, ↑ and ↓ all splice through here.
	 * @param {number} from @param {number} to
	 */
	function moveTurn(from, to) {
		const next = [...draft.script];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		draft.script = next;
	}

	/** @param {DragEvent} e @param {number} i */
	function handleDragStart(e, i) {
		dragSrcIndex = i;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	/** @param {DragEvent} e */
	function handleDragOver(e) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	/** @param {DragEvent} e @param {number} dropIndex */
	function handleDrop(e, dropIndex) {
		e.preventDefault();
		if (dragSrcIndex === -1 || dragSrcIndex === dropIndex) return;
		moveTurn(dragSrcIndex, dropIndex);
		dragSrcIndex = -1;
	}

	/** @param {number} i */
	function moveUp(i) {
		if (i > 0) moveTurn(i, i - 1);
	}

	/** @param {number} i */
	function moveDown(i) {
		if (i < draft.script.length - 1) moveTurn(i, i + 1);
	}
</script>

<CyModal bind:open title="~/draft/config.sh" onAttemptClose={attemptClose}>
	<div class="cy-modal-head">
		<h3>&gt; DRAFT_SETTINGS</h3>
		<p>// configure turn timer and the pick/ban execution order</p>
	</div>

	<div class="cy-field">
		<span class="cy-field-label">turn_timer</span>
		<div class="cy-stepper">
			<button
				type="button"
				aria-label="decrease"
				onclick={() => (draft.timerSeconds = Math.max(10, draft.timerSeconds - 5))}>−</button
			>
			<div class="cy-stepper-val">{draft.timerSeconds}<span>sec</span></div>
			<button
				type="button"
				aria-label="increase"
				onclick={() => (draft.timerSeconds = Math.min(120, draft.timerSeconds + 5))}>+</button
			>
		</div>
	</div>

	<div class="cy-field">
		<span class="cy-field-label">pick / ban order — drag ⠿ to reorder</span>
		{#if draft.script.length === 0}
			<p class="cy-foot">// empty script — add at least one turn</p>
		{:else}
			<ul class="cy-script" aria-label="Pick/ban turn order">
				{#each draft.script as turn, i (turn.id)}
					<ScriptTurnRow
						{turn}
						index={i}
						isFirst={i === 0}
						isLast={i === draft.script.length - 1}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						onRemove={removeTurn}
						onUpdate={updateTurn}
						onMoveUp={moveUp}
						onMoveDown={moveDown}
					/>
				{/each}
			</ul>
		{/if}
		<button type="button" class="cy-btn cy-btn-sm cy-script-add" onclick={addTurn}
			>+ ADD_TURN</button
		>
	</div>

	{#snippet footer()}
		{#if confirmingDiscard}
			<span class="cy-foot">// discard unsaved config?</span>
			<div class="cy-grow"></div>
			<button type="button" class="cy-btn cy-btn-sm cy-btn-danger" onclick={() => (open = false)}
				>[DISCARD]</button
			>
			<button type="button" class="cy-btn cy-btn-sm" onclick={() => (confirmingDiscard = false)}
				>[KEEP_EDITING]</button
			>
		{:else}
			<div class="cy-grow"></div>
			<button
				type="button"
				class="cy-btn cy-btn-sm"
				onclick={() => {
					if (attemptClose()) open = false;
				}}>CANCEL</button
			>
			<button type="button" class="cy-btn cy-btn-primary cy-btn-sm" onclick={save}
				>SAVE_CONFIG()</button
			>
		{/if}
	{/snippet}
</CyModal>
