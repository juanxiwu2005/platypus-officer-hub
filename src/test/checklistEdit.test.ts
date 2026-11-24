import { describe, expect, it } from "vitest"
import type { ChecklistItem, ChecklistModule, OnboardingChecklist } from "../data/types"
import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_MODULES, MAX_ITEM_TITLE, MAX_MODULE_ITEMS, MAX_MODULE_TITLE, countItems } from "../lib/checklist"
import { parsePastedList } from "../lib/checklistParse"
import {
  addPastedCounted, applyLine, canAddModule, canMoveModule, focusAfterRemoveItem, focusAfterRemoveModule, insertItems, limitIn, limitNote, locate,
  mapItem, moveItem, moveItemTarget, moveModule, newItem, newModule, pasteIntoItem, patchModule, removeItem, removeModule, roomIn,
} from "../components/settings/onboarding/edit"

// Unit tests for the matrix editor's immutable edits (src/components/settings/onboarding/edit.ts). Fictional items only.

const counter = (prefix = "n") => { let n = 0; return () => `${prefix}-${n++}` }
const item = (id: string, title = `Item ${id}`): ChecklistItem => ({ id, title, everyone: true, roleIds: [], hiddenFor: [] })
const mod = (id: string, items: ChecklistItem[], title = `Module ${id}`): ChecklistModule => ({ id, title, when: "week1", who: "new", items })
const list = (...modules: ChecklistModule[]): OnboardingChecklist => ({ version: 1, modules, updatedOn: "2026-11-23" })
const many = (prefix: string, n: number) => Array.from({ length: n }, (_, k) => item(`${prefix}${k}`))
const titles = (c: OnboardingChecklist) => c.modules.map(m => m.items.map(i => i.id))

const sample = () => list(mod("a", [item("a1"), item("a2")]), mod("b", [item("b1")]), mod("c", []))

describe("new rows", () => {
  it("newItem goes to everyone, keeps a line's when and who, and caps the title", () => {
    expect(newItem("x")).toEqual({ id: "x", title: "", everyone: true, roleIds: [], hiddenFor: [] })
    expect(newItem("x", { title: "  Meet   your buddy ", when: "day3", who: "buddy" })).toEqual({ id: "x", title: "Meet your buddy", when: "day3", who: "buddy", everyone: true, roleIds: [], hiddenFor: [] })
    expect(newItem("x", { title: "L".repeat(150) }).title).toHaveLength(MAX_ITEM_TITLE)
  })
  it("newModule follows no deadline and the new officer, with a capped name", () => {
    expect(newModule("m", "Tools")).toEqual({ id: "m", title: "Tools", when: "none", who: "new", items: [] })
    expect(newModule("m", "M".repeat(80)).title).toHaveLength(MAX_MODULE_TITLE)
  })
  it("applyLine caps the title and sets only what the line names", () => {
    const i = { ...item("x"), when: "week1" as const }
    expect(applyLine(i, { title: "T".repeat(130), who: "buddy" })).toEqual({ ...i, title: "T".repeat(MAX_ITEM_TITLE), who: "buddy" })
  })
})

describe("reading and patching", () => {
  it("locate finds an item's module and index", () => {
    expect(locate(sample(), "b1")).toEqual({ mi: 1, ii: 0 })
    expect(locate(sample(), "zz")).toBeNull()
  })
  it("patchModule and mapItem change one row and leave the input alone", () => {
    const c = sample()
    expect(patchModule(c, "b", { when: "day1" }).modules[1].when).toBe("day1")
    expect(mapItem(c, "a2", i => ({ ...i, title: "Renamed" })).modules[0].items[1].title).toBe("Renamed")
    expect(c.modules[1].when).toBe("week1")
    expect(c.modules[0].items[1].title).toBe("Item a2")
  })
})

describe("room and limits", () => {
  it("roomIn is the smaller of the module's and the checklist's room", () => {
    expect(roomIn(sample(), sample().modules[0])).toBe(MAX_MODULE_ITEMS - 2)
    const full = list(mod("a", many("a", MAX_MODULE_ITEMS)))
    expect(roomIn(full, full.modules[0])).toBe(0)
    const nearlyFull = list(...Array.from({ length: 5 }, (_, k) => mod(`m${k}`, many(`m${k}-`, k < 4 ? 60 : 50))), mod("last", many("l", 0)))
    expect(countItems(nearlyFull)).toBe(290)
    expect(roomIn(nearlyFull, nearlyFull.modules[5])).toBe(MAX_CHECKLIST_ITEMS - 290)
  })
  it("limitIn names the limit that stops the module", () => {
    const full = list(mod("a", many("a", MAX_MODULE_ITEMS)))
    expect(limitIn(full, full.modules[0])).toBe("module")
    const total = list(...Array.from({ length: 5 }, (_, k) => mod(`m${k}`, many(`m${k}-`, 60))), mod("last", []))
    expect(limitIn(total, total.modules[5])).toBe("total")
  })
  it("canAddModule stops at 20 modules", () => {
    expect(canAddModule(list(...Array.from({ length: MAX_CHECKLIST_MODULES - 1 }, (_, k) => mod(`m${k}`, []))))).toBe(true)
    expect(canAddModule(list(...Array.from({ length: MAX_CHECKLIST_MODULES }, (_, k) => mod(`m${k}`, []))))).toBe(false)
  })
  it("limitNote says what was cut, and nothing when everything went in", () => {
    expect(limitNote({ requested: 60, added: 57, limit: "module" })).toBe("Added 57 of 60 items: a module holds at most 60.")
    expect(limitNote({ requested: 5, added: 2, limit: "total" })).toBe("Added 2 of 5 items: the checklist holds at most 300 items.")
    expect(limitNote({ requested: 4, added: 1, limit: "modules" })).toBe("Added 1 of 4 items: the checklist holds at most 20 modules.")
    expect(limitNote({ requested: 1, added: 0, limit: "module" })).toBe("No room for another item: a module holds at most 60.")
    expect(limitNote({ requested: 3, added: 3, limit: null })).toBeNull()
  })
})

describe("insertItems", () => {
  it("inserts at the index", () => {
    expect(titles(insertItems(sample(), "a", 1, [item("x"), item("y")]))[0]).toEqual(["a1", "x", "y", "a2"])
  })
  it("drops what does not fit the module, and returns the same checklist when nothing fits", () => {
    const c = list(mod("a", many("a", MAX_MODULE_ITEMS - 1)))
    const next = insertItems(c, "a", 0, [item("x"), item("y")])
    expect(next.modules[0].items).toHaveLength(MAX_MODULE_ITEMS)
    expect(next.modules[0].items[0].id).toBe("x")
    expect(insertItems(next, "a", 0, [item("z")])).toBe(next)
  })
  it("respects the 300-item total", () => {
    const c = list(...Array.from({ length: 5 }, (_, k) => mod(`m${k}`, many(`m${k}-`, 60))), mod("last", []))
    expect(insertItems(c, "last", 0, [item("x")])).toBe(c)
  })
  it("ignores an unknown module", () => {
    const c = sample()
    expect(insertItems(c, "nope", 0, [item("x")])).toBe(c)
  })
})

describe("removing", () => {
  it("removeItem and removeModule take one row out", () => {
    expect(titles(removeItem(sample(), "a1"))).toEqual([["a2"], ["b1"], []])
    expect(removeModule(sample(), "b").modules.map(m => m.id)).toEqual(["a", "c"])
    expect(removeModule(sample(), "nope").modules.map(m => m.id)).toEqual(["a", "b", "c"])
  })
  it("focus after removing an item: the previous item, else the next, else the module", () => {
    expect(focusAfterRemoveItem(sample(), "a2")).toEqual({ item: "a1" })
    expect(focusAfterRemoveItem(sample(), "a1")).toEqual({ item: "a2" })
    expect(focusAfterRemoveItem(sample(), "b1")).toEqual({ module: "b" })
    expect(focusAfterRemoveItem(sample(), "zz")).toBeNull()
  })
  it("focus after removing a module: the previous module, else the next, else none", () => {
    expect(focusAfterRemoveModule(sample(), "b")).toBe("a")
    expect(focusAfterRemoveModule(sample(), "a")).toBe("b")
    expect(focusAfterRemoveModule(list(mod("only", [])), "only")).toBeNull()
  })
})

describe("moving", () => {
  it("moveModule swaps neighbours and stops at the ends", () => {
    expect(moveModule(sample(), "b", -1).modules.map(m => m.id)).toEqual(["b", "a", "c"])
    const c = sample()
    expect(moveModule(c, "a", -1)).toBe(c)
    expect(moveModule(c, "c", 1)).toBe(c)
    expect([canMoveModule(c, "a", -1), canMoveModule(c, "a", 1), canMoveModule(c, "c", 1), canMoveModule(c, "nope", 1)]).toEqual([false, true, false, false])
  })
  it("moves an item within its module", () => {
    expect(titles(moveItem(sample(), "a1", 1))[0]).toEqual(["a2", "a1"])
  })
  it("moves an item across modules: last of the module above, first of the module below", () => {
    expect(titles(moveItem(sample(), "a2", 1))).toEqual([["a1"], ["a2", "b1"], []])
    expect(titles(moveItem(sample(), "b1", -1))).toEqual([["a1", "a2", "b1"], [], []])
    // Into an empty module, and back.
    expect(titles(moveItem(sample(), "b1", 1))).toEqual([["a1", "a2"], [], ["b1"]])
  })
  it("cannot move past the first or last module, or into a full one", () => {
    const c = sample()
    expect(moveItemTarget(c, "a1", -1)).toBeNull()
    expect(moveItem(c, "a1", -1)).toBe(c)
    const full = list(mod("a", [item("x")]), mod("b", many("b", MAX_MODULE_ITEMS)))
    expect(moveItemTarget(full, "x", 1)).toBeNull()
    expect(moveItemTarget(full, "b0", -1)).toEqual({ mi: 0, ii: 1 })
  })
})

describe("adding pasted lists", () => {
  it("addPastedCounted counts what fits in a module", () => {
    const c = list(mod("a", many("a", 3), "First 3 days"))
    const r = addPastedCounted(c, parsePastedList(`First 3 days:\n${Array.from({ length: 60 }, (_, k) => `Task ${k}`).join("\n")}`), counter())
    expect([r.requested, r.added, r.limit]).toEqual([60, 57, "module"])
    expect(r.checklist.modules[0].items).toHaveLength(MAX_MODULE_ITEMS)
  })
  it("addPastedCounted says when the 20-module limit left a module out", () => {
    const c = list(...Array.from({ length: MAX_CHECKLIST_MODULES }, (_, k) => mod(`m${k}`, [])))
    const r = addPastedCounted(c, parsePastedList("Brand new:\nOne\nTwo"), counter())
    expect([r.requested, r.added, r.limit]).toEqual([2, 0, "modules"])
  })
  it("addPastedCounted starts a checklist from nothing", () => {
    const r = addPastedCounted(null, parsePastedList("Read the constitution\nMeet your buddy"), counter())
    expect([r.requested, r.added, r.limit]).toEqual([2, 2, null])
    expect(r.checklist.modules.map(m => m.title)).toEqual(["Checklist"])
  })
})

describe("pasting several lines into a title", () => {
  const paste = (c: OnboardingChecklist, id: string, text: string) => pasteIntoItem(c, id, parsePastedList(text, ""), counter())

  it("puts the leading lines below the item, capped, and focuses the last one", () => {
    const r = paste(sample(), "a1", `Extra A\n${"L".repeat(150)}`)
    expect(r.checklist.modules[0].items.map(i => i.title)).toEqual(["Item a1", "Extra A", "L".repeat(MAX_ITEM_TITLE), "Item a2"])
    expect(r.focus).toBe(r.checklist.modules[0].items[2].id)
    expect([r.requested, r.added, r.limit]).toEqual([2, 2, null])
  })
  it("an empty title takes the first line", () => {
    const c = list(mod("a", [item("e", "")]))
    const r = paste(c, "e", "First @buddy\nSecond")
    expect(r.checklist.modules[0].items.map(i => [i.id, i.title, i.who ?? null])).toEqual([["e", "First", "buddy"], ["n-0", "Second", null]])
  })
  it("Section: lines place what follows like Paste a list: an existing module by name, else a new one at the end", () => {
    const r = paste(sample(), "a1", "Extra A\nmodule b:\nExtra B\nNew section:\nExtra C")
    expect(r.checklist.modules.map(m => [m.title, m.items.map(i => i.title)])).toEqual([
      ["Module a", ["Item a1", "Extra A", "Item a2"]],
      ["Module b", ["Item b1", "Extra B"]],
      ["Module c", []],
      ["New section", ["Extra C"]],
    ])
    expect([r.requested, r.added]).toEqual([3, 3])
  })
  it("a paste with only a Section: part leaves the item where it is", () => {
    const r = paste(sample(), "a1", "Module c:\nOne\nTwo")
    expect(titles(r.checklist)[0]).toEqual(["a1", "a2"])
    expect(r.checklist.modules[2].items.map(i => i.title)).toEqual(["One", "Two"])
    expect(r.focus).toBeNull()
  })
  it("counts what a full module left out", () => {
    const c = list(mod("a", many("a", MAX_MODULE_ITEMS - 1)))
    const r = paste(c, "a0", "One\nTwo\nThree")
    expect([r.requested, r.added, r.limit]).toEqual([3, 1, "module"])
    expect(limitNote(r)).toBe("Added 1 of 3 items: a module holds at most 60.")
  })
})
