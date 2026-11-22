import { act, cleanup, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup } from "../data/settings"
import { buildExport, loadStateWithNotice, reducer, saveState, STORAGE_KEY, StoreProvider, useStore } from "../data/store"
import type { DemoState } from "../data/types"

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

function archivedClub(): DemoState {
  const state = seedDemo(undefined, "v2")
  return { ...state, org: { ...state.org, matchingWorkspaceId: "fictional-archived-workspace", settings: { ...state.org.settings, matchingMode: "responsibilities" } },
    matching: { schemaVersion: 99, original: "Fictional opaque snapshot", assignments: [{ taskId: state.nodes[0].id, memberId: state.nodes[0].ownerId }] },
    matchingContext: { source: { text: "Fictional constitution" }, futureField: ["keep"] },
    nodes: state.nodes.map((node, i) => i ? node : { ...node, matching: { workflowId: "fictional-archived-flow", stepId: "work", responsibilityId: "fictional-duty" } }),
  }
}

it("opens and exports existing v23 work without interpreting or losing retired matching fields", () => {
  const state = archivedClub(), raw = JSON.stringify(state)
  localStorage.setItem(STORAGE_KEY, raw)
  const loaded = loadStateWithNotice()
  expect(loaded.notice).toBeNull()
  expect(loaded.state.nodes).toEqual(state.nodes)
  expect(loaded.state.matching).toEqual(state.matching)
  expect(loaded.state.matchingContext).toEqual(state.matchingContext)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  const exported = buildExport(loaded.state, [], Date.now())
  expect(exported.state.matching).toEqual(state.matching)
  expect(exported.state.matchingContext).toEqual(state.matchingContext)
  expect(saveState(loaded.state)).toBe(true)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes).toEqual(state.nodes)
})

it("uses the previous task assignment form's selected owner even if an archived matching setting remains enabled", () => {
  const state = archivedClub()
  const next = reducer(state, { type: "createTasks", id: "rollback-task", sentence: "Fictional manual task", tasks: [{ title: "Fictional manual task", ownerId: "maya", eventId: null }], date: "2026-11-10", buffered: false })
  const created = next.nodes.filter(node => node.id === "rollback-task:0")
  expect(created).toHaveLength(1)
  expect(created[0]).toMatchObject({ ownerId: "maya", status: "unclaimed" })
  expect(created[0].matching).toBeUndefined()
  expect(next.matching).toBe(state.matching)
  expect(next.matchingContext).toBe(state.matchingContext)
})

it("preserves retired fields through a complete business export and restore", () => {
  const state = archivedClub(), saved = JSON.parse(JSON.stringify(buildExport(state, [], Date.now()).state)) as DemoState
  const restored = reducer(seedDemo(undefined, "v2"), { type: "replace", state: saved })
  expect(restored.matching).toEqual(state.matching)
  expect(restored.matchingContext).toEqual(state.matchingContext)
  expect(restored.nodes.map(n => ({ id: n.id, ownerId: n.ownerId, status: n.status, matching: n.matching }))).toEqual(state.nodes.map(n => ({ id: n.id, ownerId: n.ownerId, status: n.status, matching: n.matching })))
})

it("creates a fresh club without attaching the previous club's retired responsibilities", () => {
  const state = archivedClub(), draft = { ...clubDraft(state), name: "Fictional restored onboarding club" }
  const next = completeSetup(state, draft, null, "", "11111111-1111-4111-8111-111111111111")
  expect(next).not.toBe(state)
  expect(next.matching).toBeUndefined()
  expect(next.matchingContext).toBeUndefined()
  expect(next.org.matchingWorkspaceId).toBeUndefined()
  expect(next.org.settings.matchingMode).toBeUndefined()
  expect(state.matching).toEqual(archivedClub().matching)
})

type Store = ReturnType<typeof useStore>
function Probe({ id, stores }: { id: string; stores: Record<string, Store> }) {
  stores[id] = useStore()
  return null
}

it("backs up the complete archived snapshot before the restored onboarding replaces a workspace", () => {
  const state = archivedClub(), stores: Record<string, Store> = {}
  render(<StoreProvider initial={state}><Probe id="one" stores={stores} /></StoreProvider>)
  act(() => { expect(stores.one.tryDispatch({ type: "completeSetup", draft: { ...clubDraft(state), name: "Fictional replacement" }, event: null, date: "", inviteCode: "11111111-1111-4111-8111-111111111111" })).toBe(true) })
  const backup = localStorage.getItem(`${STORAGE_KEY}.backup.matching-fictional-archived-workspace`)
  expect(backup).not.toBeNull()
  expect(JSON.parse(backup!)).toEqual(state)
  expect(stores.one.state.matching).toBeUndefined()
})

it("refuses workspace replacement without losing the old state when its archive backup cannot be written", () => {
  const state = archivedClub(), stores: Record<string, Store> = {}
  render(<StoreProvider initial={state}><Probe id="one" stores={stores} /></StoreProvider>)
  const before = localStorage.getItem(STORAGE_KEY), write = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) { if (key.startsWith(`${STORAGE_KEY}.backup.`)) throw new Error("Fictional backup failure"); return write.call(this, key, value) })
  act(() => { expect(stores.one.tryDispatch({ type: "completeSetup", draft: clubDraft(state), event: null, date: "", inviteCode: "11111111-1111-4111-8111-111111111111" })).toBe(false) })
  expect(stores.one.state).toBe(state)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
})

it("keeps the original v22 business file untouched when its upgrade backup fails", () => {
  const raw = JSON.stringify({ ...archivedClub(), schemaVersion: 22 }), stores: Record<string, Store> = {}
  localStorage.setItem(STORAGE_KEY, raw)
  const write = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) { if (key.startsWith(`${STORAGE_KEY}.backup.`)) throw new Error("Fictional backup failure"); return write.call(this, key, value) })
  render(<StoreProvider><Probe id="one" stores={stores} /></StoreProvider>)
  act(() => stores.one.dispatch({ type: "advanceClock", days: 1 }))
  expect(stores.one.persistenceFailed).toBe(true)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
})

it("still refuses a stale tab's ordinary writes after another tab has saved", () => {
  const state = archivedClub(), stores: Record<string, Store> = {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  render(<><StoreProvider initial={state}><Probe id="a" stores={stores} /></StoreProvider><StoreProvider initial={state}><Probe id="b" stores={stores} /></StoreProvider></>)
  act(() => { expect(stores.a.tryDispatch({ type: "advanceClock", days: 1 })).toBe(true) })
  const latest = localStorage.getItem(STORAGE_KEY)
  expect(reducer(stores.b.state, { type: "setViewer", viewerId: "maya" })).not.toBe(stores.b.state)
  act(() => stores.b.dispatch({ type: "setViewer", viewerId: "maya" }))
  expect(localStorage.getItem(STORAGE_KEY)).toBe(latest)
  expect(stores.b.persistenceFailed).toBe(true)
})
