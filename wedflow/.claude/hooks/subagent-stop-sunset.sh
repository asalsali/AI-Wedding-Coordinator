#!/bin/bash
# ============================================================
# SUNSET RITUAL — SubagentStop Hook
# Triggers inheritance archival when a subagent completes.
# ============================================================

# Detect python command
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  echo "🚫 SUNSET HOOK: python not found — sunset ritual CANNOT run." >&2
  echo "   Install python3 or add it to PATH. Agents will sunset without testaments." >&2
  exit 2
fi

INPUT=$(cat)
AGENT_ID=$(echo "$INPUT" | "$PYTHON" -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent_id','unknown'))" 2>/dev/null)
AGENT_TYPE=$(echo "$INPUT" | "$PYTHON" -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent_type','main'))" 2>/dev/null)
TIMESTAMP=$( "$PYTHON" -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))" 2>/dev/null )

if [ "$AGENT_TYPE" = "subagent" ] && [ "$AGENT_ID" != "unknown" ]; then
  echo "✦ SUNSET: Agent '$AGENT_ID' has completed its mandate." >&2

  # Derive project dir from script location
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
  # Convert Git Bash /c/ path to C:/ for Python compatibility
  command -v cygpath >/dev/null 2>&1 && PROJECT_DIR="$(cygpath -m "$PROJECT_DIR")"
  GENEALOGY="$PROJECT_DIR/registry/genealogy.json"

  # --- Sabbath threshold check (Canon Section V) ---
  if [ -f "$GENEALOGY" ]; then
    SABBATH_CHECK=$( "$PYTHON" -c "
import json
with open('$GENEALOGY') as f:
    r = json.load(f)
interval = r.get('canon', {}).get('sabbathInterval', 10)
last_sabbath = r.get('lastSabbath', '1970-01-01')
archived = [a for a in r.get('agents', []) if a.get('status') == 'archived' and a.get('sunsetAt', '') > last_sabbath]
if len(archived) >= interval:
    print(f'SABBATH:{len(archived)}:{interval}')
else:
    print('OK')
" 2>/dev/null )
    case "$SABBATH_CHECK" in
      SABBATH:*)
        IFS=':' read -r _ COUNT INTERVAL <<< "$SABBATH_CHECK"
        echo "⬛ SABBATH THRESHOLD REACHED: $COUNT agents archived since last Sabbath (threshold: $INTERVAL)." >&2
        echo "   Run /sabbath before the next mandate. The system needs to rest and remember." >&2
        ;;
    esac
  fi

  # --- Compliance reminder (Canon Section XVI) ---
  echo "📋 COMPLIANCE: Run /compliance $AGENT_ID to record Canon telemetry for this agent." >&2
  
  # Mark archived in genealogy
  if [ -f "$GENEALOGY" ]; then
    "$PYTHON" -c "
import json
with open('$GENEALOGY', 'r') as f:
    registry = json.load(f)
for agent in registry.get('agents', []):
    if agent.get('id') == '$AGENT_ID':
        agent['status'] = 'archived'
        agent['sunsetAt'] = '$TIMESTAMP'
with open('$GENEALOGY', 'w') as f:
    json.dump(registry, f, indent=2)
print('Archived in genealogy.')
" 2>/dev/null
  fi
  
  # Check for testament (Canon Section VI compliance)
  INHERITANCE_DIR="$PROJECT_DIR/memory/inheritance"
  TESTAMENT_JSON="$INHERITANCE_DIR/${AGENT_ID}-testament.json"
  TESTAMENT_MD="$INHERITANCE_DIR/${AGENT_ID}.md"
  if [ ! -f "$TESTAMENT_JSON" ] && [ ! -f "$TESTAMENT_MD" ]; then
    echo "🚫 COVENANT VIOLATION: Agent '$AGENT_ID' sunset without writing a testament." >&2
    echo "   Canon Section VI requires a testament at memory/inheritance/<agent-id>-testament.json" >&2
    echo "   'A sunset agent that leaves no inheritance has lived in vain.' (Proverb 7)" >&2
    echo "   Run /reconcile to retroactively create testaments for unregistered agents." >&2
    exit 2
  else
    echo "Inheritance ritual complete. Testament found." >&2

    # Validate testament has mannaConsumed field (P7 — subagent manna tracking)
    if [ -f "$TESTAMENT_JSON" ]; then
      HAS_MANNA=$( "$PYTHON" -c "
import json
with open('$TESTAMENT_JSON') as f:
    t = json.load(f)
print('yes' if t.get('mannaConsumed') else 'no')
" 2>/dev/null )
      if [ "$HAS_MANNA" = "no" ]; then
        echo "⚠️  MANNA GAP: Testament for '$AGENT_ID' missing mannaConsumed field." >&2
        echo "   Canon Section IV requires manna tracking. Add mannaConsumed to the testament." >&2
      fi
    fi

    # Auto-generate epistle from testament (epistle simplification)
    # This ensures lateral communication happens even when agents don't
    # explicitly write epistles — the testament IS the epistle content.
    EPISTLES_DIR="$PROJECT_DIR/memory/epistles"
    mkdir -p "$EPISTLES_DIR"
    if [ -f "$TESTAMENT_JSON" ]; then
      "$PYTHON" -c "
import json, os
with open('$TESTAMENT_JSON') as f:
    t = json.load(f)
# Only auto-generate if there are key findings to share
findings = t.get('keyFindings', [])
if findings:
    slug = t.get('mandate', 'unknown').replace(' ', '-')[:40].lower()
    filename = '${AGENT_ID}-sunset-${TIMESTAMP}.md'
    filepath = os.path.join('$EPISTLES_DIR', filename)
    with open(filepath, 'w') as f:
        f.write('---\n')
        f.write('from: ${AGENT_ID}\n')
        f.write('to: any\n')
        f.write('subject: Sunset findings — ' + t.get('mandate', 'unknown')[:60] + '\n')
        f.write('priority: normal\n')
        f.write('timestamp: $TIMESTAMP\n')
        f.write('read: false\n')
        f.write('auto-generated: true\n')
        f.write('---\n\n')
        f.write('**Findings:**\n')
        for finding in findings:
            f.write('- ' + finding + '\n')
        recs = t.get('recommendationsForNextAgent', '')
        if recs:
            f.write('\n**For the next agent:** ' + recs + '\n')
        failed = t.get('whatFailed', '')
        if failed:
            f.write('\n**Edge cases:** ' + failed + '\n')
    print('Auto-epistle written: ' + filename)
" 2>/dev/null
    fi
  fi

  # --- Auto-update registry files from testament data ---
  if [ -f "$TESTAMENT_JSON" ]; then
    "$PYTHON" -c "
import json, os
from datetime import datetime, timezone

testament_path = '$TESTAMENT_JSON'
project_dir = '$PROJECT_DIR'
agent_id = '$AGENT_ID'
timestamp = '$TIMESTAMP'

with open(testament_path) as f:
    t = json.load(f)

# --- Update skills.json (Canon Section XXXIII: Levitical Registry) ---
skills_path = project_dir + '/registry/skills.json'
skills = []
if os.path.exists(skills_path):
    try:
        with open(skills_path) as f:
            skills = json.load(f)
    except: pass

# Extract skills from testament's keyFindings and mandate
mandate = t.get('mandate', '')
what_worked = t.get('whatWorked', '')
# Add demonstrated skills
new_skill = {
    'agentId': agent_id,
    'mandate': mandate[:80],
    'demonstrated': True,
    'demonstratedAt': timestamp,
    'whatWorked': what_worked[:200] if what_worked else ''
}
skills.append(new_skill)
with open(skills_path, 'w') as f:
    json.dump(skills, f, indent=2)

# --- Update baselines.json (Canon Section XIX: The Fall) ---
baselines_path = project_dir + '/registry/baselines.json'
baselines = {}
if os.path.exists(baselines_path):
    try:
        with open(baselines_path) as f:
            baselines = json.load(f)
    except: pass

manna = t.get('mannaConsumed', 'unknown')
completed = t.get('mandateCompleted', False)
agent_type = agent_id.rsplit('-', 1)[0] if '-' in agent_id else agent_id

if agent_type not in baselines:
    baselines[agent_type] = {
        'firstRecorded': timestamp,
        'runs': []
    }
baselines[agent_type]['runs'].append({
    'agentId': agent_id,
    'timestamp': timestamp,
    'completed': completed,
    'mannaConsumed': str(manna),
    'testamentComplete': True
})
with open(baselines_path, 'w') as f:
    json.dump(baselines, f, indent=2)

print(f'Registry files updated: skills.json, baselines.json')
" 2>/dev/null
  fi
fi

exit 0
