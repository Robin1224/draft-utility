<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { parseRoomCode } from '$lib/join-parse.js';

	let draftId = $state('');
	let disabled = $derived(draftId.length === 0);

	/** @param {SubmitEvent} event */
	async function handleSubmit(event) {
		event.preventDefault();
		const code = parseRoomCode(draftId);
		goto(resolve('/draft/[id]', { id: code }), { replaceState: true });
	}
</script>

<form class="cy-card" onsubmit={handleSubmit}>
	<div class="cy-card-head">
		<span class="cy-card-num">[ 02 ]</span>
		<span class="cy-card-title"><span class="cy-card-prompt">&gt;</span> JOIN_ROOM</span>
	</div>
	<div class="cy-card-rule" aria-hidden="true"></div>
	<p class="cy-card-desc">Connect to an existing session via room code or URL.</p>
	<div class="cy-card-action">
		<label class="cy-input-wrap">
			<span class="cy-input-prompt">&gt;</span>
			<input class="cy-input cy-input-bare" placeholder="K7-MIRA" bind:value={draftId} />
		</label>
		<button class="cy-card-btn" type="submit" {disabled}>▸ CONNECT</button>
	</div>
</form>
