# Wedflow — Claude Code Context

## What we're building
Wedflow is an AI SMS coordinator for wedding couples. Guests text a dedicated Twilio
number with questions ("What should I wear?", "Where are you registered?"). An AI
replies instantly in the couple's voice, drawn from a wedding profile they set up during
onboarding. Emotionally sensitive or ambiguous messages escalate to the couple's dashboard
with a suggested reply draft.

## Core message flow
```
Guest SMS → Twilio → POST /api/webhooks/twilio
  → Number lookup (phone_numbers table)
  → Inngest job enqueued
  → Classifier (routine | sensitive | unclear)
  → if routine or unclear+high-confidence → AI reply engine → Safety filter → Send via Twilio
  → if sensitive or unclear+low-confidence → Escalation service → Notify couple → Dashboard
  → Audit log (every path, always)
```

---

## Tech stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Framework   | Next.js 14 (App Router)           |
| Language    | TypeScript — strict mode always   |
| Auth        | Clerk (couple + partner roles)    |
| Database    | Supabase (Postgres + RLS)         |
| SMS         | Twilio (long codes per couple)    |
| Queue       | Inngest (durable jobs + retries)  |
| AI          | Anthropic SDK                     |
| Deployment  | Vercel + Supabase                 |

---

## AI model usage

- **Classifier**: `claude-sonnet-4-6` — fast, cheap, high volume
- **Reply generator**: `claude-sonnet-4-6` — standard replies
- **Escalation drafter**: `claude-opus-4-6` — only for complex flagged messages
- **Max tokens**: 300 for replies, 150 for classifications
- **Temperature**: 0.3 for classifier (deterministic), 0.7 for replies (natural)

---

## Directory structure

```
/app
  /api
    /webhooks
      /twilio         — inbound SMS handler (POST only)
  /dashboard          — couple-facing UI (auth-gated)
  /onboarding         — 7-step setup flow
/lib
  /ai
    classifier.ts     — routine | sensitive | unclear
    reply.ts          — generate reply from profile context
    safety.ts         — cross-check reply against profile facts
    escalation.ts     — draft escalation message for couple
    prompts.ts        — all system prompt templates (source of truth)
  /twilio
    client.ts         — singleton Twilio client
    numbers.ts        — provision, release, lookup
  /supabase
    server.ts         — server-side client (use in server components + actions)
    client.ts         — browser client (minimal — avoid where possible)
  /inngest
    client.ts         — Inngest client
    functions/        — one file per job type
/types
  index.ts            — shared TypeScript types (WeddingProfile, Message, etc.)
```

---

## Supabase rules

- **Always use the server client** (`/lib/supabase/server.ts`) in Server Components,
  Route Handlers, and Server Actions. Never import the browser client server-side.
- **RLS is mandatory** on every table. Couples can only read/write their own data.
  Never disable RLS, even in migrations.
- **Migrations live in `/supabase/migrations/`** — always generate a new migration
  file rather than editing existing ones.
- **No raw SQL in application code** — use the Supabase typed client or RPCs.

---

## TypeScript rules

- Strict mode: `"strict": true` in tsconfig — no exceptions.
- No `any` types — use `unknown` and narrow explicitly.
- All AI responses are typed and validated before use — never trust raw LLM output.
- Zod for runtime validation of: Twilio webhook payloads, AI JSON responses,
  onboarding form submissions.

---

## Environment variables

**Never create or modify `.env` files.** When a new env var is needed, list it
as a comment like `// requires: TWILIO_AUTH_TOKEN` and I will add it manually.

Required vars (do not hardcode, do not log):
```
ANTHROPIC_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
```

---

## Security rules (non-negotiable)

1. **Validate every Twilio webhook** using `twilio.validateRequest()` before
   processing. Reject with 403 if invalid.
2. **Never log message body content** — log message IDs and metadata only.
   Guest phone numbers stored as hashed values in logs.
3. **Safety filter is mandatory** — no AI reply is sent without passing
   `/lib/ai/safety.ts`. If safety check throws, escalate — never skip.
4. **Number-to-couple mapping is immutable** once a number is assigned.
   No update path — only provision and release.
5. **Classifier sensitive-message rules are hard-coded** — not prompt-only.
   The function enforces them in TypeScript regardless of AI confidence score.

---

## Classifier hard rules (enforce in code, not just prompts)

These message patterns ALWAYS return `sensitive` regardless of AI confidence:

```typescript
const ALWAYS_SENSITIVE_PATTERNS = [
  /\b(cancer|diagnosis|diagnosed|illness|sick|hospital|surgery)\b/i,
  /\b(died|death|funeral|passed away|grieving|grief)\b/i,
  /\b(divorce|separated|not coming together|coming alone)\b/i,
  /\b(can't make it|cannot attend|won't be able)\b/i,
  /\b(sorry|apolog|feel terrible|feel awful)\b/i,
  /\b(pregnant|expecting|due date)\b/i,
  /\b(fight|argument|issue between|problem with)\b/i,
];
```

Any message matching one or more patterns → `{ classification: 'sensitive', confidence: 1.0 }`
immediately, without calling the AI.

---

## Inngest job names

```
wedflow/sms.received          — inbound message, triggers full pipeline
wedflow/sms.classify          — runs classifier
wedflow/sms.reply             — generates and sends AI reply
wedflow/sms.escalate          — notifies couple, drafts reply
wedflow/number.provision      — assigns Twilio number to couple
wedflow/number.release        — releases number post-wedding (runs 42 days after date)
wedflow/audit.log             — writes to audit store (always runs, even on failure)
```

---

## Testing expectations

- Every function in `/lib/ai/` must have a corresponding `.test.ts` file.
- Classifier tests must cover: clearly routine, clearly sensitive (pattern match),
  clearly sensitive (AI-detected), unclear/high-confidence, unclear/low-confidence,
  empty string (throws), malformed AI response (throws).
- Safety filter tests must cover: reply matches profile facts (pass), reply contains
  invented fact (block + escalate), reply is empty (block).
- Use `jest` + `@anthropic-ai/sdk` mocked via `jest.mock`.

---

## What NOT to do

- Do not create API routes that accept GET requests for mutations.
- Do not put business logic in React components — keep components as thin UI shells.
- Do not call the Anthropic API from client-side code — always via Server Actions or
  Route Handlers.
- Do not add `console.log` with message content — use structured logging with IDs only.
- Do not skip error handling on Twilio or Anthropic SDK calls — every call gets a
  try/catch with a defined fallback (escalate, not fail silently).
- Do not use `supabase.from('table').select('*')` — always select explicit columns.
