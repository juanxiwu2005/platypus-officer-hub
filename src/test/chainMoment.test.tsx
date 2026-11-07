import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import { Chain, type Stop } from "../components/ui"

// DX-25: a stop that becomes done in front of the person gets "just-done" for a moment; nothing else does.
const stops = (...states: Stop["state"][]): Stop[] => states.map((state, i) => ({ key: `s${i}`, label: `Step ${i}`, state }))
const justDone = (container: HTMLElement) => [...container.querySelectorAll("li.just-done")].map(li => li.textContent)
const setReduced = (on: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: on && q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

describe("Chain: the done moment", () => {
  beforeEach(() => { vi.useFakeTimers(); setReduced(false) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it("shows nothing the first time it is drawn, even if stops are done", () => {
    const { container } = render(<Chain label="x" stops={stops("done", "done", "todo")} />)
    expect(justDone(container)).toEqual([])
  })
  it("marks exactly the stop that became done, then lets go of it", () => {
    const { container, rerender } = render(<Chain label="x" stops={stops("done", "now", "todo")} />)
    rerender(<Chain label="x" stops={stops("done", "done", "now")} />)
    expect(justDone(container)).toEqual(["Step 1"])
    act(() => { vi.advanceTimersByTime(700) })
    expect(justDone(container)).toEqual([])
  })
  it("does not mark a stop again when the chain is redrawn with the same stops", () => {
    const { container, rerender } = render(<Chain label="x" stops={stops("done", "now", "todo")} />)
    rerender(<Chain label="x" stops={stops("done", "done", "now")} />)
    act(() => { vi.advanceTimersByTime(700) })
    rerender(<Chain label="x" stops={stops("done", "done", "now")} />)
    expect(justDone(container)).toEqual([])
  })
  it("does not mark a stop that was already done, or one that went the other way", () => {
    const { container, rerender } = render(<Chain label="x" stops={stops("done", "done", "now")} />)
    rerender(<Chain label="x" stops={stops("done", "now", "todo")} />)   // undone
    expect(justDone(container)).toEqual([])
  })
  it("marks several stops that finish together", () => {
    const { container, rerender } = render(<Chain label="x" stops={stops("done", "now", "todo")} />)
    rerender(<Chain label="x" stops={stops("done", "done", "done")} />)
    expect(justDone(container)).toEqual(["Step 1", "Step 2"])
  })
  it("with Reduce Motion nothing is marked", () => {
    setReduced(true)
    const { container, rerender } = render(<Chain label="x" stops={stops("done", "now", "todo")} />)
    rerender(<Chain label="x" stops={stops("done", "done", "now")} />)
    expect(justDone(container)).toEqual([])
  })
  it("a stop that did not exist before is not 'just done'", () => {
    const { container, rerender } = render(<Chain label="x" stops={stops("done", "now")} />)
    rerender(<Chain label="x" stops={stops("done", "now", "done")} />)
    expect(justDone(container)).toEqual([])
  })
})
