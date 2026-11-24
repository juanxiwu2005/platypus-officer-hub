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
