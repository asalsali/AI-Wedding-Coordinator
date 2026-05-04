#!/bin/bash
# ============================================================
# DIETARY LAW — PreToolUse Hook
# Enforces clean input rules before every tool call.
# Exit 2 = block the operation and return error to Claude.
#
# Two checks:
#   1. Size-based: blocks inputs over the manna threshold
#   2. Type-based: classifies input source cleanliness
#
# Manna logging is handled by post-tool-manna-log.sh.
# ============================================================

# Detect python command
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  echo "🚫 DIETARY HOOK: python not found — dietary law CANNOT be enforced." >&2
  echo "   Install python3 or add it to PATH. The Canon requires dietary enforcement." >&2
  exit 2
fi

INPUT=$(cat)

# ── Run both size and type checks via python ──────────────
RESULT=$( echo "$INPUT" | "$PYTHON" -c "
import sys, json

d = json.load(sys.stdin)
tool_input = d.get('tool_input', '')
tool_name = d.get('tool_name', '')
input_str = json.dumps(tool_input) if tool_input else ''

# --- Size check ---
MANNA_LIMIT = 30000  # chars, approx 5000-6000 tokens
size = len(input_str)
if size > MANNA_LIMIT:
    print(f'BLOCK:SIZE:{size}')
    sys.exit(0)

# --- Type-based cleanliness check ---
# Classify input sources:
#   CLEAN:   Read, Glob, Grep, LS, Write, Edit — standard tool I/O
#   CAUTION: Bash — may contain unverified external output
#   UNCLEAN: Agent output passed as raw context (large Bash with agent markers)

# Bash commands that pipe external content are caution-level
if tool_name == 'Bash' and isinstance(tool_input, dict):
    cmd = tool_input.get('command', '')
    # Flag if command pulls external content (curl, wget, etc.)
    external_cmds = ['curl ', 'wget ', 'http://', 'https://']
    for ext in external_cmds:
        if ext in cmd and size > 10000:
            print(f'WARN:EXTERNAL:{size}')
            sys.exit(0)

# Agent tool with very large prompts — check for raw context dumps
if tool_name == 'Agent' and isinstance(tool_input, dict):
    prompt = tool_input.get('prompt', '')
    if len(prompt) > 12000:
        print(f'BLOCK:AGENT_DUMP:{len(prompt)}')
        sys.exit(0)

# --- Prophet direct-execution check (Canon Section VII) ---
# The Prophet should not Write/Edit application code directly.
# Allowed paths: registry/, memory/, .claude/, CLAUDE.md, package.json, etc.
if tool_name in ('Write', 'Edit') and isinstance(tool_input, dict):
    file_path = tool_input.get('file_path', '')
    fp_lower = file_path.replace('\\\\', '/').lower()
    allowed_patterns = [
        '/registry/', '/memory/', '/.claude/',
        'claude.md', 'package.json', 'tsconfig',
        '.gitignore', '.env'
    ]
    is_framework_file = any(p in fp_lower for p in allowed_patterns)
    if not is_framework_file:
        print(f'WARN:PROPHET_DIRECT:{file_path}')
        sys.exit(0)

print('CLEAN')
" 2>/dev/null )

# ── Act on result ──────────────────────────────────────────
case "$RESULT" in
  BLOCK:SIZE:*)
    SIZE="${RESULT#BLOCK:SIZE:}"
    echo "🚫 DIETARY LAW VIOLATION: Input size ${SIZE} chars exceeds manna threshold (30000)." >&2
    echo "Distill this context before passing it forward. The Canon forbids raw context dumps." >&2
    exit 2
    ;;
  WARN:EXTERNAL:*)
    SIZE="${RESULT#WARN:EXTERNAL:}"
    echo "⚠️  DIETARY CAUTION: Bash command fetches external content (${SIZE} chars). Verify before trusting output." >&2
    # Warning only — does not block
    ;;
  BLOCK:AGENT_DUMP:*)
    SIZE="${RESULT#BLOCK:AGENT_DUMP:}"
    echo "🚫 DIETARY LAW VIOLATION: Agent prompt is ${SIZE} chars (limit: 12000)." >&2
    echo "Distill this context before delegating. Raw context dumps violate Canon Section III." >&2
    exit 2
    ;;
  WARN:PROPHET_DIRECT:*)
    FILE="${RESULT#WARN:PROPHET_DIRECT:}"
    echo "⚠️  CANON VII WARNING: Prophet is writing directly to application code." >&2
    echo "   File: $FILE" >&2
    echo "   The Prophet should spawn agents via /beget for application changes." >&2
    echo "   'No user request reaches an agent directly.' — Canon Section VII" >&2
    echo "   If this is intentional (hotfix, trivial change), proceed with awareness." >&2
    # Warning only — does not block (the Prophet may have good reason)
    ;;
esac

exit 0
