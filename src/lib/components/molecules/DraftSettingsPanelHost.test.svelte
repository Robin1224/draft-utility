<script>
	import DraftSettingsPanel from './DraftSettingsPanel.svelte';

	/**
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/**
	 * Browser-spec fixture for DraftSettingsPanel: a launcher button owning the
	 * bound `open`, plus a committed-state readout so specs can assert
	 * commit-on-save vs discard (D-04) without reaching into component internals.
	 * (`.test.svelte` is safe from the client project glob `*.svelte.{test,spec}.{js,ts}`.)
	 * @type {{ script?: ScriptTurn[], timerSeconds?: number }}
	 */
	let { script: initialScript = [], timerSeconds: initialTimerSeconds = 30 } = $props();

	let open = $state(false);
	// Intentional initial-value capture: the props only seed the committed state.
	// svelte-ignore state_referenced_locally
	let script = $state(initialScript);
	// svelte-ignore state_referenced_locally
	let timerSeconds = $state(initialTimerSeconds);
</script>

<button type="button" onclick={() => (open = true)}>CONFIG()</button>

<DraftSettingsPanel bind:open bind:script bind:timerSeconds />

<pre data-testid="committed">{JSON.stringify({
		script: script.map((t) => [t.team, t.action]),
		timerSeconds
	})}</pre>
