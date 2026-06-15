import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const css = read('src/app.css');

describe('Phase 10 — Home/Login CSS', () => {
	it('UI-01/02: ports the Home anchor selectors + verbatim spacing', () => {
		expect(css).toContain('.cy-home {');
		expect(css).toContain('padding: 40px 32px 24px');
		expect(css).toContain('.cy-frame {');
		expect(css).toContain('.cy-home-grid');
		expect(css).toContain('.cy-card-btn');
	});

	it('UI-02: ports the Login card + Discord/divider chrome', () => {
		expect(css).toContain('.cy-login {');
		expect(css).toContain('.cy-login-card {');
		expect(css).toContain('.cy-divider');
		expect(css).toContain('.cy-foot');
	});
});

describe('Phase 10 — Lobby CSS', () => {
	it('UI-03: ports the Lobby anchor + team accent selectors', () => {
		expect(css).toContain('.cy-lobby {');
		expect(css).toContain('.cy-banner');
		expect(css).toContain('.cy-team-lime');
		expect(css).toContain('.cy-team-violet');
		expect(css).toContain('.cy-slot-empty');
		expect(css).toContain('.cy-tag-cap');
		expect(css).toContain('.cy-spec-pill');
	});
});

describe('Phase 10 — Drafting/Chat CSS', () => {
	it('UI-04: ports the draft grid with verbatim three-column track', () => {
		expect(css).toContain('.cy-draft-grid {');
		expect(css).toContain('grid-template-columns: 240px 1fr 240px');
		expect(css).toContain('repeat(7, 1fr)');
	});

	it('UI-04: ban treatment is intact (line-through + red submit)', () => {
		expect(css).toContain('.cy-pickslot.is-ban .cy-pickslot-name');
		expect(css).toContain('text-decoration: line-through');
		expect(css).toContain('.cy-submit-ban');
		expect(css).toContain('background: var(--cy-red)');
	});

	it('UI-04: urgency state is intact (red color + cy-pulse)', () => {
		expect(css).toContain('.cy-turn-clock.is-urgent');
		expect(css).toContain('color: var(--cy-red)');
		expect(css).toContain('animation: cy-pulse 1s infinite');
		expect(css).toContain('@keyframes cy-pulse');
	});

	it('UI-04: chat dock + desktop sidebar reservation are ported', () => {
		expect(css).toContain('.cy-chat-right');
		expect(css).toContain('.cy-chat-drawer');
		expect(css).toContain('padding-right: 300px');
		expect(css).toContain('.cy-chat-cursor');
	});
});

describe('Phase 10 — Review/Pause CSS', () => {
	it('UI-05: ports the Review grid + ban receipt', () => {
		expect(css).toContain('.cy-review {');
		expect(css).toContain('.cy-review-grid {');
		expect(css).toContain('.cy-review-team-lime');
		expect(css).toContain('.cy-review-team-violet');
		expect(css).toContain('.cy-review-ban');
	});

	it('UI-06: ports the Pause card + timer', () => {
		expect(css).toContain('.cy-pause {');
		expect(css).toContain('.cy-pause-card {');
		expect(css).toContain('.cy-pause-timer-num');
		expect(css).toContain('.cy-pause-bar');
	});
});

describe('Phase 10 — scope guards (no Phase 11/12, no radius)', () => {
	it('does not leak Phase 11/12 selectors into the Phase 10 port', () => {
		expect(css).not.toContain('cy-loading');
		expect(css).not.toContain('cy-gate');
		expect(css).not.toContain('cy-cancel');
		expect(css).not.toContain('cy-modal');
		expect(css).not.toContain('cy-stepper');
		expect(css).not.toContain('cy-script');
		expect(css).not.toContain('cy-hc-');
	});

	it('DS-04: still contains zero border-radius declarations', () => {
		expect(css).not.toMatch(/border-radius/);
	});
});
