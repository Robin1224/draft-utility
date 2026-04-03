---
status: resolved
trigger: "Discord sign-in failed instead of OAuth redirect on /login"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T12:00:00Z
human_verified: 2026-04-03
---

## Current Focus

hypothesis: CONFIRMED — bare catch swallowed SvelteKit `redirect()` throw  
test: fixed with `isRedirect(e) ? throw e`  
expecting: user confirms browser redirects to Discord  
next_action: none — user confirmed fixed

## Symptoms

expected: Clicking "Sign in with Discord" redirects to Discord OAuth.  
actual: UI shows "Discord sign-in failed. Please try again."  
errors: Same as actual (from login action catch path).  
reproduction: /login → Sign in with Discord.  
started: Since feature shipped.

## Eliminated

## Evidence

- timestamp: 2026-04-03
  checked: `@sveltejs/kit` `redirect()` implementation (`src/exports/index.js`)
  found: `redirect()` throws `Redirect` (not a return value); docs warn not to catch it
  implication: `try { ... return redirect(302, url) } catch { fail(500) }` treats successful redirect as failure

- timestamp: 2026-04-03
  checked: `src/routes/login/+page.server.js` signin/register actions
  found: bare `catch` wraps `return redirect(302, result.url)`
  implication: ROOT CAUSE — Redirect intercepted by catch

## Resolution

root_cause: SvelteKit `redirect()` throws a `Redirect` instance for control flow. The login actions wrapped `signInSocial` and `redirect` in one `try/catch` that treats any throw as Discord failure, so the successful OAuth redirect path always hit `fail(500)`.

fix: On catch, rethrow when `isRedirect(e)` so SvelteKit can complete the redirect; only map real errors to `fail(500)`.

verification: User confirmed fixed — Discord OAuth redirect works from /login after fix.

files_changed:

- src/routes/login/+page.server.js
