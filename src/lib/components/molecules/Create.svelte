<script>
	import { enhance } from '$app/forms';
</script>

<form method="POST" action="?/createRoom" use:enhance>
	<button type="submit" class="cy-card">
		<div class="cy-card-head">
			<span class="cy-card-num">[ 01 ]</span>
			<span class="cy-card-title"><span class="cy-card-prompt">&gt;</span> SPAWN_ROOM</span>
		</div>
		<div class="cy-card-rule" aria-hidden="true"></div>
		<p class="cy-card-desc">Initialize a new draft session. You become host.</p>
		<div class="cy-card-action">
			<span class="cy-card-btn">▸ EXECUTE</span>
		</div>
	</button>
</form>
