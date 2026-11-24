import type { ChecklistItem, ChecklistModule, OnboardingChecklist } from "../../../data/types"
import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_MODULES, MAX_ITEM_TITLE, MAX_MODULE_ITEMS, MAX_MODULE_TITLE, capText, countItems } from "../../../lib/checklist"
import { addPasted, type PastedItem, type PastedList } from "../../../lib/checklistParse"

/**
 * Immutable edits for the onboarding matrix editor (Settings → Onboarding). They only rearrange the draft on screen:
 * validation stays in sanitizeChecklist, which the store runs on every save. Template v2: no "who does it"; rows move by drag
 * and drop or the handle's keyboard mode (moveItemTo, moveModuleTo), not by up / down buttons.
 */

export type Dir = -1 | 1

/** A new item for every role, from a typed or pasted line. The title is capped like a saved one (MAX_ITEM_TITLE). */
export const newItem = (id: string, from: PastedItem = { title: "" }): ChecklistItem => ({
  id, title: capText(from.title, MAX_ITEM_TITLE), ...(from.when ? { when: from.when } : {}), everyone: true, roleIds: [], hiddenFor: [],
})

export const newModule = (id: string, title: string): ChecklistModule => ({ id, title: capText(title, MAX_MODULE_TITLE), when: "none", items: [] })

/** Where an item sits: module index and item index, or null. */
export function locate(c: OnboardingChecklist, itemId: string): { mi: number; ii: number } | null {
  for (let mi = 0; mi < c.modules.length; mi++) {
    const ii = c.modules[mi].items.findIndex(i => i.id === itemId)
    if (ii >= 0) return { mi, ii }
  }
  return null
}

const withModules = (c: OnboardingChecklist, modules: ChecklistModule[]): OnboardingChecklist => ({ ...c, modules })

export const patchModule = (c: OnboardingChecklist, moduleId: string, patch: Partial<Omit<ChecklistModule, "id" | "items">>) =>
  withModules(c, c.modules.map(m => m.id === moduleId ? { ...m, ...patch } : m))

export const mapItem = (c: OnboardingChecklist, itemId: string, fn: (i: ChecklistItem) => ChecklistItem) =>
  withModules(c, c.modules.map(m => m.items.some(i => i.id === itemId) ? { ...m, items: m.items.map(i => i.id === itemId ? fn(i) : i) } : m))

/** A typed or pasted line applied to an existing item: a capped title, and when only where the line set it. */
export const applyLine = (i: ChecklistItem, line: PastedItem): ChecklistItem =>
  ({ ...i, title: capText(line.title, MAX_ITEM_TITLE), ...(line.when ? { when: line.when } : {}) })

/** How many more items the module can take, within the module and checklist limits. */
export const roomIn = (c: OnboardingChecklist, m: ChecklistModule) => Math.max(0, Math.min(MAX_MODULE_ITEMS - m.items.length, MAX_CHECKLIST_ITEMS - countItems(c)))
export const canAddModule = (c: OnboardingChecklist) => c.modules.length < MAX_CHECKLIST_MODULES

/** Inserts items into a module at `index`, dropping what does not fit. */
export function insertItems(c: OnboardingChecklist, moduleId: string, index: number, items: ChecklistItem[]): OnboardingChecklist {
  const m = c.modules.find(x => x.id === moduleId)
  if (!m) return c
  const fit = items.slice(0, roomIn(c, m))
  if (!fit.length) return c
  return withModules(c, c.modules.map(x => x.id === moduleId ? { ...x, items: [...x.items.slice(0, index), ...fit, ...x.items.slice(index)] } : x))
}

export const removeItem = (c: OnboardingChecklist, itemId: string) =>
  withModules(c, c.modules.map(m => m.items.some(i => i.id === itemId) ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m))

export const removeModule = (c: OnboardingChecklist, moduleId: string) => withModules(c, c.modules.filter(m => m.id !== moduleId))

/* ───────────── Moving (drag and drop, or the handle's keyboard mode) ───────────── */

/**
 * Moves an item to `index` in module `moduleId`, where `index` counts the target module's items as they are once the item has been
 * taken out (0 = first; the module's length = the end, which is also how an empty module is filled). An index past the end is
 * clamped. The same checklist comes back when nothing changes, the item or module is unknown, or another module is full
 * (MAX_MODULE_ITEMS): use `moduleFullFor` to tell that case apart.
 */
export function moveItemTo(c: OnboardingChecklist, itemId: string, moduleId: string, index: number): OnboardingChecklist {
  const at = locate(c, itemId), to = c.modules.findIndex(m => m.id === moduleId)
  if (!at || to < 0) return c
  if (to !== at.mi && c.modules[to].items.length >= MAX_MODULE_ITEMS) return c
  const item = c.modules[at.mi].items[at.ii]
  const modules = c.modules.map((m, k) => k === at.mi ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m)
  const target = modules[to], i = Math.max(0, Math.min(Math.trunc(index), target.items.length))
  if (to === at.mi && i === at.ii) return c
  modules[to] = { ...target, items: [...target.items.slice(0, i), item, ...target.items.slice(i)] }
  return withModules(c, modules)
}

/** True when the item cannot go into `moduleId` because that other module already holds MAX_MODULE_ITEMS. */
export const moduleFullFor = (c: OnboardingChecklist, itemId: string, moduleId: string) => {
  const m = c.modules.find(x => x.id === moduleId)
  return !!m && !m.items.some(i => i.id === itemId) && m.items.length >= MAX_MODULE_ITEMS
}

/** Moves a module to `index` among the other modules (counted without it). Clamped; the same checklist when nothing changes. */
export function moveModuleTo(c: OnboardingChecklist, moduleId: string, index: number): OnboardingChecklist {
  const from = c.modules.findIndex(m => m.id === moduleId)
  if (from < 0) return c
  const rest = c.modules.filter(m => m.id !== moduleId), i = Math.max(0, Math.min(Math.trunc(index), rest.length))
  if (i === from) return c
  return withModules(c, [...rest.slice(0, i), c.modules[from], ...rest.slice(i)])
}

/**
 * Where one Arrow Up / Down press takes an item in keyboard mode: one place within its module, and from the top or bottom of
 * a module into the neighbouring one (as its last or first item; an empty module counts as one place). Null at the very start
 * or end of the checklist. A full neighbour is still returned: moveItemTo refuses it and the editor says why.
 */
export function itemStep(c: OnboardingChecklist, itemId: string, dir: Dir): { moduleId: string; index: number } | null {
  const at = locate(c, itemId)
  if (!at) return null
  const m = c.modules[at.mi], ii = at.ii + dir
  if (ii >= 0 && ii < m.items.length) return { moduleId: m.id, index: ii }
  const next = c.modules[at.mi + dir]
  if (!next) return null
  return { moduleId: next.id, index: dir < 0 ? next.items.length : 0 }
}

/** Where an item or module sits, for announcements: "position 2 of 5". */
export function itemPlace(c: OnboardingChecklist, itemId: string): { module: ChecklistModule; position: number; of: number } | null {
  const at = locate(c, itemId)
  if (!at) return null
  const module = c.modules[at.mi]
  return { module, position: at.ii + 1, of: module.items.length }
}

/* ───────────── Where focus goes after a row disappears ───────────── */

/** After deleting an item: the previous item in its module, else the next one, else the module (its name). */
export function focusAfterRemoveItem(c: OnboardingChecklist, itemId: string): { item: string } | { module: string } | null {
  const at = locate(c, itemId)
  if (!at) return null
  const m = c.modules[at.mi], near = m.items[at.ii - 1] ?? m.items[at.ii + 1]
  return near ? { item: near.id } : { module: m.id }
}

/** After deleting a module: the previous module, else the next one, else null (the checklist is empty). */
export function focusAfterRemoveModule(c: OnboardingChecklist, moduleId: string): string | null {
  const i = c.modules.findIndex(m => m.id === moduleId)
  if (i < 0) return null
  return (c.modules[i - 1] ?? c.modules[i + 1])?.id ?? null
}

/* ───────────── Adding many items, and saying what the limits cut ───────────── */

/** Which limit cut an addition: 60 items in a module, 300 in the checklist, or 20 modules. */
export type Limit = "module" | "total" | "modules"
export const LIMIT_REASON: Readonly<Record<Limit, string>> = {
  module: `a module holds at most ${MAX_MODULE_ITEMS}`,
  total: `the checklist holds at most ${MAX_CHECKLIST_ITEMS} items`,
  modules: `the checklist holds at most ${MAX_CHECKLIST_MODULES} modules`,
}
/** An addition and how much of it went in. `limit` is set only when something was left out. */
export interface Added { checklist: OnboardingChecklist; requested: number; added: number; limit: Limit | null }

/** The limit that stops more items going into `m` (checked before inserting). */
export const limitIn = (c: OnboardingChecklist, m: ChecklistModule): Limit =>
  MAX_CHECKLIST_ITEMS - countItems(c) < MAX_MODULE_ITEMS - m.items.length ? "total" : "module"

/** "Added 57 of 60 items: a module holds at most 60." when a limit cut an addition, else null. */
export function limitNote(r: Pick<Added, "requested" | "added" | "limit">): string | null {
  if (!r.limit || r.added >= r.requested) return null
  if (r.requested === 1) return `No room for another item: ${LIMIT_REASON[r.limit]}.`
  return `Added ${r.added} of ${r.requested} items: ${LIMIT_REASON[r.limit]}.`
}

/** Pasted items that addPasted would try to add: a non-empty title in a module with a non-empty name. */
const pastedItems = (parsed: PastedList) =>
  parsed.modules.filter(pm => capText(pm.title, MAX_MODULE_TITLE)).reduce((n, pm) => n + pm.items.filter(i => capText(i.title, MAX_ITEM_TITLE)).length, 0)

/** addPasted (the Paste a list panel), counting what the limits left out. */
export function addPastedCounted(c: OnboardingChecklist | null, parsed: PastedList, makeId: () => string): Added {
  const checklist = addPasted(c, parsed, makeId)
  const requested = pastedItems(parsed), added = countItems(checklist) - (c ? countItems(c) : 0)
  if (added >= requested) return { checklist, requested, added, limit: null }
  const named = (title: string) => checklist.modules.some(m => m.title.trim().toLowerCase() === title.toLowerCase())
  const lostModule = parsed.modules.some(pm => { const t = capText(pm.title, MAX_MODULE_TITLE); return t && pm.items.length > 0 && !named(t) })
  return { checklist, requested, added, limit: countItems(checklist) >= MAX_CHECKLIST_ITEMS ? "total" : lostModule ? "modules" : "module" }
}

/**
 * Several lines pasted into one item's title. `parsed` comes from parsePastedList(text, ""), so the lines before any
 * "Section:" line arrive in a module with an empty name. This matches the Paste a list panel: those leading lines go right
 * below the item, in its module (the first one becomes the item's title when that title is empty), and the lines after a
 * "Section:" line go to that module, an existing one with the same name or a new one at the end, as Add to checklist does.
 * `focus` is the last item placed below the row (or the row itself), so typing can continue there.
 */
export function pasteIntoItem(c: OnboardingChecklist, itemId: string, parsed: PastedList, makeId: () => string): Added & { focus: string | null } {
  const at = locate(c, itemId)
  if (!at) return { checklist: c, requested: 0, added: 0, limit: null, focus: null }
  const moduleId = c.modules[at.mi].id
  const here = parsed.modules.filter(pm => !pm.title).flatMap(pm => pm.items).filter(i => capText(i.title, MAX_ITEM_TITLE))
  const elsewhere: PastedList = { modules: parsed.modules.filter(pm => pm.title) }
  const replaceSelf = here.length > 0 && !c.modules[at.mi].items[at.ii].title.trim()
  let next = replaceSelf ? mapItem(c, itemId, i => applyLine(i, here[0])) : c
  const below = (replaceSelf ? here.slice(1) : here).map(line => newItem(makeId(), line))
  const module = next.modules[at.mi], room = roomIn(next, module)
  const hereLimit = below.length > room ? limitIn(next, module) : null
  next = insertItems(next, moduleId, at.ii + 1, below)
  const placed = below.slice(0, room)
  let requested = below.length + (replaceSelf ? 1 : 0), added = placed.length + (replaceSelf ? 1 : 0), limit: Limit | null = hereLimit
  if (elsewhere.modules.length) {
    const more = addPastedCounted(next, elsewhere, makeId)
    next = more.checklist; requested += more.requested; added += more.added; limit ??= more.limit
  }
  return { checklist: next, requested, added, limit, focus: placed.at(-1)?.id ?? (replaceSelf ? itemId : null) }
}
