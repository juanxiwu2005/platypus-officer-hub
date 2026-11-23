import { describe, expect, it } from "vitest"
import type { ChecklistItem, ChecklistModule, OnboardingChecklist } from "../data/types"
import { seedDemo } from "../data/seed"
import { POLICY_CATALOG } from "../data/policyCatalog"
import { STARTER_SOURCES, starterChecklist } from "../data/checklistStarter"
import {
  addPasted, cellState, CHECKLIST_WHEN, CHECKLIST_WHO, checklistIdMaker, countEveryone, countForRole, countItems, effectiveWhen, effectiveWho, itemsForRole,
  MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_MODULES, MAX_ITEM_TITLE, MAX_MODULE_ITEMS, MAX_MODULE_TITLE, parsePastedList, parseShorthand, sameChecklist,
  sanitizeChecklist, toggleCell, toggleEveryone, UNTITLED_MODULE, WHEN_LABEL, WHO_LABEL,
} from "../lib/checklist"

const TODAY = "2026-11-23"
const ROLES = ["r-pres", "r-fin", "r-events", "r-mkt", "r-sec"]
const counter = (prefix = "id") => { let n = 0; return () => `${prefix}-${n++}` }
const item = (over: Partial<ChecklistItem> = {}): ChecklistItem => ({ id: "i1", title: "Read the constitution", everyone: true, roleIds: [], hiddenFor: [], ...over })
const mod = (over: Partial<ChecklistModule> = {}): ChecklistModule => ({ id: "m1", title: "Learn the club", when: "week1", who: "new", items: [], ...over })
const list = (modules: ChecklistModule[]): OnboardingChecklist => ({ version: 1, modules, updatedOn: TODAY })

describe("onboarding checklist labels", () => {
  it("labels every when and who value in English", () => {
    expect(CHECKLIST_WHEN.map(w => WHEN_LABEL[w])).toEqual(["Day 1", "Day 3", "Week 1", "Week 2", "Month 1", "No deadline"])
    expect(CHECKLIST_WHO.map(w => WHO_LABEL[w])).toEqual(["New officer", "Buddy", "President", "Outgoing officer"])
  })
})

describe("reading the matrix", () => {
  it("uses the item's when and who, else the module's", () => {
    const m = mod()
    expect(effectiveWhen(m, item())).toBe("week1")
    expect(effectiveWho(m, item())).toBe("new")
    expect(effectiveWhen(m, item({ when: "day1" }))).toBe("day1")
    expect(effectiveWho(m, item({ who: "buddy" }))).toBe("buddy")
  })

  it("names the four cell states", () => {
    expect(cellState(item(), "r-fin")).toBe("inherited")
    expect(cellState(item({ hiddenFor: ["r-fin"] }), "r-fin")).toBe("hidden")
    expect(cellState(item({ everyone: false, roleIds: ["r-fin"] }), "r-fin")).toBe("included")
    expect(cellState(item({ everyone: false, roleIds: ["r-fin"] }), "r-mkt")).toBe("off")
  })

  it("toggles hiddenFor under Everyone and roleIds otherwise, returning new items", () => {
    const everyone = item()
    const hidden = toggleCell(everyone, "r-fin")
    expect(hidden).not.toBe(everyone)
    expect(everyone.hiddenFor).toEqual([])
    expect(hidden).toMatchObject({ everyone: true, hiddenFor: ["r-fin"], roleIds: [] })
    expect(toggleCell(hidden, "r-fin").hiddenFor).toEqual([])
    const some = item({ everyone: false })
    const on = toggleCell(some, "r-mkt")
    expect(on).toMatchObject({ roleIds: ["r-mkt"], hiddenFor: [] })
    expect(toggleCell(on, "r-mkt").roleIds).toEqual([])
  })

  it("clears both role lists when Everyone is switched either way", () => {
    expect(toggleEveryone(item({ hiddenFor: ["r-fin"] }))).toMatchObject({ everyone: false, roleIds: [], hiddenFor: [] })
    expect(toggleEveryone(item({ everyone: false, roleIds: ["r-fin"] }))).toMatchObject({ everyone: true, roleIds: [], hiddenFor: [] })
  })

  it("counts and lists the items each role gets, in order", () => {
    const c = list([
      mod({ items: [item({ id: "a" }), item({ id: "b", hiddenFor: ["r-fin"] })] }),
      mod({ id: "m2", title: "Tools", items: [item({ id: "c", everyone: false, roleIds: ["r-fin"] }), item({ id: "d", everyone: false })] }),
    ])
    expect(countEveryone(c)).toBe(2)
    expect(countItems(c)).toBe(4)
    expect(countForRole(c, "r-fin")).toBe(2)
    expect(countForRole(c, "r-mkt")).toBe(2)
    expect(countForRole({ ...c, modules: [c.modules[1]] }, "r-mkt")).toBe(0)
    expect(itemsForRole(c, "r-fin").map(x => [x.module.id, x.item.id])).toEqual([["m1", "a"], ["m2", "c"]])
  })

  it("compares checklists without updatedOn", () => {
    const a = list([mod({ items: [item()] })])
    expect(sameChecklist(a, { ...a, updatedOn: "2026-12-01" })).toBe(true)
    expect(sameChecklist(a, list([mod({ items: [item({ title: "Other" })] })]))).toBe(false)
    // The same item with its keys in another order (id last) is still the same checklist.
    const { id, ...rest } = item()
    expect(sameChecklist(a, list([mod({ items: [{ ...rest, id }] })]))).toBe(true)
  })

  it("makes ck-N ids that never reuse one already in the checklist", () => {
    const makeId = checklistIdMaker(list([mod({ id: "ck-4", items: [item({ id: "ck-9" })] })]))
    expect([makeId(), makeId()]).toEqual(["ck-10", "ck-11"])
    expect(checklistIdMaker()()).toBe("ck-0")
  })
})

describe("sanitizeChecklist", () => {
  it("rejects anything that is not a version-1 checklist", () => {
    for (const raw of [null, undefined, "x", [], {}, { version: 2, modules: [] }, { version: 1, modules: "no" }]) expect(sanitizeChecklist(raw, ROLES, TODAY)).toBeNull()
  })

  it("keeps a valid checklist as it is and stamps today", () => {
    const c = list([mod({ items: [item({ when: "day1", who: "buddy", source: "ASU-R-004" }), item({ id: "i2", everyone: false, roleIds: ["r-fin"] })] })])
    const out = sanitizeChecklist({ ...c, updatedOn: "2026-01-01" }, ROLES, TODAY)!
    expect(out.updatedOn).toBe(TODAY)
    expect(sameChecklist(out, c)).toBe(true)
  })

  it("checks enums, trims and caps text, and drops empty titles, unknown roles, repeated ids and bad sources", () => {
    const raw = { version: 1, updatedOn: "x", modules: [
      { id: "m1", title: `  ${"M".repeat(80)}  `, when: "someday", who: "nobody", items: [
        { id: "a", title: "  Read   the  constitution ", when: "tomorrow", who: "boss", everyone: false, roleIds: ["r-fin", "r-gone", "r-fin", 4], hiddenFor: ["r-mkt"], source: "ASU-R-4" },
        { id: "b", title: "   ", everyone: true, roleIds: [], hiddenFor: [] },
        { id: "a", title: "Duplicate id", everyone: true, roleIds: [], hiddenFor: [] },
        { id: "c", title: "X".repeat(200), everyone: true, roleIds: ["r-fin"], hiddenFor: ["r-gone", "r-sec"], source: "ASU-R-037" },
        { title: "No id", everyone: true, roleIds: [], hiddenFor: [] },
        "not an item",
      ] },
      { id: "m1", title: "Duplicate module id", when: "week1", who: "new", items: [] },
      { id: "m2", title: "", when: "week1", who: "new", items: [] },
    ] }
    const out = sanitizeChecklist(raw, ROLES, TODAY)!
    expect(out.modules).toHaveLength(1)
    const [m] = out.modules
    expect(m).toMatchObject({ id: "m1", when: "none", who: "new" })
    expect(m.title).toHaveLength(MAX_MODULE_TITLE)
    expect(m.items.map(i => i.id)).toEqual(["a", "c"])
    expect(m.items[0]).toEqual({ id: "a", title: "Read the constitution", everyone: false, roleIds: ["r-fin"], hiddenFor: [] })
    expect(m.items[1]).toMatchObject({ title: "X".repeat(MAX_ITEM_TITLE), roleIds: [], hiddenFor: ["r-sec"], source: "ASU-R-037" })
  })

  it("keeps a module with items whose name was cleared, under Untitled module", () => {
    const out = sanitizeChecklist(list([mod({ title: " ", items: [item()] })]), ROLES, TODAY)!
    expect(out.modules[0]).toMatchObject({ title: UNTITLED_MODULE, items: [{ id: "i1" }] })
  })

  it("enforces 20 modules, 60 items per module and 300 items in total", () => {
    const many = (prefix: string, n: number) => Array.from({ length: n }, (_, k) => item({ id: `${prefix}-${k}`, title: `Item ${k}` }))
    const wide = sanitizeChecklist(list(Array.from({ length: 25 }, (_, k) => mod({ id: `m${k}`, title: `M${k}` }))), ROLES, TODAY)!
    expect(wide.modules).toHaveLength(MAX_CHECKLIST_MODULES)
    const deep = sanitizeChecklist(list([mod({ items: many("a", 70) })]), ROLES, TODAY)!
    expect(deep.modules[0].items).toHaveLength(MAX_MODULE_ITEMS)
    const big = sanitizeChecklist(list(Array.from({ length: 6 }, (_, k) => mod({ id: `m${k}`, title: `M${k}`, items: many(`m${k}`, 60) }))), ROLES, TODAY)!
    expect(countItems(big)).toBe(MAX_CHECKLIST_ITEMS)
    expect(big.modules[5].items).toHaveLength(0)
  })
})

describe("parseShorthand", () => {
  it("reads who and when tokens and removes them from the title", () => {
    expect(parseShorthand("Meet your buddy @buddy day 3")).toEqual({ title: "Meet your buddy", who: "buddy", when: "day3" })
    expect(parseShorthand("Hand over keys @Predecessor WEEK 2")).toEqual({ title: "Hand over keys", who: "outgoing", when: "week2" })
    expect(parseShorthand("Review goals day 30 @president")).toEqual({ title: "Review goals", who: "president", when: "month1" })
    expect(parseShorthand("Get drive access month 1 @new")).toEqual({ title: "Get drive access", who: "new", when: "month1" })
    expect(parseShorthand("Join the chat day 1")).toEqual({ title: "Join the chat", when: "day1" })
    expect(parseShorthand("Sync calendar week 1")).toEqual({ title: "Sync calendar", when: "week1" })
  })

  it("keeps a title made only of tokens unchanged", () => {
    expect(parseShorthand("Day 30")).toEqual({ title: "Day 30" })
    expect(parseShorthand("@buddy week 2")).toEqual({ title: "@buddy week 2" })
  })

  it("does not guess: partial tokens and disagreeing tokens stay in the title", () => {
    expect(parseShorthand("Plan day 10 @newcomer")).toEqual({ title: "Plan day 10 @newcomer" })
    expect(parseShorthand("Email buddy@example.org")).toEqual({ title: "Email buddy@example.org" })
    expect(parseShorthand("Call day 1 or week 2 @buddy")).toEqual({ title: "Call day 1 or week 2", who: "buddy" })
  })
})

describe("parsePastedList", () => {
  const SEO = [
    "No.\tSection\tChecklist Item\tDescription / Completion Criteria\tOwner\tDue Date\tStatus\tNotes",
    "0. Onboarding Confirmation\t\t\t\t\t\t\t",
    "0.1\tOnboarding Confirmation\tOffer letter signed and returned\tSigned copy saved\t\t\tNot Started\t",
    "0.2\tOnboarding Confirmation\tMeet the team lead\tIntro held\tOnboarding Buddy\t2026-09-01\tNot Started\t",
    "1. Accounts & Access",
    "1.1\tAccounts & Access\tGet email account\tCan sign in\tVice President\tWeek 1\tNot Started\tAsk IT",
    "1.2\tAccounts & Access\tReceive the handoff notes\t\tPrevious officer\tDay 30\tNot Started\t",
    "1.3\tAccounts & Access\tPick a desk\t\tAnyone\tNo deadline\tNot Started\t",
  ].join("\n")

  it("reads the SEO spreadsheet layout by header names, with section rows as modules", () => {
    const parsed = parsePastedList(SEO)
    expect(parsed.modules.map(m => m.title)).toEqual(["Onboarding Confirmation", "Accounts & Access"])
    expect(parsed.modules[0].items).toEqual([
      { title: "Offer letter signed and returned" },
      { title: "Meet the team lead", who: "buddy" },
    ])
    expect(parsed.modules[1].items).toEqual([
      { title: "Get email account", who: "president", when: "week1" },
      { title: "Receive the handoff notes", who: "outgoing", when: "month1" },
      { title: "Pick a desk", when: "none" },
    ])
  })

  it("reads plain lines: modules end with ':', list markers are stripped, shorthand applies", () => {
    const parsed = parsePastedList([
      "Get the group chat link",
      "",
      "First week:",
      "- Meet your buddy @buddy day 3",
      "* Read the constitution",
      "• Sync the calendar",
      "☐ Join the drive",
      "[ ] Learn the budget",
      "1. Read the handbook",
      "2) Visit the office",
      "0.1 Sign the agreement",
      "2026 budget review",
      "- Tools & access:",
      "  Request a Mazevo account week 2",
      "first week:",
      "Say hello",
    ].join("\r\n"))
    expect(parsed.modules.map(m => m.title)).toEqual(["Checklist", "First week", "Tools & access"])
    expect(parsed.modules[0].items).toEqual([{ title: "Get the group chat link" }])
    expect(parsed.modules[1].items.map(i => i.title)).toEqual(["Meet your buddy", "Read the constitution", "Sync the calendar", "Join the drive", "Learn the budget", "Read the handbook", "Visit the office", "Sign the agreement", "2026 budget review", "Say hello"])
    expect(parsed.modules[1].items[0]).toEqual({ title: "Meet your buddy", who: "buddy", when: "day3" })
    expect(parsed.modules[2].items).toEqual([{ title: "Request a Mazevo account", when: "week2" }])
  })

  it("reads tab-separated text without a known header as lines, and empty text as nothing", () => {
    expect(parsePastedList("Read\tthe constitution\nMeet\tbuddy @buddy").modules).toEqual([{ title: "Checklist", items: [{ title: "Read the constitution" }, { title: "Meet buddy", who: "buddy" }] }])
    expect(parsePastedList(" \n\n").modules).toEqual([])
  })
})

describe("addPasted", () => {
  it("adds to a module with the same name and creates new modules with No deadline and New officer", () => {
    const c = list([mod({ title: "First week", items: [item()] })])
    const out = addPasted(c, { modules: [{ title: "first WEEK", items: [{ title: "Meet your buddy", who: "buddy", when: "day3" }] }, { title: "Tools", items: [{ title: "  " }, { title: "Get drive access" }] }] }, counter("new"))
    expect(c.modules[0].items).toHaveLength(1)
    expect(out.modules[0].items[1]).toEqual({ id: "new-0", title: "Meet your buddy", when: "day3", who: "buddy", everyone: true, roleIds: [], hiddenFor: [] })
    expect(out.modules[1]).toEqual({ id: "new-1", title: "Tools", when: "none", who: "new", items: [{ id: "new-2", title: "Get drive access", everyone: true, roleIds: [], hiddenFor: [] }] })
    expect(out.updatedOn).toBe(TODAY)
  })

  it("starts a checklist from nothing and respects the limits", () => {
    const parsed = { modules: Array.from({ length: 25 }, (_, k) => ({ title: `M${k}`, items: Array.from({ length: 70 }, (_, j) => ({ title: `Item ${j}` })) })) }
    const out = addPasted(undefined, parsed, counter())
    expect(out.modules).toHaveLength(5)
    expect(out.modules.every(m => m.items.length <= MAX_MODULE_ITEMS)).toBe(true)
    expect(countItems(out)).toBe(MAX_CHECKLIST_ITEMS)
    expect(sanitizeChecklist(out, ROLES, TODAY)!.modules).toEqual(out.modules)
  })

  it("turns the SEO spreadsheet into a saved-shape checklist", () => {
    const out = addPasted(null, parsePastedList("Item\tOwner\nMeet your buddy\tOnboarding Buddy"), counter())
    expect(out.modules).toEqual([{ id: "id-0", title: "Checklist", when: "none", who: "new", items: [{ id: "id-1", title: "Meet your buddy", who: "buddy", everyone: true, roleIds: [], hiddenFor: [] }] }])
  })
})

describe("Platypus starter", () => {
  it("builds the starter modules with role functions mapped to the club's roles", () => {
    const s = seedDemo(TODAY)
    const c = starterChecklist(s, counter())
    expect(c.updatedOn).toBe(s.today)
    expect(c.modules.map(m => [m.title, m.when, m.who, m.items.length])).toEqual([
      ["First 3 days", "day3", "new", 3], ["Learn the club", "week1", "new", 5], ["Tools & access", "week2", "new", 10],
      ["Handoff from your predecessor", "week2", "outgoing", 3], ["Check-ins", "month1", "president", 2],
    ])
    const find = (title: string) => c.modules.flatMap(m => m.items).find(i => i.title === title)!
    expect(find("Complete Officer Training")).toMatchObject({ everyone: false, roleIds: ["r-pres", "r-fin"], source: "ASU-R-004" })
    expect(find("Get added as a bank co-signer")).toMatchObject({ everyone: false, roleIds: ["r-fin"], who: "president" })
    expect(find("Get admin access to the club social accounts")).toMatchObject({ roleIds: ["r-mkt"], who: "outgoing", when: "day3" })
    expect(find("Update the member roster in Sun Devil Central")).toMatchObject({ roleIds: ["r-sec"] })
    expect(find("Meet your buddy")).toMatchObject({ everyone: true, who: "buddy" })
    expect(find("Week 2 check-in")).toMatchObject({ when: "week2" })
    expect(countEveryone(c)).toBe(13)
    expect(countForRole(c, "r-fin")).toBe(17)
  })

  it("is already sanitized, and every policy label exists in the catalog", () => {
    const s = seedDemo(TODAY)
    const c = starterChecklist(s)
    expect(sanitizeChecklist(c, s.roles.map(r => r.id), s.today)).toEqual(c)
    const ids = new Set(POLICY_CATALOG.map(p => p.recordId))
    expect(STARTER_SOURCES.length).toBeGreaterThan(0)
    for (const source of STARTER_SOURCES) expect(ids.has(source)).toBe(true)
  })

  it("gives no column a dot for a function the club does not have", () => {
    const s = seedDemo(TODAY)
    const c = starterChecklist({ ...s, roles: s.roles.filter(r => r.fn !== "programs") }, counter())
    expect(c.modules[2].items.find(i => i.title === "Request a Mazevo account")).toMatchObject({ everyone: false, roleIds: [] })
  })
})
