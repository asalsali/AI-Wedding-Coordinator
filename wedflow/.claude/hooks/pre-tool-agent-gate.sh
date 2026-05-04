#!/bin/bash
# ============================================================
# SPAWN GATE — PreToolUse Hook (Agent tool only)
# Enforces Canon genealogy rules before any agent is spawned.
#
# Checks (Canon Sections II + XVI):
#   1. Generation cap — max 4 generations deep (BLOCKS)
#   2. Sibling limit — max 8 children per ANY parent (BLOCKS)
#   3. Babel threshold — max active agents (BLOCKS)
#   4. Cain & Abel — overlap detection with active agents (WARNS)
#   5. Joseph — search inheritance for relevant prior wisdom (INFO)
#
# Exit 2 = block the spawn with a message.
# Exit 0 = allow the spawn to proceed.
# ============================================================

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  echo "🚫 SPAWN GATE: python not found — cannot enforce genealogy limits." >&2
  exit 2
fi

INPUT=$(cat)

# Derive project dir from script location (works regardless of cwd)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Convert Git Bash /c/ path to C:/ for Python compatibility
command -v cygpath >/dev/null 2>&1 && PROJECT_DIR="$(cygpath -m "$PROJECT_DIR")"
GENEALOGY="$PROJECT_DIR/registry/genealogy.json"

if [ ! -f "$GENEALOGY" ]; then
  echo "⚠️  SPAWN GATE: No genealogy.json found. Agent will spawn unregistered." >&2
  echo "   Run /reconcile after to bring this agent into compliance." >&2
  exit 0
fi

RESULT=$( echo "$INPUT" | "$PYTHON" -c "
import sys, json, os, glob

input_data = json.load(sys.stdin)
tool_name = input_data.get('tool_name', '')

# Only gate Agent tool calls
if tool_name != 'Agent':
    print('PASS:NOT_AGENT')
    sys.exit(0)

tool_input = input_data.get('tool_input', {})
prompt = ''
description = ''
if isinstance(tool_input, dict):
    prompt = tool_input.get('prompt', '')
    description = tool_input.get('description', '')

# Read genealogy
genealogy_path = '$GENEALOGY'
project_dir = '$PROJECT_DIR'
try:
    with open(genealogy_path) as f:
        registry = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    print('PASS:NO_REGISTRY')
    sys.exit(0)

canon = registry.get('canon', {})
max_generations = canon.get('maxGenerations', 4)
max_siblings = canon.get('maxSiblings', 8)
babel_threshold = canon.get('babelThreshold', 6)

agents = registry.get('agents', [])
active_agents = [a for a in agents if a.get('status') == 'active']

# Build parent->children map counting ALL children (including archived)
# to prevent serial spawn pattern: spawn, archive, spawn, archive...
children_by_parent = {}
for a in agents:
    pid = a.get('parentId')
    if pid:
        children_by_parent.setdefault(pid, []).append(a)

# --- Generation cap check (Canon Section II) ---
# Find the maximum generation among active agents.
# A new child would be max_gen + 1. If that exceeds the cap, block.
max_active_gen = 0
for a in active_agents:
    gen = a.get('generation', 0)
    if gen > max_active_gen:
        max_active_gen = gen
# The spawning agent is likely at max_active_gen (conservative).
# Its child would be max_active_gen + 1.
if max_active_gen >= max_generations:
    print(f'BLOCK:GENERATION:{max_active_gen}:{max_generations}')
    sys.exit(0)

# --- Sibling limit check for ALL parents (Canon Section II) ---
for parent_id, children in children_by_parent.items():
    if len(children) >= max_siblings:
        print(f'BLOCK:SIBLING:{parent_id}:{len(children)}:{max_siblings}')
        sys.exit(0)

# --- Babel threshold check (Canon Section XVI) — now BLOCKS ---
if len(active_agents) >= babel_threshold:
    print(f'BLOCK:BABEL:{len(active_agents)}:{babel_threshold}')
    sys.exit(0)

# --- Cain & Abel overlap check (Canon Section XVI) ---
if prompt or description:
    search_text = (prompt + ' ' + description).lower()
    common = {'the','a','an','to','for','and','of','in','on','with','is','it','this','that',
              'be','do','use','run','make','get','set','check','read','write','file','code',
              'should','would','could','need','want','please','agent','task'}
    for agent in active_agents:
        mandate = agent.get('mandate', '').lower()
        if not mandate:
            continue
        mandate_words = set(mandate.split()) - common
        search_words = set(search_text.split()) - common
        overlap = mandate_words & search_words
        if len(overlap) >= 3:
            print(f'WARN:OVERLAP:{agent[\"id\"]}:{agent[\"mandate\"][:60]}')
            sys.exit(0)

# --- Joseph phase (Canon Section XVI) — search inheritance ---
inheritance_dir = project_dir + '/memory/inheritance'
semantic_dir = project_dir + '/memory/semantic'
search_text = (prompt + ' ' + description).lower()
search_words = set(search_text.split()) - {'the','a','an','to','for','and','of','in','on','with'}

joseph_findings = []
for search_dir in [inheritance_dir, semantic_dir]:
    if not os.path.isdir(search_dir):
        continue
    for fpath in glob.glob(search_dir + '/*'):
        if not os.path.isfile(fpath):
            continue
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as fh:
                content = fh.read(2000).lower()
            content_words = set(content.split())
            match = search_words & content_words
            if len(match) >= 3:
                joseph_findings.append(os.path.basename(fpath))
        except Exception:
            pass

if joseph_findings:
    findings_str = ','.join(joseph_findings[:5])
    print(f'INFO:JOSEPH:{findings_str}')
    sys.exit(0)

print('PASS:CLEAR')
" 2>/dev/null )

case "$RESULT" in
  BLOCK:GENERATION:*)
    IFS=':' read -r _ _ GEN CAP <<< "$RESULT"
    echo "🚫 SPAWN GATE — GENERATION CAP REACHED" >&2
    echo "   Active agents are at generation $GEN (Canon limit: $CAP)." >&2
    echo "   The Canon forbids agents beyond generation $CAP." >&2
    echo "   Consider sunsetting and consolidating before spawning further." >&2
    exit 2
    ;;
  BLOCK:SIBLING:*)
    IFS=':' read -r _ _ PARENT COUNT LIMIT <<< "$RESULT"
    echo "🚫 SPAWN GATE — SIBLING LIMIT REACHED" >&2
    echo "   Parent '$PARENT' has $COUNT children (Canon limit: $LIMIT)." >&2
    echo "   Consider using intermediate parent agents for domain clusters," >&2
    echo "   or sunset inactive agents before spawning new ones." >&2
    exit 2
    ;;
  BLOCK:BABEL:*)
    IFS=':' read -r _ _ COUNT THRESHOLD <<< "$RESULT"
    echo "🚫 SPAWN GATE — BABEL THRESHOLD REACHED" >&2
    echo "   $COUNT agents are currently active (threshold: $THRESHOLD)." >&2
    echo "   The system has started building a tower." >&2
    echo "   Sunset or consolidate existing agents before spawning more." >&2
    echo "   To override: increase babelThreshold in registry/genealogy.json." >&2
    exit 2
    ;;
  WARN:OVERLAP:*)
    OVERLAP_INFO="${RESULT#WARN:OVERLAP:}"
    AGENT_ID="${OVERLAP_INFO%%:*}"
    MANDATE="${OVERLAP_INFO#*:}"
    echo "⚠️  SPAWN GATE — CAIN & ABEL WARNING" >&2
    echo "   Potential overlap with active agent '$AGENT_ID': $MANDATE" >&2
    echo "   Spawning a second risks redundant work. Proceed with awareness." >&2
    ;;
  INFO:JOSEPH:*)
    FILES="${RESULT#INFO:JOSEPH:}"
    echo "📜 SPAWN GATE — JOSEPH: Relevant prior wisdom found" >&2
    echo "   Inheritance files with related content: $FILES" >&2
    echo "   The spawned agent should read these before acting." >&2
    ;;
  PASS:*)
    ;;
  *)
    echo "⚠️  SPAWN GATE: Unexpected check result: $RESULT" >&2
    ;;
esac

# --- Sunset condition reminder (Canon Section VI) ---
# Always remind the Prophet to define a sunset condition for the spawned agent
if [[ "$RESULT" != BLOCK:* ]]; then
  echo "📋 SPAWN GATE — REMINDER: Define a sunset condition for this agent." >&2
  echo "   Canon VI requires every agent to have a defined sunset condition." >&2
  echo "   Include in the agent's genealogy entry: when is the mandate complete?" >&2
fi

exit 0
