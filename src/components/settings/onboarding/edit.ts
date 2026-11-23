import type { ChecklistItem, ChecklistModule, OnboardingChecklist } from "../../../data/types"
import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_MODULES, MAX_MODULE_ITEMS, countItems, type PastedItem } from "../../../lib/checklist"

/**
 * Immutable edits for the onboarding matrix editor (Settings → Onboarding). They only rearrange the draft on screen:
 * validation stays in sanitizeChecklist, which the store runs on every save.
 */

export type Dir = -1 | 1

/** A new item for every role, from a typed or pasted line. */
export const newItem = (id: string, from: PastedItem = { title: "" }): ChecklistItem => ({
  id, title: from.title, ...(from.when ? { when: from.when } : {}), ...(from.who ? { who: from.who } : {}), everyone: true, roleIds: [], hiddenFor: [],
})

export const newModule = (id: string, title: string): ChecklistModule => ({ id, title, when: "none", who: "new", items: [] })

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

/** Swaps a module with its neighbour. */
export function moveModule(c: OnboardingChecklist, moduleId: string, dir: Dir): OnboardingChecklist {
  const i = c.modules.findIndex(m => m.id === moduleId), j = i + dir
  if (i < 0 || j < 0 || j >= c.modules.length) return c
  const modules = [...c.modules];
  [modules[i], modules[j]] = [modules[j], modules[i]]
  return withModules(c, modules)
}

/**
 * Moves an item one place. At the top or bottom of its module it moves into the neighbouring module (as its last or first item),
 * so an item can travel anywhere with the two buttons. Null when it cannot move.
 */
export function moveItemTarget(c: OnboardingChecklist, itemId: string, dir: Dir): { mi: number; ii: number } | null {
  const at = locate(c, itemId)
  if (!at) return null
  const m = c.modules[at.mi], ii = at.ii + dir
  if (ii >= 0 && ii < m.items.length) return { mi: at.mi, ii }
  const mi = at.mi + dir, next = c.modules[mi]
  if (!next || next.items.length >= MAX_MODULE_ITEMS) return null
  return { mi, ii: dir < 0 ? next.items.length : 0 }
}

export function moveItem(c: OnboardingChecklist, itemId: string, dir: Dir): OnboardingChecklist {
  const at = locate(c, itemId), to = moveItemTarget(c, itemId, dir)
  if (!at || !to) return c
  const item = c.modules[at.mi].items[at.ii]
  const modules = c.modules.map(m => ({ ...m, items: m.items.filter(i => i.id !== itemId) }))
  const target = modules[to.mi]
  target.items = [...target.items.slice(0, to.ii), item, ...target.items.slice(to.ii)]
  return withModules(c, modules)
}
