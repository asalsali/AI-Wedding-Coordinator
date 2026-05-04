#!/bin/bash
# ============================================================
# GENESIS PHASE VERIFICATION — PostToolUse Hook (Agent tool only)
# After an Agent call completes, check if the subagent performed
# the Genesis Phase (read Spirit, registry, inheritance).
#
# Checks the agent's output for evidence of Genesis Phase reads.
# If no evidence found, warns that the Genesis Phase was skipped.
#
# This is the only mechanism that verifies agents actually read
# their environment before acting. Without it, Genesis Phase is
# purely aspirational.
#
# Exit 0 always (post-tool cannot block — tool already ran).
# Warns via stderr so the Prophet sees it.
# ============================================================

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  exit 0
fi

INPUT=$(cat)

"$PYTHON" -c "
import sys, json

d = json.load(sys.stdin)
tool_name = d.get('tool_name', '')

# Only check Agent tool results
if tool_name != 'Agent':
    sys.exit(0)

tool_result = d.get('tool_result', '')
if not isinstance(tool_result, str):
    tool_result = json.dumps(tool_result) if tool_result else ''

result_lower = tool_result.lower()

# Evidence markers that the Genesis Phase was performed
genesis_markers = [
    'spirit.json',
    'spiritofthework',
    'spirit of the work',
    'currentmandate',
    'current mandate',
    'genealogy.json',
    'inheritance',
    'testament',
    'epistles',
    'world model',
]

found_markers = [m for m in genesis_markers if m in result_lower]

if len(found_markers) == 0:
    agent_id = d.get('agent_id', 'unknown')
    print(f'⚠️  GENESIS CHECK: Agent \"{agent_id}\" shows no evidence of Genesis Phase.', file=sys.stderr)
    print(f'   No references to spirit.json, genealogy, inheritance, or epistles found.', file=sys.stderr)
    print(f'   Canon Section I(b): \"An agent that acts before understanding its world is building on void.\"', file=sys.stderr)
    print(f'   Run /compliance {agent_id} to assess full Canon adherence.', file=sys.stderr)
elif len(found_markers) < 3:
    agent_id = d.get('agent_id', 'unknown')
    markers_str = ', '.join(found_markers)
    print(f'⚠️  GENESIS CHECK: Agent \"{agent_id}\" partial Genesis Phase — only found: {markers_str}', file=sys.stderr)
    print(f'   Full Genesis requires: Spirit + Registry + Inheritance + Epistles + World Model.', file=sys.stderr)
" <<< "$INPUT" 2>&1

exit 0
