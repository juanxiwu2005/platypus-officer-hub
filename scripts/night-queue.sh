#!/bin/bash
# Night Mode 任务队列 —— 一个任务失败不拖垮整晚
#
# 用法：
#   bash scripts/night-queue.sh                     # 跑 .nightmode/queue/ 里的全部任务
#   caffeinate -dimsu bash scripts/night-queue.sh   # 过夜跑（Mac 不睡）
#
# 任务文件放在 .nightmode/queue/，按文件名排序执行，例如：
#   T1-zindex.md  T2-radius.md  T3-fontscale.md
#
# 一个任务可以在正文任意位置声明依赖（可多行）：
#   # Depends on: T1-zindex.md
# 被依赖的任务失败或被跳过时，这个任务也会被跳过，不会在坏地基上继续。
# 没有声明依赖的任务一律照常执行 —— 这正是「一个走不通，换下一个」。
#
# 失败后的半成品：存到单独的分支 wip/<任务名>，工作分支退回这个任务开跑前的位置。
#   2026-10-28 的第一版把半成品直接提交在工作分支上，结果 T2 未经验证的改动成了
#   T3 的地基，一个失败污染后面每一个任务。现在不会了。
#   处理半成品见 docs/NIGHT_MODE.md「中断后的进度分流」。
#
# 安全：存半成品前会自己查一遍保护文件。控制器的保护文件检查只在它自己提交时跑，
#   这里补上同一道检查，避免队列把本应被拒绝的改动偷偷存进任何分支。

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

QUEUE="$ROOT/.nightmode/queue"
DONE="$ROOT/.nightmode/done"
FAILED="$ROOT/.nightmode/failed"
LOGS="$ROOT/.nightmode/logs"
mkdir -p "$QUEUE" "$DONE" "$FAILED" "$LOGS"

# 和 scripts/night-mode.mjs 的 PROTECTED_PATHS / PROTECTED_PREFIXES 保持一致。
# 改那边就要改这边。
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
echo "Night Mode 队列  $(date '+%Y-%m-%d %H:%M:%S')"
echo "分支 $branch"
echo "════════════════════════════════════════════════"

shopt -s nullglob
tasks=("$QUEUE"/*.md)
if [ ${#tasks[@]} -eq 0 ]; then
  echo "队列是空的：把任务文件放进 $QUEUE"
  exit 0
fi
echo "排队中：${#tasks[@]} 个任务"

for task in "${tasks[@]}"; do
  name="$(basename "$task" .md)"
  base="$(git rev-parse HEAD)"

  # 依赖检查：被依赖的任务失败或被跳过，这个任务就不跑
  blocked=""
  while IFS= read -r dep; do
    dep="$(basename "${dep}" .md)"
    case " $failed_names $skipped_names " in *" $dep "*) blocked="$dep" ;; esac
  done < <(grep -oiE '^#[[:space:]]*Depends on:[[:space:]]*\S+' "$task" 2>/dev/null | sed -E 's/.*:[[:space:]]*//')

  if [ -n "$blocked" ]; then
    echo ""
    echo "──── $(ts)  跳过  $name  （依赖的 $blocked 没成功）"
    mv "$task" "$FAILED/$name.skipped.md"
    skipped_names="$skipped_names $name"
    continue
  fi

  echo ""
  echo "════ $(ts)  开始  $name ════"

  if node scripts/night-mode.mjs --task-file "$task" 2>&1 | tee "$LOGS/$name.log"; then
    echo "════ $(ts)  完成  $name ════"
    mv "$task" "$DONE/$name.md"
    done_count=$((done_count + 1))
    continue
  fi

  echo "════ $(ts)  失败  $name ════"
  mv "$task" "$FAILED/$name.md"
  failed_names="$failed_names $name"

  # 控制器可能已经提交但推送失败（例如别人同时推了同一分支）。那种提交通过了
  # 全部闸门，绝对不能丢。留在工作分支上，早上由人决定推还是改。
  if [ "$(git rev-parse HEAD)" != "$base" ]; then
    echo "   ⚠️ 工作分支上多了提交 —— 控制器提交过但没推成功，已保留："
    git log --oneline "$base"..HEAD | sed 's/^/     /'
    echo "   这些提交是过了测试和 Critic 的，早上先处理它们。"
    continue
  fi

  # 未提交的半成品：存到单独分支，工作分支退回起跑点，不污染下一个任务
  if [ -z "$(git status --porcelain)" ]; then
    echo "   工作区干净，没有半成品要存。"
    continue
  fi

  bad="$(protected_changed)"
  if [ -n "$bad" ]; then
    echo "⛔ 工作区里有保护文件被改动，拒绝保存，队列停止："
    echo "$bad" | sed 's/^/   /'
    echo "   请人工检查后再继续。"
    break
  fi

  wip="wip/$name"
  if git stash push -q -u -m "queue:$name" \
     && git branch -f "$wip" "$base" \
     && git checkout -q "$wip" \
     && git stash pop -q \
     && git add -A \
     && git commit -q -m "[WIP-UNVERIFIED][queue] $name 中断时的半成品

这个提交没有通过本地测试、独立 Critic 或 GitHub CI。
它在单独的分支上，不会成为后面任务的地基。

处理办法见 docs/NIGHT_MODE.md「中断后的进度分流」。
失败日志：.nightmode/logs/$name.log" \
     && git checkout -q "$branch"; then
    echo "   半成品已存到分支 $wip（未验证）；工作分支回到 ${base:0:8}，继续下一个任务。"
  else
    echo "⛔ 保存半成品失败，工作区状态不明，队列停止。请人工检查 git status。"
    break
  fi
done

echo ""
echo "════════════════════════════════════════════════"
echo "队列结束 $(date '+%Y-%m-%d %H:%M:%S')"
echo "完成 $done_count 个"
[ -n "$failed_names" ]  && echo "失败：$failed_names"
[ -n "$skipped_names" ] && echo "跳过（依赖未成功）：$skipped_names"
echo "剩余未跑：$(count_queue) 个"
echo ""
wips="$(git branch --list 'wip/*' | sed 's/^/   /')"
if [ -n "$wips" ]; then
  echo "有半成品分支，按 docs/NIGHT_MODE.md「中断后的进度分流」处理："
  echo "$wips"
fi
ahead="$(git log --oneline "@{upstream}"..HEAD 2>/dev/null | sed 's/^/   /')"
if [ -n "$ahead" ]; then
  echo "工作分支上有还没推送的提交："
  echo "$ahead"
fi
echo "════════════════════════════════════════════════"
