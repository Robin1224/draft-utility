<script>
    let { phase } = $props();

    const phaseClasses = [
        'text-text-secondary underline',
        'text-text-tertiary hidden sm:block',
    ]
</script>

<ul class="flex gap-4 mx-auto uppercase font-semibold">
    <li class={phase === 1 ? phaseClasses[0] : phaseClasses[1]}>Lobby</li>
    <li class={phase === 2 ? phaseClasses[0] : phaseClasses[1]}>Drafting</li>
    <li class={phase === 3 ? phaseClasses[0] : phaseClasses[1]}>Review</li>
</ul>