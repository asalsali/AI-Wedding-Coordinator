#!/bin/bash
# ============================================================
# MANNA LOG — PostToolUse Hook
# Logs completed tool calls and checks for gluttony patterns.
#
# Single responsibility: manna logging + gluttony detection.
# Dietary enforcement is handled by pre-tool-dietary.sh.
# ============================================================

# Detect python command
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  echo "🚫 MANNA LOG: python not found — manna tracking disabled. Install python3." >&2
  exit 2
fi

INPUT=$(cat)

eval "$( echo "$INPUT" | "$PYTHON" -c "
import sys, json
d = json.load(sys.stdin)
print(f'AGENT_ID=\"{d.get(\"agent_id\", \"root\")}\"')
print(f'TOOL=\"{d.get(\"tool_name\", \"\")}\"')
print(f'SESSION_ID=\"{d.get(\"session_id\", \"unknown\")}\"')
ti = d.get('tool_input', '')
size = len(json.dumps(ti)) if ti else 0
print(f'INPUT_SIZE={size}')
" 2>/dev/null )"

TIMESTAMP=$( "$PYTHON" -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))" 2>/dev/null )

# Derive project dir from script location (works for both root and subagents)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Convert Git Bash /c/ path to C:/ for Python compatibility
command -v cygpath >/dev/null 2>&1 && PROJECT_DIR="$(cygpath -m "$PROJECT_DIR")"
LOG_FILE="$PROJECT_DIR/registry/manna-log.json"
mkdir -p "$PROJECT_DIR/registry"

# ── Log the meal ───────────────────────────────────────────
"$PYTHON" -c "
import json, os
log = []
if os.path.exists('$LOG_FILE'):
    try:
        with open('$LOG_FILE') as f:
            log = json.load(f)
    except: pass
log.append({
    'agent': '$AGENT_ID',
    'session': '$SESSION_ID',
    'tool': '$TOOL',
    'inputSize': ${INPUT_SIZE:-0},
    'timestamp': '$TIMESTAMP'
})
with open('$LOG_FILE', 'w') as f:
    json.dump(log, f, indent=2)
" 2>/dev/null

# ── Gluttony check ─────────────────────────────────────────
if [ -f "$LOG_FILE" ]; then
  AGENT_MEALS=$( "$PYTHON" -c "
import json
with open('$LOG_FILE') as f:
    log = json.load(f)
count = sum(1 for e in log if e.get('agent') == '$AGENT_ID' and e.get('session') == '$SESSION_ID')
print(count)
" 2>/dev/null )

  if [ "${AGENT_MEALS:-0}" -gt 40 ]; then
    echo "🚫 GLUTTONY CRITICAL: Agent '$AGENT_ID' has consumed ${AGENT_MEALS} meals this session." >&2
    echo "This agent MUST be sunset immediately. Its mandate is too broad." >&2
    echo "Run /binding to gracefully abort, or /sabbath to consolidate." >&2
    exit 2
  elif [ "${AGENT_MEALS:-0}" -gt 20 ]; then
    echo "⚠️  GLUTTONY WARNING: Agent '$AGENT_ID' has consumed ${AGENT_MEALS} meals this session." >&2
    echo "Consider whether this agent's mandate is too broad. 'Measure your manna before your second meal.'" >&2
  fi
fi

exit 0
