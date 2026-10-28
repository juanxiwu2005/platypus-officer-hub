#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import process from "node:process"

const EXPECTED_REPOSITORY = "juanxiwu2005/platypus-officer-hub"
const NIGHT_BRANCH = "feat/ai-night-mode"
// The agent that writes the code. It was `orchestrator`, but that agent is denied edit and
// shell by design ("you never write code, edit files or run commands yourself"), so it can
// only delegate — and delegation fails in this environment with "Subagent session not found".
// `backend-coder` is mode "all", so it runs as a primary agent, and it keeps the same
// protected-file denials and the same nine-command shell allowlist. The independent
// `code-critic` review below is unchanged: the controller still calls it separately.
const CODING_AGENT = "backend-coder"
// Raised 2026-10-28 (Juanxi). Four runs died on budget, not on safety: the coding agent spent
// its whole allowance reading the repository and never reached an edit. Steps are now 300
// (opencode.json), so the old 20-minute ceiling would just move the wall. None of this touches
// a safety boundary — protected files, the shell allowlist, the independent review, the full
// test suite, CI, and the no-merge/no-deploy rules are unchanged.
const MAX_CYCLES = 5
const COMMAND_TIMEOUT_MS = 45 * 60 * 1000
const MAX_CAPTURE_CHARS = 300_000

const rootProbe = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: process.cwd(),
  encoding: "utf8",
})

if (rootProbe.status !== 0) {
  console.error("Night Mode must be started inside the Platypus Git repository.")
  process.exit(1)
}

const ROOT = rootProbe.stdout.trim()
const NIGHT_DIR = resolve(ROOT, ".nightmode")

const PROTECTED_PATHS = [
  ".env",
  ".gitignore",
  "AGENTS.md",
  "docs/NIGHT_MODE.md",
  "package.json",
  "package-lock.json",
  "opencode.json",
  "scripts/night-mode.mjs",
  "netlify.toml",
]

const PROTECTED_PREFIXES = [".env.", ".git/", ".github/", ".nightmode/"]

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "")
}

function appendLimited(current, chunk) {
  const next = current + chunk
  return next.length > MAX_CAPTURE_CHARS ? next.slice(-MAX_CAPTURE_CHARS) : next
}

function run(command, args = [], options = {}) {
  const {
    cwd = ROOT,
    echo = true,
    env = {},
    timeoutMs = COMMAND_TIMEOUT_MS,
  } = options

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let output = ""
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
    }, timeoutMs)

    child.stdout.on("data", (data) => {
      const text = data.toString()
      output = appendLimited(output, text)
      if (echo) process.stdout.write(text)
    })

    child.stderr.on("data", (data) => {
      const text = data.toString()
      output = appendLimited(output, text)
      if (echo) process.stderr.write(text)
    })

    child.on("error", (error) => {
      clearTimeout(timer)
      rejectRun(error)
    })

    child.on("close", (code, signal) => {
      clearTimeout(timer)
      resolveRun({
        code: timedOut ? 124 : (code ?? 1),
        signal,
        output: stripAnsi(output),
        timedOut,
      })
    })
  })
}

async function runRequired(command, args = [], options = {}) {
  const result = await run(command, args, options)
  if (result.code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.code}`)
  }
  return result
}

function commandExists(command) {
  return spawnSync("which", [command], { encoding: "utf8" }).status === 0
}

function wildcardMatches(pattern, value) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`^${escaped.replaceAll("*", ".*").replaceAll("?", ".")}$`)
  return regex.test(value)
}

function permissionEffect(permissions, action, resource) {
  let effect
  for (const rule of permissions) {
    if (rule.action === action && wildcardMatches(rule.resource, resource)) {
      effect = rule.effect
    }
  }
  return effect
}

function normalizeRepositoryUrl(value) {
  return value
    .trim()
    .replace(/^git@github\.com:/, "")
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
}

function isProtectedPath(path) {
  const clean = path.replace(/^"|"$/g, "")
  return PROTECTED_PATHS.includes(clean) || PROTECTED_PREFIXES.some((prefix) => clean.startsWith(prefix))
}

async function getBranch() {
  const result = await runRequired("git", ["branch", "--show-current"], { echo: false })
  return result.output.trim()
}

async function getStatusPaths() {
  const result = await runRequired("git", ["status", "--porcelain=v1"], { echo: false })
  return result.output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").at(-1))
}

async function getPullRequest() {
  const result = await runRequired(
    "gh",
    ["pr", "view", "--json", "number,isDraft,state,baseRefName,headRefName,url"],
    { echo: false },
  )
  return JSON.parse(result.output)
}

async function doctor({ requireClean = true } = {}) {
  console.log("Night Mode doctor: checking local safety boundaries...")

  for (const command of ["git", "gh", "node", "npm", "opencode"]) {
    if (!commandExists(command)) throw new Error(`Missing required command: ${command}`)
  }

  const nodeMajor = Number(process.versions.node.split(".")[0])
  if (nodeMajor !== 22) throw new Error(`Node 22 is required; found ${process.version}`)

  const branch = await getBranch()
  if (branch !== NIGHT_BRANCH) {
    throw new Error(`Night Mode only runs on ${NIGHT_BRANCH}; current branch is ${branch || "detached"}`)
  }

  const origin = await runRequired("git", ["remote", "get-url", "origin"], { echo: false })
  if (normalizeRepositoryUrl(origin.output) !== EXPECTED_REPOSITORY) {
    throw new Error(`Unexpected origin remote: ${origin.output.trim()}`)
  }

  if (requireClean) {
    const changedPaths = await getStatusPaths()
    if (changedPaths.length) {
      throw new Error(`Start with a clean worktree. Uncommitted paths: ${changedPaths.join(", ")}`)
    }
  }

  await runRequired("gh", ["auth", "status", "--hostname", "github.com"], { echo: false })

  const pullRequest = await getPullRequest()
  if (
    pullRequest.state !== "OPEN" ||
    !pullRequest.isDraft ||
    pullRequest.baseRefName !== "main" ||
    pullRequest.headRefName !== NIGHT_BRANCH
  ) {
    throw new Error("Night Mode requires an open Draft PR from feat/ai-night-mode into main.")
  }

  const configPath = resolve(ROOT, "opencode.json")
  if (!existsSync(configPath)) throw new Error("Missing project opencode.json safety configuration.")
  const projectConfig = JSON.parse(readFileSync(configPath, "utf8"))
  if (projectConfig.permission?.external_directory !== "deny") {
    throw new Error("opencode.json must deny external_directory.")
  }
  if (projectConfig.permission?.bash?.["*"] !== "deny") {
    throw new Error("opencode.json must deny unknown shell commands.")
  }

  const agentsResult = await runRequired("opencode", ["debug", "agents"], { echo: false })
  const agents = JSON.parse(agentsResult.output)
  const backend = agents.find((agent) => agent.name === "backend-coder")
  if (!backend) throw new Error("backend-coder agent is missing.")

  const permissions = backend.permissions ?? []
  const requiredEffects = [
    ["external_directory", "/tmp/example", "deny"],
    ["shell", "git status --short --branch", "allow"],
    ["shell", "npm run check", "allow"],
    ["shell", "brew --version", "deny"],
    ["edit", "package.json", "deny"],
    ["edit", "opencode.json", "deny"],
    ["edit", "scripts/night-mode.mjs", "deny"],
  ]

  for (const [action, resource, expected] of requiredEffects) {
    const actual = permissionEffect(permissions, action, resource)
    if (actual !== expected) {
      throw new Error(`Permission check failed for ${action}:${resource}; expected ${expected}, got ${actual}`)
    }
  }

  if (!existsSync(resolve(ROOT, "node_modules"))) {
    throw new Error("node_modules is missing. Run npm ci before Night Mode.")
  }

  console.log(`DOCTOR PASS · branch ${branch} · Draft PR #${pullRequest.number}`)
  return pullRequest
}

function taskPathFromArgs(args) {
  const index = args.indexOf("--task-file")
  const supplied = index >= 0 ? args[index + 1] : ".nightmode/TASK.md"
  if (!supplied) throw new Error("--task-file requires a file path.")
  const fullPath = isAbsolute(supplied) ? resolve(supplied) : resolve(ROOT, supplied)
  const insideRoot = fullPath === ROOT || (!relative(ROOT, fullPath).startsWith(`..${sep}`) && relative(ROOT, fullPath) !== "..")
  if (!insideRoot) throw new Error("The task file must be inside the repository.")
  return fullPath
}

function readTask(taskPath) {
  if (!existsSync(taskPath)) {
    throw new Error(`Task file not found: ${taskPath}\nCreate .nightmode/TASK.md first.`)
  }
  const task = readFileSync(taskPath, "utf8").trim()
  if (task.length < 20) throw new Error("The task is too short. Include the goal, constraints, and done criteria.")

  const secretPattern = /(sk_[A-Za-z0-9]{20,}|gh[opurs]_[A-Za-z0-9]{20,}|ASU_AIR_API_KEY\s*=|API[_ -]?KEY\s*[:=]\s*\S+)/i
  if (secretPattern.test(task)) throw new Error("The task file appears to contain a secret. Remove it before continuing.")
  return task
}

function taskTitle(task) {
  return task
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean)
    ?.replace(/[^\w\s:()\-\u4e00-\u9fff]/g, "")
    .slice(0, 60) || "Automated task"
}

async function runOpenCode(agent, title, prompt) {
  return run(
    "opencode",
    ["run", "--auto", "--agent", agent, "--title", title, prompt],
    { timeoutMs: COMMAND_TIMEOUT_MS },
  )
}

async function initialCoding(task) {
  const prompt = `
You are running Platypus Night Mode on the protected branch ${NIGHT_BRANCH}.

Read AGENTS.md, docs/PROGRESS.md, docs/PRODUCT_PLAN.md, docs/RULES.md, docs/NIGHT_MODE.md, and .nightmode/TASK.md before changing code.

Implement the task yourself; do not delegate to subagents. Use fictional data only. Never touch secrets, external directories, main, deployment settings, dependency files, GitHub Actions, or the Night Mode safety files. Do not commit or push.

Implement only this approved task:

${task}

Run the allowed focused tests as work proceeds. Finish with a concise list of changed files and remaining risks. The controller will run the authoritative full test suite and independent review afterward.
`.trim()

  const result = await runOpenCode(CODING_AGENT, `Night Mode: ${taskTitle(task)}`, prompt)
  if (result.code !== 0) throw new Error("The ASU coding phase failed.")
}

async function runLocalCheck() {
  console.log("\n=== Authoritative local check ===")
  const result = await run("npm", ["run", "check"], { timeoutMs: COMMAND_TIMEOUT_MS })
  writeFileSync(resolve(NIGHT_DIR, "check.log"), result.output)
  return result
}

async function writeReviewPatch() {
  const diff = await runRequired("git", ["diff", "--binary"], { echo: false })
  const patchPath = resolve(NIGHT_DIR, "review.patch")
  writeFileSync(patchPath, diff.output)
  return diff.output
}

async function runIndependentReview(task) {
  console.log("\n=== Independent code review ===")
  const diff = await writeReviewPatch()
  if (!diff.trim()) return { approved: false, output: "VERDICT: REJECTED\nNo code changes were produced." }

  const prompt = `
Act as an independent, read-only code critic. Read AGENTS.md, docs/NIGHT_MODE.md, .nightmode/TASK.md, and .nightmode/review.patch. Inspect the changed source and test files referenced by the patch.

Check correctness, regressions, security boundaries, fake test passing, weakened assertions, missing mobile behavior, and violations of this task:

${task}

Do not edit anything. End with exactly one final line:
VERDICT: APPROVED
or
VERDICT: REJECTED
`.trim()

  const result = await runOpenCode("code-critic", "Night Mode independent review", prompt)
  writeFileSync(resolve(NIGHT_DIR, "review.txt"), result.output)
  return {
    approved: result.code === 0 && /VERDICT:\s*APPROVED\b/i.test(result.output),
    output: result.output,
  }
}

async function askForRepair(task, cycle, failureSummary) {
  writeFileSync(resolve(NIGHT_DIR, "last-failure.log"), failureSummary)
  const prompt = `
Night Mode repair cycle ${cycle} of ${MAX_CYCLES}.

Read AGENTS.md, docs/NIGHT_MODE.md, .nightmode/TASK.md, .nightmode/last-failure.log, and .nightmode/review.txt if it exists. Diagnose the actual failure, apply the smallest safe fix yourself without delegating, and run focused allowed tests. Do not commit, push, change dependencies, weaken tests, or touch protected files.

Original task:
${task}
`.trim()

  const result = await runOpenCode(CODING_AGENT, `Night Mode repair ${cycle}`, prompt)
  if (result.code !== 0) throw new Error(`Repair cycle ${cycle} failed.`)
}

async function assertNoProtectedChanges() {
  const changedPaths = await getStatusPaths()
  const protectedChanges = changedPaths.filter(isProtectedPath)
  if (protectedChanges.length) {
    throw new Error(`Protected files changed: ${protectedChanges.join(", ")}`)
  }
  if (!changedPaths.length) throw new Error("The task produced no changes.")
}

async function commitAndPush(task, cycle) {
  await assertNoProtectedChanges()
  await runRequired("git", ["add", "-A"])

  const staged = await runRequired("git", ["diff", "--cached", "--name-only"], { echo: false })
  const protectedStaged = staged.output.split("\n").filter(Boolean).filter(isProtectedPath)
  if (protectedStaged.length) throw new Error(`Refusing to commit protected files: ${protectedStaged.join(", ")}`)

  const suffix = cycle > 1 ? ` (repair ${cycle - 1})` : ""
  await runRequired("git", ["commit", "-m", `[Night Mode] ${taskTitle(task)}${suffix}`])
  await runRequired("git", ["push", "origin", NIGHT_BRANCH])
}

async function latestCiFailure() {
  const list = await runRequired(
    "gh",
    ["run", "list", "--branch", NIGHT_BRANCH, "--workflow", "CI", "--event", "pull_request", "--limit", "1", "--json", "databaseId,status,conclusion"],
    { echo: false },
  )
  const latest = JSON.parse(list.output)[0]
  if (!latest) return "GitHub CI failed, but no run log was found."
  const logs = await run("gh", ["run", "view", String(latest.databaseId), "--log-failed"], { echo: false })
  return logs.output || `GitHub CI ${latest.conclusion || latest.status}.`
}

async function waitForCi(pullRequestNumber) {
  console.log("\n=== GitHub CI ===")
  const result = await run(
    "gh",
    ["pr", "checks", String(pullRequestNumber), "--watch", "--interval", "10"],
    { timeoutMs: COMMAND_TIMEOUT_MS },
  )
  return result.code === 0
}

async function markReady(task, pullRequest) {
  const sha = await runRequired("git", ["rev-parse", "--short", "HEAD"], { echo: false })
  const body = [
    "READY_FOR_CLAUDE",
    "",
    `Task: ${taskTitle(task)}`,
    `Commit: ${sha.output.trim()}`,
    "Local check: PASS (build, unit tests, desktop/mobile Playwright)",
    "Independent ASU code review: APPROVED",
    "GitHub CI: PASS",
    "",
    "Human approval is still required. Do not merge or deploy Production.",
  ].join("\n")

  const reportPath = resolve(NIGHT_DIR, "ready-comment.md")
  writeFileSync(reportPath, body)
  await runRequired("gh", ["pr", "comment", String(pullRequest.number), "--body-file", reportPath])

  const details = await runRequired(
    "gh",
    ["pr", "view", String(pullRequest.number), "--json", "url,statusCheckRollup"],
    { echo: false },
  )
  const parsed = JSON.parse(details.output)
  const preview = (parsed.statusCheckRollup ?? []).find((check) =>
    String(check.targetUrl ?? check.detailsUrl ?? "").includes("deploy-preview"),
  )

  console.log("\nNIGHT MODE COMPLETE")
  console.log(`PR: ${parsed.url}`)
  if (preview) console.log(`Preview: ${preview.targetUrl ?? preview.detailsUrl}`)
  console.log("Status: READY_FOR_CLAUDE · waiting for human review")
}

async function runNightMode(taskPath) {
  mkdirSync(NIGHT_DIR, { recursive: true })
  const pullRequest = await doctor({ requireClean: true })
  const task = readTask(taskPath)
  writeFileSync(resolve(NIGHT_DIR, "TASK.md"), task)

  console.log("\n=== ASU coding phase ===")
  await initialCoding(task)

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle += 1) {
    console.log(`\n=== Validation cycle ${cycle}/${MAX_CYCLES} ===`)
    const check = await runLocalCheck()
    const review = await runIndependentReview(task)

    if (check.code !== 0 || !review.approved) {
      if (cycle === MAX_CYCLES) throw new Error("Local validation did not pass within 3 cycles.")
      await askForRepair(task, cycle + 1, `${check.output}\n\n${review.output}`)
      continue
    }

    await commitAndPush(task, cycle)
    const ciPassed = await waitForCi(pullRequest.number)
    if (ciPassed) {
      await markReady(task, pullRequest)
      return
    }

    if (cycle === MAX_CYCLES) throw new Error("GitHub CI did not pass within 3 cycles.")
    const ciFailure = await latestCiFailure()
    await askForRepair(task, cycle + 1, ciFailure)
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes("--doctor")) {
    await doctor({ requireClean: true })
    return
  }

  const taskPath = taskPathFromArgs(args)
  await runNightMode(taskPath)
}

main().catch((error) => {
  console.error(`\nNIGHT MODE STOPPED: ${error.message}`)
  console.error("No merge or Production deployment was attempted.")
  process.exitCode = 1
})
