// @ts-nocheck
import { describe, it } from 'vitest';

// NOTE: src/lib/chat-filter.js does not exist yet (Wave 0 stub).
// Tests will import from it once Plan 02 creates it.
// vi.mock is NOT needed here — chat-filter.js will be a pure function module.

describe('chat-filter — length cap (CHAT-04)', () => {
  it.todo('message of exactly 500 chars passes length check');
  it.todo('message of 501 chars returns { blocked: true, reason: "TOO_LONG" }');
  it.todo('empty message passes length check');
});

describe('chat-filter — NFKC normalization and zero-width strip (CHAT-04)', () => {
  it.todo('body is NFKC-normalized before slur check');
  it.todo('zero-width space \\u200B is stripped before slur check');
  it.todo('zero-width non-joiner \\u200C is stripped before slur check');
  it.todo('zero-width joiner \\u200D is stripped before slur check');
  it.todo('BOM \\uFEFF is stripped before slur check');
  it.todo('soft hyphen \\u00AD is stripped before slur check');
});

describe('chat-filter — slur matching (CHAT-04)', () => {
  it.todo('message containing a listed slur returns { blocked: true, reason: "SLUR" }');
  it.todo('message containing slur after NFKC normalization is blocked');
  it.todo('word containing slur as substring but not at word boundary passes (Scunthorpe)');
  it.todo('clean message returns { blocked: false, body: normalizedBody }');
  it.todo('slur check is case-insensitive');
});
