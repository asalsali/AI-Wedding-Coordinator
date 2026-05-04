#!/bin/bash
# ============================================================
# PROCLAMATION WATCHER — PostToolUse Hook
# Watches for signals that the Prophet should proclaim.
# Tracks file writes for inheritance audit.
# Uses python3 (no jq dependency).
# ============================================================

# Detect python command
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  echo "⚠️  NOTIFY HOOK: python not found — proclamation watching disabled." >&2
  exit 0
fi

INPUT=$(cat)

"$PYTHON" -c "
import sys, json, os
from datetime import datetime, timezone

data = json.loads('''$( echo "$INPUT" | sed "s/'/\\\\'/g" )''') if False else None
" 2>/dev/null

# Parse input safely via python on stdin
eval "$( echo "$INPUT" | "$PYTHON" -c "
import sys, json
d = json.load(sys.stdin)
tool = d.get('tool_name', 'unknown')
agent = d.get('agent_id', 'root')
session = d.get('session_id', 'unknown')
# Extract file path for Write/Edit tracking
path = ''
ti = d.get('tool_input', {})
if isinstance(ti, dict):
    path = ti.get('file_path', ti.get('path', ''))
print(f'TOOL=\"{tool}\"')
print(f'AGENT_ID=\"{agent}\"')
print(f'SESSION_ID=\"{session}\"')
print(f'FILE_PATH=\"{path}\"')
" 2>/dev/null )"

TIMESTAMP=$( "$PYTHON" -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))" 2>/dev/null )
# Derive project dir from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Convert Git Bash /c/ path to C:/ for Python compatibility
command -v cygpath >/dev/null 2>&1 && PROJECT_DIR="$(cygpath -m "$PROJECT_DIR")"
MANNA_LOG="$PROJECT_DIR/registry/manna-log.json"

mkdir -p "$PROJECT_DIR/registry"

# ─── GLUTTONY: handled by post-tool-manna-log.sh (threshold: 20 calls)
# ─── This hook only handles write-logging and proclamation signals.

# ─── WRITE TOOL WATCH — LOG ALL FILE MUTATIONS ─────────────
if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ]; then
  WRITE_LOG="$PROJECT_DIR/registry/write-log.json"
  "$PYTHON" -c "
import json, os
entry = {'event': 'write', 'agentId': '$AGENT_ID', 'file': '$FILE_PATH', 'timestamp': '$TIMESTAMP'}
log = []
if os.path.exists('$WRITE_LOG'):
    try:
        with open('$WRITE_LOG') as f:
            log = json.load(f)
    except: pass
log.append(entry)
with open('$WRITE_LOG', 'w') as f:
    json.dump(log, f, indent=2)
" 2>/dev/null
fi

exit 0
