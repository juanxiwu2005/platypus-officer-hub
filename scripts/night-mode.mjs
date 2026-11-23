#!/usr/bin/env node
// Trusted maintainer controller. Agents never receive this file or its execution rights.
import { spawnSync } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { REPOSITORY, approvedVerdict, assertSession, ciState, hashFiles, protectedPath, run, safePath, terminalText, validateConfig, verifyPermissions } from "./night-mode-lib.mjs"

export function statusPaths(output) {
  const records = output.split("\0").filter(Boolean), paths = []
  for (let i = 0; i < records.length; i++) {
    const entry = records[i]; paths.push(entry.slice(3))
    if (/[RC]/.test(entry.slice(0, 2))) paths.push(records[++i])
  }
  return [...new Set(paths)]
}
export function createController(root, config, { evidenceDirectory, command = run, pause = ms => new Promise(resolveWait => setTimeout(resolveWait, ms)) } = {}) {
  const directory = evidenceDirectory ?? resolve(root, ".nightmode/runs", new Date().toISOString().replace(/[:.]/g, "-"))
  mkdirSync(directory, { recursive: true })
  const journal = (step, details, result = "") => {
    const row = { time: new Date().toISOString(), step, details, result }
    appendFileSync(resolve(directory, "events.jsonl"), JSON.stringify(row) + "\n")
    console.log(`${row.time} · ${step} · ${result || details}`)
  }
  async function execute(program, args, options = {}) {
    const result = await command(program, args, { cwd: root, ...options })
    if (result.code !== 0) throw new Error(`${program} ${args.slice(0, 4).join(" ")} failed (exit ${result.code}). ${result.output.slice(-2500)}`)
    return result.output
  }
  const git = (...args) => execute("git", args)
  const json = async (...args) => JSON.parse(await execute(...args))
  const paths = async () => statusPaths(await git("status", "--porcelain=v1", "-z", "--untracked-files=all"))
  async function assertBranch() {
    if ((await git("branch", "--show-current")).trim() !== config.branch) throw new Error("Branch changed or does not match approved configuration.")
  }
  async function assertScope() {
    await assertBranch()
    const changed = await paths()
    const forbidden = changed.filter(path => protectedPath(path) || !config.writeFiles.includes(path))
    if (forbidden.length) throw new Error(`Out-of-scope changes: ${forbidden.join(", ")}`)
    return changed
  }
  async function doctor() {
    journal("doctor/start", "Check approved branch, clean tree, repository, Draft PR, runtime, exact permissions and model availability.")
    validateConfig(config, root)
    if (Number(process.versions.node.split(".")[0]) !== 22) throw new Error("Node 22 is required.")
    await assertBranch()
    const origin = (await git("remote", "get-url", "origin")).trim().replace(/^git@github.com:/, "").replace(/^https:\/\/github.com\//, "").replace(/\.git$/, "")
    if (origin !== REPOSITORY) throw new Error("Unexpected repository remote.")
    if ((await paths()).length) throw new Error("Start with a clean worktree.")
    if (!existsSync(resolve(root, "node_modules"))) throw new Error("Dependencies must already be installed by the maintainer.")
    await execute("gh", ["auth", "status", "--hostname", "github.com"])
    const pr = await json("gh", ["pr", "view", config.branch, "--json", "number,url,isDraft,state,baseRefName,headRefName"])
    if (!pr.isDraft || pr.state !== "OPEN" || pr.baseRefName !== config.base || pr.headRefName !== config.branch) throw new Error("An open Draft PR must match the configured branch and base.")
    await execute("opencode", ["reload"])
    const agents = await json("opencode", ["debug", "agents"])
    const cases = verifyPermissions(agents, config)
    writeFileSync(resolve(directory, "permissions.json"), JSON.stringify(cases, null, 2) + "\n")
    const models = await execute("opencode", ["models"])
    for (const model of Object.values(config.models)) if (!models.includes(model)) throw new Error(`Requested model unavailable: ${model}`)
    const help = await execute("opencode", ["run", "--help"])
    for (const flag of ["--session", "--model", "--format"]) if (!help.includes(flag)) throw new Error(`OpenCode lacks ${flag}`)
    journal("doctor/pass", `Draft PR #${pr.number}; ${cases.length} permission assertions; exact requested models available.`, "DOCTOR PASS")
    return pr
  }
  function syncScope() {
    const status = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root, encoding: "utf8" })
    if (status.status !== 0) throw new Error("Cannot verify tool scope.")
    for (const path of statusPaths(status.stdout)) if (protectedPath(path) || !config.writeFiles.includes(path)) throw new Error(`Agent changed an unlisted path: ${path}`)
    const branch = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" })
    if (branch.status !== 0 || branch.stdout.trim() !== config.branch) throw new Error("Branch changed during model execution.")
  }
  async function runAgent(role, model, prompt, label) {
    const start = Date.now(), events = []
    await assertScope()
    const [providerID, id] = model.split("/")
    const response = await json("opencode", ["api", "POST", "/api/session", "--data", JSON.stringify({ title: label, agent: role, model: { providerID, id }, location: { directory: root } })])
    const session = response.data.id
    const info = async () => (await json("opencode", ["api", "GET", `/api/session/${session}`])).data
    assertSession(await info(), root, role, model)
    writeFileSync(resolve(directory, `${label}-prompt.txt`), prompt + "\n")
    const before = hashFiles(root, config.writeFiles)
    const reads = new Set([config.brief, config.card, ...config.readFiles, ...config.writeFiles])
    const interrupt = () => command("opencode", ["api", "POST", `/api/session/${session}/interrupt`], { cwd: root, timeoutMs: 10000 })
    journal(`${label}/start`, `Session ${session}; verified repository, role and actual model ${model}; 20-minute watchdog.`)
    let result
    try {
      result = await command("opencode", ["run", "--session", session, "--auto", "--format", "json", "--agent", role, "--model", model, "--title", label, prompt], {
        cwd: root, timeoutMs: 1200000, onTimeout: interrupt,
        onLine(line) {
          appendFileSync(resolve(directory, `${label}.jsonl`), line + "\n")
          let event
          try { event = JSON.parse(line) } catch { return }
          events.push(event)
          if (event.type === "error") throw new Error(`OpenCode error: ${JSON.stringify(event).slice(0, 500)}`)
          if (event.type !== "tool_use") return
          const part = event.part, state = part.state ?? {}, input = state.input ?? {}, tool = part.tool
          journal(`${label}/tool`, JSON.stringify({ tool, input, status: state.status, error: state.error }).slice(0, 1200))
          const allowed = role === "code-critic" ? ["read"] : ["read", "edit", "write", "patch", "shell"]
          if (!allowed.includes(tool)) throw new Error(`Forbidden tool attempted: ${tool}`)
          if (["edit", "write", "patch"].includes(tool)) {
            const supplied = input.path ?? input.filePath
            const candidates = supplied ? [supplied] : typeof input.patchText === "string" ? [...input.patchText.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)].map(match => match[1]) : []
            if (!candidates.length) throw new Error("Cannot verify mutation tool paths.")
            for (const file of candidates) {
              const path = file.startsWith(root + "/") ? relative(root, file) : file
              safePath(root, path)
              if (protectedPath(path) || !config.writeFiles.includes(path)) throw new Error(`Out-of-scope mutation attempted: ${path}`)
            }
          }
          if (state.status === "completed") {
            if (tool === "read") {
              const file = input.path ?? input.filePath ?? ""
              const path = file.startsWith(root + "/") ? relative(root, file) : file
              safePath(root, path)
              if (!reads.has(path)) throw new Error(`Unlisted read completed: ${path}`)
            }
            if (tool === "shell" && !config.agentCommands.includes(input.command)) throw new Error("Unlisted shell command completed.")
          }
          syncScope()
          if (role === "code-critic" && JSON.stringify(hashFiles(root, config.writeFiles)) !== JSON.stringify(before)) throw new Error("Critic changed task files.")
        },
      })
    } catch (error) { await interrupt(); throw error }
    const finalInfo = await info()
    assertSession(finalInfo, root, role, model)
    await assertScope()
    if (role === "code-critic" && JSON.stringify(hashFiles(root, config.writeFiles)) !== JSON.stringify(before)) throw new Error("Critic changed task files.")
    const summary = { session, role, model, actualModel: finalInfo.model, actualLocation: finalInfo.location, seconds: (Date.now() - start) / 1000, steps: events.filter(event => event.type === "step_start").length, tokens: finalInfo.tokens, code: result.code, timedOut: result.timedOut, final: terminalText(events), deniedTools: events.filter(event => event.type === "tool_use" && event.part.state?.status === "error").map(event => ({ tool: event.part.tool, input: event.part.state.input, error: event.part.state.error })) }
    writeFileSync(resolve(directory, `${label}-summary.json`), JSON.stringify(summary, null, 2) + "\n")
    journal(`${label}/finish`, JSON.stringify(summary), result.code === 0 ? "Completed" : "Failed")
    if (result.code !== 0) throw new Error(`${label} failed or exceeded the 20-minute limit.`)
    return summary
  }
  async function checks(cycle) {
    for (let index = 0; index < config.checks.length; index++) {
      const [program, ...args] = config.checks[index]
      journal(`check/${cycle}/${index}/start`, [program, ...args].join(" "))
      const result = await command(program, args, { cwd: root, timeoutMs: 1200000 })
      writeFileSync(resolve(directory, `check-${cycle}-${index}.txt`), result.output)
      journal(`check/${cycle}/${index}/finish`, `Exit ${result.code}`, result.code === 0 ? "PASS" : "FAIL")
      await assertScope()
      if (result.code !== 0) return result.output
    }
    return null
  }
  async function completePatch(baseline) {
    const changed = await assertScope()
    if (!changed.length && (await git("rev-parse", "HEAD")).trim() === baseline) throw new Error("Task produced no changes.")
    // Intent-to-add includes new files; baseline includes every controller commit from earlier cycles.
    for (const path of changed) if (existsSync(resolve(root, path))) await git("add", "-N", "--", path)
    const diff = await git("diff", "--binary", baseline, "--", ...config.writeFiles)
    if (!diff.trim() || diff.length > 60000) throw new Error("Review diff is empty or too large; split the card.")
    writeFileSync(resolve(directory, "review.patch"), diff)
    return diff
  }
  async function waitForCi(sha) {
    const deadline = Date.now() + 30 * 60000
    let lastState
    while (Date.now() < deadline) {
      const runs = await json("gh", ["run", "list", "--branch", config.branch, "--workflow", "CI", "--event", "pull_request", "--limit", "30", "--json", "databaseId,headSha,event,status,conclusion,url"])
      let state = ciState(runs, sha, config.requiredJobs)
      if (state.state === "inspect") {
        const details = await json("gh", ["run", "view", String(state.run.databaseId), "--json", "databaseId,headSha,event,status,conclusion,jobs,url"])
        state = ciState([details], sha, config.requiredJobs)
      }
      writeFileSync(resolve(directory, "ci.json"), JSON.stringify({ sha, ...state }, null, 2) + "\n")
      if (state.state !== lastState) journal("ci/state", `Exact source SHA ${sha}; run ${state.run?.databaseId ?? "not registered"}`, state.state)
      lastState = state.state
      if (state.state === "passed") return state.run
      if (state.state === "failed") {
        const result = await command("gh", ["run", "view", String(state.run.databaseId), "--log-failed"], { cwd: root, timeoutMs: 60000 })
        writeFileSync(resolve(directory, "ci-failed.txt"), result.output)
        throw new Error(`Exact-SHA CI failed (${state.run.conclusion}); logs retained. Preserve commits for maintainer triage; do not send stale success logs as repair instructions.`)
      }
      await pause(10000)
    }
    throw new Error("Exact-SHA CI registration/completion timed out; this is not a code rejection.")
  }
  async function runCard() {
    const pr = await doctor(), baseline = (await git("rev-parse", "HEAD")).trim()
    const card = readFileSync(safePath(root, config.card), "utf8")
    if (card.length < 20 || card.length > 20000 || /(?:gh[pours]_[A-Za-z0-9]{20,}|sk_[A-Za-z0-9]{20,}|(?:API[_ -]?KEY)\s*[:=]\s*\S+)/i.test(card)) throw new Error("Card is empty, oversized or appears to contain a secret.")
    writeFileSync(resolve(directory, "baseline.json"), JSON.stringify({ baseline, branch: config.branch, config }, null, 2))
    const instructions = `Read only ${config.brief}, ${config.card}, and the source/test files listed in the card. The planner has already read the project rules and investigated the baseline. Do not read AGENTS.md, docs/PROGRESS.md, docs/PRODUCT_PLAN.md, docs/NIGHT_MODE.md, archives, directories or configuration. Do not delegate. Do not commit or push. Never weaken tests. Only these task files may change: ${config.writeFiles.join(", ")}. Only these shell commands are permitted for the coder: ${config.agentCommands.join("; ")}. Do not run exploratory commands.\n\nCARD:\n${card}`
    let failure = ""
    for (let cycle = 1; cycle <= 3; cycle++) {
      await runAgent("backend-coder", config.models.coder, `${instructions}\n${failure ? "Repair only these actual failures:\n" + failure.slice(-16000) : "Implement the exact approved card and return a short English handoff."}`, `coder-${cycle}`)
      const checkFailure = await checks(cycle)
      if (checkFailure) { failure = checkFailure; if (cycle === 3) break; continue }
      const diff = await completePatch(baseline), hashes = hashFiles(root, config.writeFiles)
      const review = await runAgent("code-critic", config.models.critic, `${instructions}\nYou are the independent read-only reviewer. Do not use shell or edit tools. Review this entire baseline-to-worktree diff including new files and any previous controller commits. Local checks all passed. Return an explicit APPROVED or REJECTED first line and at most eight brief reasons. Do not request unlisted configuration.\n\nCOMPLETE DIFF:\n${diff}`, `critic-${cycle}`)
      if (!approvedVerdict(review.final)) { failure = review.final; if (cycle === 3) break; continue }
      if (JSON.stringify(hashes) !== JSON.stringify(hashFiles(root, config.writeFiles)) || diff !== await completePatch(baseline)) throw new Error("Reviewed files changed after approval.")
      const changed = await assertScope()
      if (!changed.length) throw new Error("No uncommitted changes to publish.")
      await git("add", "--", ...changed)
      const staged = (await git("diff", "--cached", "--name-only", "-z")).split("\0").filter(Boolean)
      if (staged.some(path => !config.writeFiles.includes(path) || protectedPath(path))) throw new Error("Staged scope differs from approved task.")
      await git("commit", "-m", `[Quest P1][ASU AIR glm-5-3] ${card.split("\n")[0].replace(/^#+\s*/, "")}`)
      const sha = (await git("rev-parse", "HEAD")).trim()
      await assertBranch()
      journal("publication/start", `Commit ${sha}; push only ${config.branch}. No force push or automatic rebase.`)
      await execute("git", ["push", "origin", `HEAD:refs/heads/${config.branch}`])
      journal("publication/pushed", sha, "PASS")
      const ci = await waitForCi(sha)
      await assertBranch()
      const remote = await git("ls-remote", "origin", `refs/heads/${config.branch}`)
      if (remote.split(/\s/)[0] !== sha || (await paths()).length) throw new Error("Published head or local tree changed after validation.")
      const receipt = { result: "READY_FOR_HUMAN_REVIEW", branch: config.branch, baseline, sha, pr: pr.url, ci: ci.url, checks: config.checks, coderModel: config.models.coder, criticModel: config.models.critic, cycles: cycle, hashes }
      writeFileSync(resolve(directory, "result.json"), JSON.stringify(receipt, null, 2) + "\n")
      writeFileSync(resolve(directory, "ready-comment.md"), `READY_FOR_CLAUDE\n\nCommit: ${sha}\nExact-SHA CI and independent review passed. Human acceptance is required; main was not changed.\n`)
      journal("complete", JSON.stringify(receipt), "READY_FOR_HUMAN_REVIEW; ready note saved locally, not posted.")
      return receipt
    }
    throw new Error("Local checks/review failed after three bounded cycles; original tests and unverified work are preserved.")
  }
  return { doctor, runCard, completePatch, directory, journal, waitForCi }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes("--help")) { console.log("Usage: node scripts/night-mode.mjs [--doctor] [--config docs/quest-build/pipeline.json]\nOne explicitly configured card; never resumes the legacy queue."); return }
  const probe = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" })
  if (probe.status !== 0) throw new Error("Start inside the approved repository.")
  const root = probe.stdout.trim(), index = args.indexOf("--config")
  if (index >= 0 && (!args[index + 1] || args[index + 1].startsWith("--"))) throw new Error("--config requires a repository path.")
  if (args.some((arg, i) => !["--doctor", "--config"].includes(arg) && !(index >= 0 && i === index + 1))) throw new Error("Unknown controller argument.")
  const configFile = index < 0 ? "docs/quest-build/pipeline.json" : args[index + 1]
  const config = validateConfig(JSON.parse(readFileSync(safePath(root, configFile), "utf8")), root)
  const lock = resolve(root, ".nightmode/controller-lock")
  mkdirSync(resolve(root, ".nightmode"), { recursive: true })
  const queueOwner = resolve(root, ".nightmode/queue-lock/owner.json")
  if (existsSync(queueOwner) && String(JSON.parse(readFileSync(queueOwner, "utf8")).pid) !== process.env.QUEST_QUEUE_PID) throw new Error("An active queue owns this workspace; standalone controller execution is blocked.")
  try { mkdirSync(lock) } catch { throw new Error("Another controller lock exists; inspect its owner before retrying.") }
  writeFileSync(resolve(lock, "owner.json"), JSON.stringify({ pid: process.pid, branch: config.branch, started: new Date().toISOString() }))
  const controller = createController(root, config)
  console.log(`Evidence: ${controller.directory}`)
  try { if (args.includes("--doctor")) await controller.doctor(); else await controller.runCard() }
  catch (error) { controller.journal("stopped", error.message, "FAILED; work retained, no merge or production deployment."); throw error }
  finally { rmSync(lock, { recursive: true, force: true }) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(`PIPELINE STOPPED: ${error.message}`); process.exitCode = 1 })
