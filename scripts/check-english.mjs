import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, readlinkSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

// This guard detects selected non-Latin scripts; prose still needs English-language review.
const nonEnglishScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}]/u

export function readTrackedText(path) {
  let status
  try { status = lstatSync(path) } catch (error) { if (error.code === "ENOENT") return null; throw error }
  // Gitlinks are directories. Inspect a symlink's literal target without following it.
  if (status.isDirectory()) return null
  const bytes = status.isSymbolicLink() ? Buffer.from(readlinkSync(path)) : readFileSync(path)
  return bytes.includes(0) ? null : bytes.toString("utf8")
}

export function checkText(path, text, exceptions = []) {
  const remaining = exceptions.filter(item => item.path === path).map(item => ({ ...item, used: 0 }))
  const failures = []
  text.split(/\r?\n/).forEach((line, index) => {
    if (!nonEnglishScript.test(line)) return
    const exception = remaining.find(item => item.line === line && item.used < item.count)
    if (exception) exception.used += 1
    else failures.push(`${path}:${index + 1}: use English; functional multilingual data requires a reviewed exact-line exception`)
  })
  for (const item of remaining) {
    if (item.used !== item.count) failures.push(`${path}: stale or invalid multilingual exception; expected ${item.count} occurrence(s), found ${item.used}`)
  }
  return failures
}

export function checkEvent(event) {
  const fields = []
  for (const kind of ["pull_request", "issue", "comment", "review", "discussion"]) {
    const object = event[kind]
    if (!object) continue
    for (const field of ["title", "body"]) {
      if (typeof object[field] === "string") fields.push([`${kind}.${field}`, object[field]])
    }
  }
  return fields.flatMap(([name, value]) => checkText(name, value))
}

function main() {
  if (process.argv.includes("--event")) {
    if (!process.env.GITHUB_EVENT_PATH) throw new Error("GITHUB_EVENT_PATH is required for --event")
    const failures = checkEvent(JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")))
    if (failures.length) {
      console.error(failures.join("\n"))
      process.exitCode = 1
    } else console.log("GitHub text passed the English script check. Review Latin-script prose manually.")
    return
  }
  const exceptions = JSON.parse(readFileSync("scripts/english-exceptions.json", "utf8"))
  for (const item of exceptions) {
    if (typeof item.path !== "string" || typeof item.line !== "string" || typeof item.reason !== "string" || !item.reason.trim() || !Number.isInteger(item.count) || item.count < 1) {
      throw new Error("Each multilingual exception needs a path, exact line, English reason, and positive occurrence count")
    }
  }
  const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
  const failures = []
  const seen = new Set()
  for (const path of paths) {
    const value = readTrackedText(path)
    if (value === null) continue
    seen.add(path)
    failures.push(...checkText(path, value, exceptions))
  }
  for (const item of exceptions) if (!seen.has(item.path)) failures.push(`${item.path}: exception references a missing or binary file`)
  if (failures.length) {
    console.error(failures.join("\n"))
    process.exitCode = 1
  } else console.log(`English script check passed for ${seen.size} tracked text files; ${exceptions.length} exact functional-data exceptions. Review prose and image text manually.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
