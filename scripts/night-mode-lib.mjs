import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"

export const REPOSITORY = "juanxiwu2005/platypus-officer-hub"
export const PROTECTED = ["AGENTS.md", "CLAUDE.md", ".gitignore", "package.json", "package-lock.json", "opencode.json", "netlify.toml", "docs/NIGHT_MODE.md", "docs/PROGRESS.md", "docs/quest-build/TRIAL_LOG.md", "docs/quest-build/pipeline.json"]
export function protectedPath(path) {
  return PROTECTED.includes(path) || /^(?:\.env(?:\.|$)|\.git(?:\/|$)|\.github\/|\.nightmode\/|scripts\/)/.test(path) || /(?:^|\/)\.env(?:\.|$)/.test(path)
}
export function branchName(branch) {
  if (!/^(?:feat|fix|chore)\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(branch) || branch === "feat/ai-night-mode") throw new Error("Use an explicit feature branch; main and the paused legacy branch are forbidden.")
  return branch
}
export function safePath(root, path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\") || path.split("/").some(part => !part || part === "." || part === "..") || /[\0\r\n*?\[\]]/.test(path)) throw new Error(`Invalid repository path: ${path}`)
  const full = resolve(root, path)
  let probe = full
  while (!existsSync(probe) && probe !== root) probe = dirname(probe)
  const resolved = realpathSync(probe)
  const inside = relative(realpathSync(root), resolved)
  if (inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside)) throw new Error(`Path escapes repository: ${path}`)
  // Disallow even in-repository symlink aliases: permission resources must be unambiguous.
  let current = root
  for (const part of path.split("/")) {
    current = resolve(current, part)
    let stat
    try { stat = lstatSync(current) } catch (error) { if (error.code !== "ENOENT") throw error }
    if (stat?.isSymbolicLink()) throw new Error(`Symlink path forbidden: ${path}`)
  }
  return full
}
export function wildcard(pattern, value) {
  return new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*").replaceAll("?", ".")}$`).test(value)
}
export function permissionEffect(rules, action, resource) {
  let effect
  for (const rule of rules) if (wildcard(rule.action, action) && wildcard(rule.resource, resource)) effect = rule.effect
  return effect
}
export function verifyPermissions(agents, config) {
  const cases = []
  for (const role of ["backend-coder", "code-critic"]) {
    const agent = agents.find(item => (item.id ?? item.name) === role)
    if (!agent) throw new Error(`Missing agent: ${role}`)
    const rules = agent.permissions ?? []
    const check = (action, resource, expected) => {
      const actual = permissionEffect(rules, action, resource)
      cases.push({ role, action, resource, expected, actual })
      if (actual !== expected) throw new Error(`Permission mismatch: ${role} ${action} ${resource}: ${actual}, expected ${expected}`)
    }
    for (const action of ["execute", "code", "run", "subagent", "task", "webfetch", "websearch", "browser", "unknown_tool", "external_directory"]) check(action, "*", "deny")
    const reads = [...new Set([config.brief, config.card, ...config.readFiles, ...config.writeFiles])]
    for (const path of reads) check("read", path, "allow")
    const deniedPaths = [...PROTECTED, ".env", ".git/config", ".github/workflows/ci.yml", ".nightmode/TASK.md", "src/unlisted.ts"]
    for (const path of deniedPaths) {
      check("read", path, "deny")
      check("edit", path, "deny")
    }
    for (const path of config.writeFiles) check("edit", path, role === "backend-coder" ? "allow" : "deny")
    for (const path of config.readFiles.filter(path => !config.writeFiles.includes(path))) check("edit", path, "deny")
    for (const command of config.agentCommands) check("shell", command, role === "backend-coder" ? "allow" : "deny")
    for (const command of ["git push", "git status", "npm ci", "node -e 1", "curl https://example.com", "npx vitest run src/quest && git push"]) check("shell", command, "deny")
    // Catch inherited broad grants and partial wildcard execution grants, not just sampled paths.
    const resources = [...new Set(rules.map(rule => rule.resource))]
    for (const action of ["execute", "code", "run", "subagent", "task", "webfetch", "websearch", "browser", "unknown_tool"]) {
      for (const resource of resources) check(action, resource, "deny")
    }
    for (const action of ["read", "edit", "shell"]) {
      const permitted = action === "read" ? reads : action === "edit" && role === "backend-coder" ? config.writeFiles : action === "shell" && role === "backend-coder" ? config.agentCommands : []
      for (const resource of resources) if (!permitted.includes(resource)) check(action, resource, "deny")
    }
  }
  return cases
}
export function validateConfig(config, root) {
  if (config.version !== 1) throw new Error("Unsupported pipeline configuration version.")
  branchName(config.branch)
  if (config.base !== "main") throw new Error("The review base must remain main.")
  if (config.models?.coder !== "asu/glm-5-3" || config.models?.critic !== "asu/deepseek-v4-1-flash") throw new Error("This approved pipeline requires exact GLM 5.3 / DeepSeek models.")
  for (const key of ["readFiles", "writeFiles", "agentCommands", "checks", "requiredJobs"]) if (!Array.isArray(config[key]) || !config[key].length) throw new Error(`Nonempty ${key} is required.`)
  for (const path of [config.brief, config.card, ...config.readFiles, ...config.writeFiles]) safePath(root, path)
  for (const path of config.writeFiles) if (protectedPath(path) || !path.startsWith("src/")) throw new Error(`Task cannot edit protected or non-source file: ${path}`)
  for (const path of config.readFiles) if (protectedPath(path)) throw new Error(`Task cannot read protected file: ${path}`)
  for (const command of config.agentCommands) if (!/^(?:npx vitest run [\w./ -]+|npx tsc --noEmit -p tsconfig\.json)$/.test(command) || command.includes("..")) throw new Error(`Unsafe agent command: ${command}`)
  for (const command of config.checks) {
    if (!Array.isArray(command) || !command.length || command.some(value => typeof value !== "string")) throw new Error("Checks must be argv arrays.")
    const joined = command.join(" ")
    if (!["npm run check", "npm run lint", "npm run build", "node --test scripts/night-mode.test.mjs", ...config.agentCommands].includes(joined)) throw new Error(`Unapproved controller check: ${joined}`)
  }
  return config
}
export function assertSession(info, root, role, model) {
  const [providerID, id] = model.split("/")
  if (info.location?.directory !== root || info.agent !== role || info.model?.providerID !== providerID || info.model?.id !== id) throw new Error("OpenCode session directory, role or actual model does not match the requested run.")
}
export function terminalText(events) {
  const texts = events.filter(event => event.type === "text").map(event => event.part)
  const id = texts.at(-1)?.messageID
  return texts.filter(part => part.messageID === id).map(part => part.text).join("\n").trim()
}
export function approvedVerdict(text) {
  const lines = text.trim().split(/\r?\n/)
  const verdicts = lines.filter(line => /^(?:(?:STATUS|VERDICT):\s*)?(?:APPROVED|REJECTED)\s*$/i.test(line.trim()))
  return verdicts.length === 1 && /^(?:(?:STATUS|VERDICT):\s*)?APPROVED$/i.test(verdicts[0].trim()) && (lines[0] === verdicts[0] || lines.at(-1) === verdicts[0])
}
export function ciState(runs, sha, requiredJobs) {
  const matching = runs.filter(run => run.headSha === sha && run.event === "pull_request").sort((a, b) => b.databaseId - a.databaseId)
  if (!matching.length) return { state: "registering" }
  const run = matching[0]
  if (run.status !== "completed") return { state: "pending", run }
  if (run.conclusion !== "success") return { state: "failed", run }
  if (!Array.isArray(run.jobs)) return { state: "inspect", run }
  if (!requiredJobs.every(name => run.jobs.some(job => job.name === name && job.status === "completed" && job.conclusion === "success"))) return { state: "failed", run, reason: "Required CI jobs did not all pass." }
  return { state: "passed", run }
}
export function hashFiles(root, paths) {
  return Object.fromEntries(paths.map(path => [path, existsSync(resolve(root, path)) ? createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex") : null]))
}
export function run(command, args = [], { cwd, timeoutMs = 1200000, onLine, onTimeout, env = {}, echo = false } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, detached: true, env: { ...process.env, ...env, PWD: cwd }, stdio: ["ignore", "pipe", "pipe"] })
    let output = "", error, timedOut = false, stopTimer
    const pending = { stdout: "", stderr: "" }
    const terminate = () => {
      try { process.kill(-child.pid, "SIGTERM") } catch {}
      stopTimer ??= setTimeout(() => { try { process.kill(-child.pid, "SIGKILL") } catch {} }, 5000)
    }
    const timer = setTimeout(() => { timedOut = true; void Promise.resolve().then(() => onTimeout?.()).finally(terminate).catch(() => {}) }, timeoutMs)
    const forced = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL") } catch {} }, timeoutMs + 15000)
    const consume = (data, stream) => {
      const text = data.toString(); output += text; pending[stream] += text
      if (echo) process.stdout.write(text)
      const lines = pending[stream].split("\n"); pending[stream] = lines.pop()
      for (const line of lines) { try { onLine?.(line) } catch (cause) { error = cause; terminate() } }
    }
    child.stdout.on("data", data => consume(data, "stdout")); child.stderr.on("data", data => consume(data, "stderr"))
    child.on("error", cause => { clearTimeout(timer); clearTimeout(forced); clearTimeout(stopTimer); reject(cause) })
    child.on("close", code => {
      clearTimeout(timer); clearTimeout(forced); clearTimeout(stopTimer)
      for (const text of Object.values(pending)) if (text) { try { onLine?.(text) } catch (cause) { error = cause } }
      if (error) reject(error)
      else resolveRun({ code: timedOut ? 124 : code ?? 1, output, timedOut })
    })
  })
}
