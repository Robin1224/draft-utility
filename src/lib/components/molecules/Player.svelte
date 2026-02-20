<script lang="ts">
	import Avatar from '$lib/components/atoms/Avatar.svelte';
	import type { Player } from '$lib/shared/types';

	let {
		player,
		isYou
	}: { player: Player; isYou: boolean } = $props();
</script>

<div class="flex min-w-0 flex-1 items-center gap-2">
	{#if isYou}
		<div class="relative shrink-0">
			<Avatar
				src={player.avatar_url ?? ''}
				alt={player.username ?? 'Anonymous'}
				fallback={player.username?.[0]?.toUpperCase() ?? '?'}
			/>
			<span
				class="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background-alt bg-green-500"
			></span>
		</div>
	{:else}
		<Avatar
			src={player.avatar_url ?? ''}
			alt={player.username ?? 'Anonymous'}
			fallback={player.username?.[0]?.toUpperCase() ?? '?'}
		/>
	{/if}
	<span class="truncate text-sm font-medium text-foreground">
		{player.username ?? 'Anonymous'}
	</span>
	{#if isYou}
		<span
			class="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-xxs font-semibold text-accent-foreground"
		>
			You
		</span>
	{/if}
</div>
