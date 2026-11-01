import { describe, expect, it } from "vitest"
import path from "node:path"
import stylelint from "stylelint"

// DX-01: the rules for the small design-upgrade style files (src/styles/dx-NN-*.css). They are written as
// negative tests too: a guard nobody has seen go red is not a guard.
const root = path.resolve(__dirname, "../..")
async function problems(code: string, file = "src/styles/dx-03-press-feedback.css") {
  const result = await stylelint.lint({ code, codeFilename: path.join(root, file), configFile: path.join(root, ".stylelintrc.json") })
  return result.results[0].warnings.map(w => w.text)
}

describe("design-upgrade style guard", () => {
  it("accepts a transition that uses tokens and moves only transform and opacity", async () => {
    expect(await problems(".a { transition: transform var(--dur-press) var(--ease-out), opacity var(--dur-fast) var(--ease-out); }")).toEqual([])
    expect(await problems(".a { transition-duration: var(--dur-base); animation-delay: 0s; }")).toEqual([])
  })
  it("rejects transition: all", async () => {
    expect((await problems(".a { transition: all var(--dur-fast); }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition-property: all; }")).length).toBeGreaterThan(0)
  })
  it("rejects a raw time", async () => {
    expect((await problems(".a { transition: opacity 150ms; }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition: opacity .2s var(--ease-out); }")).length).toBeGreaterThan(0)
    expect((await problems(".a { animation-duration: 300ms; }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition-delay: 40ms; }")).length).toBeGreaterThan(0)
  })
  it("rejects animating a layout property", async () => {
    expect((await problems(".a { transition: left var(--dur-fast); }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition: opacity var(--dur-fast), width var(--dur-fast); }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition-property: height; }")).length).toBeGreaterThan(0)
  })
  it("still rejects a hex colour", async () => {
    expect((await problems(".a { color: #fff; }")).length).toBeGreaterThan(0)
  })
  it("lets the tokens file hold raw times", async () => {
    expect(await problems(":root { --dur-fast: 150ms; }", "src/styles/dx-00-tokens.css")).toEqual([])
  })
})
