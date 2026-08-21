<script>
	/**
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/**
	 * Cyber script-editor row (D-11): ⠿ grip drag + ↑/↓ move buttons + rm.
	 * The whole li is draggable (grip is the visual affordance only); the
	 * ↑/↓ buttons are the keyboard/touch reorder path sharing the parent's
	 * single splice data path.
	 * @type {{
	 *   turn: ScriptTurn,
	 *   index: number,
	 *   isFirst: boolean,
	 *   isLast: boolean,
	 *   onDragStart: (e: DragEvent, i: number) => void,
	 *   onDragOver: (e: DragEvent, i: number) => void,
	 *   onDrop: (e: DragEvent, i: number) => void,
	 *   onRemove: (i: number) => void,
	 *   onUpdate: (i: number, field: 'team'|'action', value: string) => void,
	 *   onMoveUp: (i: number) => void,
	 *   onMoveDown: (i: number) => void
	 * }}
	 */
	let {
		turn,
		index,
		isFirst,
		isLast,
		onDragStart,
		onDragOver,
		onDrop,
		onRemove,
		onUpdate,
		onMoveUp,
		onMoveDown
	} = $props();

	let dragging = $state(false);
	let dragOver = $state(false);
</script>

<li
	class="cy-script-row"
	class:is-drag={dragging || dragOver}
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
	<span class="cy-script-grip" aria-hidden="true">⠿</span>
	<span class="cy-script-idx">{String(index + 1).padStart(2, '0')}</span>
	<select
		class={turn.team === 'A' ? 'team-a' : 'team-b'}
		aria-label="Team for turn {index + 1}"
		value={turn.team}
		onchange={(e) => onUpdate(index, 'team', e.currentTarget.value)}
	>
		<option value="A">TEAM_A</option>
		<option value="B">TEAM_B</option>
	</select>
	<select
		class={turn.action === 'ban' ? 'is-ban' : 'is-pick'}
		aria-label="Action for turn {index + 1}"
		value={turn.action}
		onchange={(e) => onUpdate(index, 'action', e.currentTarget.value)}
	>
		<option value="ban">ban()</option>
		<option value="pick">pick()</option>
	</select>
	<button
		type="button"
		class="cy-script-move"
		aria-label="move turn {index + 1} up"
		disabled={isFirst}
		onclick={() => onMoveUp(index)}>↑</button
	>
	<button
		type="button"
		class="cy-script-move"
		aria-label="move turn {index + 1} down"
		disabled={isLast}
		onclick={() => onMoveDown(index)}>↓</button
	>
	<button
		type="button"
		class="cy-script-rm"
		aria-label="remove turn {index + 1}"
		onclick={() => onRemove(index)}>rm</button
	>
</li>
