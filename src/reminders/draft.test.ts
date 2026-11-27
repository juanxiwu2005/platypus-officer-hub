import { afterEach, describe, expect, it } from "vitest"
import {
  BODY_LIMIT, GROUP_PAUSE_MS, HISTORY_LIMIT, SUBJECT_LIMIT, TOKEN_TITLE_LIMIT, changeDraft, checkDigestEdit, clearDrafts, createDraft, draftBlocker,
  draftEditFor, draftEmail, draftLinks, draftProblems, draftProblemsOf, dropDrafts, findDraft, forgetGmail, fromTokens, isEdited, missingLinks,
  openDraft, putBack, putBackLinks, redoDraft, resolveDraft, resolveDrafts, restoreOriginal, sendAllBlocker, syncDraft, toTokens, typeInto, undoDraft,
  type DraftBase, type DraftTask, type ReminderDraft,
} from "./draft"
import type { PreparedDigest } from "./digestContracts"
import { draftsAfterAction, loadDraftModule } from "./draftLoader"

// Fictional tasks and signed-looking addresses; nothing here is real data.
const url = (node: string, n = 1) => `https://demo.example.org/#/events?event=e1&node=${node}&access=${"a".repeat(8)}${n}.${"f".repeat(64)}`
const TASKS: DraftTask[] = [
  { nodeId: "room", title: "Book the spring weekly meeting room", url: url("room") },
  { nodeId: "quote", title: "Collect catering quotes", url: url("quote") },
]
const RULE_BODY = `Hi Jordan,\n\n2 tasks could use an update today.\n\n1. Book the spring weekly meeting room\nTask due: Nov 3\nThe planned start has passed.\nOpen task: ${TASKS[0].url}\n\n2. Collect catering quotes\nTask due: Nov 5\nToday is our planned start date.\nOpen task: ${TASKS[1].url}\n\nIf anything is in the way, share an update so we can help.\nThank you for your work on these.`
const base = (patch: Partial<DraftBase> = {}): DraftBase => ({ groupId: "g1", recipientId: "jordan", day: "2026-10-31", intendedEmail: "jordan@example.org",
  subject: "2 Platypus tasks need you", body: RULE_BODY, taskUrls: TASKS.map(t => t.url), nodeIds: TASKS.map(t => t.nodeId), ...patch })
const titles: Record<string, string> = { room: TASKS[0].title, quote: TASKS[1].title }
const titleOf = (id: string) => titles[id] ?? "Task"
const fresh = () => createDraft(base(), titleOf)
/** Type text one character at a time, `gap` ms apart, at the end of the body. */
const typeText = (draft: ReminderDraft, text: string, at: number, gap = 50, field: "subject" | "body" = "body") =>
  [...text].reduce((d, ch, i) => typeInto(d, field, d[field] + ch, at + i * gap), draft)

afterEach(() => clearDrafts())

describe("task links as tokens", () => {
  it("round-trips: the box shows tokens on their own lines and the exact signed URLs come back", () => {
    const links = draftLinks(TASKS)
    expect(links.map(l => l.token)).toEqual(["[Open task: Book the spring weekly meeting room]", "[Open task: Collect catering quotes]"])
    const shown = toTokens(RULE_BODY, links)
    expect(shown).not.toMatch(/https?:/)
    expect(shown.split("\n")).toContain("[Open task: Collect catering quotes]")
    expect(fromTokens(shown, links)).toBe(RULE_BODY)
  })

  it("keeps tokens unique and readable for odd titles: brackets, colliding and very long titles", () => {
    const long = "Reserve the large ballroom for the end of semester celebration with the alumni chapter and guests"
    const links = draftLinks([
      { nodeId: "a", title: "Print [draft] flyers", url: url("a") }, { nodeId: "b", title: "Print [draft] flyers", url: url("b") },
      { nodeId: "c", title: "  ", url: url("c") }, { nodeId: "d", title: long, url: url("d") }, { nodeId: "e", title: long, url: url("e") },
    ])
    expect(links.map(l => l.token).slice(0, 3)).toEqual(["[Open task: Print (draft) flyers]", "[Open task: Print (draft) flyers (2)]", "[Open task: Task]"])
    expect(new Set(links.map(l => l.token)).size).toBe(5)
    for (const l of links.slice(3)) expect(l.token.length).toBeLessThanOrEqual(TOKEN_TITLE_LIMIT + "[Open task: ]".length)
    expect(links[3].token.endsWith("…]")).toBe(true)
    expect(links[4].token.endsWith("… (2)]")).toBe(true)
    // The full title stays in the missing-link message.
    expect(draftProblems("Hi", "", links).find(p => p.nodeId === "d")?.message).toBe(`Missing link: ${long}`)
    const body = links.map(l => l.token).join("\n")
    expect(toTokens(fromTokens(body, links), links)).toBe(body)
  })

  it("a token typed against other text gets a space, so no character can stick to the address", () => {
    const [room] = draftLinks(TASKS)
    expect(fromTokens(`See${room.token}.`, [room])).toBe(`See Open task: ${room.url} .`)
  })
})

describe("missing links and Put back links", () => {
  it("names a deleted or altered token and puts every missing one back at the end", () => {
    const links = draftLinks(TASKS)
    const shown = toTokens(RULE_BODY, links)
    const deleted = shown.replace(`${links[0].token}\n`, "")
    expect(missingLinks(deleted, links).map(l => l.nodeId)).toEqual(["room"])
    const altered = shown.replace(links[1].token, "[Open task: Collect catering]")
    expect(draftProblems("S", altered, links).map(p => p.code)).toEqual(["missing_link", "stray_link"])
    const fixed = putBackLinks(altered, links)
    expect(missingLinks(fixed, links)).toEqual([])
    expect(fixed).not.toContain("[Open task: Collect catering]\n")
    expect(fixed.endsWith(`\n\n${links[1].token}`)).toBe(true)
    expect(draftProblems("S", fixed, links)).toEqual([])
    expect(putBackLinks(shown, links)).toBe(shown)
  })

  it("Put back is one undoable step", () => {
    let d = fresh()
    d = typeInto(d, "body", d.body.replace(`${d.links[0].token}\n`, ""), 0)
    d = putBack(d)
    expect(missingLinks(d.body, d.links)).toEqual([])
    const back = undoDraft(d)
    expect(missingLinks(back.body, back.links).map(l => l.nodeId)).toEqual(["room"])
    expect(redoDraft(back).body).toBe(d.body)
  })
})

describe("limits", () => {
  const links = draftLinks(TASKS)
  const body = toTokens(RULE_BODY, links)
  const codes = (subject: string, text: string) => draftProblems(subject, text, links).map(p => p.code)
  it("subject 1-120 characters on one line, body up to 2,000 characters as shown, no other web address", () => {
    expect(codes("S", body)).toEqual([])
    expect(codes("  ", body)).toEqual(["subject_empty"])
    expect(codes("x".repeat(SUBJECT_LIMIT), body)).toEqual([])
    expect(draftProblems("x".repeat(SUBJECT_LIMIT + 1), body, links)[0].message).toBe("Shorten the subject to 120 characters (now 121).")
    expect(codes("a\nb", body)).toEqual(["subject_line"])
    // Measured with tokens, not addresses: the two long signed URLs do not count against the limit.
    const room = BODY_LIMIT - body.length
    expect(codes("S", body + "x".repeat(room))).toEqual([])
    expect(draftProblems("S", body + "x".repeat(room + 1), links)[0].message).toBe("Shorten the email to 2,000 characters (now 2,001).")
    for (const extra of ["See https://example.org/form", "www.example.org", "ftp://files.example.org"]) expect(codes("S", `${body}\n${extra}`)).toEqual(["web_address"])
    expect(codes("Visit www.example.org", body)).toEqual(["web_address"])
    expect(codes("S", `${body}\n${links[0].token}`)).toEqual(["repeated_link"])
  })

  it("checkDigestEdit, the reducer's half: exact URLs once each, followed by a space or the end, and the same limits", () => {
    const rule = { subject: "2 Platypus tasks need you", body: RULE_BODY }
    const edited = fromTokens(`A personal line.\n\n${body}`, links)
    expect(checkDigestEdit(rule, rule, TASKS)).toBe("same")
    expect(checkDigestEdit({ subject: "Hi Jordan", body: edited }, rule, TASKS)).toEqual({ subject: "Hi Jordan", body: edited })
    expect(checkDigestEdit({ subject: "Hi", body: edited.replace(`Open task: ${TASKS[0].url}`, "") }, rule, TASKS)).toBeNull()
    expect(checkDigestEdit({ subject: "Hi", body: `${edited}\nOpen task: ${TASKS[0].url}` }, rule, TASKS)).toBeNull()
    expect(checkDigestEdit({ subject: "Hi", body: edited.replace(TASKS[1].url, `${TASKS[1].url}.`) }, rule, TASKS)).toBeNull()
    expect(checkDigestEdit({ subject: "Hi", body: edited.replace(TASKS[1].url, url("quote", 2)) }, rule, TASKS)).toBeNull()
    expect(checkDigestEdit({ subject: "Hi", body: `${edited}\nhttps://example.org` }, rule, TASKS)).toBeNull()
    expect(checkDigestEdit({ subject: "", body: edited }, rule, TASKS)).toBeNull()
    expect(checkDigestEdit({ subject: "Hi", body: `${edited}${"x".repeat(BODY_LIMIT)}` }, rule, TASKS)).toBeNull()
    for (const bad of [null, "text", { subject: 1, body: edited }, { subject: "Hi" }]) expect(checkDigestEdit(bad, rule, TASKS)).toBeNull()
    // Exactly { subject, body }: no extra field can ride along into the record (review P3-8).
    for (const bad of [{ subject: "Hi", body: edited, extra: 1 }, { ...rule, edited: false }, Object.assign([], { subject: "Hi", body: edited })]) {
      expect(checkDigestEdit(bad, rule, TASKS)).toBeNull()
    }
  })
})

describe("undo history", () => {
  it("groups typing by pauses and words; Ctrl+Z steps back one group at a time", () => {
    let d = fresh()
    const start = d.body
    d = typeText(d, "Hello there", 1000)            // "Hello " then "there": a new word is a new step
    d = typeText(d, "!", 1000 + 11 * 50 + GROUP_PAUSE_MS)  // after a pause: its own step
    expect(d.body).toBe(`${start}Hello there!`)
    expect(d.undo).toHaveLength(3)
    d = undoDraft(d); expect(d.body).toBe(`${start}Hello there`)
    d = undoDraft(d); expect(d.body).toBe(`${start}Hello `)
    expect(d.caret).toEqual({ field: "body", start: start.length + 6, end: start.length + 6 })
    d = undoDraft(d); expect(d.body).toBe(start)
    expect(isEdited(d)).toBe(false)
    d = redoDraft(redoDraft(d)); expect(d.body).toBe(`${start}Hello there`)
    // New typing after undo clears redo.
    d = typeText(d, "?", 99_999)
    expect(d.redo).toEqual([])
  })

  it("backspaces merge; a paste, a caret jump or the other field starts a new step", () => {
    let d = typeText(fresh(), "abcd", 0)
    const typed = d.body
    d = [1, 2].reduce(x => typeInto(x, "body", x.body.slice(0, -1), 300), d)
    expect(d.undo).toHaveLength(2)
    d = typeInto(d, "body", `${d.body}PASTED TEXT`, 310)
    expect(d.undo).toHaveLength(3)
    d = typeInto(d, "body", `X${d.body}`, 320)          // typing somewhere else
    expect(d.undo).toHaveLength(4)
    d = typeText(d, "!", 330, 10, "subject")
    expect(d.undo).toHaveLength(5)
    expect(undoDraft(undoDraft(undoDraft(undoDraft(d)))).body).toBe(typed)
  })

  it("keeps at least 100 steps, and each Restore original is one step", () => {
    let d = fresh()
    for (let i = 0; i < HISTORY_LIMIT + 30; i++) d = typeInto(d, "body", `${d.body}${i % 2 ? "a" : " "}`, i * GROUP_PAUSE_MS * 2)
    expect(d.undo.length).toBe(HISTORY_LIMIT)
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(100)
    let back = d
    for (let i = 0; i < 100; i++) back = undoDraft(back)
    expect(back.body.length).toBe(d.body.length - 100)
    const restored = restoreOriginal(d)
    expect(isEdited(restored)).toBe(false)
    expect(undoDraft(restored).body).toBe(d.body)
    expect(restoreOriginal(restored)).toBe(restored)
  })
})

describe("stale drafts", () => {
  it("an untouched draft simply shows the new email", () => {
    const next = syncDraft(fresh(), base({ subject: "New subject" }), titleOf)
    expect(next.subject).toBe("New subject")
    expect(next.notice).toBeNull()
  })

  it("same tasks: the edit is kept, tokens follow a renamed task, and the page says the tasks changed", () => {
    let d = typeText(fresh(), " Thanks!", 0)
    d = { ...d, gmailOpened: true }
    const renamed: Record<string, string> = { ...titles, quote: "Collect three catering quotes" }
    const newBody = RULE_BODY.replace("2. Collect catering quotes", "2. Collect three catering quotes").replace(TASKS[1].url, url("quote", 3))
    const next = syncDraft(d, base({ body: newBody, taskUrls: [TASKS[0].url, url("quote", 3)] }), id => renamed[id] ?? "Task")
    expect(next.notice).toBe("changed")
    expect(next.body).toContain("[Open task: Collect three catering quotes]")
    expect(next.body.endsWith(" Thanks!")).toBe(true)
    expect(draftProblemsOf(next)).toEqual([])
    expect(next.gmailOpened).toBe(false)
    expect(undoDraft(next).body).toContain("[Open task: Collect three catering quotes]")
    expect(draftEmail(next).body).toContain(url("quote", 3))
    const useNew = restoreOriginal(next)
    expect(useNew.notice).toBeNull()
    expect(fromTokens(useNew.body, useNew.links)).toBe(newBody)
  })

  it("other tasks: the edit is replaced and the page says so", () => {
    const d = typeText(fresh(), " Thanks!", 0)
    const next = syncDraft(d, base({ groupId: "g2", taskUrls: [TASKS[0].url], nodeIds: ["room"], body: RULE_BODY.split("\n\n2.")[0] }), titleOf)
    expect(next.notice).toBe("replaced")
    expect(isEdited(next)).toBe(false)
    expect(typeText(next, "x", 0).notice).toBeNull()
  })
})

describe("sending a draft", () => {
  it("an edited draft becomes an edit with the URLs of the email being recorded; an untouched one sends nothing extra", () => {
    const d = typeText(fresh(), " Thanks!", 0)
    expect(draftEditFor(fresh(), base())).toBeNull()
    const other = [url("room", 7), url("quote", 7)]
    const edit = draftEditFor(d, { nodeIds: ["quote", "room"], taskUrls: [other[1], other[0]] })!
    expect(edit.body).toContain(`Open task: ${other[0]}`)
    expect(edit.body).toContain(`Open task: ${other[1]}`)
    const both = { nodeIds: ["room", "quote"] }
    expect(draftBlocker(d, both)).toBeNull()
    expect(draftBlocker(d, { nodeIds: ["room"] }, "Jordan")).toBe("Jordan's email's tasks changed. Review it before sending.")
    const broken = typeInto(d, "body", d.body.replace(d.links[0].token, ""), 0)
    expect(draftBlocker(broken, both, "Jordan")).toBe("Put back the task link in Jordan's email first.")
    expect(draftBlocker(typeInto(d, "subject", "", 0), both)).toBe("Add a subject.")
    // An edit from an earlier day holds the send until the row is opened; an untouched one does not.
    expect(draftBlocker(d, { ...both, day: "2026-11-01" }, "Jordan")).toBe("Jordan's email changed. Open it and review before sending.")
    expect(draftBlocker(fresh(), { ...both, day: "2026-11-01" })).toBeNull()
  })

  it("the in-memory store keeps a draft by group, finds it after the group id changed, and Send all is held or not", () => {
    openDraft(base(), titleOf)
    changeDraft("g1", d => typeText(d, " Thanks!", 0))
    // Re-preparing the same email keeps the edit.
    expect(openDraft(base(), titleOf).body.endsWith(" Thanks!")).toBe(true)
    const group = { id: "g1", recipientId: "jordan", recipientName: "Jordan Patel", candidates: [{ nodeId: "room" }, { nodeId: "quote" }] }
    expect(sendAllBlocker([group, { ...group, id: "g9", recipientId: "maya", recipientName: "Maya Chen" }], "2026-10-31")).toBeNull()
    changeDraft("g1", d => typeInto(d, "body", d.body.replace(d.links[1].token, ""), 0))
    expect(sendAllBlocker([group], "2026-10-31")).toBe("Put back the task link in Jordan's email first.")
    // A new group id for the same person today still finds the draft (and moves it on the next prepare); a later day
    // finds it too, so the next prepare can say the edit was replaced.
    expect(findDraft("g2", "jordan", "2026-10-31")?.base.groupId).toBe("g1")
    expect(findDraft("g2", "jordan", "2026-11-01")?.base.groupId).toBe("g1")
    expect(findDraft("g2", "maya", "2026-10-31")).toBeUndefined()
    openDraft(base({ groupId: "g2" }), titleOf)
    expect(findDraft("g1", "maya", "2026-10-31")).toBeUndefined()
    expect(findDraft("g2", "jordan", "2026-10-31")?.base.groupId).toBe("g2")
    dropDrafts(["g2"])
    expect(findDraft("g2", "jordan", "2026-10-31")).toBeUndefined()
  })
})

/** A freshly prepared email for Jordan, as Send all or a row's Send gets it (only the fields a draft reads). */
const prep = (patch: Partial<DraftBase> = {}): PreparedDigest => {
  const b = base(patch)
  return { groupId: b.groupId, recipientId: b.recipientId, entries: [], digest: { groupId: b.groupId, recipientId: b.recipientId, recipientName: "Jordan Patel",
    intendedEmail: b.intendedEmail, preparedOn: b.day, subject: b.subject, body: b.body, taskUrls: b.taskUrls, nodeIds: b.nodeIds } } as unknown as PreparedDigest
}
const RENAMED_BODY = RULE_BODY.replace("2. Collect catering quotes", "2. Collect three catering quotes")
const renamedTitle = (id: string) => id === "quote" ? "Collect three catering quotes" : titleOf(id)

describe("resolving a draft against the email about to be recorded (review P2-3)", () => {
  it("a reissued link: the edit goes out with the new address, never the one the draft was made from", () => {
    openDraft(base(), titleOf)
    changeDraft("g1", d => typeText(d, " Thanks!", 0))
    const reissued = [TASKS[0].url, url("quote", 9)]
    const { edit, blocker } = resolveDraft(prep({ taskUrls: reissued, body: RULE_BODY.replace(TASKS[1].url, reissued[1]) }), titleOf)
    expect(blocker).toBeNull()
    expect(edit!.body).toContain(`Open task: ${reissued[1]}`)
    expect(edit!.body).not.toContain(TASKS[1].url)
    expect(edit!.body.endsWith(" Thanks!")).toBe(true)
    expect(checkDigestEdit(edit, { subject: "2 Platypus tasks need you", body: RULE_BODY }, [TASKS[0], { ...TASKS[1], url: reissued[1] }])).toEqual(edit)
    expect(findDraft("g1", "jordan", "2026-10-31")!.notice).toBeNull()
  })

  it("a task renamed after the edit: the send is held, named, and the row shows the tasks-changed note when it opens", () => {
    openDraft(base(), titleOf)
    changeDraft("g1", d => typeText(d, " Thanks!", 0))
    const renamed = prep({ body: RENAMED_BODY })
    expect(resolveDrafts([renamed], renamedTitle)).toEqual({ edits: {}, blocker: "Jordan's email changed. Open it and review before sending." })
    const held = findDraft("g1", "jordan", "2026-10-31")!
    expect(held).toMatchObject({ notice: "changed", needsReview: true })
    expect(held.body).toContain("[Open task: Collect three catering quotes]")
    // Still held on the next try, and Send all stays off, until the box has been seen.
    const group = { id: "g1", recipientId: "jordan", recipientName: "Jordan Patel", candidates: [{ nodeId: "room" }, { nodeId: "quote" }] }
    expect(resolveDraft(renamed, renamedTitle).blocker).toBe("This email changed. Open it and review before sending.")
    expect(sendAllBlocker([group], "2026-10-31")).toBe("Jordan's email changed. Open it and review before sending.")
    changeDraft("g1", d => ({ ...d, needsReview: false }))   // what the open box does
    expect(sendAllBlocker([group], "2026-10-31")).toBeNull()
    const { edit } = resolveDraft(renamed, renamedTitle)
    expect(edit!.body.endsWith(" Thanks!")).toBe(true)
    expect(edit!.body).toContain(`Open task: ${TASKS[1].url}`)
  })

  it("an untouched draft simply follows the new email (no edit); no draft sends the rule-written email", () => {
    openDraft(base(), titleOf)
    expect(resolveDrafts([prep({ body: RENAMED_BODY })], renamedTitle)).toEqual({ edits: {}, blocker: null })
    expect(findDraft("g1", "jordan", "2026-10-31")!.body).toContain("[Open task: Collect three catering quotes]")
    clearDrafts()
    expect(resolveDraft(prep(), titleOf)).toEqual({ edit: null, blocker: null })
  })

  it("I sent this records only the text Gmail was given", () => {
    openDraft(base(), titleOf)
    changeDraft("g1", d => ({ ...typeText(d, " Thanks!", 0), gmailOpened: true }))
    expect(resolveDraft(prep(), titleOf, { gmail: true }).edit!.body.endsWith(" Thanks!")).toBe(true)
    // A reissued link changes the address Gmail would get: Open in Gmail again first.
    expect(resolveDraft(prep({ taskUrls: [TASKS[0].url, url("quote", 9)], body: RULE_BODY.replace(TASKS[1].url, url("quote", 9)) }), titleOf, { gmail: true }).blocker)
      .toBe("This email changed after it was opened in Gmail. Open it in Gmail again, then choose I sent this.")
  })

  it("the next day: an edit from yesterday is replaced when the row opens, and says so", () => {
    openDraft(base(), titleOf)
    changeDraft("g1", d => typeText(d, " Thanks!", 0))
    const next = openDraft(base({ groupId: "g-next", day: "2026-11-01" }), titleOf)
    expect(next).toMatchObject({ notice: "replaced", needsReview: true })
    expect(isEdited(next)).toBe(false)
    expect(findDraft("g1", "jordan", "2026-10-31")?.base.groupId).toBe("g-next")
  })
})

describe("Open in Gmail hands over one exact text (review P2-2)", () => {
  it("any change after Open in Gmail clears it, so I sent this waits for Gmail again", () => {
    const opened = (d: ReminderDraft) => ({ ...d, gmailOpened: true })
    const edited = typeText(fresh(), " Thanks!", 0)
    const broken = typeInto(edited, "body", edited.body.replace(edited.links[0].token, ""), 5000)
    for (const change of [
      (d: ReminderDraft) => typeInto(d, "body", `${d.body}!`, 99_000),
      (d: ReminderDraft) => typeInto(d, "subject", "New", 99_000),
      undoDraft, redoDraft, restoreOriginal, putBack,
    ]) {
      const start = change === redoDraft ? undoDraft(broken) : change === putBack ? broken : edited
      const after = change(opened(start))
      expect(after.subject !== start.subject || after.body !== start.body).toBe(true)
      expect(after.gmailOpened).toBe(false)
    }
    // Use new email is Restore original on a draft whose email changed.
    const changed = syncDraft(edited, base({ body: RENAMED_BODY }), renamedTitle)
    expect(restoreOriginal(opened(changed)).gmailOpened).toBe(false)
    // Nothing changed: nothing is cleared.
    expect(undoDraft(opened(fresh())).gmailOpened).toBe(true)
  })

  it("a new sending mode forgets every opened Gmail draft", () => {
    openDraft(base(), titleOf)
    changeDraft("g1", d => ({ ...d, gmailOpened: true }))
    forgetGmail()
    expect(findDraft("g1", "jordan", "2026-10-31")!.gmailOpened).toBe(false)
  })
})

describe("what the store tells the drafts after an action (review P2-1, P3-9)", () => {
  const scope = (viewerId: string, reminderMode: string | null) => ({ viewerId, org: { settings: { reminderMode } } })
  it("reset, import, setup and another viewer clear every draft; a mode change only forgets Gmail; other actions keep them", async () => {
    await loadDraftModule()
    const start = scope("alex", "review_then_self")
    const edit = () => { openDraft(base(), titleOf); changeDraft("g1", d => ({ ...typeText(d, " Thanks!", 0), gmailOpened: true })) }
    edit()
    draftsAfterAction("updateNode", start, scope("alex", "review_then_self"))
    expect(findDraft("g1", "jordan", "2026-10-31")).toMatchObject({ gmailOpened: true })
    draftsAfterAction("saveClubSettings", start, scope("alex", "review_then_auto"))
    expect(findDraft("g1", "jordan", "2026-10-31")).toMatchObject({ gmailOpened: false })
    expect(isEdited(findDraft("g1", "jordan", "2026-10-31")!)).toBe(true)
    for (const [type, after] of [["reset", start], ["replace", start], ["completeSetup", start], ["setViewer", scope("maya", "review_then_self")]] as const) {
      edit()
      draftsAfterAction(type, start, { ...after })
      expect(findDraft("g1", "jordan", "2026-10-31")).toBeUndefined()
    }
  })
})
