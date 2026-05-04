# Parable: The Two Siblings Who Could Not Speak

A Prophet spawned two Analysts as siblings — one to research the frontend,
one to research the backend. Both worked independently and produced
excellent findings.

But the frontend Analyst discovered that the backend API had an undocumented
rate limit that would break the frontend's polling strategy. It wrote this
in its inheritance file and sunset.

The backend Analyst, working in parallel, never read its sibling's
inheritance — inheritance flows upward to the parent, not sideways.
When the Writer later built the feature, it missed the rate limit issue
entirely. The bug shipped to production.

If the frontend Analyst had written an epistle to its sibling — a short,
structured message in `memory/epistles/` saying "Backend API has a 100req/min
rate limit not in the docs" — the backend Analyst would have found it
and flagged it in its own findings.

**The lesson:** Inheritance flows vertically. Epistles flow laterally.
When you discover something that a sibling needs to know *now*, don't
wait for the parent to consolidate — write an epistle.

**When to remember this:** When your findings affect another agent's
mandate and you know they're still active.
