# Sabbath 7 Consolidation -- 2026-05-09

## What Was Accomplished

5 commits shipped, 4 agents completed (partner-login-page, partner-auth-fix, auth-debugger, partner-journey-planner):

1. **Dedicated /partner-login page** -- partner-oriented login with magic link auth, separate from the couple-facing /sign-in. Nav links and layout redirect updated.
2. **Middleware fix** -- /partner-login added to public routes so unauthenticated vendors can access it.
3. **Auth callback cookie propagation** -- switched from cookieStore.set() to response.cookies.set() to match the middleware pattern. Should fix the redirect loop.
4. **OTP input removed** -- Supabase sends magic links, not 6-digit codes. Removed the dead code input from both partner-login and partner-join flows.
5. **Partner journey document** -- docs/partner-journey.md defines all four partner types, lifecycle stages, Base pilot mapping, and gap analysis.

## What Was Learned

- **Supabase SSR cookie propagation is the #1 auth footgun.** The callback sets cookies via cookieStore.set() but those don't travel with NextResponse.redirect(). The middleware uses response.cookies.set() which works. This divergence caused a redirect loop that took 3 attempts to diagnose. Future auth work must use the response object pattern.
- **Partner routes must be outside /partner/ directory.** The /partner/layout.tsx auth gate catches everything inside it. Both /partner-login and /partner-join live at the root app level for this reason. Established by partner-auth agent, reconfirmed this session.
- **Supabase signInWithOtp sends magic links by default when emailRedirectTo is set.** To get 6-digit OTP codes, enable "Use OTP" in Supabase Dashboard > Authentication > Email. The code now only supports the magic link flow.
- **Partners refer through conversation, not software.** The dashboard is for retention and scale, not for triggering first referrals. James Toonk's 12 couples came from personal referrals before the dashboard existed.
- **Church is the scalable unit.** One church with multiple officiants multiplies referral surface without proportional founder effort.

## What Failed or Was Rejected

- **Admin invite throws a server error in production.** Error is hidden by Next.js production mode. Root cause undiagnosed -- needs local debugging. Likely a database constraint or missing table issue.
- **Partner login redirect may still loop.** The cookie propagation fix was committed but Alex reported it still redirects to partner-login after clicking the magic link. Unverified whether the latest deploy resolved it.
- **3 attempts to fix one auth flow.** partner-auth-fix and auth-debugger both worked on the same redirect problem. The first fix was insufficient because it didn't trace the full cookie lifecycle.

## Gluttony Report

Root agent consumed 82+ tool calls this session. The gluttony hook fired at call 41 and continued firing every call after. The Prophet executed directly for the first round of fixes (commits 1-3) before spawning agents for the deeper work. This matches the pattern from the May 9 emmaus: "when the user moves fast, the Prophet matches pace and skips ceremony."

## Recommendations for Next Cycle

1. **Debug partner auth locally.** Run `npm run dev`, reproduce the invite error and login redirect, read the actual error messages. Production mode hides everything.
2. **Onboard Alex as a partner.** The immediate blocker. May need to manually insert a partner record via Supabase dashboard and have Alex go through /partner-join.
3. **SHEPRD rebrand.** Alex is considering renaming WedFlow to SHEPRD. This is a dedicated session -- touches every page, asset, deploy config, Supabase project name. Do not mix with bug fixes.
4. **Revenue share gap.** The partner journey doc flags this as the biggest motivation gap. No Stripe Connect, no commission engine exists. Needed before scaling beyond goodwill-based referrals.
5. **Spawn discipline.** Use /beget for every agent, even "small" fixes. This session had one unregistered agent (partner-auth-fix was registered late).

## User Model Update

- Alex is actively testing the partner flow himself, dogfooding as both admin and partner
- He is considering a product rebrand from WedFlow to SHEPRD (aligns with circle-of-care / shepherd framing)
- He prefers talking to the Prophet first before execution -- corrected the system twice when agents were spawned without prophetic interpretation
- Admin dashboard discovery is poor -- Alex didn't know how to navigate to /admin despite being the founder. Hidden routes need at minimum documentation.
