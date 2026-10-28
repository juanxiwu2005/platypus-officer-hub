#!/bin/bash
# Night Mode 任务队列 —— 一个任务失败不拖垮整晚
#
# 用法：
#   bash scripts/night-queue.sh                     # 跑 .nightmode/queue/ 里的全部任务
#   caffeinate -dimsu bash scripts/night-queue.sh   # 过夜跑（Mac 不睡）
#
# 任务文件放在 .nightmode/queue/，按文件名排序执行，例如：
#   01-fontscale.md  02-spacing.md  03-radius-z.md
#
# 一个任务可以在正文任意位置声明依赖（可多行）：
#   # Depends on: 01-fontscale.md
# 被依赖的任务失败或被跳过时，这个任务也会被跳过，不会在坏地基上继续。
# 没有声明依赖的任务一律照常执行 —— 这正是「一个走不通，换下一个」。
#
# 失败后的半成品怎么办：
#   控制器只在全部闸门通过后才提交。失败时改动留在工作区，而下一个任务的
#   doctor 要求工作区干净，所以队列会先把半成品存成一个 WIP 提交再继续。
#   WIP 提交带 [WIP-UNVERIFIED] 前缀，没过测试、没过 Critic、没过 CI，
#   只是「存着别丢」。第二天按 docs/NIGHT_MODE.md 的「中断后的进度分流」处理。
#
# 安全：WIP 提交前会自己查一遍保护文件。控制器的保护文件检查只在它自己提交时跑，
#   这里补上同一道检查，避免队列把本应被拒绝的改动偷偷存进分支。

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
failed_names=""
skipped_names=""
done_count=0

echo "════════════════════════════════════════════════"
echo "Night Mode 队列  $(date '+%Y-%m-%d %H:%M:%S')"
echo "分支 $(git branch --show-current)"
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
  else
    echo "════ $(ts)  失败  $name ════"
    mv "$task" "$FAILED/$name.md"
    failed_names="$failed_names $name"

    # 半成品分流：存成 WIP 提交，让工作区变干净，下一个任务才能起跑
    if [ -n "$(git status --porcelain)" ]; then
      bad="$(protected_changed)"
      if [ -n "$bad" ]; then
        echo "⛔ 工作区里有保护文件被改动，拒绝存 WIP，队列停止："
        echo "$bad" | sed 's/^/   /'
        echo "   请人工检查后再继续。"
        break
      fi
      git add -A
      git commit -q -m "[WIP-UNVERIFIED][queue] $name 中断时的半成品

这个提交没有通过本地测试、独立 Critic 或 GitHub CI。
它只是为了不丢进度，并让工作区干净以便队列继续下一个任务。

处理办法见 docs/NIGHT_MODE.md「中断后的进度分流」。
失败日志：.nightmode/logs/$name.log"
      echo "   半成品已存成 WIP 提交（未验证），工作区已清空，继续下一个任务。"
    else
      echo "   工作区干净，没有半成品要存。"
    fi
  fi
done

echo ""
echo "════════════════════════════════════════════════"
echo "队列结束 $(date '+%Y-%m-%d %H:%M:%S')"
echo "完成 $done_count 个"
[ -n "$failed_names" ]  && echo "失败：$failed_names"
[ -n "$skipped_names" ] && echo "跳过（依赖未成功）：$skipped_names"
echo "剩余未跑： $(ls "$QUEUE"/*.md 2>/dev/null | wc -l | tr -d ' ') 个"
echo ""
echo "有 WIP 提交的话，按 docs/NIGHT_MODE.md「中断后的进度分流」处理："
git log --oneline --grep='^\[WIP-UNVERIFIED\]' -5 | sed 's/^/   /'
echo "════════════════════════════════════════════════"
