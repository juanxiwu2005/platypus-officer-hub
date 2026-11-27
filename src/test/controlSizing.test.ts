import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import postcss from "postcss"
import selectorParser from "postcss-selector-parser"

// DESIGN_TOKENS §12: every button, text field and select takes its height, inline padding, radius and line-height from
// the shared control tokens (--control-h, --control-px, --field-px, --control-r). A page sets the tier on a container;
// it never gives one control its own padding, height or radius. This guard walks every stylesheet under src/ and fails
// on a rule that sizes a control by hand, so one-off sizes cannot come back one screen at a time.
const root = path.resolve(__dirname, "../..")
const stylesCss = fs.readFileSync(path.join(root, "src/styles.css"), "utf8")

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (p.endsWith(".css")) out.push(p)
  }
  return out
}
const cssFiles = walk(path.join(root, "src")).filter(f => !f.includes(`${path.sep}archive${path.sep}`))

const FIELDS = new Set(["input", "select", "textarea"])
// Checkboxes, radios, switches and the like are not text controls: they keep their own size.
const NOT_TEXT = /type="?(checkbox|radio|range|color|file)/
const SIZE = /^(padding(-[a-z-]+)?|height|min-height|border-radius|line-height)$/

/** What kind of control the rule's rightmost compound targets, or null when it targets none. */
function controlKind(selector: string): string | null {
  let kind: string | null = null
  selectorParser(selectors => {
    selectors.each(sequence => {
      const nodes: selectorParser.Node[] = []
      sequence.each(node => { nodes.push(node) })
      const compound: selectorParser.Node[] = []
      for (let i = nodes.length - 1; i >= 0 && nodes[i].type !== "combinator"; i--) compound.push(nodes[i])
      // `:not([type=checkbox])` narrows to text fields, so it is removed before looking for a non-text type.
      const text = compound.map(String).join("").replace(/:not\([^)]*\)/g, "")
      if (NOT_TEXT.test(text)) return
      for (const node of compound) {
        if (node.type === "tag" && FIELDS.has(node.value)) kind = kind ?? node.value
        else if (node.type === "class" && node.value === "btn") kind = kind ?? "btn"
        else if (node.type === "pseudo" && /^:(is|where)$/.test(node.value) && /\b(input|select|textarea)\b/.test(String(node))) kind = kind ?? "field"
      }
    })
  }).processSync(selector)
  return kind
}

/** Rules that may size a control by hand, each with the reason. Keyed by file and the rule's selector. */
const ALLOWED: Record<string, string> = {
  "src/styles.css|.btn": "the base button rule itself: its line-height centres one line of label in the tier height",
  "src/styles.css|.switch input": "a toggle switch, drawn as a track and knob",
  "src/styles.css|.switch input::after": "the knob of a toggle switch",
  "src/styles.css|.check-label input": "a checkbox",
  "src/styles.css|.command textarea": "the Ask composer: a multi-line message box, not a form field",
  "src/styles.css|.ask-form textarea": "the Ask composer: a multi-line message box, not a form field",
  "src/styles.css|.owner-picker input": "the inner field of a composite picker; its wrapper takes the field size",
  "src/styles/ch-01-cheers.css|.ch-field select": "the inner menu of a composite field; its wrapper takes the field size",
  "src/styles/ck-01-onboarding-matrix.css|.tbl.ck-table :is(textarea.ck-title, textarea.ck-name)": "an editor inside a matrix cell, sized by the cell",
  "src/styles/ck-01-onboarding-matrix.css|.tbl.ck-table :is(textarea.ck-title, textarea.ck-name):hover": "an editor inside a matrix cell, sized by the cell",
  "src/styles/ck-01-onboarding-matrix.css|.tbl.ck-table :is(textarea.ck-title, textarea.ck-name):focus-visible": "an editor inside a matrix cell, sized by the cell",
  "src/styles/ck-01-onboarding-matrix.css|.tbl.ck-table select.ck-select": "an invisible menu laid over a status chip; the chip is what shows",
  "src/styles/ob-07-member-invitation.css|.ob-m-opt input": "a radio inside a whole-row option",
  "src/styles/ob-07-member-invitation.css|.ob-m-seg input": "an invisible radio over a segment",
  "src/styles/dx-04-touch-targets.css|:is(select, input:not([type=\"checkbox\"], [type=\"radio\"], [type=\"range\"], [type=\"color\"]))": "DX-04 touch floor for fields (agrees with the medium tier on touch)",
  "src/styles/dx-04-touch-targets.css|:is(.tbl, .mini-card, .crm-card, .task-card, .menu, .m-menu) :is(.btn, .chip, select)": "DX-04 touch floor for dense rows (agrees with the small tier on touch)",
  "src/components/workflowLibrary/workflowLibrary.css|.wfl-bar .wfl-name input": "the workflow title, edited in place at heading size",
  "src/taskDetails/detail.css|.task-target-form .task-target-person input": "a checkbox",
}

/** A value that only reads the tier tokens is how a control is meant to be sized. */
const usesTier = (value: string) => /var\(--(control-|field-px)/.test(value)

type Finding = { key: string; at: string; decls: string[] }
function findings(): Finding[] {
  const out: Finding[] = []
  for (const file of cssFiles) {
    const rel = path.relative(root, file).split(path.sep).join("/")
    postcss.parse(fs.readFileSync(file, "utf8")).walkRules(rule => {
      if (rule.selector.startsWith(":where(")) return   // the shared base rules (zero specificity)
      const kind = controlKind(rule.selector)
      if (!kind) return
      const decls: string[] = []
      rule.walkDecls(d => {
        if (SIZE.test(d.prop) && !usesTier(d.value) && !(kind === "textarea" && d.prop === "min-height")) decls.push(`${d.prop}: ${d.value}`)
        // The background shorthand would wipe the drawn select chevron; set background-color instead.
        if ((kind === "select" || kind === "field") && d.prop === "background") decls.push(`background: ${d.value}`)
      })
      if (decls.length) out.push({ key: `${rel}|${rule.selector.replace(/\s+/g, " ")}`, at: `${rel}:${rule.source?.start?.line}`, decls })
    })
  }
  return out
}

describe("control sizing (DESIGN_TOKENS §12)", () => {
  it("defines the three tiers and the shared control tokens", () => {
    for (const token of ["control-h-sm", "control-h-md", "control-h-lg", "control-h", "control-px", "field-px", "control-r", "control-gap"]) {
      expect(stylesCss, `--${token}`).toMatch(new RegExp(`--${token}:`))
    }
    expect(stylesCss).toMatch(/--control-h-sm: 28px;\s+--control-h-md: 36px;\s+--control-h-lg: 44px;/)
    expect(stylesCss).toMatch(/@media \(pointer: coarse\) \{\s*:root \{ --control-h-sm: 32px; --control-h-md: 44px; \}\s*\}/)
  })
  it("draws selects itself, because Safari and macOS Chrome ignore height and padding on a native menu", () => {
    expect(stylesCss).toMatch(/:where\(select\) \{\s*appearance: none;/)
  })
  it("gives buttons and fields the same height and radius from the tier", () => {
    expect(stylesCss).toMatch(/\.btn \{[^}]*min-height: var\(--control-h\);[^}]*border-radius: var\(--control-r\);/)
    expect(stylesCss).toMatch(/:where\(input:not\([^{]*\{[^}]*min-height: var\(--control-h\);[^}]*border-radius: var\(--control-r\);/)
  })
  it("no stylesheet sizes a button, field or select by hand outside the allowlist", () => {
    const bad = findings().filter(f => !(f.key in ALLOWED)).map(f => `${f.at} ${f.key.split("|")[1]} { ${f.decls.join("; ")} }`)
    expect(bad, "Set the tier on a container (.ctl-sm / .ctl-lg or the tier tokens) instead of sizing one control").toEqual([])
  })
  it("every allowlist entry still matches a rule, so the list cannot go stale", () => {
    const keys = new Set(findings().map(f => f.key))
    expect(Object.keys(ALLOWED).filter(k => !keys.has(k))).toEqual([])
  })
})
