import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import postcss, { type Rule } from "postcss"
import selectorParser from "postcss-selector-parser"

// Batch 1 audit V4-V6: form controls on touch screens are >= 16px (no iPhone zoom on focus), their borders reach 3:1
// (WCAG 1.4.11) through --control-line while --line stays a quiet divider, and the text-field focus ring reaches 3:1.
const root = path.resolve(__dirname, "../..")
const stylesCss = fs.readFileSync(path.join(root, "src/styles.css"), "utf8")

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const srcFiles = walk(path.join(root, "src"))
const cssFiles = srcFiles.filter(f => f.endsWith(".css"))

// --- tokens and contrast ---------------------------------------------------------------------------------------------
function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}
const lightBlock = stylesCss.slice(stylesCss.indexOf(":root {"), stylesCss.indexOf("@media (prefers-color-scheme: dark)"))
const mediaDarkBlock = stylesCss.slice(stylesCss.indexOf(':root:not([data-theme="light"]) {'), stylesCss.indexOf(':root[data-theme="dark"] {'))
const forcedDarkBlock = stylesCss.slice(stylesCss.indexOf(':root[data-theme="dark"] {'), stylesCss.indexOf("/* stylelint-enable color-no-hex */"))
const light = tokens(lightBlock)
const themes = { light, "system dark": { ...light, ...tokens(mediaDarkBlock) }, "forced dark": { ...light, ...tokens(forcedDarkBlock) } }

function luminance(hex: string) {
  const h = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const BACKGROUNDS = ["bg", "surface", "surface-2", "lane"]

describe("form-control contrast tokens", () => {
  for (const [name, t] of Object.entries(themes)) {
    it(`--control-line reaches 3:1 on every background (${name})`, () => {
      expect(t["control-line"]).toMatch(/^#[0-9a-f]{6}$/i)
      for (const bg of BACKGROUNDS) expect(contrast(t["control-line"], t[bg]), `${name} --control-line on --${bg}`).toBeGreaterThanOrEqual(3)
    })
    it(`the focus ring's solid --accent ring reaches 3:1 on every background and on its halo (${name})`, () => {
      for (const bg of [...BACKGROUNDS, "accent-soft"]) expect(contrast(t.accent, t[bg]), `${name} --accent on --${bg}`).toBeGreaterThanOrEqual(3)
    })
  }
  it("keeps --line a quiet divider and gives both dark blocks the same --control-line", () => {
    expect(light.line).toBe("#e5e2da")
    expect(tokens(mediaDarkBlock)["control-line"]).toBe(tokens(forcedDarkBlock)["control-line"])
  })
  it("the shared text-field focus rule draws a solid accent ring, not only the soft halo", () => {
    expect(light["focus-ring"]).toMatch(/^0 0 0 1px var\(--accent\), /)
    const rule = stylesCss.split("\n").find(l => l.startsWith(':is(input:not([type="checkbox"], [type="radio"]), select, textarea):focus'))
    expect(rule).toContain("box-shadow: var(--focus-ring)")
  })
})

// --- which rules style a form control ----------------------------------------------------------------------------------
// Classes written on <input>, <select> or <textarea> in the app, so `.ch-note` counts as a control as well as `.field input`.
const controlClasses = new Set<string>()
for (const f of srcFiles.filter(p => p.endsWith(".tsx") && !p.includes(`${path.sep}test${path.sep}`))) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/<(?:input|select|textarea)\b([^>]*?)>/gs)) {
    const c = m[1].match(/className=(?:"([^"]+)"|\{`([^`]+)`\}|\{"([^"]+)"\})/)
    for (const name of (c?.[1] ?? c?.[2] ?? c?.[3] ?? "").replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) if (/^[\w-]+$/.test(name)) controlClasses.add(name)
  }
}
function lastCompoundIsControl(selector: string) {
  let hit = false
  selectorParser(sel => {
    const nodes = sel.first.nodes
    let i = nodes.length - 1
    while (i >= 0 && nodes[i].type !== "combinator") i--
    for (const n of nodes.slice(i + 1)) {
      const check = (node: selectorParser.Node) => {
        if (node.type === "tag" && ["input", "select", "textarea"].includes(node.value)) hit = true
        if (node.type === "class" && controlClasses.has(node.value)) hit = true
      }
      check(n)
      if (n.type === "pseudo" && (n.value === ":is" || n.value === ":where")) n.walk(check)
    }
  }).processSync(selector)
  return hit
}
type Spec = [number, number, number]
const add = (a: Spec, b: Spec): Spec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const cmp = (a: Spec, b: Spec) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
function specOf(nodes: selectorParser.Node[]): Spec {
  let s: Spec = [0, 0, 0]
  for (const n of nodes) {
    if (n.type === "id") s = add(s, [1, 0, 0])
    else if (n.type === "class" || n.type === "attribute") s = add(s, [0, 1, 0])
    else if (n.type === "tag") s = add(s, [0, 0, 1])
    else if (n.type === "pseudo") {
      if (n.value === ":where") continue
      if ([":is", ":not", ":has"].includes(n.value)) {
        const args = (n as selectorParser.Pseudo).nodes.map(arg => specOf(arg.nodes))
        s = add(s, args.sort(cmp).at(-1) ?? [0, 0, 0])
      } else if (n.value.startsWith("::")) s = add(s, [0, 0, 1])
      else s = add(s, [0, 1, 0])
    }
  }
  return s
}
const specificity = (selector: string) => {
  let s: Spec = [0, 0, 0]
  selectorParser(sel => { s = specOf(sel.first.nodes) }).processSync(selector)
  return s
}
function insideMedia(rule: Rule, query: string) {
  for (let p = rule.parent as postcss.Node | undefined; p; p = p.parent as postcss.Node | undefined) if (p.type === "atrule" && (p as postcss.AtRule).params === query) return true
  return false
}

describe("form controls on touch screens", () => {
  it("defines a 16px input size", () => {
    expect(light["fs-input"]).toBe("16px")
  })
  it("a pointer: coarse rule beats every rule that gives a text field less than 16px", () => {
    const ast = postcss.parse(stylesCss)
    let guard: Rule | undefined
    ast.walkRules(r => {
      if (insideMedia(r, "(pointer: coarse)") && r.nodes.some(d => d.type === "decl" && d.prop === "font-size" && d.value === "var(--fs-input)")) guard = r
    })
    expect(guard, "coarse-pointer font-size rule").toBeDefined()
    const guardSpec = specificity(guard!.selector)
    const small = /^var\(--fs-(xs|sm|md|base)\)$|^inherit$/
    const losers: string[] = []
    let checked = 0
    for (const f of cssFiles) {
      postcss.parse(fs.readFileSync(f, "utf8")).walkRules(r => {
        if (r === guard || r.selector.startsWith("@")) return
        const sizes = r.nodes.filter(d => d.type === "decl" && (d.prop === "font-size" || d.prop === "font")) as postcss.Declaration[]
        if (!sizes.some(d => small.test(d.value) || /^inherit$/.test(d.value))) return
        for (const sel of r.selectors) {
          if (!lastCompoundIsControl(sel) || /\bbutton\b|::?(placeholder|before|after)/.test(sel)) continue
          checked++
          if (cmp(specificity(sel), guardSpec) >= 0) losers.push(`${path.relative(root, f)}: ${sel}`)
        }
      })
    }
    // CT-01 (DESIGN_TOKENS §12) moved field size and chrome into one zero-specificity base rule, so far fewer page rules
    // set a font size on a field than before; the scan must still see the base rule and the page rules that remain.
    expect(checked).toBeGreaterThan(10)
    expect(losers).toEqual([])
  })
})

describe("form-control borders", () => {
  it("no rule that styles only form controls draws its border with --line", () => {
    const offenders: string[] = []
    let controlBorders = 0
    for (const f of cssFiles) {
      postcss.parse(fs.readFileSync(f, "utf8")).walkDecls(d => {
        if (!/^border/.test(d.prop) || d.parent?.type !== "rule") return
        const rule = d.parent as Rule
        if (!rule.selectors.every(lastCompoundIsControl)) return
        if (/var\(--control-line\)/.test(d.value)) controlBorders++
        if (/var\(--line\)/.test(d.value)) offenders.push(`${path.relative(root, f)}:${d.source?.start?.line} ${rule.selector}`)
      })
    }
    // CT-01: one base rule draws every field border with --control-line; the remaining hits are composite wrappers.
    expect(controlBorders).toBeGreaterThan(6)
    expect(offenders).toEqual([])
  })
  it("Settings > Roles & teams inline cells show a border on hover and an inner accent ring on focus", () => {
    expect(stylesCss).toContain(".tbl.roles-table :is(input, select):hover { border-color: var(--control-line);")
    expect(stylesCss).toContain(".tbl.roles-table :is(input, select):focus { box-shadow: inset 0 0 0 2px var(--accent); }")
    expect(stylesCss).not.toMatch(/\.tbl\.roles-table :is\(input, select\) \{[^}]*border: 0;/)
  })
})
