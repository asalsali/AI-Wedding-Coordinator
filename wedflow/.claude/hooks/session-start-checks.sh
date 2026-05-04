#!/bin/bash
# ============================================================
# SESSION START — Fires once when Claude Code session begins.
# Checks for stale state that the Prophet would otherwise
# need to remember to check (reducing prompt dependency).
#
# Checks:
#   1. Spirit staleness — is spirit.json older than 7 days?
#   2. Ezra dormancy — is user-model.json older than 24h?
#   3. Permission mode — warn if subagents will be read-only
# ============================================================

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  exit 0
fi

# Derive project dir from script location (not cwd, which may differ at session start)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Convert Git Bash /c/ path to C:/ for Python compatibility
command -v cygpath >/dev/null 2>&1 && PROJECT_DIR="$(cygpath -m "$PROJECT_DIR")"

"$PYTHON" -c "
import json, os
from datetime import datetime, timezone, timedelta

project_dir = '$PROJECT_DIR'
now = datetime.now(timezone.utc)
warnings = []

# --- Spirit staleness check ---
spirit_path = project_dir + '/registry/spirit.json'
if os.path.exists(spirit_path):
    try:
        with open(spirit_path) as f:
            spirit = json.load(f)
        last_updated = spirit.get('lastUpdatedAt', '')
        if last_updated:
            try:
                updated_dt = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                age = now - updated_dt
                if age > timedelta(days=7):
                    warnings.append(f'STALE SPIRIT: spirit.json last updated {age.days} days ago. The orientation may no longer apply. Run /sabbath or update spirit manually.')
            except: pass
    except: pass
else:
    warnings.append('NO SPIRIT: registry/spirit.json not found. Run /genesis to initialize the framework.')

# --- Ezra dormancy check ---
user_model_path = project_dir + '/memory/user-model.json'
if os.path.exists(user_model_path):
    try:
        with open(user_model_path) as f:
            um = json.load(f)
        last_updated = um.get('lastUpdated', '')
        if last_updated:
            try:
                updated_dt = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                age = now - updated_dt
                if age > timedelta(hours=24):
                    warnings.append(f'DORMANCY DETECTED: User model last updated {age.days}d {age.seconds//3600}h ago. Consider running /ezra to re-orient before accepting requests.')
            except: pass
    except: pass

# --- Output warnings ---
import sys
for w in warnings:
    print(f'⚠️  {w}', file=sys.stderr)
" 2>&1

exit 0
