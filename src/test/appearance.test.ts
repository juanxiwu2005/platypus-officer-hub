import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import postcss, { type AtRule, type Rule } from "postcss"
import { APPEARANCE_KEY, applyAppearance, readAppearance, resolveTheme, saveAppearance } from "../lib/appearance"

// Settings → My preferences → Appearance (docs/DESIGN_TOKENS.md section 14): the stored choice, the pre-paint script in
// index.html, and the CSS rule that every dark rule exists twice (system dark and forced dark) so the choice wins both ways.
const root = path.resolve(__dirname, "../..")
const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
const head = html.match(/<head>([\s\S]*?)<\/head>/)![1]
const inline = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])
const runPrePaint = () => new Function(inline[0])()

/** A fresh <head> from index.html without its scripts, and no data-theme. */
function resetDocument() {
  document.head.innerHTML = head.replace(/<script>[\s\S]*?<\/script>/g, "")
  delete document.documentElement.dataset.theme
}
const metaState = () => ({
  theme: document.documentElement.dataset.theme,
  scheme: document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content,
  media: [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(m => m.getAttribute("media")),
})
const SYSTEM = { theme: undefined, scheme: "light dark", media: ["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"] }

beforeEach(() => { localStorage.clear(); resetDocument() })
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); resetDocument() })

describe("appearance preference", () => {
  it("defaults to Follow system when nothing, or something unknown, is stored", () => {
    expect(readAppearance()).toBe("system")
    localStorage.setItem(APPEARANCE_KEY, "sepia")
    expect(readAppearance()).toBe("system")
  })
  it("saves light and dark under its own key and stores nothing for Follow system", () => {
    expect(saveAppearance("light")).toBe(true)
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe("light")
    expect(readAppearance()).toBe("light")
    saveAppearance("dark")
    expect(readAppearance()).toBe("dark")
    saveAppearance("system")
    expect(localStorage.getItem(APPEARANCE_KEY)).toBeNull()
    expect(readAppearance()).toBe("system")
    expect(APPEARANCE_KEY).not.toBe("platypus.v1.demo")
  })
  it("survives broken or missing storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked") })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked") })
    expect(readAppearance()).toBe("system")
    expect(saveAppearance("dark")).toBe(false)
    expect(readAppearance(null)).toBe("system")
    expect(saveAppearance("light", null)).toBe(false)
  })
  it("resolves the theme that shows", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
    expect(resolveTheme("light", true)).toBe("light")
    expect(resolveTheme("dark", false)).toBe("dark")
  })
  it("applies at once and Follow system hands everything back to the media queries", () => {
    applyAppearance("dark")
    expect(metaState()).toEqual({ theme: "dark", scheme: "dark", media: ["not all", "all"] })
    applyAppearance("light")
    expect(metaState()).toEqual({ theme: "light", scheme: "light", media: ["all", "not all"] })
    applyAppearance("system")
    expect(metaState()).toEqual(SYSTEM)
  })
})

describe("index.html pre-paint script", () => {
  it("is one small classic inline script in <head>, before the app's module script", () => {
    expect(inline).toHaveLength(1)
    expect(inline[0]).toContain(APPEARANCE_KEY)
    expect(inline[0].length).toBeLessThan(400)
    expect(html.indexOf(inline[0])).toBeLessThan(html.indexOf('<script type="module"'))
    expect(head).toMatch(/<meta name="theme-color" [^>]*data-scheme="light"/)
    expect(head).toMatch(/<meta name="theme-color" [^>]*data-scheme="dark"/)
  })
  it("leaves Follow system (nothing stored, or an unknown value) untouched", () => {
    runPrePaint()
    expect(metaState()).toEqual(SYSTEM)
    localStorage.setItem(APPEARANCE_KEY, "system")
    runPrePaint()
    expect(metaState()).toEqual(SYSTEM)
  })
  for (const theme of ["light", "dark"] as const) {
    it(`sets ${theme} before paint exactly as the Settings control does`, () => {
      localStorage.setItem(APPEARANCE_KEY, theme)
      runPrePaint()
      const fromScript = metaState()
      resetDocument()
      applyAppearance(theme)
      expect(fromScript).toEqual(metaState())
      expect(fromScript.theme).toBe(theme)
    })
  }
  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked") })
    expect(runPrePaint).not.toThrow()
    expect(metaState()).toEqual(SYSTEM)
  })
})

// --- every themed rule follows data-theme both ways -------------------------------------------------------------------
type Scheme = "light" | "dark"
const other = (s: Scheme): Scheme => (s === "dark" ? "light" : "dark")
const decls = (rule: Rule) => rule.nodes.filter(n => n.type === "decl").map(n => `${n.prop}:${n.value}`).sort()

/**
 * Each `@media (prefers-color-scheme: X)` rule must be guarded by `:root:not([data-theme="Y"])` (so the opposite fixed
 * choice turns it off) and must have a top-level `:root[data-theme="X"]` twin with the same declarations (so the fixed
 * choice turns it on whatever the OS says). Returns the problems found.
 */
function themeTwinProblems(css: string, file = "sample.css"): string[] {
  const ast = postcss.parse(css)
  const problems: string[] = []
  const topLevel = new Map<string, Rule[]>()
  ast.each(node => { if (node.type === "rule") topLevel.set(node.selector, [...(topLevel.get(node.selector) ?? []), node]) })
  ast.walkAtRules("media", (media: AtRule) => {
    const scheme = media.params.match(/prefers-color-scheme:\s*(light|dark)/)?.[1] as Scheme | undefined
    if (!scheme) return
    const guard = `:root:not([data-theme="${other(scheme)}"])`
    media.walkRules(rule => {
      for (const selector of rule.selectors) {
        if (!selector.startsWith(guard)) { problems.push(`${file}: "${selector}" in a ${scheme} media block is not guarded by ${guard}`); continue }
        const twin = `:root[data-theme="${scheme}"]${selector.slice(guard.length)}`
        const match = (topLevel.get(twin) ?? []).some(t => JSON.stringify(decls(t)) === JSON.stringify(decls(rule)))
        if (!match) problems.push(`${file}: "${selector}" has no ${twin} twin with the same declarations`)
      }
    })
  })
  return problems
}

function walk(dir: string, keep: RegExp, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, keep, out)
    else if (keep.test(p)) out.push(p)
  }
  return out
}

describe("themed CSS follows data-theme", () => {
  const files = walk(path.join(root, "src"), /\.css$/)
  it("every prefers-color-scheme rule is guarded and has a forced twin", () => {
    const withMedia = files.filter(f => /prefers-color-scheme/.test(fs.readFileSync(f, "utf8")))
    expect(withMedia.length).toBeGreaterThan(0)
    expect(withMedia.flatMap(f => themeTwinProblems(fs.readFileSync(f, "utf8"), path.relative(root, f)))).toEqual([])
  })
  it("would notice an unguarded block, a missing twin and a twin that drifted", () => {
    expect(themeTwinProblems(`@media (prefers-color-scheme: dark) { :root { --bg: black; } }`)).toHaveLength(1)
    expect(themeTwinProblems(`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .x { color: var(--ink); } }`)).toHaveLength(1)
    expect(themeTwinProblems(`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --a: 1; --b: 2; } } :root[data-theme="dark"] { --a: 1; }`)).toHaveLength(1)
    expect(themeTwinProblems(`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --a: 1; } } :root[data-theme="dark"] { --a: 1; }`)).toEqual([])
  })
  it("no script reads the OS colour scheme on its own (it would ignore the setting)", () => {
    const scripts = walk(path.join(root, "src"), /\.tsx?$/).filter(f => !/\.test\.tsx?$/.test(f))
    const readers = scripts.filter(f => /prefers-color-scheme/.test(fs.readFileSync(f, "utf8"))).map(f => path.relative(root, f))
    expect(readers).toEqual(["src/lib/appearance.ts"])
  })
})
