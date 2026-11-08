import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import type { LogEntry } from "../data/types"
import { appendUiLog } from "../data/store"
import { Hover, Info } from "../components/ui"
import {
  AWAY_FLICKER_MS, currentTask, describeClick, describeHover, editKind, HOVER_MIN_MS, installAwayCapture, installEditCapture,
  onUi, taskMarks, type UiEvent,
} from "../lib/uiLog"
import { describeEntry } from "../lib/timeline"

// The four behaviour-only items approved on 2026-11-07 (docs/PHASE3_DATA_DICTIONARY.md section 11):
// ui.task (study task markers), ui.visibility (leaving the page), ui.edit (starting to type, never what) and ui.hover.
const T = Date.UTC(2026, 10, 7, 15, 0, 0)
const entry = (seq: number, at: number, type: string, payload: Record<string, unknown>): LogEntry => ({ seq, at, actor: "alex", type, payload, applied: true })
const toLog = (events: UiEvent[], at: number, log: LogEntry[] = []) => events.reduce((l, e) => appendUiLog(l, "alex", e, at), log)

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T); document.body.innerHTML = ""; window.location.hash = "#/tasks" })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

describe("ui.task: study task markers", () => {
  it("start, then a new start ends the running task implicitly, then Done; each done carries how long the task ran", () => {
    let log: LogEntry[] = []
    expect(currentTask(log)).toBeNull()
    log = toLog(taskMarks(log, 1, T, "/"), T)
    expect(log.map(e => e.payload)).toEqual([{ task: 1, event: "start", route: "/" }])
    expect(currentTask(log)).toEqual({ task: 1, at: T })
    log = toLog(taskMarks(log, 2, T + 90_000, "/tasks"), T + 90_000, log)
    expect(log.slice(1).map(e => e.payload)).toEqual([
      { task: 1, event: "done", implicit: true, ms: 90_000, route: "/tasks" },
      { task: 2, event: "start", route: "/tasks" },
    ])
    expect(currentTask(log)?.task).toBe(2)
    log = toLog(taskMarks(log, null, T + 150_000, "/rules"), T + 150_000, log)
    expect(log[3].payload).toEqual({ task: 2, event: "done", ms: 60_000, route: "/rules" })
    expect(currentTask(log)).toBeNull()
    expect(log.map(e => [e.seq, e.type, e.applied])).toEqual([[1, "ui.task", true], [2, "ui.task", true], [3, "ui.task", true], [4, "ui.task", true]])
  })
  it("the running task's own button and Done with nothing running write nothing", () => {
    const log = [entry(1, T, "ui.task", { task: 3, event: "start", route: "/" })]
    expect(taskMarks(log, 3, T + 5000, "/")).toEqual([])
    expect(taskMarks([], null, T, "/")).toEqual([])
    expect(taskMarks([entry(1, T, "ui.task", { task: 3, event: "done", ms: 1 })], null, T, "/")).toEqual([])
  })
  it("the running task is read from the log, so it survives a reload and other entries in between", () => {
    const log = [entry(1, T, "ui.task", { task: 4, event: "start" }), entry(2, T + 1, "ui.click", { name: "x" }), entry(3, T + 2, "updateNode", {})]
    expect(currentTask(log)).toEqual({ task: 4, at: T })
  })
  it("the task buttons are skipped by the page's click listener (their own entry is the record)", () => {
    document.body.innerHTML = `<div role="group" data-ui-log="skip"><button aria-label="Start task 2">2</button></div><button>Other</button>`
    expect(describeClick(document.querySelector("[aria-label='Start task 2']"), "/", "http://x")).toBeNull()
    expect(describeClick(document.querySelectorAll("button")[1], "/", "http://x")).not.toBeNull()
  })
})

describe("ui.visibility: leaving the page", () => {
  let state: DocumentVisibilityState = "visible"
  beforeEach(() => { state = "visible"; vi.spyOn(document, "visibilityState", "get").mockImplementation(() => state) })
  const setVisible = (v: DocumentVisibilityState) => { state = v; document.dispatchEvent(new Event("visibilitychange")) }
  const capture = () => { const got: UiEvent[] = []; const stop = installAwayCapture(window, document, e => got.push(e)); return { got, stop } }

  it("a flicker under one second writes nothing", () => {
    const { got, stop } = capture()
    setVisible("hidden"); vi.advanceTimersByTime(AWAY_FLICKER_MS - 200); setVisible("visible")
    window.dispatchEvent(new FocusEvent("blur")); vi.advanceTimersByTime(300); window.dispatchEvent(new FocusEvent("focus"))
    stop()
    expect(got).toEqual([])
  })
  it("away for longer: hidden after one second, then visible with the exact time away", () => {
    const { got, stop } = capture()
    setVisible("hidden")
    vi.advanceTimersByTime(AWAY_FLICKER_MS)
    expect(got).toEqual([{ type: "ui.visibility", payload: { state: "hidden", via: "tab", route: "/tasks" } }])
    vi.advanceTimersByTime(41_000)
    setVisible("visible")
    stop()
    expect(got[1]).toEqual({ type: "ui.visibility", payload: { state: "visible", via: "tab", awayMs: 42_000, route: "/tasks" } })
  })
  it("the window losing focus while the page stays on screen (Zoom, another window) is via window; a picker is marked", () => {
    const { got, stop } = capture()
    window.dispatchEvent(new FocusEvent("blur")); vi.advanceTimersByTime(3000); window.dispatchEvent(new FocusEvent("focus"))
    document.body.innerHTML = `<input type="file" id="f">`
    document.querySelector<HTMLInputElement>("#f")!.focus()
    window.dispatchEvent(new FocusEvent("blur")); vi.advanceTimersByTime(2000); window.dispatchEvent(new FocusEvent("focus"))
    stop()
    expect(got.map(e => e.payload)).toEqual([
      { state: "hidden", via: "window", route: "/tasks" }, { state: "visible", via: "window", awayMs: 3000, route: "/tasks" },
      { state: "hidden", via: "window", route: "/tasks", picker: true }, { state: "visible", via: "window", awayMs: 2000, route: "/tasks", picker: true },
    ])
  })
  it("a field losing focus is not the window losing focus", () => {
    document.body.innerHTML = `<input id="a"><input id="b">`
    const { got, stop } = capture()
    document.querySelector<HTMLInputElement>("#a")!.focus(); document.querySelector<HTMLInputElement>("#b")!.focus()
    vi.advanceTimersByTime(5000)
    stop()
    expect(got).toEqual([])
  })
  it("another window first, then the page hidden: one span, which ends when the page shows again", () => {
    const { got, stop } = capture()
    window.dispatchEvent(new FocusEvent("blur")); vi.advanceTimersByTime(400); setVisible("hidden")
    vi.advanceTimersByTime(5000); setVisible("visible"); window.dispatchEvent(new FocusEvent("focus"))
    stop()
    expect(got.map(e => e.payload)).toEqual([{ state: "hidden", via: "tab", route: "/tasks" }, { state: "visible", via: "tab", awayMs: 5400, route: "/tasks" }])
  })
  it("closing or reloading writes hidden at once (no flicker wait); a page restored from the back-forward cache comes back", () => {
    const { got, stop } = capture()
    setVisible("hidden")
    window.dispatchEvent(new Event("pagehide"))
    expect(got.map(e => e.payload)).toEqual([{ state: "hidden", via: "close", route: "/tasks" }])
    vi.advanceTimersByTime(8000)
    expect(got).toHaveLength(1)                                       // the pending flicker timer was replaced
    const show = new Event("pageshow") as PageTransitionEvent
    Object.defineProperty(show, "persisted", { value: true })
    window.dispatchEvent(show)
    stop()
    expect(got[1].payload).toEqual({ state: "visible", via: "close", awayMs: 8000, route: "/tasks" })
  })
  it("a phone that froze the page (the one-second timer never ran) still gets visible with the whole time away", () => {
    const { got, stop } = capture()
    setVisible("hidden")
    vi.setSystemTime(T + 60_000)                                      // the clock moved, the timer did not run
    setVisible("visible")
    stop()
    expect(got.map(e => e.payload)).toEqual([{ state: "visible", via: "tab", awayMs: 60_000, route: "/tasks" }])
  })
})

describe("ui.edit: starting to type in a field (never what was typed)", () => {
  const capture = () => { const got: UiEvent[] = []; const stop = installEditCapture(document, e => got.push(e), { trustedOnly: false }); return { got, stop } }
  const type = (el: HTMLInputElement | HTMLTextAreaElement, text: string) => { for (const ch of text) { el.value += ch; el.dispatchEvent(new Event("input", { bubbles: true })) } }

  it("one start at the first change and one end on blur with the time since; nothing about the value", () => {
    document.body.innerHTML = `<main><label for="n">Club name</label><input id="n"><button>Next</button></main>`
    const { got, stop } = capture()
    const n = document.querySelector<HTMLInputElement>("#n")!
    n.focus()
    vi.advanceTimersByTime(2000)
    type(n, "Moonlight Typing Society")
    vi.advanceTimersByTime(6500)
    type(n, " Extra")
    n.blur()
    stop()
    expect(got).toEqual([
      { type: "ui.edit", payload: { route: "/tasks", field: "Club name", kind: "text", area: "main", event: "start" } },
      { type: "ui.edit", payload: { route: "/tasks", field: "Club name", kind: "text", area: "main", event: "end", ms: 6500 } },
    ])
    const text = JSON.stringify(got)
    for (const secret of ["Moonlight", "Extra", "24", "30"]) expect(text).not.toContain(secret)
  })
  it("focusing without typing writes nothing; each new focus is a new session", () => {
    document.body.innerHTML = `<textarea aria-label="Mission">Typed earlier: SECRET PLAN</textarea><input type="number" aria-label="Headcount">`
    const { got, stop } = capture()
    const [ta, num] = [document.querySelector("textarea")!, document.querySelector<HTMLInputElement>("input")!]
    ta.focus(); ta.blur()
    expect(got).toEqual([])
    ta.focus(); type(ta, "x"); ta.blur()
    ta.focus(); type(ta, "y"); num.focus()                          // moving to another field ends the first
    type(num, "4")
    num.blur()
    stop()
    expect(got.map(e => `${e.payload.field}:${e.payload.kind}:${e.payload.event}`)).toEqual([
      "Mission:textarea:start", "Mission:textarea:end", "Mission:textarea:start", "Mission:textarea:end", "Headcount:number:start", "Headcount:number:end",
    ])
    expect(JSON.stringify(got)).not.toContain("SECRET")
  })
  it("password fields write nothing at all, even under another type; checkboxes and drop-downs are not typing", () => {
    document.body.innerHTML = `<label>Password<input id="p" type="password"></label><input id="q" type="text" autocomplete="current-password" aria-label="PIN"><input id="c" type="checkbox"><select id="s"><option>a</option></select>`
    const { got, stop } = capture()
    for (const id of ["p", "q"]) { const el = document.querySelector<HTMLInputElement>(`#${id}`)!; el.focus(); type(el, "hunter2"); el.blur() }
    stop()
    expect(got).toEqual([])
    expect(["c", "s"].map(id => editKind(document.querySelector(`#${id}`)))).toEqual([null, null])
  })
  it("the kinds: text (also email, url, tel), search, number, date (also time), textarea", () => {
    document.body.innerHTML = ["text", "email", "url", "tel", "search", "number", "date", "time", "datetime-local"].map(t => `<input type="${t}">`).join("") + "<textarea></textarea>"
    expect([...document.querySelectorAll("input, textarea")].map(editKind)).toEqual(["text", "text", "text", "text", "search", "number", "date", "date", "date", "textarea"])
  })
  it("by default only real typing counts (the app's own events are not the participant)", () => {
    document.body.innerHTML = `<input aria-label="Name">`
    const got: UiEvent[] = []
    const stop = installEditCapture(document, e => got.push(e))
    const el = document.querySelector("input")!
    el.focus(); el.dispatchEvent(new Event("input", { bubbles: true })); el.blur()
    stop()
    expect(got).toEqual([])
  })
  it("a field removed while focused is closed on the next page change, and the page closing ends it too", () => {
    document.body.innerHTML = `<input aria-label="Ask a question">`
    const { got, stop } = capture()
    const el = document.querySelector("input")!
    el.focus(); type(el, "q"); vi.advanceTimersByTime(1200)
    el.remove()
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    expect(got.map(e => e.payload.event)).toEqual(["start", "end"])
    expect(got[1].payload.ms).toBe(1200)
    document.body.innerHTML = `<input aria-label="Ask a question">`
    const again = document.querySelector("input")!
    again.focus(); type(again, "q")
    window.dispatchEvent(new Event("pagehide"))
    stop()
    expect(got.map(e => e.payload.event)).toEqual(["start", "end", "start", "end"])
  })
  it("the field's name comes from its label, never from its own text", () => {
    document.body.innerHTML = `<label>Notes <textarea id="t">Typed text in the box</textarea></label><textarea id="u" placeholder="Paste your notes">Other typed text</textarea>`
    const { got, stop } = capture()
    for (const id of ["t", "u"]) { const el = document.querySelector<HTMLTextAreaElement>(`#${id}`)!; el.focus(); type(el, "!"); el.blur() }
    stop()
    expect(got.filter(e => e.payload.event === "start").map(e => e.payload.field)).toEqual(["Notes", "Paste your notes"])
    expect(JSON.stringify(got)).not.toContain("Typed")
  })
})

describe("ui.hover: hover cards open for at least half a second", () => {
  const listen = () => { const got: UiEvent[] = []; const stop = onUi(e => got.push(e)); return { got, stop } }

  it("a mouse passing over (under 500 ms) writes nothing; resting writes one entry on close with the time open", () => {
    const { got, stop } = listen()
    const { container } = render(<main><Hover card={<span>SECRET CARD TEXT</span>}><button type="button">R06</button></Hover></main>)
    const box = container.querySelector(".hover")!
    fireEvent.mouseEnter(box); vi.advanceTimersByTime(HOVER_MIN_MS - 100); fireEvent.mouseLeave(box)
    expect(got).toEqual([])
    fireEvent.mouseEnter(box); vi.advanceTimersByTime(1800)
    expect(got).toEqual([])                                           // written when it closes, not while open
    fireEvent.mouseLeave(box)
    stop()
    expect(got).toEqual([{ type: "ui.hover", payload: { route: "/tasks", name: "R06", ms: 1800, via: "mouse", area: "main" } }])
    expect(JSON.stringify(got)).not.toContain("SECRET")
  })
  it("keyboard focus counts like the mouse; focus moving inside the card does not close it", () => {
    const { got, stop } = listen()
    const { container } = render(<Hover card={<a href="#/rules">Open rule</a>}><button type="button">Why?</button></Hover>)
    const [trigger, link] = [container.querySelector("button")!, container.querySelector("a")!]
    act(() => trigger.focus()); vi.advanceTimersByTime(700)
    act(() => link.focus()); vi.advanceTimersByTime(300)
    act(() => link.blur())
    stop()
    expect(got.map(e => e.payload)).toEqual([{ route: "/tasks", name: "Why?", ms: 1000, via: "focus" }])
  })
  it("an Info icon with the generic name says which heading it sits under", () => {
    const { got, stop } = listen()
    const { container } = render(<section><header><h2>Needs a nudge</h2><Info>Three open steps, from 1,000 simulated runs.</Info></header></section>)
    const box = container.querySelector(".hover")!
    fireEvent.mouseEnter(box); vi.advanceTimersByTime(900); fireEvent.mouseLeave(box)
    stop()
    expect(got[0].payload).toEqual({ route: "/tasks", name: "More information", ms: 900, via: "mouse", near: "Needs a nudge", area: "header" })
  })
  it("on a touch screen the card counts from the tap that opens it to the tap that closes it", () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: (q: string) => ({ matches: q === "(hover: none)", media: q, addEventListener: () => undefined, removeEventListener: () => undefined }) })
    onTestFinished(() => { delete (window as { matchMedia?: unknown }).matchMedia })
    const { got, stop } = listen()
    const { container } = render(<Hover card="Card"><button type="button">Forecast</button></Hover>)
    const box = container.querySelector(".hover")!
    fireEvent.mouseEnter(box)                                         // the mouse events a tap also fires are not hovering
    fireEvent.click(box); vi.advanceTimersByTime(2500); fireEvent.click(box)
    fireEvent.click(box); vi.advanceTimersByTime(200); fireEvent.click(box)   // a quick open and close: nothing
    stop()
    expect(got.map(e => e.payload)).toEqual([{ route: "/tasks", name: "Forecast", ms: 2500, via: "tap" }])
  })
  it("a card that disappears while open (the page changed) is still written, with the page it was on", () => {
    const { got, stop } = listen()
    const { container, unmount } = render(<Hover card="Card"><button type="button">Dot</button></Hover>)
    fireEvent.mouseEnter(container.querySelector(".hover")!); vi.advanceTimersByTime(650)
    window.location.hash = "#/rules"
    unmount()
    stop()
    expect(got.map(e => e.payload)).toEqual([{ route: "/tasks", name: "Dot", ms: 650, via: "mouse" }])
  })
  it("the trigger's name leaves out the card's own text", () => {
    document.body.innerHTML = `<span class="hover"><b>Budget</b><span class="hover-card" role="tooltip">Hidden explanation</span></span>`
    expect(describeHover(document.querySelector(".hover")!, 600, "mouse", "/")?.payload.name).toBe("Budget")
    expect(describeHover(document.querySelector(".hover")!, 499, "mouse", "/")).toBeNull()
  })
})

describe("timeline descriptions for the new entries", () => {
  const d = (type: string, payload: Record<string, unknown>) => describeEntry(entry(1, T, type, payload))
  it("reads well in the timeline and the CSV", () => {
    expect(d("ui.task", { task: 3, event: "start", route: "/tasks" })).toBe("Started study task 3 on /tasks")
    expect(d("ui.task", { task: 3, event: "done", ms: 754_000, route: "/" })).toBe("Finished study task 3 after 12 min 34 s")
    expect(d("ui.task", { task: 3, event: "done", implicit: true, ms: 4200, route: "/" })).toBe("Ended study task 3 after 4.2 s (next task started)")
    expect(d("ui.visibility", { state: "hidden", via: "tab", route: "/rules" })).toBe("Left the page: another tab or app on /rules")
    expect(d("ui.visibility", { state: "visible", via: "window", awayMs: 12_300, route: "/rules" })).toBe("Came back after 12.3 s away (another window) on /rules")
    expect(d("ui.visibility", { state: "hidden", via: "close", route: "/" })).toBe("Left the page: page closed or reloaded on /")
    expect(d("ui.edit", { field: "Club name", kind: "text", event: "start", route: "/welcome/founder/name" })).toBe('Started typing in text field "Club name" on /welcome/founder/name')
    expect(d("ui.edit", { field: "Club name", kind: "text", event: "end", ms: 8200, route: "/x" })).toBe('Stopped typing in "Club name" after 8.2 s on /x')
    expect(d("ui.hover", { name: "More information", near: "Needs a nudge", ms: 900, route: "/" })).toBe('Hover card "More information" (under "Needs a nudge") open 0.9 s on /')
  })
})
