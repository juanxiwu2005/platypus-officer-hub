import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { seedDemo } from "../data/seed"
import { StoreProvider, useStore, type Action } from "../data/store"
import type { DemoState } from "../data/types"
import { RailProvider } from "../components/rail/RailContext"
import OnboardingChecklist from "../components/settings/OnboardingChecklist"

// Settings → Onboarding editor (review fixes F2): what happens when the saved checklist changes underneath the editor, and
// when the saved value is damaged. Fictional seed club only.

let current: DemoState
let dispatch: (a: Action) => void
let hideEditor: () => void
function Harness() {
  const store = useStore()
  const [shown, setShown] = useState(true)
  current = store.state; dispatch = store.dispatch; hideEditor = () => setShown(false)
  return shown ? <OnboardingChecklist /> : null
}
const show = (state: DemoState = seedDemo(undefined, "v2")) =>
  render(<StoreProvider initial={state}><RailProvider><Harness /></RailProvider></StoreProvider>)
const startStarter = () => fireEvent.click(screen.getByRole("button", { name: "Start from Platypus starter" }))
const typeModuleName = (text: string) => fireEvent.change(screen.getAllByRole("textbox", { name: "Module name" })[0], { target: { value: text } })

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear() })

describe("the saved checklist changes from outside the editor", () => {
  it("Reset demo cancels typing still waiting and clears the Undo history", () => {
    show()
    startStarter()
    fireEvent.click(screen.getAllByRole("button", { name: /^Treasurer: / })[1])
    expect(current.org.onboardingChecklist?.modules[0].items[1].hiddenFor).toEqual(["r-fin"])
    typeModuleName("Typed before the reset")
    act(() => dispatch({ type: "reset" }))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(current.org.onboardingChecklist).toBeUndefined()
    expect(screen.getByTestId("onboarding-empty")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull()
  })

  it("an editor closed in the same render as the reset does not write its old draft back", () => {
    show()
    startStarter()
    typeModuleName("Typed before the reset")
    act(() => { dispatch({ type: "reset" }); hideEditor() })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(current.org.onboardingChecklist).toBeUndefined()
  })

  it("typing still waiting is saved when the editor closes normally", () => {
    show()
    startStarter()
    typeModuleName("Typed then closed")
    act(() => hideEditor())
    expect(current.org.onboardingChecklist?.modules[0].title).toBe("Typed then closed")
  })

  it("typing still waiting is saved when the page is hidden or left", () => {
    show()
    startStarter()
    typeModuleName("Typed then hidden")
    act(() => { window.dispatchEvent(new Event("pagehide")) })
    expect(current.org.onboardingChecklist?.modules[0].title).toBe("Typed then hidden")
  })
})

describe("the grip's keyboard mode (template v2)", () => {
  const titles = () => current.org.onboardingChecklist!.modules[0].items.map(i => i.title)
  const grip = (title: string) => screen.getByRole("button", { name: `Move ${title}` })

  it("moves on screen with the arrows, saves once on the drop, and Undo takes the whole move back", () => {
    show()
    startStarter()
    const before = titles()
    fireEvent.keyDown(grip("Join the officer group chat"), { key: " " })
    fireEvent.keyDown(grip("Join the officer group chat"), { key: "ArrowDown" })
    fireEvent.keyDown(grip("Join the officer group chat"), { key: "ArrowDown" })
    // Nothing saved while the row is held.
    expect(titles()).toEqual(before)
    fireEvent.keyDown(grip("Join the officer group chat"), { key: "Enter" })
    expect(titles()).toEqual(["Meet your buddy", "Get added to the club shared drive", "Join the officer group chat"])
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(titles()).toEqual(before)
    // One more Undo goes back past the starter: the move was exactly one step.
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(current.org.onboardingChecklist).toBeUndefined()
  })

  it("Escape puts the row back and saves nothing", () => {
    show()
    startStarter()
    const saved = current.org.onboardingChecklist
    fireEvent.keyDown(grip("Meet your buddy"), { key: "Enter" })
    fireEvent.keyDown(grip("Meet your buddy"), { key: "ArrowUp" })
    expect(screen.getAllByRole("textbox", { name: "Item title" }).map(t => (t as HTMLTextAreaElement).value).slice(0, 2)).toEqual(["Meet your buddy", "Join the officer group chat"])
    fireEvent.keyDown(grip("Meet your buddy"), { key: "Escape" })
    expect(screen.getAllByRole("textbox", { name: "Item title" }).map(t => (t as HTMLTextAreaElement).value).slice(0, 2)).toEqual(["Join the officer group chat", "Meet your buddy"])
    expect(current.org.onboardingChecklist).toBe(saved)
    expect(screen.getByTestId("onboarding-announce").textContent).toBe("Move cancelled.")
  })
})

describe("a damaged saved checklist", () => {
  const withChecklist = (value: unknown): DemoState => { const s = seedDemo(undefined, "v2"); return { ...s, org: { ...s.org, onboardingChecklist: value as never } } }

  it("shows what can be read: a module without its items list opens as an empty module", () => {
    show(withChecklist({ version: 1, updatedOn: "", modules: [{ id: "a", title: "Damaged module", when: "none", who: "new" }] }))
    expect((screen.getByRole("textbox", { name: "Module name" }) as HTMLTextAreaElement).value).toBe("Damaged module")
    expect(screen.queryAllByTestId("onboarding-item")).toHaveLength(0)
  })

  it("shows the empty state and one line when the value is not a checklist, and the starter replaces it", () => {
    show(withChecklist({ version: 3, modules: "nope" }))
    expect(screen.getByTestId("onboarding-empty").textContent).toContain("The saved checklist could not be read.")
    startStarter()
    expect(current.org.onboardingChecklist?.modules).toHaveLength(5)
    expect(screen.queryByText("The saved checklist could not be read.")).toBeNull()
  })
})
