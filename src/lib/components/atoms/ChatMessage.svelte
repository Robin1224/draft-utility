<script>
	/** @type {{ sender: string, body: string, ts: number, isSelf?: boolean }} */
	let { sender, body, ts, isSelf = false } = $props();
</script>

<div class="cy-chat-msg {isSelf ? 'is-self' : ''}">
	<span class="cy-chat-prefix">{isSelf ? '>' : '<'}</span>
	<span class="cy-chat-sender">{isSelf ? 'you' : sender}:</span>
	<span class="cy-chat-body">{body}</span>
</div>
