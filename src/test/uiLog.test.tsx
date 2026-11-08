import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { seedDemo } from "../data/seed"
import { FLOW_VERSION } from "../onboarding/record"
import type { LogEntry } from "../data/types"
import { appendLog, appendUiLog, buildExport, LOG_KEY, LOG_LIMIT, loggedReducer, StoreProvider, UI_REPEAT_MS, useStore, type Action } from "../data/store"
import { answerSummary, describeChange, describeClick, emitUi, installUiCapture, routeOf, taskMarks, type UiEvent } from "../lib/uiLog"
import { buildTimeline, describeEntry } from "../lib/timeline"

// Phase 3 research log: screen events go into the SAME interaction log (docs/PHASE3_DATA_DICTIONARY.md).
const T = Date.UTC(2026, 10, 7, 15, 0, 0)
const ORIGIN = "http://localhost:3000"
const html = (markup: string) => { document.body.innerHTML = markup; return document.body }
const click = (ev: UiEvent | null) => ev as UiEvent
beforeEach(() => { window.localStorage.clear(); document.body.innerHTML = "" })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("reading a press", () => {
  it("names a button by its text, its role, the page and the part of the screen", () => {
    html(`<main><button data-testid="go"><svg aria-hidden="true"><title>x</title></svg> Continue </button></main>`)
    const ev = click(describeClick(document.querySelector("button svg"), "/welcome/founder/name", ORIGIN))
    expect(ev).toEqual({ type: "ui.click", payload: { route: "/welcome/founder/name", role: "button", name: "Continue", testid: "go", area: "main" } })
  })
  it("an app link records the page it goes to, without the query", () => {
    html(`<nav><a href="#/tasks?node=t-secret-id">Tasks</a></nav>`)
    expect(describeClick(document.querySelector("a"), "/", ORIGIN)?.payload).toMatchObject({ role: "link", name: "Tasks", to: "/tasks", area: "nav" })
    expect(JSON.stringify(describeClick(document.querySelector("a"), "/", ORIGIN))).not.toContain("t-secret-id")
  })
  it("an outside link (a cited ASU source) is marked external, with host and path only", () => {
    html(`<div data-testid="bot-reply"><a class="btn" href="https://asu.example.edu/policy/food?ref=abc#part" target="_blank">R06 source ↗</a></div>`)
    expect(describeClick(document.querySelector("a"), "/rules", ORIGIN)?.payload).toEqual({ route: "/rules", role: "link", name: "R06 source ↗", area: "answer", external: true, href: "asu.example.edu/policy/food" })
  })
  it("a reminder's draft link keeps only the scheme or host: the message body is never recorded", () => {
    html(`<aside data-testid="nudge-panel"><a href="sms:?body=Hi%20Priya%20TOKEN">Open Text message draft</a><a href="https://mail.google.com/mail/?view=cm&body=TOKEN">Open Gmail draft</a></aside>`)
    const [sms, gmail] = [...document.querySelectorAll("a")].map(a => describeClick(a, "/tasks", ORIGIN)!.payload)
    expect(sms).toMatchObject({ external: true, href: "sms:", area: "reminder" })
    expect(gmail).toMatchObject({ external: true, href: "mail.google.com/mail/", area: "reminder" })
    expect(JSON.stringify([sms, gmail])).not.toContain("TOKEN")
  })
  it("text fields, checkboxes, labels and empty space are not clicks (choices are recorded as changes; typing never)", () => {
    html(`<form><label for="n">Club name</label><input id="n" value="Typed Secret Club"><textarea>typed</textarea>
      <label><input type="checkbox"> Guest speaker</label><input type="password" value="hunter2"><div id="space">text</div><select><option>A</option></select></form>`)
    for (const sel of ["#n", "textarea", "label[for]", "label input", "input[type=password]", "#space", "select", "option"]) expect(describeClick(document.querySelector(sel), "/", ORIGIN)).toBeNull()
  })
  it("disclosure and expanded state: records what the press leads to", () => {
    html(`<details><summary>Sources & task details</summary><p>x</p></details><button aria-expanded="false" aria-label="Show side panel">≡</button>`)
    expect(describeClick(document.querySelector("summary"), "/", ORIGIN)?.payload).toMatchObject({ role: "summary", expanded: true })
    expect(describeClick(document.querySelector("button"), "/", ORIGIN)?.payload).toMatchObject({ name: "Show side panel", expanded: true })
  })
  it("a switched-off control is recorded as not applied; the export's own download link is not recorded", () => {
    html(`<span role="button" aria-disabled="true">Apply</span><a download="x.json" href="blob:abc">x</a>`)
    expect(describeClick(document.querySelector("span"), "/", ORIGIN)).toMatchObject({ applied: false })
    expect(describeClick(document.querySelector("a"), "/", ORIGIN)).toBeNull()
  })
  it("routes keep only the path and the names of query parameters", () => {
    expect(routeOf("#/officer?t=SECRETTOKEN&n=2")).toEqual({ path: "/officer", params: ["t", "n"] })
    expect(routeOf("")).toEqual({ path: "/", params: [] })
  })
})

describe("reading a choice", () => {
  it("checkbox: its label, ticked or not, and its group; select: the chosen option's label, not the other options", () => {
    html(`<fieldset><legend>Situation-based checklist</legend><label><input type="checkbox" id="c"> Alcohol</label></fieldset>
      <label class="composer-channel">Preferred channel<select id="s"><option value="whatsapp">WhatsApp · preferred</option><option value="email">Gmail</option></select></label>`)
    const box = document.querySelector<HTMLInputElement>("#c")!; box.checked = true
    expect(describeChange(box, "/")?.payload).toEqual({ route: "/", role: "checkbox", name: "Alcohol", checked: true, group: "Situation-based checklist" })
    const sel = document.querySelector<HTMLSelectElement>("#s")!; sel.value = "email"
    expect(describeChange(sel, "/tasks")?.payload).toEqual({ route: "/tasks", role: "combobox", name: "Preferred channel", value: "Gmail" })
  })
  it("never reads text, number, date, password or file fields", () => {
    html(`<input type="text" value="SECRET"><input type="number" value="42"><input type="date" value="2026-12-01"><input type="password" value="pw"><input type="file"><textarea>SECRET</textarea>`)
    for (const el of document.querySelectorAll("input, textarea")) expect(describeChange(el, "/")).toBeNull()
  })
  it("the page listener records presses and choices, and nothing typed ever reaches it", () => {
    html(`<form><label>Club name<input id="name"></label><label>Password<input id="pw" type="password"></label><label><input id="box" type="checkbox">Speaker</label><button type="button">Continue</button></form>`)
    const got: UiEvent[] = []
    const stop = installUiCapture(document, e => got.push(e), { trustedOnly: false })
    const name = document.querySelector<HTMLInputElement>("#name")!, pw = document.querySelector<HTMLInputElement>("#pw")!
    name.value = "Moonlight Typing Society"; name.dispatchEvent(new Event("input", { bubbles: true })); name.dispatchEvent(new Event("change", { bubbles: true })); name.click()
    pw.value = "hunter2"; pw.dispatchEvent(new Event("change", { bubbles: true }))
    document.querySelector<HTMLInputElement>("#box")!.click()
    document.querySelector("button")!.click()
    stop()
    document.querySelector("button")!.click()   // after stop: not recorded
    expect(got.map(e => e.type)).toEqual(["ui.change", "ui.click"])
    expect(got[0].payload).toMatchObject({ name: "Speaker", checked: true })
    const text = JSON.stringify(got)
    expect(text).not.toContain("Moonlight"); expect(text).not.toContain("hunter2")
  })
  it("by default only real input counts: the app's own programmatic clicks are not a participant's action", () => {
    html(`<button>Go</button>`)
    const got: UiEvent[] = []
    const stop = installUiCapture(document, e => got.push(e))
    document.querySelector("button")!.click()   // jsdom's click() is not trusted, like the app's own a.click()
    stop()
    expect(got).toEqual([])
  })
})

describe("writing screen events into the interaction log", () => {
  const nav = (to: string, from: string | null = "/"): UiEvent => ({ type: "ui.navigate", payload: { from, to } })
  const press = (name: string, extra: Record<string, unknown> = {}): UiEvent => ({ type: "ui.click", payload: { route: "/", role: "button", name, ...extra } as UiEvent["payload"] })

  it("same entry shape and one numbering with data actions; no `before`; applied true unless switched off", () => {
    const s = seedDemo("2026-10-22")
    let log = appendUiLog([], "alex", nav("/settings", null), T)
    log = appendLog(log, s, { ...s, aiEnabled: false }, { type: "setAi", enabled: false }, T + 1000)
    log = appendUiLog(log, "alex", { ...press("Apply"), applied: false }, T + 2000)
    expect(log.map(e => [e.seq, e.type, e.applied])).toEqual([[1, "ui.navigate", true], [2, "setAi", true], [3, "ui.click", false]])
    expect(Object.keys(log[0]).sort()).toEqual(["actor", "applied", "at", "payload", "seq", "type"])
    expect(log[2].before).toBeUndefined()
    expect(log[0].actor).toBe("alex")
  })
  it("coalesces noise: an identical event at once is one entry; a double click is counted, not duplicated", () => {
    let log = appendUiLog([], "alex", nav("/tasks"), T)
    log = appendUiLog(log, "alex", nav("/tasks"), T + 5)              // React development double-run
    expect(log).toHaveLength(1)
    log = appendUiLog(log, "alex", press("Done"), T + 1000)
    log = appendUiLog(log, "alex", press("Done"), T + 1200)
    log = appendUiLog(log, "alex", press("Done"), T + 1300)
    expect(log).toHaveLength(2)
    expect(log[1].payload).toMatchObject({ name: "Done", repeat: 3 })
    log = appendUiLog(log, "alex", press("Done"), T + 1000 + UI_REPEAT_MS + 1)   // later: a new press
    log = appendUiLog(log, "alex", press("Stuck"), T + 1700)                   // different control: a new press
    expect(log.map(e => (e.payload as { name?: string }).name ?? "nav")).toEqual(["nav", "Done", "Done", "Stuck"])
  })
  it("a link or button that changes the page carries where it led, instead of a second entry", () => {
    let log = appendUiLog([], "alex", press("Tasks", { role: "link", to: "/tasks" }), T)
    log = appendUiLog(log, "alex", nav("/tasks"), T + 50)
    expect(log).toHaveLength(1)
    log = appendUiLog(log, "alex", press("Continue"), T + 3000)
    log = appendUiLog(log, "alex", nav("/welcome/founder/goals"), T + 3100)
    expect(log).toHaveLength(2)
    expect(log[1].payload).toMatchObject({ name: "Continue", to: "/welcome/founder/goals" })
    log = appendUiLog(log, "alex", press("Funding", { role: "link", to: "/funding" }), T + 6000)
    log = appendUiLog(log, "alex", nav("/funding"), T + 6010)
    log = appendUiLog(log, "alex", nav("/events", "/funding"), T + 6020)    // a redirect is its own step
    expect(log.map(e => e.type)).toEqual(["ui.click", "ui.click", "ui.click", "ui.navigate"])
    log = appendUiLog(log, "alex", nav("/rules", "/events"), T + 20000)   // typed address or Back: its own entry
    expect(log).toHaveLength(5)
  })
  it("truncates a long question with the log's usual rule and keeps the 2,000-entry cap", () => {
    const one = appendUiLog([], "alex", { type: "ui.ask", payload: { question: "q".repeat(5000), via: "typed" } }, T)
    expect((one[0].payload as { question: string }).question).toHaveLength(201)
    const full: LogEntry[] = Array.from({ length: LOG_LIMIT }, (_, i) => ({ seq: i + 1, at: T, actor: "alex", type: "setAi", payload: {}, applied: true }))
    const next = appendUiLog(full, "alex", nav("/"), T + 1)
    expect(next).toHaveLength(LOG_LIMIT)
    expect(next[0].seq).toBe(2)
    expect(next[LOG_LIMIT - 1]).toMatchObject({ seq: LOG_LIMIT + 1, type: "ui.navigate" })
  })
  it("an answer is recorded by kind and citations, never by its text", () => {
    const answer = "SECRET ANSWER TEXT from the assistant"
    const p = answerSummary({ cards: [{ kind: "rule", question: "What do outside caterers need?", answer, citations: ["R06", "P-12"], inScope: true, label: "AI checked" } as never], source: "Matched by keywords · AI unavailable" }, 812.4)
    expect(p).toEqual({ answer: "rule-answer", cards: ["rule-answer"], citations: ["R06", "P-12"], source: "Matched by keywords · AI unavailable", fallback: true, ms: 812, inScope: true })
    expect(JSON.stringify(p)).not.toContain("SECRET")
    expect(answerSummary({ cards: [{ kind: "text" }, { kind: "changes" }], source: "Checked command grammar", changeSet: { id: "change-1" } }, 5)).toMatchObject({ answer: "change-card", fallback: false, changeSetId: "change-1" })
  })
})

describe("the store records screen events, and the export includes the export itself", () => {
  it("events emitted anywhere reach the log; a click does not re-render screens that read the store; Export downloads everything", async () => {
    let api!: ReturnType<typeof useStore>
    let renders = 0
    const Probe = () => { api = useStore(); renders++; return null }
    const blobs: Blob[] = []
    vi.spyOn(URL, "createObjectURL").mockImplementation(b => { blobs.push(b as Blob); return "blob:test" })
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    emitUi("ui.navigate", { from: null, to: "/" })      // before the store subscribed: kept and delivered
    render(<StoreProvider initial={seedDemo("2026-10-22")}><Probe /></StoreProvider>)
    const before = renders
    act(() => emitUi("ui.click", { route: "/", role: "button", name: "Show side panel" }))
    expect(renders).toBe(before)
    act(() => api.dispatch({ type: "setAi", enabled: false }))
    act(() => emitUi("ui.click", { route: "/settings", role: "button", name: "Export my data", testid: "export-data" }))
    act(() => api.exportData())
    expect(api.getLog().map(e => e.type)).toEqual(["ui.navigate", "ui.click", "setAi", "ui.click", "ui.export"])
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!).map((e: LogEntry) => e.seq)).toEqual([1, 2, 3, 4, 5])
    const file = JSON.parse(await blobs[0].text())
    expect(file.formatVersion).toBe(2)
    expect(file.interactionLog.entries.map((e: LogEntry) => e.type)).toEqual(["ui.navigate", "ui.click", "setAi", "ui.click", "ui.export"])
    expect(file.timeline.map((r: { desc: string }) => r.desc)).toEqual([
      "Opened the app at /", 'Clicked button "Show side panel" on /', "Data action setAi", 'Clicked button "Export my data" on /settings', "Exported data (5 log entries)",
    ])
  })
})

describe("timeline", () => {
  it("merges onboarding events and the log by time, with ISO times and short descriptions", () => {
    const log: LogEntry[] = [
      { seq: 1, at: T + 10, actor: "alex", type: "ui.navigate", payload: { from: null, to: "/welcome/start" }, applied: true },
      { seq: 2, at: T + 2000, actor: "alex", type: "ui.click", payload: { route: "/welcome/founder/name", role: "button", name: "Continue", to: "/welcome/founder/constitution" }, applied: true },
      { seq: 3, at: T + 9000, actor: "alex", type: "completeSetup", payload: {}, applied: false },
    ]
    const onboarding = { attempts: [{ id: "ob-1", entry: "start" as const, flowVersion: "ob-2", replay: 0, startedAt: T, finishedAt: T + 9500, outcome: "completed" as const, steps: [{ step: "founder.name", event: "enter" as const, at: T + 20 }, { step: "founder.name", event: "complete" as const, at: T + 2001 }] }] }
    const rows = buildTimeline(log, onboarding)
    expect(rows.map(r => `${r.source}:${r.type}`)).toEqual(["onboarding:onboarding.start", "log:ui.navigate", "onboarding:onboarding.enter", "log:ui.click", "onboarding:onboarding.complete", "log:completeSetup", "onboarding:onboarding.finish"])
    expect(rows[0].time).toBe(new Date(T).toISOString())
    expect(rows.map(r => r.desc)).toContain('Clicked button "Continue" → /welcome/founder/constitution on /welcome/founder/name')
    expect(rows.find(r => r.type === "completeSetup")).toMatchObject({ applied: false, desc: "Data action completeSetup — not applied", seq: 3 })
    expect(describeEntry({ seq: 9, at: T, actor: "alex", type: "ui.click", payload: { route: "/rules", role: "link", name: "R06 source ↗", external: true, href: "asu.example.edu/x" }, applied: true })).toBe('Opened outside link "R06 source ↗" → asu.example.edu/x on /rules')
  })
})

describe("how many entries a 75-minute session writes (the cap is 2,000)", () => {
  /**
   * A simulated participant, built from what the e2e session measured per kind of press. Two speeds:
   * typical (one press every 8 seconds for 60 minutes in the app) and very busy (one every 4 seconds, all 75 minutes).
   */
  function simulate(seconds: number, everySeconds: number, withNew: boolean) {
    const s = seedDemo("2026-10-22")
    let root = { app: s, log: [] as LogEntry[] }
    let t = T
    const ui = (e: UiEvent, dt = 0) => { root = { app: root.app, log: appendUiLog(root.log, "alex", e, t + dt) } }
    const act = (a: Action, dt = 0) => { root = loggedReducer(root, { action: a, at: t + dt }) }
    const pages = ["/", "/events", "/tasks", "/team", "/rules", "/settings", "/partners"]
    const mix: ((i: number) => void)[] = [
      i => ui({ type: "ui.click", payload: { route: "/", role: "button", name: `Button ${i % 9}` } }),                                               // 35% plain press
      i => ui({ type: "ui.click", payload: { route: "/", role: "button", name: `Button ${i % 9}` } }),
      i => ui({ type: "ui.click", payload: { route: "/", role: "button", name: `Button ${i % 9}` } }),
      i => { ui({ type: "ui.click", payload: { route: "/", role: "link", name: "Page", to: pages[i % pages.length] } }); ui({ type: "ui.navigate", payload: { from: "/", to: pages[i % pages.length] } }, 40) }, // 20% nav link
      i => { ui({ type: "ui.click", payload: { route: "/", role: "link", name: "Page", to: pages[(i + 1) % pages.length] } }); ui({ type: "ui.navigate", payload: { from: "/", to: pages[(i + 1) % pages.length] } }, 40) },
      i => { ui({ type: "ui.click", payload: { route: "/tasks", role: "button", name: `Task ${i % 30}` } }); ui({ type: "ui.details", payload: { action: "open", kind: "task", id: `t-${i % 30}` } }, 5) }, // 10% open details
      i => { ui({ type: "ui.click", payload: { route: "/welcome", role: "button", name: "Continue" } }); ui({ type: "ui.navigate", payload: { from: "/welcome/a", to: `/welcome/${i}` } }, 60) }, // 10% button that changes page
      i => ui({ type: "ui.change", payload: { route: "/", role: "checkbox", name: `Box ${i % 12}`, checked: i % 2 === 0 } }),                       // 10% choices
      i => { ui({ type: "ui.ask", payload: { question: `Question ${i}`, via: "typed" } }); ui({ type: "ui.answer", payload: { answer: "rule-answer", citations: ["R06"] } }, 900); if (i % 3 === 0) act({ type: "setAi", enabled: i % 2 === 0 }, 1500) }, // 10% ask (+ some data change)
      i => { ui({ type: "ui.click", payload: { route: "/tasks", role: "button", name: "Done" } }); act({ type: "advanceClock", days: 1 } as Action, 10); if (i % 4 === 0) ui({ type: "ui.click", payload: { route: "/tasks", role: "button", name: "Done" } }, 150) }, // 10% data action (+ double clicks)
    ]
    // 2026-11-07 items (section 11 of the data dictionary). Each is an action in the same rhythm, not on top of it:
    // typing in a field (start + end) and resting on a hover card for half a second or more.
    const extra: ((i: number) => void)[] = [
      i => { ui({ type: "ui.edit", payload: { route: "/tasks", field: `Field ${i % 15}`, kind: "text", event: "start" } }); ui({ type: "ui.edit", payload: { route: "/tasks", field: `Field ${i % 15}`, kind: "text", event: "end", ms: 6000 } }, 3000) },
      i => ui({ type: "ui.hover", payload: { route: "/", name: `Dot ${i % 20}`, ms: 900, via: "mouse" } }),
    ]
    const all = withNew ? [...mix, ...extra] : mix
    const n = Math.round(seconds / everySeconds)
    for (let i = 0; i < n; i++) {
      all[i % all.length](i)
      if (withNew) {
        // Six study tasks, spread over the session: Start task k ends the one before implicitly; Done after the last.
        const k = Math.floor((i * 6) / n) + 1
        if (i === 0 || Math.floor(((i - 1) * 6) / n) + 1 !== k) for (const e of taskMarks(root.log, k, t + 500, "/")) ui(e, 500)
        // Leaving the page: one away span (hidden + visible) every 3 minutes (other tabs, ASU pages, Zoom).
        if (i % Math.round(180 / everySeconds) === 0) { ui({ type: "ui.visibility", payload: { state: "hidden", via: "tab", route: "/" } }, 1200); ui({ type: "ui.visibility", payload: { state: "visible", via: "tab", awayMs: 20_000, route: "/" } }, 2500) }
      }
      t += everySeconds * 1000
    }
    if (withNew) for (const e of taskMarks(root.log, null, t, "/")) ui(e)
    return root.log.length
  }
  it("a typical session stays far below the cap, and even a very busy one stays under it", () => {
    const typical = simulate(60 * 60, 8, true)
    const busy = simulate(75 * 60, 4, true)
    // Measured 2026-11-07: 651 / 1561 (without the 2026-11-07 items, `withNew` false: 600 / 1498).
    console.info(`Simulated session: typical ${typical} entries, very busy ${busy} entries (cap ${LOG_LIMIT}).`)
    expect(typical).toBeLessThan(800)
    expect(busy).toBeLessThan(LOG_LIMIT * 0.85)
  })
})

describe("export shape", () => {
  it("adds build info, the demo date, the flow version and a timeline, and keeps every version-1 field", () => {
    const s = seedDemo("2026-10-22")
    const out = buildExport(s, [], T, { attempts: [] })
    for (const key of ["format", "formatVersion", "exportedAt", "schemaVersion", "storageKey", "state", "onboarding", "interactionLog"]) expect(out).toHaveProperty(key)
    expect(out).toMatchObject({ formatVersion: 2, demoToday: "2026-10-22", onboardingFlowVersion: FLOW_VERSION, timeline: [] })
    expect(typeof out.build.commit).toBe("string")
  })
})
