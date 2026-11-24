import type { ChecklistModule, ChecklistWhen, ChecklistWho, OnboardingChecklist } from "../data/types"
import { CHECKLIST_WHEN, MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_MODULES, MAX_ITEM_TITLE, MAX_MODULE_ITEMS, MAX_MODULE_TITLE, WHEN_LABEL, capText, collapse, isWhen, isWho } from "./checklist"

/**
 * Typed shorthand and pasted lists for the onboarding checklist editor (docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md Section 3).
 * Kept apart from src/lib/checklist.ts, which the store imports, so this parser loads with the lazy editor and stays out of the
 * entry bundle. Pure functions only; ids come from a caller-supplied `makeId`.
 */

/** Where pasted items go when no module was named before them. */
export const DEFAULT_PASTE_MODULE = "Checklist"

/** One pasted or typed item before it has an id or role columns. */
export interface PastedItem { title: string; when?: ChecklistWhen; who?: ChecklistWho }
export interface PastedModule { title: string; items: PastedItem[] }
export interface PastedList { modules: PastedModule[] }

/* ───────────── Typed shorthand and pasted lists ───────────── */

// Whole tokens only: "day 10" or "@newcomer" are not tokens. The leading space is kept in group 1 so removal keeps word gaps.
const WHO_TOKEN = /(^|\s)@(new|buddy|president|outgoing|predecessor)(?=\s|$)/gi
const WHEN_TOKEN = /(^|\s)(day\s+(?:1|3|30)|week\s+(?:1|2)|month\s+1)(?=\s|$)/gi
/** The run of tokens that ends a line ("… @buddy day 3"); a time is read only from here. */
const TRAILING_TOKENS = /(?:\s+(?:@(?:new|buddy|president|outgoing|predecessor)|day\s+(?:1|3|30)|week\s+(?:1|2)|month\s+1))+\s*$/i
const WHO_OF_TOKEN: Record<string, ChecklistWho> = { new: "new", buddy: "buddy", president: "president", outgoing: "outgoing", predecessor: "outgoing" }
const WHEN_OF_TOKEN: Record<string, ChecklistWhen> = { "day 1": "day1", "day 3": "day3", "day 30": "month1", "week 1": "week1", "week 2": "week2", "month 1": "month1" }

/** The one value the tokens agree on; undefined when there is none or they disagree (no guessing). */
function single<T>(text: string, token: RegExp, of: (match: string) => T): T | undefined {
  const values = [...new Set([...text.matchAll(token)].map(m => of(collapse(m[2]).toLowerCase())))]
  return values.length === 1 ? values[0] : undefined
}
const whenTokenIn = (text: string) => single(text, WHEN_TOKEN, t => WHEN_OF_TOKEN[t])
const whoTokenIn = (text: string) => single(text, WHO_TOKEN, t => WHO_OF_TOKEN[t])

/**
 * "Meet your buddy @buddy day 3" → title "Meet your buddy", who buddy, when Day 3. Recognized tokens are case-insensitive
 * whole words: @new @buddy @president @outgoing @predecessor, and day 1, day 3, week 1, week 2, month 1, day 30 (= Month 1).
 * A time counts only at the end of the line, after the title, so titles such as "Week 2 check-in" or "Day 30 review" stay whole;
 * an @ token counts anywhere because nobody writes "@buddy" by accident.
 * Tokens that disagree (day 1 … week 2) set nothing and stay in the title. When removing the tokens would leave no title,
 * the original text stays the title and nothing is set.
 */
export function parseShorthand(text: string): PastedItem {
  const original = collapse(text)
  const tail = TRAILING_TOKENS.exec(original)?.[0] ?? ""
  const head = original.slice(0, original.length - tail.length)
  // A time in the title part as well ("Call day 1 or week 2") is ambiguous: set nothing rather than guess.
  const headHasTime = [...head.matchAll(WHEN_TOKEN)].length > 0
  const when = headHasTime ? undefined : whenTokenIn(tail), who = whoTokenIn(original)
  let title = original
  if (when) title = head + tail.replace(WHEN_TOKEN, "$1")
  if (who) title = title.replace(WHO_TOKEN, "$1")
  title = collapse(title).replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, "")
  if (!title) return { title: original }
  return { title, ...(when ? { when } : {}), ...(who ? { who } : {}) }
}

/** A spreadsheet "Due" cell: a single when token ("Week 1", "Day 30") or a label ("No deadline"). Dates and anything else: none. */
function whenFromCell(cell: string): ChecklistWhen | undefined {
  const label = CHECKLIST_WHEN.find(w => WHEN_LABEL[w].toLowerCase() === collapse(cell).toLowerCase())
  return label ?? whenTokenIn(cell)
}

const OWNER_WORDS: [ChecklistWho, RegExp][] = [
  ["buddy", /\bbuddy\b/i],
  ["president", /\b(?:vice\s+)?president\b/i],
  ["outgoing", /\b(?:outgoing|predecessor|previous)\b/i],
]
/** A spreadsheet "Owner" cell: buddy, (vice) president, or outgoing/predecessor/previous. Anything else, or two of them, sets nothing. */
function whoFromCell(cell: string): ChecklistWho | undefined {
  const found = OWNER_WORDS.filter(([, word]) => word.test(cell)).map(([who]) => who)
  return found.length === 1 ? found[0] : undefined
}

const HEADER_NAMES = {
  item: ["checklist item", "item", "task", "title"],
  section: ["section", "module", "group"],
  owner: ["owner", "who", "responsible"],
  due: ["due", "when", "timing"],
} as const
type HeaderField = keyof typeof HEADER_NAMES
const normalHeader = (cell: string) => collapse(cell).toLowerCase().replace(/[:*]+$/, "")

/** Column index for each field. An exact header name wins over a longer one ("Due Date" for due), and a column is used once. */
function headerColumns(header: string[]): Partial<Record<HeaderField, number>> {
  const names = header.map(normalHeader), taken = new Set<number>(), out: Partial<Record<HeaderField, number>> = {}
  for (const field of Object.keys(HEADER_NAMES) as HeaderField[]) {
    const keys: readonly string[] = HEADER_NAMES[field]
    const free = (i: number) => !taken.has(i)
    let index = names.findIndex((n, i) => free(i) && keys.includes(n))
    if (index < 0) index = names.findIndex((n, i) => free(i) && keys.some(k => n.startsWith(`${k} `)))
    if (index >= 0) { out[field] = index; taken.add(index) }
  }
  return out
}

/** "0. Onboarding Confirmation" → "Onboarding Confirmation"; "1) Tools" → "Tools". */
const withoutNumber = (s: string) => collapse(s).replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
/** Strips list markers: -, *, •, ☐, [ ], 1., 1), 0.1 (repeatedly, so "- [ ] Item" works). A bare number such as "2026" stays. */
function withoutBullet(line: string): string {
  let out = line, prev = ""
  while (out !== prev) { prev = out; out = out.replace(/^(?:[-*•☐]|\[\s?\])\s*|^(?:\d+(?:\.\d+)+\.?|\d+[.)])\s+/, "").trim() }
  return out
}

function moduleList() {
  const modules: PastedModule[] = []
  const moduleFor = (title: string) => {
    let m = modules.find(x => x.title.toLowerCase() === title.toLowerCase())
    if (!m) { m = { title, items: [] }; modules.push(m) }
    return m
  }
  return { modules, moduleFor }
}

function parseSheet(rows: string[][], cols: Partial<Record<HeaderField, number>>, leading: string): PastedList {
  const { modules, moduleFor } = moduleList()
  const cell = (row: string[], i: number | undefined) => i === undefined ? "" : row[i] ?? ""
  let current: string | null = null
  for (const row of rows) {
    const item = collapse(cell(row, cols.item))
    if (!item) {
      // A section row: text in the first cell only (the SEO sheet's "0. Onboarding Confirmation").
      const title = withoutNumber(row[0] ?? "")
      if (title) { current = title; moduleFor(title) }
      continue
    }
    const section = withoutNumber(cell(row, cols.section))
    if (section) current = section
    const when = whenFromCell(cell(row, cols.due)), who = whoFromCell(cell(row, cols.owner))
    moduleFor(current ?? leading).items.push({ title: item, ...(when ? { when } : {}), ...(who ? { who } : {}) })
  }
  return { modules }
}

function parseLines(lines: string[], leading: string): PastedList {
  const { modules, moduleFor } = moduleList()
  let current: string | null = null
  for (const raw of lines) {
    const line = withoutBullet(collapse(raw))
    if (!line) continue
    if (line.endsWith(":")) {
      const title = collapse(line.slice(0, -1))
      if (title) { current = title; moduleFor(title) }
      continue
    }
    moduleFor(current ?? leading).items.push(parseShorthand(line))
  }
  return { modules }
}

/**
 * Pasted text to modules and items, without ids. Tab-separated text whose first row names an item column
 * (Item, Checklist Item, Task, Title) is read as a spreadsheet: columns by header name, section rows become modules.
 * Anything else is read as lines: "Name:" starts a module, list markers are stripped, each line goes through parseShorthand.
 * Absolute dates are never read. Items before any module go into `leading` ("Checklist"). Modules with the same name are merged.
 * The editor passes "" as `leading` for text pasted into an item's title, to tell those lines apart from a module named
 * "Checklist" (a module name read from the text is never empty).
 */
export function parsePastedList(text: string, leading = DEFAULT_PASTE_MODULE): PastedList {
  const lines = text.split(/\r?\n/)
  const first = lines.findIndex(l => l.trim())
  if (first < 0) return { modules: [] }
  if (lines[first].includes("\t")) {
    const split = (l: string) => l.split("\t").map(c => c.trim().replace(/^"([\s\S]*)"$/, "$1").trim())
    const cols = headerColumns(split(lines[first]))
    if (cols.item !== undefined) return parseSheet(lines.slice(first + 1).filter(l => l.trim()).map(split), cols, leading)
    return parseLines(lines.map(l => l.replace(/\t+/g, " ")), leading)
  }
  return parseLines(lines, leading)
}

/**
 * Append a parsed paste. A pasted module whose name matches an existing one (ignoring case) adds its items there;
 * other modules are new, with No deadline and New officer. New items go to everyone. Limits are respected: what does
 * not fit is left out. Ids come from `makeId`. `updatedOn` is carried over (empty for a new checklist): the store sets it on save.
 */
export function addPasted(c: OnboardingChecklist | null | undefined, parsed: PastedList, makeId: () => string): OnboardingChecklist {
  const modules: ChecklistModule[] = (c?.modules ?? []).map(m => ({ ...m, items: [...m.items] }))
  let total = modules.reduce((n, m) => n + m.items.length, 0)
  for (const pm of parsed.modules) {
    const title = capText(pm.title, MAX_MODULE_TITLE)
    if (!title) continue
    let target = modules.find(m => m.title.trim().toLowerCase() === title.toLowerCase())
    if (!target) {
      // A new module that could not hold any of its items is left out too; an empty pasted module is still added.
      if (modules.length >= MAX_CHECKLIST_MODULES || (total >= MAX_CHECKLIST_ITEMS && pm.items.length > 0)) continue
      target = { id: makeId(), title, when: "none", who: "new", items: [] }
      modules.push(target)
    }
    for (const pi of pm.items) {
      if (total >= MAX_CHECKLIST_ITEMS || target.items.length >= MAX_MODULE_ITEMS) break
      const itemTitle = capText(pi.title, MAX_ITEM_TITLE)
      if (!itemTitle) continue
      target.items.push({ id: makeId(), title: itemTitle, ...(isWhen(pi.when) ? { when: pi.when } : {}), ...(isWho(pi.who) ? { who: pi.who } : {}), everyone: true, roleIds: [], hiddenFor: [] })
      total++
    }
  }
  return { version: 1, modules, updatedOn: c?.updatedOn ?? "" }
}
