#!/usr/bin/env node
// A separate JSON-manifest queue; never consumes the paused legacy Markdown queue.
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"
import { statusPaths } from "./night-mode.mjs"
import { protectedPath, run, safePath, validateConfig } from "./night-mode-lib.mjs"

export async function recoverFailure(root, branch, baseline, name, execute = run) {
  const git = async (...args) => {
    const result = await execute("git", args, { cwd: root })
    if (result.code !== 0) throw new Error(result.output)
    return result.output.trim()
  }
  if (await git("branch", "--show-current") !== branch) throw new Error("Queue branch changed; preserve state for manual review.")
  const head = await git("rev-parse", "HEAD")
  const raw = await execute("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root })
  if (raw.code !== 0) throw new Error("Cannot inspect failed-task state.")
  const changed = statusPaths(raw.output)
  if (changed.some(protectedPath)) throw new Error("Protected files changed; no WIP commit or reset attempted.")
  let wip = null
  if (changed.length) {
    wip = `wip/${name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}-${Date.now()}`
    // Create a fresh branch without forcing/deleting any previous recovery branch.
    await git("switch", "-c", wip)
    await git("add", "--", ...changed)
    await git("commit", "-m", `[WIP-UNVERIFIED][queue] ${name}: preserved failed task`)
    await git("switch", branch)
  }
  return { wip, committed: head !== baseline, continueQueue: head === baseline }
}
async function main() {
  const args = process.argv.slice(2)
  if (args.includes("--help")) { console.log("Usage: bash scripts/night-queue.sh [--queue-dir .nightmode/quest-queue]\nOnly approved JSON pipeline manifests are consumed; the old queue remains paused."); return }
  if (args.length && (args.length !== 2 || args[0] !== "--queue-dir")) throw new Error("Unknown queue argument.")
  const probe = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" })
  if (probe.status !== 0) throw new Error("Start inside the repository.")
  const root = probe.stdout.trim(), queueName = args[1] ?? ".nightmode/quest-queue"
  if (!queueName.startsWith(".nightmode/") || queueName === ".nightmode/queue") throw new Error("Use an isolated new queue directory.")
  const queue = safePath(root, queueName), lock = resolve(root, ".nightmode/queue-lock")
  mkdirSync(queue, { recursive: true })
  try { mkdirSync(lock) } catch { throw new Error("Queue lock already exists; inspect it before retrying.") }
  writeFileSync(resolve(lock, "owner.json"), JSON.stringify({ pid: process.pid, started: new Date().toISOString() }))
  const failed = new Set(), done = resolve(root, ".nightmode/quest-done"), rejected = resolve(root, ".nightmode/quest-failed")
  mkdirSync(done, { recursive: true }); mkdirSync(rejected, { recursive: true })
  try {
    for (const file of readdirSync(queue).filter(file => file.endsWith(".json")).sort()) {
      const task = JSON.parse(readFileSync(resolve(queue, file), "utf8")), name = basename(file, ".json")
      validateConfig(task, root)
      if ((task.dependsOn ?? []).some(dep => failed.has(dep))) {
        failed.add(file); renameSync(resolve(queue, file), resolve(rejected, `${name}.skipped.json`)); continue
      }
      const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
      if (base.status !== 0) throw new Error("Cannot establish task baseline.")
      const before = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root, encoding: "utf8" })
      if (before.status !== 0 || before.stdout.length) throw new Error("Queue requires a clean tree before each task; existing user changes are left untouched.")
      const result = await run("node", ["scripts/night-mode.mjs", "--config", `${queueName}/${file}`], { cwd: root, timeoutMs: 3 * 60 * 60000, echo: true, env: { QUEST_QUEUE_PID: String(process.pid) } })
      if (result.code === 0) { renameSync(resolve(queue, file), resolve(done, file)); continue }
      failed.add(file); renameSync(resolve(queue, file), resolve(rejected, file))
      const recovery = await recoverFailure(root, task.branch, base.stdout.trim(), name)
      console.log(JSON.stringify(recovery))
      // Handle dirty work even if a commit exists, then stop: its CI/publication is unverified.
      if (!recovery.continueQueue) throw new Error("Controller commits preserved and remaining WIP isolated; stop before later tasks inherit unverified commits.")
    }
    if (failed.size) process.exitCode = 1
  } finally { rmSync(lock, { recursive: true, force: true }) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(`QUEUE STOPPED: ${error.message}`); process.exitCode = 1 })
