<script>
	// ASCII plasma shader — verbatim port of cyber.jsx §CYShader (React → Svelte 5).
	// A grid of monospace glyphs whose density is driven by an animated,
	// domain-warped plasma field, colored on a procedural violet→lime brightness
	// ramp. Renders to a <canvas> scoped inside .cy-app (absolute, behind content).
	// Pauses via IntersectionObserver when off-screen; under prefers-reduced-motion
	// it draws exactly one static frame and never schedules requestAnimationFrame.

	/** @type {{ intensity?: number, hot?: boolean }} */
	let { intensity = 1, hot = false } = $props();

	/** @type {HTMLCanvasElement | null} */
	let canvas = $state(null);

	const CY_RAMP = ' .:-=+*o#%@'; // low → high density; leading space is index 0 — do NOT trim

	$effect(() => {
		// React useEffect(fn, [intensity, hot]) → this $effect reads both, so it
		// re-runs (and re-creates the loop/observers) when either changes.
		if (typeof window === 'undefined') return;
		if (!canvas) return;
		const maybeCtx = canvas.getContext('2d');
		if (!maybeCtx) return;
		/** @type {HTMLCanvasElement} */
		const el = canvas;
		/** @type {CanvasRenderingContext2D} */
		const ctx = maybeCtx;

		const cell = hot ? 16 : 14; // glyph cell size, CSS px
		let cols = 0,
			rows = 0,
			w = 0,
			h = 0,
			dpr = 1;
		let raf = 0,
			last = 0;
		const t0 = performance.now();
		let visible = true;
		const sp = hot ? 1.25 : 1; // motion speed multiplier
		const fps = hot ? 60 : 30; // frame cap

		// Precompute the per-level palette ONCE — procedural violet→lime RGB ramp
		// (NOT token-driven; the formula IS the contract).
		const levels = CY_RAMP.length; // 11
		/** @type {string[]} */
		const colors = [];
		for (let i = 0; i < levels; i++) {
			const v = i / (levels - 1);
			// low: dim violet · mid: violet→lime · high: bright lime
			const r = Math.round(140 + (179 - 140) * v + (v > 0.6 ? (v - 0.6) * 120 : 0));
			const g = Math.round(40 + (255 - 40) * v);
			const b = Math.round(200 - 160 * v);
			const a = (hot ? 0.26 + v * v * 0.95 : 0.05 + v * v * 0.5) * intensity;
			colors.push(
				`rgba(${Math.min(r, 205)},${Math.min(g, 255)},${Math.max(b, 40)},${a.toFixed(3)})`
			);
		}

		function resize() {
			const rect = el.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = rect.width;
			h = rect.height;
			cols = Math.ceil(w / cell);
			rows = Math.ceil(h / cell);
			el.width = Math.floor(w * dpr);
			el.height = Math.floor(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.font = `${cell}px "JetBrains Mono", ui-monospace, monospace`;
			ctx.textBaseline = 'top';
		}

		// One full per-cell plasma pass at time `t`. Shared by the animated loop
		// and the reduced-motion single static draw.
		/** @param {number} t */
		function draw(t) {
			ctx.clearRect(0, 0, w, h);
			const cx = cols * 0.5,
				cy = rows * 0.5;
			for (let gy = 0; gy < rows; gy++) {
				for (let gx = 0; gx < cols; gx++) {
					// domain warp for organic, large-scale drift
					const wx = Math.sin(gy * 0.12 + t * 0.9) * 2.6;
					const wy = Math.cos(gx * 0.1 - t * 0.7) * 2.6;
					const dx = gx - cx,
						dy = gy - cy;
					const d = Math.sqrt(dx * dx + dy * dy);
					let v =
						Math.sin((gx + wx) * 0.11 + t * 1.3) +
						Math.sin((gy + wy) * 0.1 - t * 1.05) +
						Math.sin((gx + gy) * 0.07 + t * 0.85) +
						0.7 * Math.sin(d * 0.09 - t * 1.6);
					v = (v + 3.7) / 7.4; // → ~0..1
					if (v < 0) v = 0;
					else if (v > 1) v = 1;
					v = hot ? Math.pow(v, 1.5) : v * v * v; // hot = denser; calm = sparse ridges
					let lvl = (v * (levels - 1)) | 0;
					if (lvl <= 0) continue; // skip spaces — big perf win
					if (lvl > levels - 1) lvl = levels - 1;
					ctx.fillStyle = colors[lvl];
					ctx.fillText(CY_RAMP[lvl], gx * cell, gy * cell);
				}
			}
		}

		/** @param {number} now */
		function frame(now) {
			raf = requestAnimationFrame(frame);
			if (!visible) return; // off-screen pause: keep scheduling, draw nothing
			if (now - last < 1000 / fps) return; // frame cap
			last = now;
			if (!cols || !rows) {
				resize();
				if (!cols) return;
			}
			const t = (now - t0) * 0.001 * sp;
			draw(t);
		}

		// Detect reduced-motion once (SSR-guarded; window already confirmed above).
		const reduced =
			!!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(el);
		const io = new IntersectionObserver(
			(entries) => {
				visible = entries[0].isIntersecting;
			},
			{ threshold: 0.01 }
		);
		io.observe(el);

		if (reduced) {
			// D-04: draw exactly ONE static frame at a fixed t, then NEVER schedule rAF.
			if (cols && rows) draw(0);
		} else {
			raf = requestAnimationFrame(frame);
		}

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class="cy-shader" class:cy-shader-hot={hot} aria-hidden="true"></canvas>
