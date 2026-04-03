<script>
	/** @type {{ roomPhase?: 'lobby' | 'drafting' | 'review' }} */
	let { roomPhase = 'lobby' } = $props();

	/** @param {'lobby' | 'drafting' | 'review'} p */
	function phaseToIndex(p) {
		if (p === 'drafting') return 2;
		if (p === 'review') return 3;
		return 1;
	}

	const activeIndex = $derived(phaseToIndex(roomPhase));

	const activeClasses = 'text-text-secondary underline';
	const baseInactive = 'text-text-tertiary hidden sm:block';

	/** @param {number} i 1-based step index */
	function itemClass(i) {
		if (i === activeIndex) return activeClasses;
		if (i > activeIndex) return `${baseInactive} opacity-50 pointer-events-none select-none`;
		return baseInactive;
	}
</script>

<ul class="mx-auto flex gap-4 font-semibold uppercase">
	<li class={itemClass(1)}>
		<span aria-disabled={1 > activeIndex ? 'true' : undefined}>Lobby</span>
	</li>
	<li class={itemClass(2)}>
		<span aria-disabled={2 > activeIndex ? 'true' : undefined}>Drafting</span>
	</li>
	<li class={itemClass(3)}>
		<span aria-disabled={3 > activeIndex ? 'true' : undefined}>Review</span>
	</li>
</ul>
