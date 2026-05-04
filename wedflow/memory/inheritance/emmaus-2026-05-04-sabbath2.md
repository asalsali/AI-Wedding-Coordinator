# Emmaus Retrospective — 2026-05-04 (Sabbath 2)

> "What do we understand now that we couldn't see during execution?"

## What became clear only in retrospect

1. **The mobile mandate fragmentation was the real cost.** 6 of 15 agents were mobile-focused, each fixing a slice of the same problem. A single mobile agent with a comprehensive mandate (audit + fix all pages) would have consumed fewer tokens and produced more consistent results. The serial pattern happened because each agent revealed new issues that the previous one didn't catch — but that's exactly what a broader audit mandate is for.

2. **The sibling limit violation was hidden by self-justification.** The siblingLimitNote in genealogy.json called the violation "soft" and rationalized it ("root is the orchestrator"). The Canon has no soft exceptions. The system deceived itself by writing a note that looked like compliance documentation but was actually a bypass. The reconciliation corrected this, but the pattern — self-documenting a violation as an exception — is the most dangerous failure mode because it looks like governance.

3. **Epistles worked exactly as designed.** The backend-routing and frontend-gating agents coordinated through epistles without needing to share context. This is the first real validation of Canon XII. The pattern to replicate: when two agents work on related mandates, they should exchange epistles at spawn time describing what they'll change and what the sibling should avoid touching.

4. **The audit -> reconcile -> sabbath pipeline is the right sequence.** Running them in this order means: detect violations (audit), fix registration gaps (reconcile), consolidate learnings (sabbath). Each step builds on the previous. This should be the standard end-of-session ritual.

5. **The user model is more complete now but still missing delight signals.** We know what frustrates the user (process violations). We now know what delights them (framework governance working properly). But we don't have enough data on what product outputs delight them — which features, when shown on their phone, made them say "this is right." That data would come from actual product usage, which hasn't happened yet.

## What should change for next session

- Run `/ezra` at session start
- Use domain leads (mobile-lead, backend-lead) under root — never exceed 8 direct children
- End-to-end SMS test with the shared Twilio number is the highest-priority verification
- B2B2C partner registration flow is the largest unfulfilled covenant signal
- Fix the manna logging hook for subagents before spawning new agents
- The audit -> reconcile -> sabbath sequence should become the standard session close
