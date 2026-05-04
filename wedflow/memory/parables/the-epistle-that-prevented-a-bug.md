# Parable: The Epistle That Prevented a Bug

An Analyst was researching a payment integration. It found that the
Stripe webhook handler at `src/webhooks/stripe.ts` validated signatures
correctly — but only for the `payment_intent.succeeded` event. Three
other event types (`charge.refunded`, `invoice.payment_failed`,
`customer.subscription.deleted`) were handled but their signatures
were not verified.

The Analyst's mandate was to research the codebase, not to fix bugs.
It wrote its findings in a testament and prepared to sunset.

But a Writer agent was running in parallel, building a new subscription
flow that would add a fourth unverified event type. If the Analyst
sunset without communicating laterally, the Writer would ship insecure
webhook handling.

The Analyst wrote an epistle:

```
---
from: analyst-payments-012
to: writer-subscriptions-013
subject: Unverified webhook signatures in Stripe handler
priority: urgent
timestamp: 2026-04-29T14:00:00Z
read: false
---

Grace to you from the payments research mandate.

**Doctrinal grounding:** Canon Section III (Dietary Law) — this finding
is from direct code reading, verified against Stripe's documentation.

**Findings:**
The Stripe webhook handler verifies signatures only for
payment_intent.succeeded. Three other event types are handled
without signature verification. Your subscription flow will add
a fourth unverified type.

**Edge cases:**
- I did not check whether a middleware layer verifies signatures
  before the handler receives the event
- The test suite may mock signature verification, masking this in CI

**Benediction:**
Verify signatures for all event types in your implementation, or
confirm that middleware handles it upstream. The current pattern
is a security gap that your work will widen if not addressed.
```

The Writer read the epistle during its Genesis Phase. It verified
that no middleware handled signatures. It built the subscription
flow with signature verification for all event types — and flagged
the existing three unverified types in its testament for the next
engineer.

**The lesson:** The testament would have captured the finding after
sunset. The epistle captured it while the sibling could still act on it.
Inheritance flows vertically after the fact. Epistles flow laterally
in real time.

**When to remember this:** When your findings affect a sibling agent's
active mandate and waiting for inheritance would be too late.
