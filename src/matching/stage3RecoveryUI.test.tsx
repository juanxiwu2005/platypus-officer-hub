import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { STORAGE_KEY, StoreProvider, useStore } from "../data/store"
import { seedDemo } from "../data/seed"
import type { OrganizationMatchingContext } from "./businessContracts"
import { TaskMatchingPanel } from "./TaskMatchingPanel"
import { stage3Club, stage3CreateEvent } from "./stage3Fixtures"

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

it.each([undefined, { opaqueFutureRecord: "preserve this" }])("shows recovery in a task detail when overrides are unreadable instead of crashing the application: %o", overrides => {
  const state = stage3CreateEvent(stage3Club(), "recovery-ui")
  const node = state.nodes.find(n => n.id === "recovery-ui:0:venue")!
  const damaged = { ...state, matchingContext: { ...state.matchingContext!, overrides } as unknown as OrganizationMatchingContext }
  expect(() => render(<StoreProvider initial={damaged}><TaskMatchingPanel node={node} /></StoreProvider>)).not.toThrow()
  expect(screen.getByTestId("task-matching").textContent).toContain("original data is retained")
  expect(damaged.matchingContext.overrides).toBe(overrides)
})

function MigrationProbe() {
  const { dispatch, persistenceFailed } = useStore()
  return <><output data-testid="persistence-held">{String(persistenceFailed)}</output><button onClick={() => dispatch({ type: "advanceClock", days: 1 })}>Change local preview</button></>
}

it("holds automatic saves after migration backup failure so rendering and page interactions cannot replace the original v22 data", () => {
  const raw = JSON.stringify({ ...seedDemo(undefined, "v2"), schemaVersion: 22 })
  localStorage.setItem(STORAGE_KEY, raw)
  const write = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
    if (key.startsWith(`${STORAGE_KEY}.backup.`)) throw new Error("Fictional backup write failure")
    return write.call(this, key, value)
  })
  render(<StoreProvider><MigrationProbe /></StoreProvider>)
  expect(screen.getByTestId("persistence-held").textContent).toBe("true")
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  fireEvent.click(screen.getByRole("button", { name: "Change local preview" }))
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
})
