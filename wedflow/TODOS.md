# TODOS

## Circle of Care MVP

### Must fix before spike
- [ ] **Create DESIGN.md.** Formalize existing brand tokens from globals.css, add component patterns for task cards, empty states, badges, and specify the contrast fix (use --wf-terracotta-deep for text on cream). Include typography scale, spacing system, and ARIA landmark patterns. Estimated: 10 min with CC.
- [ ] **Write safety.test.ts and escalation.test.ts.** These are CLAUDE.md-mandated test files that don't exist. safety.ts handles fact-checking AI replies before sending. escalation.ts drafts sensitive replies using Opus. Both are production paths with zero test coverage. Build these BEFORE spike tests. Estimated: 15 min with CC.

### Spike scope
- [ ] **circle_members table + migration.** New table with role enum, invite_token, invite_expires_at (72h), user_id FK to auth.users. RLS policies for couple CRUD and member read-own. Include composite index on guests(couple_id, group_tag).
- [ ] **task_assignments table + migration.** Moved into spike (from post-spike). Tasks are the primary MOH view, not conversations. RLS: couple manages all, member manages own.
- [ ] **Invite flow: createCircleInvite server action.** Couple enters name + email + role. Creates circle_members row. Sends Supabase magic link email. Also generates a "Copy invite link" button as fallback if email doesn't arrive.
- [ ] **Auth binding: invite email must match auth email.** When magic link callback completes, verify authenticated email matches the invited email in circle_members. Reject if mismatch. Security requirement.
- [ ] **/join/[token] page.** Validates token (not expired, not used). Shows signup form. On success, binds user_id and redirects to /portal. Expired tokens show error + "request new invite."
- [ ] **/portal page.** Task board (primary): shows tasks assigned to this member with status (pending/done). Conversations (secondary): role-filtered via guests.group_tag. Auth-gated to circle members only.
- [ ] **Middleware update.** Add /join/* and /portal/* to public/semi-public route list.
- [ ] **Spike tests.** circle_members RLS, invite token expiry, auth email binding, portal auth check, task assignment CRUD.

### Landing page (parallel with spike)
- [ ] **Rewrite hero copy.** "Your wedding takes a village. We help you tend it." Body copy names specific roles. Brand language: tend, care, hold. No emojis, no em dashes.
- [ ] **Replace phone mockup with circle diagram.** Concentric rings showing couple > inner circle > guests.
- [ ] **Three-column "How your people are cared for."** Guests text / Circle coordinates / Hard things held gently.

### Post-spike (if MOH logs in and engages)
- [ ] **Split DashboardClient.tsx.** Extract InboxView, ThreadView, CircleTab as separate components. Currently 1,182 lines. Must happen BEFORE adding Circle tab to dashboard.
- [ ] **Inbox redesign for emotional triage.** Sort by emotional weight (sensitive > unclear > routine). Role-based views. "Assign to MOH" button on escalated messages.
- [ ] **Circle tab in couple dashboard.** Member management, invite flow UI, circle visualization (card-based MVP, SVG deferred).
- [ ] **Onboarding invite step.** Add "Invite your circle" after wedding profile setup. Gate on spike validation success.

### Phase 2+
- [ ] **WhatsApp integration.** Secondary channel for international circles.
- [ ] **AI tone adaptation by ring.** Different AI voice for guests vs family vs bridal party.
- [ ] **Concentric SVG visualization.** Replace card-based circle view with interactive rings.
- [ ] **Task completion metrics.** "Sarah has handled 12 of 15 assigned tasks."

### Design decisions (from /plan-design-review)
- Portal layout: single column, mobile-first. Task counter + cards (primary), conversations (secondary).
- Task card fields: title + person + deadline + linked message preview. Scannable in under 2 seconds.
- Empty state (zero tasks): warm welcome with role context. "Welcome to Alex and Kirsten's circle. As Maid of Honor, you'll see tasks and updates here."
- Invite email tone: couple-first. "Alex and Kirsten have invited you into their circle." WedFlow is the medium, not the sender.
- Portal header: minimal. WedFlow logo + couple name + role badge + sign out. No sidebar nav.
- "Assign to MOH" button: inline on escalated messages, next to Send as-is / Edit.
- Task completion: card fades to muted state with checkmark, stays 5 seconds, moves to Done section.
- Contrast fix: use --wf-terracotta-deep (#A85C38) for text on cream backgrounds (standard terracotta fails WCAG AA at 3.6:1).
- Touch targets: 44px minimum on all task action buttons.
- Token expired page: "This invite has expired. Ask [couple name] to send a new one." with WedFlow logo.

### Watch items
- [ ] **Shepherd/flock brand language with diverse couples.** During user testing, note reactions to "tend," "care," "hold" language. If any couple finds it alienating, revisit the copy. The language is rooted in John 10 (personal inspiration) and is deliberately subtle, but worth validating across faith backgrounds.
