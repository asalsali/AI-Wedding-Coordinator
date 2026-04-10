# Wedflow

AI-powered SMS coordinator for wedding couples. Guests text a dedicated number with questions. An AI replies instantly in the couple's voice. Sensitive messages escalate to the couple's dashboard with a suggested reply draft.

---

## How it works

```
Guest SMS → Twilio → /api/webhooks/twilio
  → Number lookup → Inngest job enqueued
  → Classifier: routine | sensitive | unclear
  → routine/unclear+confident → AI reply → Safety filter → Send
  → sensitive/unclear+low-confidence → Escalate → Dashboard
  → Audit log (every path, always)
```

Couples set up a wedding profile during onboarding — venue, dress code, registry, tone of voice. The AI draws from that profile to answer guest questions accurately and in the couple's style. If something is emotionally sensitive (grief, illness, can't-attend messages), it never auto-replies — it surfaces to the dashboard instead.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Auth | Supabase Auth |
| Database | Supabase (Postgres + RLS) |
| SMS | Twilio (dedicated number per couple) |
| Queue | Inngest (durable jobs + retries) |
| AI | Anthropic Claude |
| Payments | Stripe |
| Deployment | Vercel |

---

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Twilio account with a phone number
- An Anthropic API key
- A Stripe account

### Install

```bash
npm install
```

### Environment variables

Create a `.env.local` file with the following:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WEBHOOK_SECRET=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

RESEND_API_KEY=
WAITLIST_NOTIFY_EMAIL=
```

### Database

Run migrations against your Supabase project in order:

```bash
# Apply via Supabase CLI or paste into the SQL editor
supabase/migrations/001_*.sql through 009_*.sql
```

### Run locally

```bash
npm run dev
```

Then in a separate terminal, run the Inngest dev server:

```bash
npx inngest-cli@latest dev
```

---

## Project structure

```
app/
  api/
    webhooks/twilio/     — inbound SMS handler
    stripe/              — checkout + webhook
    waitlist/            — beta waitlist signup
  auth/callback/         — Supabase OAuth callback
  dashboard/             — couple-facing UI (auth-gated)
  onboarding/            — 7-step setup flow
  pricing/               — plan selection
  sign-in/
  sign-up/

lib/
  ai/
    classifier.ts        — routine | sensitive | unclear
    reply.ts             — generate reply from wedding profile
    safety.ts            — fact-check reply before sending
    escalation.ts        — draft escalation message for couple
    prompts.ts           — all system prompt templates
  supabase/
    server.ts            — server-side client
    client.ts            — browser client
  twilio/
    client.ts            — singleton Twilio client
    provision.ts         — number provisioning
  inngest/
    client.ts
    functions/           — one file per job type

supabase/migrations/     — database schema history
types/index.ts           — shared TypeScript types
```

---

## AI models

| Job | Model | Why |
|---|---|---|
| Classifier | `claude-sonnet-4-6` | Fast, high volume |
| Reply generator | `claude-sonnet-4-6` | Standard quality |
| Escalation drafter | `claude-opus-4-6` | Complex, sensitive messages only |

Classifier temperature: `0.3` (deterministic). Reply temperature: `0.7` (natural).

---

## Sensitive message rules

These patterns always return `sensitive` — no AI involved, no exceptions:

```typescript
const ALWAYS_SENSITIVE_PATTERNS = [
  /\b(cancer|diagnosis|diagnosed|illness|sick|hospital|surgery)\b/i,
  /\b(died|death|funeral|passed away|grieving|grief)\b/i,
  /\b(divorce|separated|not coming together|coming alone)\b/i,
  /\b(can't make it|cannot attend|won't be able)\b/i,
  /\b(sorry|apolog|feel terrible|feel awful)\b/i,
  /\b(pregnant|expecting|due date)\b/i,
  /\b(fight|argument|issue between|problem with)\b/i,
]
```

---

## Security

- Every Twilio webhook is validated with `twilio.validateRequest()` before processing
- Message body content is never logged — only IDs and metadata
- Guest phone numbers are stored as hashed values in logs
- The safety filter is mandatory — no AI reply sends without passing it
- RLS is enabled on every Supabase table — couples can only access their own data
- Number-to-couple assignments are immutable once provisioned

---

## Inngest jobs

```
wedflow/sms.received       — inbound message, triggers pipeline
wedflow/sms.classify       — classifier step
wedflow/sms.reply          — generate + send AI reply
wedflow/sms.escalate       — notify couple, draft reply
wedflow/number.provision   — assign Twilio number to couple
wedflow/number.release     — release number 42 days after wedding date
wedflow/audit.log          — audit trail (runs on every path, including failures)
```

---

## License

Private. All rights reserved.
