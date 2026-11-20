import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkEvent, checkText, readTrackedText } from "./check-english.mjs"

test("accepts English with punctuation, symbols, and international names", () => {
  assert.deepEqual(checkText("docs/example.md", "Review café settings → save. Owner: José; budget: $25."), [])
})

test("rejects non-English script in prose and code comments with line numbers", () => {
  for (const text of ["\u6ce8\u91ca", "\u30e1\u30e2", "\uba54\ubaa8", "\u043f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435", "\u0645\u0644\u0627\u062d\u0638\u0629", "\u05d4\u05e2\u05e8\u05d4"]) {
    assert.match(checkText("src/example.ts", `// English\n// ${text}`)[0], /src\/example\.ts:2:/)
  }
})

test("an exception permits only the exact functional line and occurrence count", () => {
  const line = 'const input = "\u4efb\u52a1"'
  const exceptions = [{ path: "src/input.test.ts", line, count: 1, reason: "Multilingual parser input." }]
  assert.deepEqual(checkText("src/input.test.ts", line, exceptions), [])
  assert.equal(checkText("src/input.test.ts", `${line}\n// \u4efb\u52a1`, exceptions).length, 1)
  assert.equal(checkText("src/input.test.ts", `${line}\n${line}`, exceptions).length, 1)
  assert.equal(checkText("src/other.ts", line, exceptions).length, 1)
  assert.match(checkText("src/input.test.ts", "", exceptions)[0], /stale/)
})

test("checks GitHub issue, PR, review, and comment text without executing it", () => {
  assert.deepEqual(checkEvent({ pull_request: { title: "Fix tasks", body: "$(echo literal) `literal`" } }), [])
  for (const key of ["pull_request", "issue", "comment", "review", "discussion"]) {
    assert.match(checkEvent({ [key]: { body: "\u5907\u6ce8" } })[0], new RegExp(`${key}\\.body:1:`))
  }
})


test("reads tracked text while skipping binary/gitlink directories and not following symlinks", () => {
  const root = mkdtempSync(join(tmpdir(), "platypus-english-"))
  try {
    writeFileSync(join(root, "note.md"), "English text")
    writeFileSync(join(root, "image.bin"), Buffer.from([1, 0, 2]))
    mkdirSync(join(root, "module"))
    symlinkSync("missing-target", join(root, "link"))
    assert.equal(readTrackedText(join(root, "note.md")), "English text")
    assert.equal(readTrackedText(join(root, "image.bin")), null)
    assert.equal(readTrackedText(join(root, "module")), null)
    assert.equal(readTrackedText(join(root, "link")), "missing-target")
    assert.equal(readTrackedText(join(root, "absent")), null)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
