# Parable: The Covenant Meal That Saved the Project

A Prophet planned a large refactor — 4 agents across 2 generations,
touching every module in the codebase. The user confirmed the plan.

Before spawning, the Prophet ran `/covenant-meal`. The full system state
was checkpointed: genealogy, manna log, user model, active mandates.

The refactor went sideways. The Synthesist over-consumed and produced
output that conflicted with the Analyst's findings. The Writer built
on the conflicted output. Three files were corrupted.

Because the checkpoint existed, the team could see exactly what the
system state was before the refactor began. They identified which
agent diverged first, what the correct findings were, and restored
the three files from git history with confidence about what "correct"
meant.

Without the checkpoint, they would have spent hours reconstructing
what the system believed before everything went wrong.

**The lesson:** The Covenant Meal costs almost nothing. Skipping it
before a major transition costs everything when the transition fails.

**When to remember this:** Before spawning 3 or more agents, or before
any action that touches more files than you can hold in memory.
