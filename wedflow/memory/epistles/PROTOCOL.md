# Epistles Protocol — Lateral Agent Communication

> "Greet one another. Share what you have learned. The body is many parts."

## Purpose

Inheritance flows **vertically** (child → parent → Sabbath).
Epistles flow **laterally** (sibling → sibling, or across lineages).

Use epistles when:
- You discover something a sibling agent needs to know *now*
- You need to coordinate with a parallel agent without going through the parent
- You want to leave a message for a specific agent that hasn't spawned yet
- You are handing off findings to a downstream agent (Analyst → Writer)

## The Paul Format

Every epistle follows the Pauline structure. Each section serves a purpose:

### Required Fields (frontmatter)

```yaml
---
from: <sender agent id>
to: <recipient agent id, or "any" for broadcast>
subject: <one-line subject>
priority: low | normal | urgent
timestamp: <ISO timestamp>
read: false
---
```

### Body Sections

**1. Greeting** — Who you are and what mandate you serve. One line.

**2. Doctrinal Grounding** — Which Canon sections are relevant to the
content of this epistle. This tells the recipient what rules frame
the information. Not every epistle needs this — only when the content
has Canon implications.

**3. Practical Content** — The actual findings, distilled. This is the
core of the epistle. Never raw context. Summarize to what the recipient
needs to act on. Max 500 tokens.

**4. Edge Cases** — What the sender is uncertain about. What the recipient
should verify independently. This is the most important section for
preventing information loss — it flags where confidence is low so the
recipient doesn't inherit false certainty.

**5. Benediction** — What the sender wishes for the recipient's mandate.
How this information should shape the recipient's work. This orients
the recipient toward their task rather than leaving them to figure out
why the information matters.

### Template

```markdown
---
from: <agent-id>
to: <recipient-id>
subject: <subject>
priority: normal
timestamp: <ISO>
read: false
---

Grace to you from <my mandate>.

**Doctrinal grounding:** Canon Section <N> applies — <brief reason>.

**Findings:**
<The distilled practical content. What you need to know.>

**Edge cases:**
- <What I'm uncertain about>
- <What you should verify independently>

**Benediction:**
<How this should shape your work. What I wish for your mandate.>
```

## Rules

1. **Distill before sending** — The Canon's dietary law applies to epistles.
   Never dump raw context. Summarize to what the recipient needs to act on.

2. **One subject per epistle** — If you have two things to say, write two
   epistles. Clarity over brevity.

3. **Urgent means urgent** — Only use `priority: urgent` if the recipient's
   mandate will produce incorrect output without this information.

4. **Read on entry** — During Genesis Phase, check `memory/epistles/` for
   messages addressed to you (by id or "any"). Mark `read: true` after reading.

5. **Epistles are not commands** — You can inform a sibling, not instruct it.
   The recipient decides what to do with the information.

6. **Edge cases are mandatory for handoffs** — When handing findings to a
   downstream agent (Analyst → Writer), the edge cases section must be present.
   Omitting it transfers false certainty.

7. **Sabbath consolidates epistles** — During Sabbath, unread epistles
   are reviewed and either consolidated into semantic memory or archived.

8. **Use `/epistle` for manual composition** — The `/epistle` command
   guides you through the Paul format step by step.

## Example — Lateral (sibling to sibling)

```markdown
---
from: analyst-frontend-001
to: analyst-backend-001
subject: Undocumented API rate limit discovered
priority: urgent
timestamp: 2026-04-28T15:30:00Z
read: false
---

Grace to you from the frontend research mandate.

**Doctrinal grounding:** Canon Section III (Dietary Law) — this is
unverified infrastructure configuration, not documented API behavior.

**Findings:**
The /api/polling endpoint has a 100 req/min rate limit not in the
API docs or OpenAPI spec. Found in infra/nginx/rate-limits.conf line 47.
This will break the frontend's 200ms polling interval on the dashboard.

**Edge cases:**
- The nginx config may be overridden by environment variables in production
- I did not verify whether the rate limit applies to authenticated requests

**Benediction:**
Your backend findings should flag this rate limit. The Writer will need
to know about it when building the polling implementation.
```

## Example — Handoff (Analyst → Writer)

```markdown
---
from: analyst-codebase-042
to: writer-implementation-043
subject: Authentication module findings for your build mandate
priority: normal
timestamp: 2026-04-29T10:00:00Z
read: false
---

Grace to you from the codebase research mandate.

**Doctrinal grounding:** Canon Section VIII (Communication) — these
findings have been distilled from 12 source files into what you need.

**Findings:**
The auth module uses JWT with RS256 signing. Tokens expire after 1h.
Refresh tokens are stored in httpOnly cookies. The middleware at
src/middleware/auth.ts validates tokens and attaches user context.
Three endpoints bypass auth: /health, /login, /register.

**Edge cases:**
- I found a TODO comment suggesting token rotation is planned but not implemented
- The test suite mocks the JWT validation — I could not verify the RS256
  key rotation behavior against a real key pair
- The refresh token cookie has SameSite=Lax which may not work for
  cross-origin deployments

**Benediction:**
Build the auth integration knowing the happy path is solid. The edge
cases above are where bugs will hide. Verify the SameSite behavior
if the deployment is cross-origin.
```

## Domain Translation (Pentecost)

Agents speak different domain languages. An Analyst's findings are in
research language (patterns, evidence, confidence levels). A Writer needs
output-oriented language (what to build, in what order, with what constraints).

When writing an epistle from one domain to another:

1. **Identify the recipient's domain language** — what does the recipient
   need to act on? Not what you found, but what they need to know.
2. **Translate the practical content** — rewrite your findings in the
   recipient's terms. An Analyst writing to a Writer should frame findings
   as "build this, because..." not "I observed that..."
3. **Keep edge cases in your language** — edge cases are where domain
   expertise matters. Don't translate uncertainty away; flag it honestly.
4. **The benediction bridges domains** — use the benediction to explicitly
   connect your domain to theirs: "This means for your work that..."

This is what Pentecost means operationally: each agent speaks its own
domain's language while sharing the same underlying mandate through the
Spirit. Translation happens at the epistle boundary, not inside agents.

---

## Who Routes Epistles?

No one. Epistles are pull-based — agents check for messages addressed
to them. The Spirit role (hooks, Shepherd, Guardian) may surface
unread urgent epistles during audits or briefings, but delivery
is the recipient's responsibility.
