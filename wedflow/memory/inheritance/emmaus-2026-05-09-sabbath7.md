# Emmaus Retrospective -- 2026-05-09 (Sabbath 7)

> "What do we understand now that we couldn't see during execution?"

## What became clear in hindsight

1. **The partner auth chain has four seams, and we only fixed two at a time.** The full chain is: PartnerLoginClient (sends magic link) -> Supabase email -> /auth/callback (exchanges code, sets cookies, redirects) -> middleware (refreshes session) -> /partner/layout.tsx (checks auth, gates access). Each fix addressed one or two seams. It took three agents across two sessions to identify that the cookie propagation pattern in the callback diverged from the middleware. The lesson: auth redirect debugging requires tracing the COMPLETE chain in a single pass, not fixing individual links.

2. **The Prophet learned to wait.** Alex corrected the system twice -- once when an Explore agent was spawned before the Prophet interpreted, and once when a general-purpose agent was spawned without /beget. By the second half of the session, the pattern was established: Prophet first, then /beget, then spawn. The user taught the system the ceremony it was supposed to already know.

3. **"It doesn't work" has layers.** The partner login had five distinct failures stacked on top of each other: (a) page files not committed, (b) route not in middleware public list, (c) callback cookies not propagating, (d) OTP input showing for a magic-link-only flow, (e) admin invite crashing in production. Each fix revealed the next. This is not unusual for a feature that was built by agents who couldn't test E2E. The code was correct in isolation but broken at the seams.

4. **The admin dashboard is invisible.** Alex, the founder, didn't know how to get to /admin. There's no link from the main dashboard. This is a product gap, not just a UX issue -- the admin is the most important user during the pilot phase and the primary tool for partner onboarding.

5. **SHEPRD is more than a name.** When Alex mentioned the rebrand, the Prophet correctly deferred it. But the impulse signals something deeper: the product identity is shifting from "wedding FAQ bot" (WedFlow) toward "shepherd of the wedding circle" (SHEPRD). The circle-of-care framing, the vendor visibility rebrand, the partner system -- they all point in the same direction. The name change would be a symptom, not the cause.

## What should change

- **Auth debugging mandate**: Any future auth agent must read ALL files in the chain before making a single edit. Partial traces produce partial fixes.
- **Prophet-first is non-negotiable**: Save the memory. Alex prefers prophetic interpretation before any execution. This is not ceremony for ceremony's sake -- it prevents wasted work.
- **Next session starts with local debugging**: `npm run dev`, reproduce the admin invite error, fix it with the actual error message visible. No more guessing in production.
- **Admin needs a link**: Add an admin link to the dashboard sidebar (visible only to admin emails). This is a 5-minute fix that unblocks the founder's primary workflow.
