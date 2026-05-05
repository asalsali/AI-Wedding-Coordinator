# WedFlow — Product Roadmap

## Current State (2026-05-05)

### Traction
- 12 couples paying $79/month (Concierge tier) through Base church pilot
- Champion: James Toonk (officiant at Base), introduced by David Klomfass (Director of Strategic Planning)
- James warm intro'ing to church elders and other officiants
- Randy sourcing 3 verbal LOIs from churches in Lebanon
- FamilyLife Canada interested — pre-marriage counselling monitoring angle

### Pricing
- Essential: $49/month
- Concierge: $79/month
- Starter tier killed

### Distribution: B2B2C
- Officiants and churches are the channel, couples are the end user
- Officiants love it: reduces their coordination workload, adds revenue as an addon service
- Churches see counselling value: surface small issues early, bring major issues to sessions

---

## Phase 1: Prove It (May-June 2026)

Eric's mandate: observe for a month. Be a detective. Be objective.

### Metrics to Track
- Messages received per couple per week
- Auto-reply rate (routine messages handled without escalation)
- Inbox usage (how often couples open the dashboard)
- Escalation draft adoption (do couples use the AI draft or write their own?)
- Sample message completion rate during onboarding
- Churn: do couples keep using it, or drop off after setup?

### Key Questions to Answer
- Do couples love the product, or just officiants?
- Which features drive retention vs which are ignored?
- What do couples wish they could do that they can't?
- Does usage sustain past the first week?
- What's the natural expansion motion — do couples tell other couples?

### Actions
- [ ] Instrument all metrics above in the dashboard
- [ ] Set up 1:1s with couples in Base pilot as they start using it
- [ ] Weekly check-in with James Toonk on officiant experience
- [ ] Track which messages hit auto-reply vs escalation (classifier tuning signal)
- [ ] Document every feature request and complaint verbatim

---

## Phase 2: Expand What Works (July 2026)

Only after Phase 1 data is in. Do not skip ahead.

### If officiant channel scales:
- [ ] Onboard officiants from James's warm intros (elders, other officiants at Base)
- [ ] Onboard Randy's Lebanon church contacts (3 LOIs)
- [ ] Build officiant dashboard — let officiants manage their couples, see aggregate usage
- [ ] Formalize officiant referral incentive (revenue share or discount)

### If FamilyLife counselling angle validates:
- [ ] Build counselling integration — flag patterns across sessions for counsellors
- [ ] Explore FamilyLife Canada partnership structure

### If couples love it independently:
- [ ] Build couple-to-couple referral flow
- [ ] Explore direct-to-consumer alongside B2B2C

---

## Phase 3: Scale (August 2026)

### Stripe integration
- Stripe Checkout for Essential ($49) and Concierge ($79)
- Subscription management in dashboard (upgrade, downgrade, cancel)
- Officiant/church billing: bulk pricing or partner portal
- Stripe keys provided separately — never in code

### Launch target (September 1, 2026)
- 10-12 paid couples actively using AI SMS coordination
- Waitlist demand from 4-month marketing campaign
- B2B2C channel partners registered and referring

---

## Signals to Watch

### Product-market fit signals (positive)
- Couples texting multiple times per week without prompting
- Couples using escalation drafts as-is (AI voice matches their voice)
- Officiants asking to onboard more couples unprompted
- Organic word-of-mouth from couples to other couples

### Warning signals
- Couples stop texting after week 1
- High escalation rate (classifier not catching enough routine messages)
- Couples rewriting every draft (AI voice mismatch)
- Officiants not following up after initial enthusiasm

---

## Mentor Guidance (Eric Blondeel, Velocity — 2026-05-05)

> Pay attention to how your users experience the product.
> See what seems to matter most. Do people love the product?
> See how it goes for a month. See what scales, see what's consistent.
> Be a detective. Be objective.
> Don't just insist the product is amazing. Make it amazing.
