#!/bin/bash
# ============================================================
# AUTO-UPGRADE — SessionStart Hook
# Checks if the Covenant Framework has updates available from
# the canonical repo and applies them automatically before
# the Prophet loads.
#
# Only upgrades .claude/ directory (agents, hooks, commands,
# settings.json). Never touches registry/, memory/, or
# project-specific files.
#
# Exit 0 always — upgrade failures should not block the session.
# ============================================================

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
UPGRADE_MARKER="$PROJECT_DIR/.claude/.last-upgrade-check"
CANONICAL_REPO="https://github.com/asalsali/covenant-framework.git"
CANONICAL_BRANCH="master"

# --- Skip if checked within the last 6 hours ---
if [ -f "$UPGRADE_MARKER" ]; then
  LAST_CHECK=$( cat "$UPGRADE_MARKER" 2>/dev/null )
  NOW=$( "$PYTHON" -c "import time; print(int(time.time()))" 2>/dev/null )
  DIFF=$(( NOW - ${LAST_CHECK:-0} ))
  if [ "$DIFF" -lt 21600 ]; then
    # Checked less than 6 hours ago — skip
    exit 0
  fi
fi

# --- Check for git availability ---
if ! command -v git &>/dev/null; then
  exit 0
fi

# --- Fetch latest framework version ---
TEMP_DIR=$( mktemp -d 2>/dev/null || echo "/tmp/covenant-upgrade-$$" )
mkdir -p "$TEMP_DIR"

# Shallow clone just the .claude directory
git clone --depth 1 --filter=blob:none --sparse \
  "$CANONICAL_REPO" "$TEMP_DIR/upstream" 2>/dev/null

if [ $? -ne 0 ]; then
  # Clone failed (no network, repo unreachable) — skip silently
  rm -rf "$TEMP_DIR"
  exit 0
fi

cd "$TEMP_DIR/upstream"
git sparse-checkout set .claude 2>/dev/null

if [ ! -d "$TEMP_DIR/upstream/.claude" ]; then
  rm -rf "$TEMP_DIR"
  exit 0
fi

# --- Compare versions ---
LOCAL_VERSION=""
REMOTE_VERSION=""

# Use the settings.json modification as a version proxy
if [ -f "$PROJECT_DIR/.claude/settings.json" ] && [ -f "$TEMP_DIR/upstream/.claude/settings.json" ]; then
  LOCAL_HASH=$( "$PYTHON" -c "
import hashlib, json
with open('$PROJECT_DIR/.claude/settings.json') as f:
    print(hashlib.md5(f.read().encode()).hexdigest())
" 2>/dev/null )
  REMOTE_HASH=$( "$PYTHON" -c "
import hashlib, json
with open('$TEMP_DIR/upstream/.claude/settings.json') as f:
    print(hashlib.md5(f.read().encode()).hexdigest())
" 2>/dev/null )
fi

# Count total file differences
DIFF_COUNT=$( "$PYTHON" -c "
import os, hashlib

def hash_dir(d):
    hashes = {}
    for root, dirs, files in os.walk(d):
        for f in files:
            fpath = os.path.join(root, f)
            rel = os.path.relpath(fpath, d)
            try:
                with open(fpath, 'rb') as fh:
                    hashes[rel] = hashlib.md5(fh.read()).hexdigest()
            except: pass
    return hashes

local_dir = '$PROJECT_DIR/.claude'
remote_dir = '$TEMP_DIR/upstream/.claude'

local = hash_dir(local_dir)
remote = hash_dir(remote_dir)

# Count files that differ or are new in remote
diff = 0
for k, v in remote.items():
    # Skip settings.local.json (user-specific)
    if k == 'settings.local.json':
        continue
    if k not in local or local[k] != v:
        diff += 1

print(diff)
" 2>/dev/null )

if [ "${DIFF_COUNT:-0}" -eq 0 ]; then
  # Up to date
  echo "✦ Covenant Framework is up to date." >&2
  "$PYTHON" -c "import time; print(int(time.time()))" > "$UPGRADE_MARKER" 2>/dev/null
  rm -rf "$TEMP_DIR"
  exit 0
fi

# --- Apply upgrade ---
echo "⬆️  COVENANT UPGRADE: $DIFF_COUNT files changed in the canonical framework." >&2
echo "   Updating .claude/ directory (agents, hooks, commands, settings)..." >&2

# Copy everything EXCEPT settings.local.json (user-specific)
"$PYTHON" -c "
import os, shutil

src = '$TEMP_DIR/upstream/.claude'
dst = '$PROJECT_DIR/.claude'

skip = {'settings.local.json'}
updated = []

for root, dirs, files in os.walk(src):
    for f in files:
        if f in skip:
            continue
        src_path = os.path.join(root, f)
        rel = os.path.relpath(src_path, src)
        dst_path = os.path.join(dst, rel)
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        shutil.copy2(src_path, dst_path)
        updated.append(rel)

for u in updated:
    print(f'  Updated: {u}')
" 2>&1 | head -20 >&2

echo "✦ Covenant Framework upgraded. $DIFF_COUNT files updated." >&2

# Record check time
"$PYTHON" -c "import time; print(int(time.time()))" > "$UPGRADE_MARKER" 2>/dev/null

# Cleanup
rm -rf "$TEMP_DIR"

exit 0
