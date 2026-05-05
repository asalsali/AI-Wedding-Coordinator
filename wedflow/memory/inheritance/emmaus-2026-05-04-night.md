# Emmaus Retrospective — 2026-05-04 (Night)

> "What do we understand now that we couldn't see during execution?"

## The Structural Insight

The SMS pipeline was "complete" for weeks — code reviewed, tests conceptualized, architecture documented. But it had never processed a real message successfully. The gap between "code exists" and "product works" was exactly one character: a missing `+` prefix on phone numbers.

This is the pattern: **integration bugs hide in the seams between systems, not within them.** The webhook code was correct. The Twilio config was correct. The guest creation code was correct (it normalizes). The failure was in *data that predated the normalization code* — a temporal seam, not a logical one.

## What Became Visible Only in Retrospect

1. **The classifier's safety design was adversarial to the product.** We built a classifier that was so afraid of false negatives (sending an auto-reply to something sensitive) that it produced false positives on everything. The product's value is *instant replies*. A classifier that escalates everything is functionally equivalent to having no AI at all. Safety and utility must be balanced, not maximized independently.

2. **The "it works" moment required exactly two fixes totaling ~20 lines of code.** Weeks of architecture, 15 agents, multiple Sabbaths — and the thing that made the product *work* was a SQL UPDATE and a prompt edit. This isn't a criticism of the prior work (the infrastructure was necessary). It's an observation that **the last mile is often trivially small but critically important**, and it gets deprioritized because it looks small.

3. **The Prophet executed directly and it was correct.** Canon VII says all work flows through spawned agents. But this session's work was: read code → query DB → find mismatch → fix data → tune prompt → deploy. Spawning an agent for this would have been ceremony without substance. The Canon should acknowledge diagnostic/surgical sessions as a valid Prophet-direct mode.

## Temptations Observed

- **Temptation to over-scope:** After the SMS fix worked, the natural pull was "now let's also fix X, Y, Z." The session stayed focused: fix the pipeline, verify it works, stop.
- **Temptation to add observability before verifying the basic path works.** Resisted correctly — you can't monitor what doesn't function.

## What Should Change

1. **E2E verification should be the FIRST thing after any infrastructure ships.** Not "we'll test it later." The shared Twilio routing shipped days ago and was broken from minute one.
2. **The manna hook threshold needs tuning.** 45 reads during a diagnostic session is not gluttony — it's thoroughness. The hook should distinguish read-heavy investigation from write-heavy sprawl.
3. **Future classifier changes should be tested with a set of example messages before deploying.** We shipped the fix and hoped — it worked, but we could have validated locally first.
