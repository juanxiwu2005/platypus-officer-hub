import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import postcss, { type Rule } from "postcss"
import { PLAN_PAGES } from "../routes"

// DESIGN_TOKENS §15: a page's frame (its title, its second-level navigation and the start of its content) never depends on
// which tab is open or how wide that tab's content is. The browser check is e2e/stable-page-frame.spec.ts; this cheap guard
// stops the two CSS patterns that caused the jumps from coming back: a page column whose width or anchor is chosen by what
// is inside it (`main:has(.wide-thing)`), and a chosen tab whose text turns bold in a row of tabs (bold is wider).
const root = path.resolve(__dirname, "../..")
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (p.endsWith(".css")) out.push(p)
  }
  return out
}
const cssFiles = walk(path.join(root, "src")).filter(f => !f.includes(`${path.sep}archive${path.sep}`))
const rules: { file: string; rule: Rule }[] = []
for (const file of cssFiles) postcss.parse(fs.readFileSync(file, "utf8")).walkRules(rule => { rules.push({ file: path.relative(root, file), rule }) })
const decls = (rule: Rule) => { const out: Record<string, string> = {}; rule.walkDecls(d => { out[d.prop] = d.value }); return out }
const selectors = (rule: Rule) => rule.selectors.map(s => s.trim())
/** The rightmost compound of a selector, with every (...) removed first (innermost out), so `main:has(> .wide)` is `main:has`. */
function subjectOf(sel: string): string {
  let flat = sel
  while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, "")
  return flat.split(/\s*[>+~\s]\s*/).pop() ?? ""
}

const FRAME = /^(width|max-width|min-width|justify-self|margin|margin-inline|margin-left|margin-right|grid-template-columns)$/

describe("stable page frame (DESIGN_TOKENS §15)", () => {
  it("sizes and places the page column in exactly two rules, neither of which looks at the page's content", () => {
    const found: string[] = []
    for (const { file, rule } of rules) {
      for (const sel of selectors(rule)) {
        // The rightmost compound targets <main> (main, main.x, main:has(...), .shell > main).
        if (!/^main(?![\w-])/.test(subjectOf(sel))) continue
        const frameProps = Object.keys(decls(rule)).filter(p => FRAME.test(p))
        if (frameProps.length) found.push(`${file}|${sel}|${frameProps.sort().join(",")}`)
      }
    }
    expect(found).toEqual([
      "src/styles.css|main|justify-self,max-width,min-width,width",
      "src/styles.css|.shell:not(.single) > main|justify-self,max-width",
    ])
    const shell = rules.find(r => r.rule.selector === ".shell:not(.single) > main")!
    expect(decls(shell.rule)).toMatchObject({ "max-width": "var(--page-max)", "justify-self": "start" })
  })

  it("never lets content choose the width of the Settings or Events frame", () => {
    const bad: string[] = []
    for (const { file, rule } of rules) {
      for (const sel of selectors(rule)) {
        if (!sel.includes(":has(")) continue
        if (!/^(main|\.settings|\.settings-nav|\.settings-body|\.events-layout|\.event-nav)(?![\w-])/.test(subjectOf(sel))) continue
        const frameProps = Object.keys(decls(rule)).filter(p => FRAME.test(p))
        if (frameProps.length) bad.push(`${file}|${sel}|${frameProps.join(",")}`)
      }
    }
    expect(bad).toEqual([])
  })

  it("keeps the chosen tab of a row of tabs at the same weight, so the tabs after it never move", () => {
    const CHOSEN = [/\.seg button\[aria-pressed="true"\]$/, /\.plan-switch a\[aria-current="page"\]$/, /\.pb-cats button\[aria-pressed="true"\]$/]
    const bold: string[] = []
    for (const { file, rule } of rules) {
      for (const sel of selectors(rule)) {
        if (!CHOSEN.some(re => re.test(sel))) continue
        const weight = decls(rule)["font-weight"]
        if (weight !== undefined && !/^(400|normal|inherit)$/.test(weight)) bold.push(`${file}|${sel}|${weight}`)
      }
    }
    expect(bold).toEqual([])
  })

  it("reserves the width of the longest Plan title, so the Events | Tasks switch stays put", () => {
    const reserve = rules.find(r => r.rule.selector === ".page-title:has(> .plan-switch) > h1::after")
    expect(reserve, "the rule that reserves the title width").toBeDefined()
    const longest = [...PLAN_PAGES].sort((a, b) => b.label.length - a.label.length)[0].label
    expect(decls(reserve!.rule)).toMatchObject({ content: `"${longest}"`, visibility: "hidden", height: "0" })
  })
})

