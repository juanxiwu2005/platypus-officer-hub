#!/bin/bash
# Night Mode task queue: one failed task does not stop independent tasks.
#
# Usage:
#   bash scripts/night-queue.sh                     # Run every task in .nightmode/queue/.
#   caffeinate -dimsu bash scripts/night-queue.sh   # Keep a Mac awake overnight.
#
# Put task files in .nightmode/queue/; execution follows filename order, for example:
#   T1-zindex.md  T2-radius.md  T3-fontscale.md
#
# A task can declare dependencies anywhere in its body, on multiple lines:
#   # Depends on: T1-zindex.md
# If a dependency fails or is skipped, skip this task instead of building on unverified changes.
# Run tasks without declared dependencies normally; continue with the next independent task.
#
# Preserve unfinished work on wip/<task-name>; restore the working branch to its pre-task commit.
#   The first version on 2026-10-28 committed unfinished work on the working branch, so unverified T2
#   changes became the base for T3 and every later task. Separate WIP branches prevent this.
#   See the interrupted-work recovery section in docs/NIGHT_MODE.md.
#
# Safety: check protected files before preserving WIP. The controller checks them only when it commits;
#   repeat that check here so the queue cannot preserve prohibited changes on any branch.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

QUEUE="$ROOT/.nightmode/queue"
DONE="$ROOT/.nightmode/done"
FAILED="$ROOT/.nightmode/failed"
LOGS="$ROOT/.nightmode/logs"
mkdir -p "$QUEUE" "$DONE" "$FAILED" "$LOGS"

# Keep this aligned with PROTECTED_PATHS / PROTECTED_PREFIXES in scripts/night-mode.mjs.
# Update both places when the protected-file list changes.
protected_changed() {
  git diff --name-only HEAD | while read -r f; do
    case "$f" in
      .env|.gitignore|AGENTS.md|docs/NIGHT_MODE.md|package.json|package-lock.json|opencode.json|scripts/night-mode.mjs|netlify.toml) echo "$f" ;;
      .env.*|.git/*|.github/*|.nightmode/*) echo "$f" ;;
    esac
  done
}

ts() { date '+%H:%M:%S'; }
count_queue() { find "$QUEUE" -maxdepth 1 -name '*.md' | wc -l | tr -d ' '; }

failed_names=""
skipped_names=""
done_count=0
branch="$(git branch --show-current)"

echo "════════════════════════════════════════════════"
echo "Night Mode queue  $(date '+%Y-%m-%d %H:%M:%S')"
echo "Branch $branch"
echo "════════════════════════════════════════════════"

shopt -s nullglob
tasks=("$QUEUE"/*.md)
if [ ${#tasks[@]} -eq 0 ]; then
  echo "The queue is empty: put task files in $QUEUE"
  exit 0
fi
echo "Queued: ${#tasks[@]} tasks"

for task in "${tasks[@]}"; do
  name="$(basename "$task" .md)"
  base="$(git rev-parse HEAD)"

  # Dependency check: do not run a task whose dependency failed or was skipped.
  blocked=""
  while IFS= read -r dep; do
    dep="$(basename "${dep}" .md)"
    case " $failed_names $skipped_names " in *" $dep "*) blocked="$dep" ;; esac
  done < <(grep -oiE '^#[[:space:]]*Depends on:[[:space:]]*\S+' "$task" 2>/dev/null | sed -E 's/.*:[[:space:]]*//')

  if [ -n "$blocked" ]; then
    echo ""
    echo "──── $(ts)  SKIP  $name  (dependency $blocked did not succeed)"
    mv "$task" "$FAILED/$name.skipped.md"
    skipped_names="$skipped_names $name"
    continue
  fi

  echo ""
  echo "════ $(ts)  START  $name ════"

  if node scripts/night-mode.mjs --task-file "$task" 2>&1 | tee "$LOGS/$name.log"; then
    echo "════ $(ts)  DONE  $name ════"
    mv "$task" "$DONE/$name.md"
    done_count=$((done_count + 1))
    continue
  fi

  echo "════ $(ts)  FAILED  $name ════"
  mv "$task" "$FAILED/$name.md"
  failed_names="$failed_names $name"

  # The controller may have committed but failed to push (for example, after a concurrent push).
  # Those commits passed all gates. Preserve them for a person to review and push or revise.
  if [ "$(git rev-parse HEAD)" != "$base" ]; then
    echo "   Warning: the controller committed but could not push. Preserved commits:"
    git log --oneline "$base"..HEAD | sed 's/^/     /'
    echo "   These commits passed tests and Critic review. Resolve them before continuing."
    continue
  fi

  # Preserve uncommitted WIP on a separate branch; keep it out of the next task's base.
  if [ -z "$(git status --porcelain)" ]; then
    echo "   The working tree is clean; no unfinished work to preserve."
    continue
  fi

  bad="$(protected_changed)"
  if [ -n "$bad" ]; then
    echo "STOP: protected files were modified. Refusing to preserve WIP:"
    echo "$bad" | sed 's/^/   /'
    echo "   Review these changes manually before continuing."
    break
  fi

  wip="wip/$name"
  if git stash push -q -u -m "queue:$name" \
     && git branch -f "$wip" "$base" \
     && git checkout -q "$wip" \
     && git stash pop -q \
     && git add -A \
     && git commit -q -m "[WIP-UNVERIFIED][queue] $name: unfinished work at interruption

This commit has not passed local tests, independent Critic review, or GitHub CI.
It is on a separate branch and will not become the base for later tasks.

See the interrupted-work recovery section in docs/NIGHT_MODE.md.
Failure log: .nightmode/logs/$name.log" \
     && git checkout -q "$branch"; then
    echo "   Unverified WIP saved on $wip; working branch restored to ${base:0:8}. Continuing."
  else
    echo "STOP: could not preserve WIP; working-tree state is uncertain. Review git status manually."
    break
  fi
done

echo ""
echo "════════════════════════════════════════════════"
echo "Queue finished $(date '+%Y-%m-%d %H:%M:%S')"
echo "Completed: $done_count"
[ -n "$failed_names" ]  && echo "Failed: $failed_names"
[ -n "$skipped_names" ] && echo "Skipped (dependency did not succeed): $skipped_names"
echo "Not yet run: $(count_queue)"
echo ""
wips="$(git branch --list 'wip/*' | sed 's/^/   /')"
if [ -n "$wips" ]; then
  echo "Unfinished branches exist. Follow interrupted-work recovery in docs/NIGHT_MODE.md:"
  echo "$wips"
fi
ahead="$(git log --oneline "@{upstream}"..HEAD 2>/dev/null | sed 's/^/   /')"
if [ -n "$ahead" ]; then
  echo "The working branch has unpushed commits:"
  echo "$ahead"
fi
echo "════════════════════════════════════════════════"
