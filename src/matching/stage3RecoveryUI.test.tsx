import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { reducer, STORAGE_KEY, StoreProvider, useStore } from "../data/store"
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

type CapturedStores = Record<string, ReturnType<typeof useStore>>
function TabProbe({ id, stores }: { id: string; stores: CapturedStores }) {
  stores[id] = useStore()
  return <output data-testid={`held-${id}`}>{String(stores[id].persistenceFailed)}</output>
}

function twoTabs() {
  const state = stage3Club(), stores: CapturedStores = {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  render(<><StoreProvider initial={state}><TabProbe id="a" stores={stores} /></StoreProvider><StoreProvider initial={state}><TabProbe id="b" stores={stores} /></StoreProvider></>)
  const before = localStorage.getItem(STORAGE_KEY)!
  act(() => {
    expect(stores.a.tryDispatch({ type: "matchingCommand", command: { type: "policy.upsert", value: { id: "fixture-space-policy", responsibilityId: "fixture-space", primaryMemberId: "jordan", backupMemberId: "maya" } } })).toBe(true)
  })
  const current = localStorage.getItem(STORAGE_KEY)!
  expect(JSON.parse(current).matching.revision).toBeGreaterThan(state.matching!.revision)
  expect(stores.b.persistenceFailed).toBe(false)
  return { stores, before, current }
}

it.each(["tryDispatch", "dispatch", "logUi"] as const)("detects another tab's canonical save before a stale %s can overwrite it, even without a storage event", path => {
  const { stores, current } = twoTabs()
  const staleEdit = { type: "matchingCommand" as const, command: { type: "policy.upsert" as const, value: { id: "fixture-space-policy", responsibilityId: "fixture-space", primaryMemberId: "jordan", backupMemberId: "maya" } } }
  expect(reducer(stores.b.state, staleEdit)).not.toBe(stores.b.state)
  act(() => {
    if (path === "tryDispatch") expect(stores.b.tryDispatch(staleEdit)).toBe(false)
    else if (path === "dispatch") stores.b.dispatch(staleEdit)
    else stores.b.logUi({ type: "ui.click", payload: { label: "Fictional old-tab action" } })
  })
  expect(localStorage.getItem(STORAGE_KEY)).toBe(current)
  expect(stores.b.persistenceFailed).toBe(true)
  expect(stores.a.persistenceFailed).toBe(false)
})

it("holds a stale tab immediately when the canonical storage key changes in another tab", () => {
  const { stores, before, current } = twoTabs()
  fireEvent(window, new StorageEvent("storage", { key: STORAGE_KEY, oldValue: before, newValue: current, storageArea: localStorage }))
  expect(stores.b.persistenceFailed).toBe(true)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(current)
})
