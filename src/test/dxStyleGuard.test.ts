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

// DX-27: two more guards, found while building the packages.
//  1. The small files load after styles.css, so they win by order. `!important` would make them win over everything,
//     including each other and the reduced-motion rules, and could not be switched off one package at a time.
//  2. A hover card on a screen that can hover answers at once (S3, e2e/feel.spec.ts): no delay of any kind. Only the phone sheet
//     (inside `@media (hover: none)`) may time its own motion, and it still may not wait before it starts.
import fs from "node:fs"
import postcss, { type AtRule, type Container } from "postcss"

describe("design-upgrade style guard (DX-27)", () => {
  it("rejects !important in the small files, but not in styles.css", async () => {
    expect((await problems(".a { color: var(--ink) !important; }")).length).toBeGreaterThan(0)
    expect((await problems(".a { color: var(--ink); }")).length).toBe(0)
  })
  it("the real small files contain no !important", () => {
    const dir = path.join(root, "src/styles")
    const hits = fs.readdirSync(dir).filter(f => f.endsWith(".css") && /!important/.test(fs.readFileSync(path.join(dir, f), "utf8")))
    expect(hits).toEqual([])
  })
})

/** Declarations that put a delay on a .hover-card on a screen that hovers. `source` is CSS text. */
export function hoverCardDelays(source: string): string[] {
  const found: string[] = []
  const inPhoneOnly = (node: Container | undefined): boolean => {
    for (let n: Container | undefined = node; n && n.type !== "root"; n = n.parent as Container | undefined) {
      if (n.type === "atrule" && (n as AtRule).name === "media" && /hover:\s*none/.test((n as AtRule).params)) return true
    }
    return false
  }
  postcss.parse(source).walkRules(rule => {
    if (!/\.hover-card\b/.test(rule.selector) || inPhoneOnly(rule.parent as Container)) return
    rule.walkDecls(/^(transition-delay|animation-delay)$/, d => { if (!/^0m?s$/.test(d.value.trim())) found.push(`${rule.selector} { ${d.prop}: ${d.value} }`) })
    // The shorthand: a second time after the first one is a delay (var(--dur-*) counts as a time, 0s does not).
    rule.walkDecls(/^transition$/, d => {
      for (const part of d.value.split(/,(?![^(]*\))/)) {
        const times = part.trim().split(/\s+(?![^(]*\))/).filter(t => /^(-?[\d.]+m?s|var\(--dur-[a-z]+\))$/.test(t))
        if (times.length > 1 && !/^0m?s$/.test(times[1])) found.push(`${rule.selector} { transition: ${part.trim()} }`)
      }
    })
  })
  return found
}

describe("a hover card on a screen that hovers has no delay (DX-27)", () => {
  it("catches a delay, in either spelling", () => {
    expect(hoverCardDelays(".hover > .hover-card { transition-delay: 120ms; }").length).toBe(1)
    expect(hoverCardDelays(".hover:hover > .hover-card { transition: opacity var(--dur-fast) var(--ease-out) 80ms; }").length).toBe(1)
    expect(hoverCardDelays(".hover-card { animation-delay: var(--x); }").length).toBe(1)
  })
  it("lets a plain timed fade, a zero delay and the phone sheet through", () => {
    expect(hoverCardDelays(".hover > .hover-card { transition: opacity var(--dur-fast) var(--ease-out), visibility 0s; transition-delay: 0s; }")).toEqual([])
    expect(hoverCardDelays("@media (hover: none) { .hover > .hover-card { transition: transform var(--dur-base) var(--ease-out) 40ms; } }")).toEqual([])
  })
  it("none of the real files delays a hover card", () => {
    const dir = path.join(root, "src/styles")
    const all = fs.readdirSync(dir).filter(f => f.endsWith(".css")).flatMap(f => hoverCardDelays(fs.readFileSync(path.join(dir, f), "utf8")).map(h => `${f}: ${h}`))
    expect(all).toEqual([])
  })
})
