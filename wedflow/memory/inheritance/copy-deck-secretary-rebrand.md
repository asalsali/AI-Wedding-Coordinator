# WedFlow Copy Deck: AI Wedding Secretary Rebrand
Date: 2026-05-15

## Positioning Statement

WedFlow is the first AI wedding secretary. A secretary is someone who handles the details so you do not have to. They answer the phone, keep the calendar, remember the little things, and know when to put someone through to you directly. WedFlow does exactly this for weddings: it answers guest texts, coordinates vendor logistics, and holds sensitive messages for your review. The secretary metaphor is warm because a great secretary is not corporate. They are the person everyone trusts, the one who makes everything run without being asked. That is WedFlow.

---

## Copy Changes by File

### app/layout.tsx (metadata)

| Location | Before | After |
|----------|--------|-------|
| `metadata.title` | `Wedflow — Your Wedding Concierge` | `Wedflow — The First AI Wedding Secretary` |
| `metadata.description` | `Wedflow handles guest questions so you can be fully present on your wedding day.` | `Wedflow answers your guests, coordinates your vendors, and handles the details so you can be present on your wedding day.` |

---

### app/page.tsx (landing page)

#### Nav

| Location | Before | After |
|----------|--------|-------|
| CTA button (desktop + mobile, both instances) | `Begin Your Journey →` | `Get Started →` |

#### Hero

| Location | Before | After |
|----------|--------|-------|
| Eyebrow | `Your Circle of Care` | `The First AI Wedding Secretary` |
| Headline line 1 | `Your wedding takes` | `Every text handled.` |
| Headline line 2 (em tag) | `a village.` | `Every detail covered.` |
| Headline line 3 | `We help you tend it.` | `You stay present.` |
| Subtitle | `Guests text with questions. Vendors confirm timelines. Your maid of honor coordinates the bridesmaids. Your mom handles the family dynamics. WedFlow keeps all of it moving so you can be present for what matters.` | `Guests text one number with questions about dress code, parking, and registry. Vendors confirm timelines. WedFlow answers instantly in your voice, coordinates your people, and flags anything that needs your personal touch.` |

#### CircleDiagram labels

| Location | Before | After |
|----------|--------|-------|
| SVG text label (middle ring) | `YOUR CIRCLE` | `YOUR WEDDING` |

#### SocialProofBar

| Location | Before | After |
|----------|--------|-------|
| Tagline | `The coordination layer between you, your people, and your vendors. Trusted by couples across Canada.` | `Your guests get instant answers. Your vendors stay in sync. You stay present. Trusted by couples across Canada.` |

#### How It Works

| Location | Before | After |
|----------|--------|-------|
| Section eyebrow | `How your people are cared for` | `How your secretary works` |
| Section headline line 1 | `Every person,` | `Every detail,` |
| Section headline line 2 (em) | `tended to.` | `handled.` |
| Section description | `Ten minutes to set up. From that moment, every guest question gets a thoughtful reply. Every task lands in the right hands. Every hard conversation is held with care.` | `Ten minutes to set up. From that moment, every guest question gets an instant reply. Every vendor request lands in the right hands. Every sensitive message is held for you.` |
| Step 1 title | `Everyone texts, WedFlow coordinates` | `Guests and vendors text, WedFlow answers` |
| Step 2 title | `Your circle coordinates` | `Your people see what they need` |
| Step 2 body | `Your maid of honor, best man, and family get their own dashboard. Vendors stay in the loop on timelines and logistics. Everyone sees what belongs to them and stays out of what does not.` | `Your maid of honor, best man, and family each get their own view. Vendors stay in the loop on timelines and logistics. Everyone sees what belongs to them and nothing more.` |
| Step 3 title | `Hard things, held gently` | `Sensitive messages, held for you` |
| Step 3 body | `When a guest shares something emotional, WedFlow holds it. It drafts a reply and waits for you, or hands it to someone you trust.` | `When a guest shares something emotional, WedFlow pauses. It drafts a reply in your voice and waits for you to review, or passes it to someone you trust.` |

#### Features

| Location | Before | After |
|----------|--------|-------|
| Section headline line 1 | `Everything your circle` | `Everything your wedding` |
| Feature 2 title | `Your inner circle gets real tools` | `Your wedding party gets real tools` |
| Feature 3 title | `Hard things, held with care` | `Sensitive messages, handled with care` |
| Feature 3 body | `When a guest shares something emotional, WedFlow recognizes it. It pauses, drafts something thoughtful, and holds it for you, or passes it to someone you trust.` | `When a guest shares something emotional, WedFlow recognizes it. It pauses, drafts a thoughtful reply in your voice, and holds it for your review.` |
| Feature 5 body | `Share your wedding details once. Invite your circle. From that moment, every question, every task, every sensitive message is tended to.` | `Share your wedding details once. Invite your people. From that moment, every question, every vendor request, every sensitive message is handled.` |

#### Final CTA

| Location | Before | After |
|----------|--------|-------|
| Headline line 1 | `Your celebration deserves` | `Your wedding day deserves` |
| Subtitle | `Let WedFlow tend to your village. You tend to each other.` | `Let WedFlow handle the details. You be present for each other.` |
| CTA button | `Begin Your Journey →` | `Get Started →` |

#### Footer

| Location | Before | After |
|----------|--------|-------|
| Tagline | `Made with care for couples everywhere.` | `The AI wedding secretary for couples everywhere.` |

---

### app/sign-up/[[...sign-up]]/page.tsx

| Location | Before | After |
|----------|--------|-------|
| Eyebrow | `For the month before` | `Your AI wedding secretary` |
| Headline | `Your wedding, beautifully coordinated.` | `Every guest answered. Every detail handled.` |
| Subtitle | `One number for all your guests. One calm inbox for you.` | `One number for all your guests and vendors. One calm inbox for you.` |
| Testimonial | `"It felt like having a thoughtful friend in our pocket."` | `"It felt like having a thoughtful friend handling everything."` |

---

### app/sign-in/[[...sign-in]]/page.tsx

| Location | Before | After |
|----------|--------|-------|
| Eyebrow | `Welcome back` | `Welcome back` (no change) |
| Headline | `Your wedding, beautifully coordinated.` | `Every guest answered. Every detail handled.` |
| Subtitle | `One number for all your guests. One calm inbox for you.` | `One number for all your guests and vendors. One calm inbox for you.` |
| Testimonial | `"It felt like having a thoughtful friend in our pocket."` | `"It felt like having a thoughtful friend handling everything."` |

---

### app/pricing/PricingClient.tsx

No changes. "Simple, transparent pricing" and "Pick the plan that fits your wedding. Cancel anytime." are already functional and clear.

---

### lib/stripe/plans.ts (plan descriptions)

| Location | Before | After |
|----------|--------|-------|
| Starter description | `Your dedicated wedding number, ready to answer guests. AI handles the most common questions like venue, dress code, parking and registry so you do not have to.` | `Your AI wedding secretary answers the questions guests ask most. Venue, dress code, parking, registry. One number, instant replies, so you do not have to.` |
| Essential description | `Everything in Starter plus your AI concierge handles sensitive messages with care. Wedflow drafts replies in your voice for you to review before sending.` | `Everything in Starter plus your secretary handles sensitive messages with care. WedFlow drafts replies in your voice for you to review before sending.` |
| Concierge description | `The full white-glove experience. Everything in Essential plus a dedicated setup call, priority support and early access to new features.` | `The full white-glove experience. Everything in Essential plus a dedicated setup call, priority support, and early access to new features.` |

---

### app/onboarding/page.tsx

| Location | Before | After |
|----------|--------|-------|
| Step 4 subtitle | `Your AI coordinator will match your voice. Choose how it sounds.` | `Your AI secretary will match your voice. Choose how it sounds.` |
| Step 5 subtitle | `Fill in your answers — your AI will use these word for word. You can also add vendor-specific questions, like setup times or delivery instructions.` | `Fill in your answers. Your secretary will use these word for word. You can also add vendor-specific questions like setup times or delivery instructions.` |
| Step 7 number helper text | `Share this number with your guests and vendors — everyone texts the same number.` | `Share this number with your guests and vendors. Everyone texts the same number.` |
| Step 7 partner modal description | `We'll send them a link to view and manage the wedding coordinator together. Invites are coming soon.` | `We'll send them a link to view and manage WedFlow together. Invites are coming soon.` |
| Step 8 heading | `Invite your circle` | `Invite your wedding party` |
| Step 8 subtitle | `Your maid of honor, best man, or family leads can help tend your guests. Your vendors will coordinate through the same number. They will see tasks you assign and conversations relevant to their role.` | `Your maid of honor, best man, or family leads can help manage guest messages. Your vendors coordinate through the same number. Everyone sees the tasks and conversations relevant to their role.` |
| Step 8 form heading | `Add a circle member` | `Add a team member` |
| Step 8 SMS invite body | `You're invited to our wedding circle! Join here:` | `You're invited to help with our wedding! Join here:` |

---

### app/portal/PortalClient.tsx

| Location | Before | After |
|----------|--------|-------|
| Welcome heading | `Welcome to {coupleName}'s circle` | `Welcome to {coupleName}'s wedding` |
| Conversations heading | `Conversations in your circle` | `Conversations` |

---

### public/manifest.json

| Location | Before | After |
|----------|--------|-------|
| `description` | `Your wedding circle, in one place` | `Your AI wedding secretary` |

---

## Strings NOT Changing (and why)

- **"Wedflow" brand name** -- Brand name, not positioning.
- **"Request Early Access"** -- Clear functional CTA.
- **Nav labels** ("How it works", "Features", "Sign in", etc.) -- Standard UI.
- **Testimonial quote body** ("We stopped answering the same question 40 times...") -- Already describes the secretary function.
- **Feature 1** ("Guests get answers instantly") -- Already concrete.
- **Feature 4** ("Your vendors stay in sync") -- Already concrete.
- **Feature 5 title** ("Ten minutes to set up. That is it.") -- Functional.
- **All accent lines** -- Product truths, not circle metaphor.
- **Pricing page header and feature bullets** -- Already functional.
- **Onboarding steps 1-3, 6-7 headings** -- Already functional.
- **Tone options** -- Personality descriptions, not positioning.
- **"Welcome back" sign-in eyebrow** -- Contextually correct.
- **All form placeholders and loading states** -- Functional.

---

**Total strings changed: 42. Total strings audited and kept: 30+.**
