# Changelog

All notable changes to WedFlow are documented here.

## [0.3.0] - 2026-04-23

### Added
- Circle of Care MVP: new `circle_members` and `task_assignments` database tables with RLS policies
- Circle member invite flow at `/join/[token]` with couple-first welcome, magic link auth, email binding validation, and copy invite link fallback
- MOH portal at `/portal` with task-first mobile layout, task counter, task cards (title, person, deadline), done/dismissed states, and role-filtered conversations
- Circle server actions: invite creation, invite acceptance, portal context loading, task status updates
- `DESIGN.md` formalizing the WedFlow brand system (colors, typography, spacing, components, accessibility, ARIA patterns)
- `safety.test.ts` with 17 tests covering reply fact-checking (URLs, times, addresses, dress codes, empty replies)
- `escalation.test.ts` with 12 tests covering draft generation, API errors, empty responses, minimal profiles
- `TODOS.md` with full Circle of Care build order and design decisions from reviews
- Composite index on `guests(couple_id, group_tag)` for portal conversation filtering

### Changed
- Landing page hero rewritten: "Your wedding takes a village. We help you tend it." with circle diagram replacing phone mockup
- Landing page copy now names specific roles (MOH, mom, bridesmaids) instead of generic "guests"
- "How it works" section reframed as "How your people are cared for" with three pillars: guests text, circle coordinates, hard things held gently
- Features section reframed around the circle of care, not just guest FAQ handling
- Brand language throughout uses "tend," "care," "hold" rooted in shepherd/flock values
- Middleware updated to allow `/join` as a public route for circle member invites

## [0.2.0] - 2026-04-19

### Added
- Complete design system with `--wf-*` CSS custom properties (forest, cream, terracotta, ink, paper, rose)
- Sign-in and sign-up pages with two-column forest/form layout, couple photo, and testimonial
- `checkEmail` success state on sign-up for email confirmation flow — clear inbox messaging instead of silent wait
- `googleLoading` state on both auth forms to prevent double-submit race on Google OAuth
- `reply.test.ts` — mandatory test file for `lib/ai/generateReply` covering happy path, non-text block error, empty response, and AI call failure

### Changed
- Landing page, dashboard, and auth pages migrated to design system tokens — no more hardcoded hex values
- Logo implementation updated: `LogoDark.png` on dark surfaces, `LogoLight.png` on cream surfaces, sized with `overflow: hidden` to fill container
- Auth redirect URLs now use `NEXT_PUBLIC_APP_URL` env var with `window.location.origin` fallback — avoids OAuth pointing to preview deployments
- `lib/ai/reply.ts` `max_tokens` increased from 100 to 300 to allow complete guest responses
- Supabase client moved to module scope in auth forms for stable singleton per component lifecycle

### Fixed
- Open redirect in `/auth/callback` — `next` query param now validated to reject absolute URLs and `//` prefixes
- Raw Supabase error message logged in auth callback — now logs only `error.code`
- Silent sign-in failure when user has unconfirmed email (session=null, error=null) — now shows actionable message
- Guest phone number (`guestPhone`) removed from Twilio send-reply log in `sms-received.ts` — replaced with `messageId` per security policy
- Unused `createClient` import removed from `DashboardClient.tsx`
- Unused `useRef` import removed from `SignInForm.tsx`

## [0.1.0] - Initial release

- Core AI SMS coordinator pipeline (classify → reply → escalate)
- Supabase auth with PKCE flow
- Inngest durable job queue for SMS processing
- Twilio webhook handler with signature validation
- Dashboard for couple to view and respond to escalated messages
- 7-step onboarding flow
