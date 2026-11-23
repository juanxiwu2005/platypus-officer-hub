import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { approvedVerdict, assertSession, branchName, ciState, permissionEffect, run, safePath, terminalText, validateConfig, verifyPermissions } from "./night-mode-lib.mjs"
import { createController, statusPaths } from "./night-mode.mjs"
import { recoverFailure } from "./night-queue.mjs"

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), "quest-pipeline-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  git("init", "-b", "feat/onboarding-quest")
  git("config", "user.email", "fixture@example.invalid"); git("config", "user.name", "Pipeline fixture")
  const put = (path, content) => { mkdirSync(resolve(root, path, ".."), { recursive: true }); writeFileSync(resolve(root, path), content) }
  put(".gitignore", ".nightmode/\nnode_modules/\n")
  put("src/original.ts", "export const original = 1\n")
  put("docs/brief.md", "Short approved brief.\n")
  put("docs/card.md", "# Fixture card\nCreate only the exact approved test file.\n")
  git("add", "."); git("commit", "-m", "Fixture baseline")
  const config = { version: 1, branch: "feat/onboarding-quest", base: "main", brief: "docs/brief.md", card: "docs/card.md", readFiles: ["src/original.ts"], writeFiles: ["src/new.test.ts"], agentCommands: ["npx vitest run src/quest"], checks: [["npx", "vitest", "run", "src/quest"]], requiredJobs: ["check"], models: { coder: "asu/glm-5-3", critic: "asu/deepseek-v4-1-flash" } }
  return { root, git, put, config }
}
function agentsFor(config) {
  return ["backend-coder", "code-critic"].map(id => ({ id, permissions: [
    { action: "*", resource: "*", effect: "deny" },
    ...[config.brief, config.card, ...config.readFiles, ...config.writeFiles].map(resource => ({ action: "read", resource, effect: "allow" })),
    ...(id === "backend-coder" ? [...config.writeFiles.map(resource => ({ action: "edit", resource, effect: "allow" })), ...config.agentCommands.map(resource => ({ action: "shell", resource, effect: "allow" }))] : []),
  ] }))
}
test("main, detached, malformed and paused legacy branches cannot be configured", () => {
  for (const value of ["main", "feat/ai-night-mode", "", "feat/../main", "feat/x/", "feat/x.lock"]) assert.throws(() => branchName(value))
  assert.equal(branchName("feat/onboarding-quest"), "feat/onboarding-quest")
})
test("path validation blocks traversal, absolute paths and symlink aliases including dangling links", t => {
  const { root } = fixture(t)
  for (const path of ["../other", "/tmp/file", "src/../AGENTS.md", "src//file", "src/*.ts"]) assert.throws(() => safePath(root, path))
  symlinkSync("original.ts", resolve(root, "src/alias.ts"))
  symlinkSync("missing", resolve(root, "src/dangling"))
  assert.throws(() => safePath(root, "src/alias.ts"))
  assert.throws(() => safePath(root, "src/dangling/file.ts"))
  assert.equal(safePath(root, "src/new.test.ts"), resolve(root, "src/new.test.ts"))
})
test("effective permission evaluation respects wildcard actions and last matching override", () => {
  const rules = [{ action: "*", resource: "*", effect: "allow" }, { action: "*", resource: "*", effect: "deny" }, { action: "read", resource: "src/*.ts", effect: "allow" }]
  assert.equal(permissionEffect(rules, "execute", "node -e 1"), "deny")
  assert.equal(permissionEffect(rules, "read", "src/a.ts"), "allow")
  assert.equal(permissionEffect(rules, "edit", "src/a.ts"), "deny")
})
test("doctor rejects inherited alternate execution and out-of-card command grants", t => {
  const { config } = fixture(t), agents = agentsFor(config)
  assert.ok(verifyPermissions(agents, config).length > 100)
  agents[0].permissions.push({ action: "execute", resource: "node*", effect: "allow" })
  assert.throws(() => verifyPermissions(agents, config), /Permission mismatch/)
  agents[0].permissions.pop()
  agents[0].permissions.push({ action: "shell", resource: "node*", effect: "allow" })
  assert.throws(() => verifyPermissions(agents, config), /Permission mismatch/)
})
test("session verification rejects outer workspace, wrong family and wrong role", () => {
  const info = { agent: "backend-coder", location: { directory: "/repo" }, model: { providerID: "asu", id: "glm-5-3" } }
  assert.doesNotThrow(() => assertSession(info, "/repo", "backend-coder", "asu/glm-5-3"))
  assert.throws(() => assertSession(info, "/outer", "backend-coder", "asu/glm-5-3"))
  assert.throws(() => assertSession(info, "/repo", "code-critic", "asu/glm-5-3"))
  assert.throws(() => assertSession(info, "/repo", "backend-coder", "asu/deepseek-v4-1-flash"))
})
test("only terminal assistant text can approve; quoted, contradictory or qualified verdicts fail", () => {
  const events = [{ type: "text", part: { messageID: "a", text: "APPROVED" } }, { type: "text", part: { messageID: "b", text: "STATUS: REJECTED\nWrong data." } }]
  assert.equal(approvedVerdict(terminalText(events)), false)
  for (const value of ["The task requests APPROVED", "APPROVED with changes", "APPROVED\nREJECTED", "> APPROVED"]) assert.equal(approvedVerdict(value), false)
  assert.equal(approvedVerdict("STATUS: APPROVED\nAll fields match."), true)
  assert.equal(approvedVerdict("All fields match.\nVERDICT: APPROVED"), true)
})
test("CI waits for registration and exact SHA, and never treats old success or missing jobs as passage", () => {
  const old = { databaseId: 1, headSha: "old", event: "pull_request", status: "completed", conclusion: "success" }
  assert.equal(ciState([old], "new", ["check"]).state, "registering")
  const current = { ...old, databaseId: 2, headSha: "new", status: "in_progress", conclusion: "" }
  assert.equal(ciState([old, current], "new", ["check"]).state, "pending")
  current.status = "completed"; current.conclusion = "failure"
  assert.equal(ciState([old, current], "new", ["check"]).run.databaseId, 2)
  current.conclusion = "success"
  assert.equal(ciState([current], "new", ["check"]).state, "inspect")
  current.jobs = [{ name: "check", status: "completed", conclusion: "skipped" }]
  assert.equal(ciState([current], "new", ["check"]).state, "failed")
  current.jobs[0].conclusion = "success"
  assert.equal(ciState([current], "new", ["check"]).state, "passed")
})
test("NUL status parsing retains both rename paths and filenames with spaces", () => {
  assert.deepEqual(statusPaths("R  src/new name.ts\0AGENTS.md\0?? src/fresh file.ts\0"), ["src/new name.ts", "AGENTS.md", "src/fresh file.ts"])
})
test("complete review diff includes earlier commits and a new untracked file with spaces", async t => {
  const { root, git, put, config } = fixture(t), baseline = git("rev-parse", "HEAD")
  put("src/original.ts", "export const original = 2\n"); git("add", "."); git("commit", "-m", "Earlier controller commit")
  config.writeFiles = ["src/original.ts", "src/new file.test.ts"]
  put("src/new file.test.ts", "new regression coverage\n")
  const patch = await createController(root, config).completePatch(baseline)
  assert.match(patch, /-export const original = 1/)
  assert.match(patch, /\+export const original = 2/)
  assert.match(patch, /new file mode/)
  assert.match(patch, /\+new regression coverage/)
})
test("queue isolates remaining dirty work even after controller committed and stops subsequent tasks", async t => {
  const { root, git, put } = fixture(t), base = git("rev-parse", "HEAD")
  put("src/original.ts", "committed controller work\n"); git("add", "."); git("commit", "-m", "Controller commit before CI failure")
  const committed = git("rev-parse", "HEAD")
  put("src/original.ts", "remaining repair work\n"); put("src/new.test.ts", "untracked repair\n")
  const result = await recoverFailure(root, "feat/onboarding-quest", base, "fixture")
  assert.equal(result.continueQueue, false)
  assert.equal(git("rev-parse", "HEAD"), committed)
  assert.equal(git("status", "--porcelain"), "")
  assert.equal(git("show", `${result.wip}:src/original.ts`), "remaining repair work")
  assert.equal(git("show", `${result.wip}:src/new.test.ts`), "untracked repair")
})
test("queue preserves uncommitted failure separately and restores the original task baseline", async t => {
  const { root, git, put } = fixture(t), base = git("rev-parse", "HEAD")
  put("src/new.test.ts", "unfinished\n")
  const result = await recoverFailure(root, "feat/onboarding-quest", base, "fixture")
  assert.equal(result.continueQueue, true)
  assert.equal(git("rev-parse", "HEAD"), base)
  assert.equal(git("status", "--porcelain"), "")
  assert.equal(git("show", `${result.wip}:src/new.test.ts`), "unfinished")
})
test("queue refuses to save protected changes and does not discard them", async t => {
  const { root, git, put } = fixture(t), base = git("rev-parse", "HEAD")
  put("AGENTS.md", "protected change\n")
  await assert.rejects(recoverFailure(root, "feat/onboarding-quest", base, "fixture"), /Protected/)
  assert.equal(git("rev-parse", "HEAD"), base)
  assert.equal(readFileSync(resolve(root, "AGENTS.md"), "utf8"), "protected change\n")
})
test("config rejects arbitrary commands, protected writes and provider drift", t => {
  const { root, config } = fixture(t)
  assert.doesNotThrow(() => validateConfig(config, root))
  assert.throws(() => validateConfig({ ...config, writeFiles: ["opencode.json"] }, root))
  assert.throws(() => validateConfig({ ...config, checks: [["sh", "-c", "true"]] }, root))
  assert.throws(() => validateConfig({ ...config, models: { ...config.models, coder: "asu/beam-1-0" } }, root))
})
test("process watchdog invokes cancellation and terminates a blocked process", async () => {
  let interrupted = false
  const start = Date.now()
  const result = await run(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { cwd: process.cwd(), timeoutMs: 100, onTimeout: async () => { interrupted = true } })
  assert.equal(interrupted, true)
  assert.equal(result.timedOut, true)
  assert.equal(result.code, 124)
  assert.ok(Date.now() - start < 5000)
})
test("controller fixture runs binding, checks, complete review, commit/push and exact-SHA CI without any model network call", async t => {
  const { root, git, put, config } = fixture(t)
  mkdirSync(resolve(root, "node_modules"))
  const bare = resolve(root, ".nightmode/remote.git"); mkdirSync(resolve(root, ".nightmode"), { recursive: true })
  assert.equal(spawnSync("git", ["init", "--bare", bare]).status, 0)
  git("remote", "add", "origin", bare)
  const sessions = new Map(), calls = [], pauses = []
  let registrations = 0
  const answer = value => ({ code: 0, output: typeof value === "string" ? value : JSON.stringify(value) })
  const command = async (program, args, options) => {
    calls.push([program, ...args])
    if (program === "git" && args.join(" ") === "remote get-url origin") return answer("https://github.com/juanxiwu2005/platypus-officer-hub.git\n")
    if (program === "git") return run(program, args, options)
    if (program === "npx") return answer("Focused tests passed")
    if (program === "opencode") {
      if (args[0] === "reload") return answer("reloaded")
      if (args[0] === "debug") return answer(agentsFor(config))
      if (args[0] === "models") return answer(Object.values(config.models).join("\n"))
      if (args.includes("--help")) return answer("--session --model --format")
      if (args[0] === "api" && args[2] === "/api/session") {
        const info = JSON.parse(args[4]), id = `fixture-${sessions.size}`
        sessions.set(id, { id, ...info, tokens: { input: 1, output: 1 } }); return answer({ data: { id } })
      }
      if (args[0] === "api") return answer({ data: sessions.get(args[2].split("/").at(-1)) })
      if (args[0] === "run") {
        assert.ok(args.includes("--session")); assert.ok(args.includes("--model"))
        const role = args[args.indexOf("--agent") + 1]
        options.onLine(JSON.stringify({ type: "step_start", part: {} }))
        if (role === "backend-coder") {
          put("src/new.test.ts", "exact fixture source\n")
          options.onLine(JSON.stringify({ type: "tool_use", part: { tool: "write", state: { status: "completed", input: { path: "src/new.test.ts", content: "exact fixture source\n" } } } }))
        } else assert.match(args.at(-1), /new file mode/)
        options.onLine(JSON.stringify({ type: "text", part: { messageID: role, text: role === "code-critic" ? "APPROVED\nFixture review." : "Fixture complete." } }))
        return answer("")
      }
    }
    if (program === "gh") {
      if (args[0] === "auth") return answer("authenticated")
      if (args[0] === "pr") return answer({ number: 99, isDraft: true, state: "OPEN", headRefName: config.branch, baseRefName: "main", url: "https://example.invalid/pr/99" })
      const sha = git("rev-parse", "HEAD"), current = { databaseId: 2, headSha: sha, event: "pull_request", status: "completed", conclusion: "success", url: "https://example.invalid/run/2" }
      if (args[1] === "list") { registrations++; return answer(registrations === 1 ? [{ ...current, databaseId: 1, headSha: "old" }] : [current]) }
      if (args[1] === "view") return answer({ ...current, jobs: [{ name: "check", status: "completed", conclusion: "success" }] })
    }
    throw new Error(`Unstubbed fixture call: ${program} ${args}`)
  }
  const controller = createController(root, config, { command, pause: async ms => pauses.push(ms) })
  const result = await controller.runCard()
  assert.equal(result.result, "READY_FOR_HUMAN_REVIEW")
  assert.equal(git("rev-parse", "HEAD"), result.sha)
  assert.equal(git("ls-remote", "origin", `refs/heads/${config.branch}`).split(/\s/)[0], result.sha)
  assert.equal(git("status", "--porcelain"), "")
  assert.equal(pauses.length, 1)
  assert.ok(calls.some(call => call.includes("code-critic")))
  assert.equal(sessions.size, 2)
})
