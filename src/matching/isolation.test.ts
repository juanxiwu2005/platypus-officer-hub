import { afterEach, describe, expect, it } from "vitest"
import { seedDemo, SCHEMA_VERSION } from "../data/seed"
import { loadStateWithNotice, STORAGE_KEY } from "../data/store"
import { createMatchingExample } from "./examples"
import { loadMatchingState, matchingStorageKey, saveMatchingState } from "./repository"

afterEach(() => window.localStorage.clear())

describe("stage 1 remains isolated from the existing business archive", () => {
  it("saves and restores matching configuration without changing or attaching it to the old application", () => {
    const legacy = JSON.stringify(seedDemo(undefined, "v2"))
    window.localStorage.setItem(STORAGE_KEY, legacy)
    const { state, references } = createMatchingExample()
    saveMatchingState(window.localStorage, state, null)
    expect(loadMatchingState(window.localStorage, references.organizationId)).toMatchObject({ status: "loaded", state })
    const loaded = loadStateWithNotice()
    expect(loaded.notice).toBeNull()
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.state).not.toHaveProperty("matching")
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(legacy)
    expect(matchingStorageKey(references.organizationId)).not.toBe(STORAGE_KEY)
  })

  it.each(["{broken", JSON.stringify({ schemaVersion: 99, organizationId: "example-robotics-club" })])("preserves an unreadable or newer matching snapshot without resetting business data: %s", raw => {
    const legacy = JSON.stringify(seedDemo(undefined, "v2"))
    window.localStorage.setItem(STORAGE_KEY, legacy)
    const key = matchingStorageKey("example-robotics-club")
    window.localStorage.setItem(key, raw)
    const result = loadMatchingState(window.localStorage, "example-robotics-club")
    expect(["invalid", "unsupported"]).toContain(result.status)
    expect(result.raw).toBe(raw)
    expect(window.localStorage.getItem(key)).toBe(raw)
    expect(loadStateWithNotice().notice).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(legacy)
  })
})
