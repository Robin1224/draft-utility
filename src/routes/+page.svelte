<script lang="ts">
	import { on, status } from 'svelte-adapter-uws/client';

	// Subscribe to the 'notifications' topic.
	// Store is null until the first event is received (by design).
	const notifications = on('notifications');

	async function sendTestNotification() {
		await fetch('/api/notify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: 'Hello from test', at: new Date().toISOString() })
		});
	}
</script>

{#if $status === 'open'}
	<span>Connected</span>
{:else}
	<span>Status: {$status}</span>
{/if}

<button type="button" onclick={sendTestNotification}>Send test notification</button>

{#if $notifications}
	<p>Event: {$notifications.event}</p>
	<p>Data: {JSON.stringify($notifications.data)}</p>
{:else}
	<p>No notification yet — click the button above to send one.</p>
{/if}