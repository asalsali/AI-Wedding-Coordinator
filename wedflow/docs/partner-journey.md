# Partner Journey Map

How each partner type discovers, adopts, and grows with WedFlow.

Written against the product as it exists on 2026-05-09. Where the product
falls short of the ideal journey, gaps are called out explicitly.

---

## Partner Types

WedFlow has four partner types, stored as a single `partner_type` enum in the
partners table. All four share one dashboard with role-based views. Church is
the only type with meaningfully different UI (multi-officiant hierarchy). The
others share the same layout.

| Type | Who they are | Relationship to couples |
|------|-------------|------------------------|
| Officiant | Performs the ceremony. Often a pastor, justice of the peace, or independent officiant. | Direct, high-trust. Sees the couple 3-6 times before the wedding. |
| Church | Organization with one or more officiants on staff. | Institutional. The church refers through its officiants, not directly. |
| Counsellor | Pre-marital counselling provider. May be faith-based or secular. | Deep, extended. 6-12 sessions over months. Sees the couple's real stress. |
| Vendor | Photographers, florists, DJs, venues, planners. | Transactional to relational. Varies by vendor type. Planners are closest to the couple's coordination pain. |

---

## Officiant Journey

### How they discover WedFlow

1. **Direct outreach from founder.** The Base pilot started this way. Alex
   contacted James Toonk, who serves as officiant at Base Church in Waterloo.
   This is the primary channel for early adoption.
2. **Referred by another officiant.** Once a champion officiant sees value,
   they mention it to peers. Not built yet as a formal referral-a-partner flow.
3. **Couple mentions it.** A couple using WedFlow mentions the SMS line to
   their officiant during a meeting. The officiant sees it working and asks
   how to refer other couples.

### What triggers a referral

The officiant meets a couple for the first time (intake session or initial
consultation). The couple asks logistical questions about the ceremony, or
the officiant senses they are overwhelmed with coordination. The officiant
says: "There's a tool my other couples use. Guests text one number with
questions and get instant answers. I'll send you a link."

The trigger is the moment the officiant recognizes coordination stress.
This happens naturally in their existing workflow. WedFlow does not require
the officiant to change how they work.

### Day-to-day dashboard usage

The officiant logs into /partner and sees:

- **Overview tab:** Total referrals, active couples, conversion rate, pending
  referrals. Performance metrics (conversion funnel, retention, revenue
  attribution). Recent referrals list.
- **Couples tab:** Table of all referred couples with status and referral date.
  Currently shows referral status (pending/active/churned/cancelled) but does
  not show couple usage metrics like message volume.
- **Referral tab:** Their unique referral link and code. Copy-to-clipboard.
  Stats on referral performance.
- **Settings tab:** Read-only account info, contact details, referral code.

Realistically, an officiant checks the dashboard once a week at most. They
are not power users. The value is in the referral link, not the dashboard.

### What value they get

- **Reputation.** The officiant looks modern and helpful. They solve a real
  problem for the couple before the wedding even starts.
- **Visibility.** They can see which couples signed up and are active. This
  tells them their recommendation landed.
- **Revenue share.** Not yet implemented. The analytics show revenue
  attribution using hardcoded plan values ($0/$49/$79) but no actual
  commission or Stripe Connect payout exists. This is the biggest gap for
  officiant motivation beyond goodwill.

### What would make them refer more

1. A simple one-page or one-card explainer they can hand to couples (digital
   or physical). Not built.
2. Seeing that referred couples actually use the product (usage metrics visible
   on their dashboard). Partially built -- they see referral status but not
   message volume.
3. Revenue share. Even a small per-couple credit or discount would formalize
   the relationship. Not built.
4. Being able to text their referral link to the couple rather than logging in
   to copy it. Not built.

---

## Church Journey

### How they discover WedFlow

1. **Through an officiant on staff.** A staff officiant uses WedFlow
   individually, sees it work, and brings it to church leadership. This is the
   Base pilot pattern: James Toonk referred 12 couples through Base Church.
2. **Founder outreach to church admin.** Direct contact with the church's
   wedding coordinator or pastoral staff.
3. **Denomination or network referral.** One church tells another in their
   network. Relevant for Base, which is part of a broader church planting
   movement.

### What triggers a referral

The church does not refer directly. The church approves WedFlow as a
recommended tool, and their officiants refer individual couples. The church's
trigger is institutional: "Should we endorse this for all our wedding
couples?"

### Day-to-day dashboard usage

The church sees everything the officiant sees, plus:

- **Officiants tab:** List of officiants linked to the church via
  parent_partner_id. Each shows their referral count, active couples, and
  status. This is the unique church view.
- **Aggregate stats:** Total referrals across all officiants, not just the
  church's own code.

The church admin (wedding coordinator, pastoral assistant) checks the
dashboard to see which officiants are actively referring and how couples
are progressing. Monthly at most.

### What value they get

- **Oversight.** The church can see all wedding-related activity across its
  officiants in one place.
- **Consistency.** Every couple going through the church gets the same
  recommendation, creating a standard pre-wedding experience.
- **Performance visibility.** The admin can see which officiants are
  engaged and which are not, through the child partner stats.

### What would make them refer more

1. A way to bulk-invite couples (upload a list of upcoming weddings). Not
   built. Currently each couple must sign up individually through a referral
   link.
2. Co-branding. The church wants the SMS experience to feel like it comes
   from the church, not from a third-party startup. Not built and not on the
   immediate roadmap.
3. Integration with church management software (Planning Center, Church
   Community Builder). Not built, likely Phase 3.
4. A report they can present to church leadership showing impact. The
   analytics tab has the data but not in a shareable format.

---

## Counsellor Journey

### How they discover WedFlow

1. **Founder outreach.** FamilyLife Canada is in the warm pipeline as a
   counselling-angle partner.
2. **Referred by a church.** A church that uses WedFlow recommends it to
   their affiliated counselling provider.
3. **Professional network.** Counsellors who specialize in pre-marital work
   talk to each other. Conference mentions, peer referrals.

### What triggers a referral

During a counselling session, the couple expresses stress about wedding
logistics, guest management, or vendor coordination. The counsellor
recognizes that this stress is consuming emotional bandwidth that should go
toward the relationship work. The counsellor says: "I know a tool that
handles the logistics side so you can focus on each other."

The counsellor's trigger is emotional, not logistical. They refer WedFlow
as a way to reduce the couple's stress load, not as a wedding planning tool.

### Day-to-day dashboard usage

Same as officiant. The counsellor dashboard has no unique views today.

A counsellor's usage pattern is even lighter than an officiant's. They might
check the dashboard once a month to see if their referrals converted. Their
primary interaction is sharing the referral link during a session.

### What value they get

- **Therapeutic leverage.** Reducing logistical stress makes their sessions
  more productive. The couple arrives less frazzled.
- **Professional credibility.** Recommending practical tools alongside
  relational guidance makes the counsellor feel more holistic.
- **Referral tracking.** They can see which couples followed through.

### What would make them refer more

1. A way to see whether the couple's stress level decreased after WedFlow
   adoption. Not built and probably not measurable from SMS data alone.
2. A professional-facing one-pager explaining the tool's approach to
   sensitive messages (escalation, not auto-reply on emotional content).
   Not built. This matters because counsellors care about how technology
   handles emotional situations.
3. Revenue share, though counsellors may care less about this than
   officiants or vendors. Depends on the practice model.

---

## Vendor Journey

### How they discover WedFlow

1. **Through a couple.** A couple tells their photographer or planner about
   the SMS line. The vendor sees it working at an event or in coordination.
2. **Through another vendor.** Wedding vendors network heavily. A planner
   recommends WedFlow to photographers they work with.
3. **Founder outreach.** Direct contact at wedding industry events, vendor
   communities, or through the Waterloo wedding network.
4. **Landing page.** The WedFlow landing page shows vendor coordination in
   the circle diagram and has a Partner Login link in the nav. A vendor
   researching wedding tech could find it organically.

### What triggers a referral

Vendors see couples drowning in coordination. The trigger varies by vendor
type:

- **Planner:** Sees the couple forwarding the same information to 8 vendors.
  Recognizes WedFlow as a way to centralize that communication.
- **Photographer:** Gets the same logistical questions from every couple
  ("What time is the ceremony?" "Where is the venue?"). Sees WedFlow as
  the answer machine that saves them time too.
- **Venue:** Fields repetitive guest questions about parking, directions,
  accommodation. Recognizes WedFlow as a way to offload those inquiries.
- **Florist/DJ:** Less natural referral trigger. More likely to refer if
  they have a close relationship with the couple and see them stressed.

### Day-to-day dashboard usage

Same as officiant. No vendor-specific views exist today.

Vendors who are planners might check the dashboard weekly because they
manage multiple couples simultaneously. Other vendor types (photographer,
florist, DJ) check rarely or not at all.

### What value they get

- **Time savings.** Fewer repetitive questions from couples and guests.
  Most relevant for planners and venues.
- **Professional positioning.** Recommending WedFlow positions the vendor
  as tech-forward and couple-focused.
- **Revenue share.** Same gap as officiant. Not built.

### What would make them refer more

1. A vendor-specific feature: the ability for vendors to receive relevant
   updates about the weddings they are working on. For example, a
   photographer being notified when the couple updates the timeline. Not
   built.
2. Being listed in a WedFlow vendor directory that couples can browse. Not
   built.
3. Co-marketing. Featured vendor spotlights or badges ("WedFlow Recommended
   Vendor"). Not built.
4. For planners specifically: a multi-couple view showing all their active
   weddings in one dashboard. Not built.

---

## Partner Lifecycle

### 1. Invited

An admin (Alex) creates the partner record from /admin. The admin enters
the partner's organization name, contact name, email, phone, website, type,
and optionally a parent partner (for church hierarchy). The partner receives
an invite link at /partner-join?email=their@email.com.

**What exists today:** Admin invite form with all fields. Partner record
created with status "pending" and a placeholder user_id (all-zeros UUID).
Referral code generated at invite time.

**What is missing:** No automated invite email. The admin must manually
send the invite link. No signed token on the invite URL, so technically
anyone who guesses an email could attempt to claim an invite (low risk but
worth noting).

### 2. Onboarding

The partner clicks the invite link, lands on /partner-join, sees their
pre-filled email, and authenticates via Supabase email OTP (magic link).
After authentication, the partner record is claimed (user_id updated from
placeholder to their actual auth ID). The auth callback detects partner
claims and redirects to /partner.

**What exists today:** Full onboarding flow with multi-step UI. Email
pre-fill prevents wrong-email claims. Auth callback partner detection works.

**What is missing:** No welcome tutorial or first-time experience in the
dashboard. The partner lands on the overview tab and has to figure things
out themselves. No onboarding checklist ("Share your referral link with
your first couple").

### 3. Active

The partner is approved by an admin (status changes from "pending" to
"approved"). They can now log in, see their dashboard, copy their referral
link, and share it with couples. Couples who sign up with the referral
code are tracked in partner_referrals.

**What exists today:** Full dashboard with stats, couples list, referral
link, settings. Performance metrics with conversion funnels, retention
tracking, and revenue attribution. Church partners see their officiants.

**What is missing:** No way for the partner to edit their own profile
(settings page is read-only). No notification when a couple signs up through
their link. No way to add notes about referred couples.

### 4. Measuring

The partner accumulates referral data over time. The dashboard shows
conversion rate, active vs churned couples, and revenue attribution. The
admin dashboard shows a leaderboard of partner performance with health
badges (green/yellow/red).

**What exists today:** Analytics are comprehensive for v1. Conversion
funnels, retention metrics, revenue attribution, performance badges. The
admin can see which partners are performing and which are not.

**What is missing:** Revenue attribution uses hardcoded plan values, not
actual Stripe subscription data. No historical trend data (charts over
time). No automated reports or digests sent to partners.

### 5. Champion

A partner who consistently refers couples and sees value becomes a champion.
They start referring other partners, not just couples. James Toonk at Base
is the first example of this pattern.

**What exists today:** Nothing. There is no formal partner-refers-partner
mechanism. The church hierarchy (parent_partner_id) enables organizational
structure but not peer referral.

**What is missing:** Partner referral tracking (partner A refers partner B).
Champion badges or recognition. A partner community or communication
channel. Case studies or testimonials from successful partners.

---

## Base Pilot Mapping

### How James Toonk maps to the officiant journey

James Toonk is an officiant at Base Church in Waterloo. He referred 12
couples at $79/month (Concierge tier). This is the only active partner
channel and represents WedFlow's first revenue.

| Journey stage | James's experience | Notes |
|--------------|-------------------|-------|
| Discovery | Direct founder outreach | Alex contacted James directly |
| First referral | In-person recommendation to a couple | Natural fit during ceremony planning |
| Dashboard usage | Unknown | The partner dashboard was just built; James has not been onboarded as a formal partner yet |
| Value received | Reputation, helpfulness to couples | No revenue share exists |
| Champion behavior | Referred 12 couples, likely mentions WedFlow to peers | Organic, not tracked |

### What we are learning from the pilot

1. **The officiant channel works.** 12 couples from one officiant is strong
   signal. The referral happens naturally during ceremony planning conversations.
2. **$79/month is the validated price point.** All 12 couples are on
   Concierge. We do not yet know if lower tiers convert through partners.
3. **The partner did not need a dashboard to refer.** James referred 12
   couples before the partner dashboard existed. The dashboard is for
   retention and scale, not for first referrals.
4. **Church is the scalable unit.** One church with multiple officiants
   multiplies the referral surface without proportional founder effort.

### Gaps between current product and ideal journey

| Gap | Impact | Priority |
|-----|--------|----------|
| James is not formally onboarded as a partner in the system | Cannot track his referrals through the partner dashboard | High, immediate |
| No automated invite email | Admin must manually send the /partner-join link | Medium |
| No revenue share mechanism | No financial incentive beyond goodwill | Medium, needed before scaling to new partners |
| No partner notification on new referral conversion | Partner has to check dashboard to see results | Medium |
| Settings are read-only | Partner cannot update their own contact info | Low |
| No first-time onboarding experience | Partner lands on empty dashboard with no guidance | Low for James (founder can walk him through), high for self-serve scale |
| No couple usage metrics visible to partner | Partner sees referral status but not whether the couple is actually using the product | Medium |
| Revenue attribution uses hardcoded values | Acceptable for now, must change when Stripe Connect ships | Low until then |

---

## Summary: Where each partner type is today

| Type | Product readiness | First partner identified | Path to 5 partners |
|------|------------------|------------------------|---------------------|
| Officiant | Dashboard ready, needs QA and first formal onboarding | James Toonk (Base) | James refers peers. Founder outreach to Waterloo officiants. |
| Church | Dashboard ready with multi-officiant view | Base Church (through James) | Onboard Base formally. Then approach 2-3 churches in James's network. |
| Counsellor | Dashboard ready (same as officiant view) | FamilyLife Canada (warm lead) | Founder outreach. Needs a counsellor-specific pitch about stress reduction. |
| Vendor | Dashboard ready (same as officiant view) | None identified | Lowest priority. Wait until the officiant/church channel is proven before investing here. |
