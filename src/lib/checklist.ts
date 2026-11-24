import type { ChecklistItem, ChecklistModule, ChecklistWhen, OnboardingChecklist } from "../data/types"
import { nextCounter } from "./ids"

/**
 * The onboarding checklist matrix (Settings → Onboarding, option C; docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md).
 * Pure functions only: no React and no store, so the editor, the store and the tests share one definition.
 * The store imports this file, so it ships in the entry bundle: the paste and shorthand parser lives in
 * src/lib/checklistParse.ts, which only the lazy editor imports.
 * "When" values are relative labels, never dates: only the rule engine turns them into deadlines, in a later package.
 * Template v2 (contract Section 8): "who does it" is gone, and a role either gets an item or does not (two states).
 */

/** Every "when" value, in the order the editor lists them. */
export const CHECKLIST_WHEN: readonly ChecklistWhen[] = ["day1", "day3", "week1", "week2", "month1", "none"]
export const WHEN_LABEL: Readonly<Record<ChecklistWhen, string>> = { day1: "Day 1", day3: "Day 3", week1: "Week 1", week2: "Week 2", month1: "Month 1", none: "No deadline" }

export const MAX_CHECKLIST_MODULES = 20
export const MAX_MODULE_ITEMS = 60
export const MAX_CHECKLIST_ITEMS = 300
export const MAX_ITEM_TITLE = 120
export const MAX_MODULE_TITLE = 60
/** Keeps a module that still has items when its name was cleared, instead of silently dropping its items. */
export const UNTITLED_MODULE = "Untitled module"

/** The only `source` form kept: a policy record label from src/data/policyCatalog.ts. */
const SOURCE_LABEL = /^ASU-R-\d{3}$/

/* Small readers shared with src/lib/checklistParse.ts (the editor-only parser). */
export const isWhen = (v: unknown): v is ChecklistWhen => typeof v === "string" && (CHECKLIST_WHEN as readonly string[]).includes(v)
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
export const collapse = (s: string) => s.replace(/\s+/g, " ").trim()
/** Trim, collapse inner whitespace and cut to the limit; "" for anything that is not a string. */
export const capText = (v: unknown, max: number) => typeof v === "string" ? collapse(v).slice(0, max).trim() : ""

/* ───────────── Reading the matrix ───────────── */

/** The item's own "when", else its module's. */
export const effectiveWhen = (m: ChecklistModule, i: ChecklistItem): ChecklistWhen => i.when ?? m.when
/** Whether the role gets the item: a role cell is filled or an empty ring, nothing else. */
export const getsItem = (i: ChecklistItem, roleId: string) => i.everyone ? !i.hiddenFor.includes(roleId) : i.roleIds.includes(roleId)

/**
 * Whether every current role gets the item: the Everyone cell is filled exactly then. With no roles at all the stored flag decides
 * (it still means "roles added later get it too").
 */
export const allRolesGet = (i: ChecklistItem, roleIds: readonly string[]) => roleIds.length ? roleIds.every(id => getsItem(i, id)) : i.everyone

/**
 * Click on a role's cell: with Everyone on it hides or unhides the role; otherwise it adds or removes the role. Returns a new item.
 * Given the current `roleIds`, switching on the last role that lacked the item makes it Everyone's (`everyone: true`, both lists
 * empty), so a filled Everyone cell always means "roles added later get it too"; switching roles off never changes the flag.
 */
export function toggleCell(i: ChecklistItem, roleId: string, roleIds: readonly string[] = []): ChecklistItem {
  const flip = (ids: string[]) => ids.includes(roleId) ? ids.filter(id => id !== roleId) : [...ids, roleId]
  if (i.everyone) return { ...i, hiddenFor: flip(i.hiddenFor) }
  const next = { ...i, roleIds: flip(i.roleIds) }
  return roleIds.length && roleIds.every(id => next.roleIds.includes(id)) ? { ...next, everyone: true, roleIds: [], hiddenFor: [] } : next
}

/**
 * The Everyone cell: when every current role already gets the item, nobody gets it; otherwise every role (and roles added later) gets it.
 * Either way both role lists start empty, so the result never mixes the two meanings.
 */
export const toggleEveryone = (i: ChecklistItem, roleIds: readonly string[]): ChecklistItem =>
  ({ ...i, everyone: !allRolesGet(i, roleIds), roleIds: [], hiddenFor: [] })

/** Items the role gets, across all modules. */
export const countForRole = (c: OnboardingChecklist, roleId: string) => c.modules.reduce((n, m) => n + m.items.filter(i => getsItem(i, roleId)).length, 0)
/** Items every current role gets (a filled Everyone cell). */
export const countEveryone = (c: OnboardingChecklist, roleIds: readonly string[]) => c.modules.reduce((n, m) => n + m.items.filter(i => allRolesGet(i, roleIds)).length, 0)
/** Items in the whole checklist. */
export const countItems = (c: OnboardingChecklist) => c.modules.reduce((n, m) => n + m.items.length, 0)

/** The role's items, in checklist order, each with its module (for the module's when). */
export function itemsForRole(c: OnboardingChecklist, roleId: string): { module: ChecklistModule; item: ChecklistItem }[] {
  return c.modules.flatMap(module => module.items.filter(item => getsItem(item, roleId)).map(item => ({ module, item })))
}

/** JSON with object keys sorted, so two equal checklists compare equal whatever order their fields were written in. */
const stableJson = (v: unknown): string => Array.isArray(v) ? `[${v.map(stableJson).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`).join(",")}}`
  : JSON.stringify(v) ?? "null"
/** True when both hold the same modules and items; `updatedOn` is ignored, so a save that changes nothing changes nothing. */
export const sameChecklist = (a: OnboardingChecklist, b: OnboardingChecklist) => a.version === b.version && stableJson(a.modules) === stableJson(b.modules)

/**
 * Ids "ck-N" that do not collide with any id already in the checklist (src/lib/ids.ts). Callers pass the returned function
 * as `makeId`; tests pass their own counter instead, so every function here stays deterministic.
 */
export function checklistIdMaker(c?: OnboardingChecklist | null): () => string {
  const ids = (c?.modules ?? []).flatMap(m => [m.id, ...m.items.map(i => i.id)])
  let next = nextCounter(ids, /^ck-(\d+)$/)
  return () => `ck-${next++}`
}

/* ───────────── Validation ───────────── */

const cleanId = (v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 100 ? v : null
const knownIds = (v: unknown, known: ReadonlySet<string>) => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === "string" && known.has(id)))] : []

function sanitizeItem(raw: unknown, known: ReadonlySet<string>, seen: Set<string>): ChecklistItem | null {
  if (!isRecord(raw)) return null
  const id = cleanId(raw.id), title = capText(raw.title, MAX_ITEM_TITLE)
  if (!id || seen.has(id) || !title) return null
  seen.add(id)
  // A missing flag reads as Everyone, the default for new items. The list that the flag does not use is emptied.
  const everyone = typeof raw.everyone === "boolean" ? raw.everyone : true
  return {
    id, title,
    ...(isWhen(raw.when) ? { when: raw.when } : {}),
    everyone,
    roleIds: everyone ? [] : knownIds(raw.roleIds, known),
    hiddenFor: everyone ? knownIds(raw.hiddenFor, known) : [],
    ...(typeof raw.source === "string" && SOURCE_LABEL.test(raw.source) ? { source: raw.source } : {}),
  }
}

/**
 * The only way a checklist enters the store: a valid copy of `raw`, or null when it is not a version-1 checklist at all.
 * Unknown enum values fall back (items follow the module; a module uses No deadline), a stored "who" (template v1) is dropped, text is trimmed and
 * capped, items with an empty title, unknown or archived role ids, repeated ids and any `source` other than "ASU-R-NNN"
 * are dropped, and the limits (20 modules, 60 items per module, 300 in total) cut what is beyond them.
 * A module whose name is empty is dropped only when it has no items; otherwise it is kept as "Untitled module" so that
 * clearing a name while typing never deletes the module's items.
 */
export function sanitizeChecklist(raw: unknown, roleIds: readonly string[], today: string): OnboardingChecklist | null {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.modules)) return null
  const known = new Set(roleIds), seen = new Set<string>()
  const modules: ChecklistModule[] = []
  let total = 0
  for (const rm of raw.modules) {
    if (modules.length >= MAX_CHECKLIST_MODULES) break
    if (!isRecord(rm)) continue
    const id = cleanId(rm.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const items: ChecklistItem[] = []
    for (const ri of Array.isArray(rm.items) ? rm.items : []) {
      if (items.length >= MAX_MODULE_ITEMS || total >= MAX_CHECKLIST_ITEMS) break
      const item = sanitizeItem(ri, known, seen)
      if (item) { items.push(item); total++ }
    }
    const title = capText(rm.title, MAX_MODULE_TITLE) || (items.length ? UNTITLED_MODULE : "")
    if (!title) continue
    modules.push({ id, title, when: isWhen(rm.when) ? rm.when : "none", items })
  }
  return { version: 1, modules, updatedOn: today }
}
