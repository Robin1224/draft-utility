<script>
	/**
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/** @type {{ turn: ScriptTurn, index: number, onDragStart: (e: DragEvent, i: number) => void, onDragOver: (e: DragEvent, i: number) => void, onDrop: (e: DragEvent, i: number) => void, onRemove: (i: number) => void, onUpdate: (i: number, field: 'team'|'action', value: string) => void }} */
	let { turn, index, onDragStart, onDragOver, onDrop, onRemove, onUpdate } = $props();

	let dragging = $state(false);
	let dragOver = $state(false);
</script>

<li
	class="flex items-center gap-2 rounded-md border {dragOver
		? 'border-amber-400'
		: 'border-bg-secondary'} {dragging ? 'opacity-50' : ''} bg-bg-primary px-3 py-2"
	draggable="true"
	ondragstart={(e) => {
		dragging = true;
		onDragStart(e, index);
	}}
	ondragend={() => {
		dragging = false;
	}}
	ondragover={(e) => {
		e.preventDefault();
		dragOver = true;
		onDragOver(e, index);
	}}
	ondragleave={() => {
		dragOver = false;
	}}
	ondrop={(e) => {
		dragOver = false;
		onDrop(e, index);
	}}
>
	<!-- Drag handle -->
	<button
		type="button"
		class="cursor-grab text-text-tertiary"
		aria-label="Drag to reorder"
		tabindex="-1"
		onclick={(e) => e.preventDefault()}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
			<circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
			<circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
		</svg>
	</button>

	<!-- Turn index (1-based) -->
	<span class="w-5 text-right text-sm text-text-tertiary">{index + 1}</span>

	<!-- Team select -->
	<label class="sr-only" for="turn-team-{turn.id}">Team for turn {index + 1}</label>
	<select
		id="turn-team-{turn.id}"
		class="w-24 rounded-md border border-bg-secondary bg-bg-primary px-2 py-1 text-sm text-text-primary"
		value={turn.team}
		onchange={(e) => onUpdate(index, 'team', e.currentTarget.value)}
	>
		<option value="A">Team A</option>
		<option value="B">Team B</option>
	</select>

	<!-- Action select -->
	<label class="sr-only" for="turn-action-{turn.id}">Action for turn {index + 1}</label>
	<select
		id="turn-action-{turn.id}"
		class="w-24 rounded-md border border-bg-secondary bg-bg-primary px-2 py-1 text-sm text-text-primary"
		value={turn.action}
		onchange={(e) => onUpdate(index, 'action', e.currentTarget.value)}
	>
		<option value="pick">Pick</option>
		<option value="ban">Ban</option>
	</select>

	<!-- Remove button -->
	<button
		type="button"
		class="text-sm font-medium text-red-600 hover:underline"
		aria-label="Remove turn {index + 1}"
		onclick={() => onRemove(index)}
	>
		Remove
	</button>
</li>
