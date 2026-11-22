// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { StoreProvider, downloadExport, useStore } from "../data/store"
import { seedDemo } from "../data/seed"

vi.mock("../taskDetails/archive", () => ({ taskWorkArchive: vi.fn(() => Promise.reject(new Error("IndexedDB unavailable"))) }))

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear() })

describe("blocked browser storage", () => {
  it("keeps ordinary actions working in memory when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked") })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked") })
    let api!: ReturnType<typeof useStore>
    const Probe = () => { api = useStore(); return null }
    render(<StoreProvider initial={seedDemo("2026-10-22")}><Probe /></StoreProvider>)
    const other = api.state.people.find(person => person.id !== api.state.viewerId)!
    act(() => api.dispatch({ type: "setViewer", viewerId: other.id }))
    expect(api.state.viewerId).toBe(other.id)
    expect(api.persistenceFailed).toBe(true)
  })
})

describe("export when task files cannot be read", () => {
  it("still downloads the club data and interaction log, and says the export is incomplete", async () => {
    const blobs: Blob[] = []
    vi.spyOn(URL, "createObjectURL").mockImplementation(blob => { blobs.push(blob as Blob); return "blob:test" })
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    const state = seedDemo("2026-10-22")
    const result = await downloadExport(state, [])
    expect(result.complete).toBe(false)
    expect(blobs).toHaveLength(1)
    const file = JSON.parse(await blobs[0].text())
    expect(file.state.org.name).toBe(state.org.name)
    expect(file.taskDrafts).toEqual([])
  })
})
