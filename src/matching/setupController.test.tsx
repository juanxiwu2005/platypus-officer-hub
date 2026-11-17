import { StrictMode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { MatchingStorage } from "./contracts"
import type { MatchingExtractionRequest, MatchingExtractionResponse, MatchingSetupInitial } from "./setupContracts"
import { beginSetupRead, createSetupDocument, saveSetupDocument, setupStorageKey } from "./setupWorkspace"
import { useMatchingSetup } from "./useMatchingSetup"
import { extractMatchingResponsibilities } from "./constitutionClient"

vi.mock("./constitutionClient", () => ({ extractMatchingResponsibilities: vi.fn() }))
const extract = vi.mocked(extractMatchingResponsibilities)
const source = { name: "Fictional rules", text: "The Robot Builders maintain robots and test their firmware before each demonstration." }
const initial: MatchingSetupInitial = { contextKey: "hook-test-fictional", references: { organizationId: "legacy", roles: [{ id: "robots", title: "Robot Builders" }], members: [] }, memberships: [] }
const response = (request: MatchingExtractionRequest): MatchingExtractionResponse => ({ part: "responsibilities", requestId: request.requestId, sourceId: request.sourceId, warnings: [], proposals: [] })
function memory() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
function deferred() {
  let resolve!: (value: MatchingExtractionResponse) => void
  const promise = new Promise<MatchingExtractionResponse>(r => { resolve = r })
  return { promise, resolve }
}
beforeEach(() => { extract.mockReset() })
afterEach(cleanup)

describe("setup controller: explicit AI actions and saved drafts", () => {
  it("saves the exact request before starting AI, then reuses unchanged completed suggestions", async () => {
    const store = memory()
    extract.mockImplementation(async request => {
      const saved = JSON.parse(store.getItem(setupStorageKey(initial.contextKey))!)
      expect(saved.reads.at(-1)).toMatchObject({ status: "pending", request })
      return response(request)
    })
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    expect(extract).not.toHaveBeenCalled()
    act(() => result.current.onRead(source))
    await waitFor(() => expect(result.current.document!.reads[0].status).toBe("completed"))
    act(() => result.current.onRead(source))
    expect(extract).toHaveBeenCalledTimes(1)
    // A selected-position retry is an explicit, separate action.
    act(() => result.current.onRead(source, ["robots"]))
    await waitFor(() => expect(extract).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.busy).toBe(false))
  })

  it("does not issue a paid request when the prerequisite save fails", () => {
    const store: MatchingStorage = { getItem: () => null, setItem() { throw new Error("quota") } }
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    act(() => result.current.onRead(source))
    expect(extract).not.toHaveBeenCalled()
    expect(result.current.document!.reads).toHaveLength(0)
    expect(result.current.error).toContain("could not be saved")
  })

  it("recovers an interrupted request on refresh without automatically re-billing, including StrictMode", async () => {
    const store = memory(), pending = beginSetupRead(createSetupDocument(initial), source, "fictional-president")
    saveSetupDocument(store, pending, null)
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store), { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> })
    await waitFor(() => expect(result.current.document!.reads[0].status).toBe("interrupted"))
    expect(extract).not.toHaveBeenCalled()
    expect(JSON.parse(store.getItem(setupStorageKey(initial.contextKey))!).reads[0].request.text).toBe(source.text)
  })

  it("recovers an orphaned request when a read-only viewer becomes an editor without interrupting a live retry", async () => {
    const store = memory(), pending = beginSetupRead(createSetupDocument(initial), source, "fictional-president")
    saveSetupDocument(store, pending, null)
    const { result, rerender } = renderHook(({ canEdit }) => useMatchingSetup(initial, "fictional-president", canEdit, store), { initialProps: { canEdit: false } })
    expect(result.current.document!.reads[0].status).toBe("pending")
    rerender({ canEdit: true })
    await waitFor(() => expect(result.current.document!.reads[0].status).toBe("interrupted"))
    expect(extract).not.toHaveBeenCalled()
    const waiting = deferred()
    extract.mockReturnValue(waiting.promise)
    act(() => result.current.onRead(source, ["robots"]))
    rerender({ canEdit: false }); rerender({ canEdit: true })
    expect(result.current.document!.reads[1].status).toBe("pending")
    expect(result.current.busy).toBe(true)
    act(() => result.current.onStop())
    await act(async () => waiting.resolve(response(extract.mock.calls[0][0])))
  })

  it("aborts stale waiting after a source edit and ignores a late provider response", async () => {
    const store = memory(), waiting = deferred()
    extract.mockReturnValue(waiting.promise)
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    act(() => result.current.onRead(source))
    const request = extract.mock.calls[0][0], signal = extract.mock.calls[0][1]!.signal!
    act(() => result.current.onSourceChange({ ...source, text: source.text + " Updated rules." }))
    expect(signal.aborted).toBe(true)
    await act(async () => waiting.resolve(response(request)))
    expect(result.current.document!.reads[0]).toMatchObject({ status: "stale", response: null })
    expect(result.current.busy).toBe(false)
  })

  it("stops waiting without adopting a late result or deleting the saved source", async () => {
    const waiting = deferred(), store = memory()
    extract.mockReturnValue(waiting.promise)
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    act(() => result.current.onRead(source))
    const request = extract.mock.calls[0][0]
    act(() => result.current.onStop())
    expect(result.current.error).toBeNull()
    await act(async () => waiting.resolve(response(request)))
    expect(result.current.document!.reads[0].status).toBe("stopped")
    expect(result.current.document!.source).toEqual(source)
    expect(result.current.document!.matching.responsibilities).toEqual([])
  })

  it("retains failed read input and allows an explicit retry without clearing manual work", async () => {
    const store = memory()
    extract.mockRejectedValue(new Error("AI is unavailable. Continue manually."))
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    act(() => result.current.onRead(source))
    await waitFor(() => expect(result.current.document!.reads[0].status).toBe("failed"))
    expect(result.current.document!.source).toEqual(source)
    expect(result.current.error).toContain("Continue manually")
    act(() => result.current.onRead(source, ["robots"]))
    expect(result.current.error).toBeNull()
    await waitFor(() => expect(result.current.document!.reads[1].status).toBe("failed"))
    expect(extract).toHaveBeenCalledTimes(2)
  })

  it("denies editing and AI from a read-only viewer even if callbacks are called directly", () => {
    const store = memory(), { result } = renderHook(() => useMatchingSetup(initial, "fictional-member", false, store))
    act(() => { result.current.onSourceChange(source); result.current.onRead(source) })
    expect(result.current.document!.source.text).toBe("")
    expect(store.values.size).toBe(0)
    expect(extract).not.toHaveBeenCalled()
  })

  it("respects the AI switch while keeping manual setup available", () => {
    const store = memory(), { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store, false))
    act(() => result.current.onSourceChange(source))
    expect(result.current.document!.source).toEqual(source)
    act(() => result.current.onRead(source))
    expect(extract).not.toHaveBeenCalled()
    expect(result.current.error).toContain("AI is turned off")
  })

  it("blocks further edits after a failed outcome save while keeping the unsaved result for export", async () => {
    const store = memory(), waiting = deferred()
    extract.mockReturnValue(waiting.promise)
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    act(() => result.current.onRead(source))
    const request = extract.mock.calls[0][0], saved = store.getItem(setupStorageKey(initial.contextKey))
    store.setItem = () => { throw new Error("quota") }
    await act(async () => waiting.resolve(response(request)))
    expect(result.current.error).toContain("could not be saved")
    act(() => result.current.onSourceChange({ ...source, text: source.text + " Unsaved edit." }))
    expect(result.current.error).toContain("unsaved preview")
    expect(store.getItem(setupStorageKey(initial.contextKey))).toBe(saved)
    expect(result.current.document!.source).toEqual(source)
  })

  it("hides contact details and refuses credential-shaped text before persisting an AI request", () => {
    const store = memory()
    extract.mockImplementation(async request => response(request))
    const { result } = renderHook(() => useMatchingSetup(initial, "fictional-president", true, store))
    act(() => result.current.onRead({ ...source, text: source.text + " Contact demo@example.com." }))
    expect(extract.mock.calls[0][0].text).not.toContain("demo@example.com")
    expect(store.getItem(setupStorageKey(initial.contextKey))).not.toContain("demo@example.com")
    act(() => result.current.onStop())
    act(() => result.current.onRead({ ...source, text: source.text + " password=fictional-example" }))
    expect(extract).toHaveBeenCalledTimes(1)
    expect(result.current.error).toContain("Remove credentials")
  })
})
