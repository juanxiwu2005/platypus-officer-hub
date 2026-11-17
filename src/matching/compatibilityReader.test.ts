import { afterEach, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { loadStateWithNotice, saveState, STORAGE_KEY } from "../data/store"

afterEach(() => localStorage.clear())
it("keeps future matching v23 data readable at the rollback checkpoint without resetting or dropping unknown matching fields", () => {
  const state = { ...seedDemo(), schemaVersion: 23, matching: { schemaVersion: 99, organizationId: "fictional", unknownFutureField: ["retained"] } }
  const raw = JSON.stringify(state)
  localStorage.setItem(STORAGE_KEY, raw)
  const loaded = loadStateWithNotice()
  expect(loaded.notice).toBeNull()
  expect(loaded.state.schemaVersion).toBe(23)
  expect(loaded.state.nodes).toEqual(state.nodes)
  expect(loaded.state.people).toEqual(state.people)
  expect(loaded.state).toHaveProperty("matching", state.matching)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  expect(saveState(loaded.state)).toBe(true)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).matching).toEqual(state.matching)
})
