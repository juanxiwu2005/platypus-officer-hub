import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import VenueEditor from "./VenueEditor"
import { initialVenue, type VenueLayout } from "./venue"

/** Honest unavailable-WebGL stubs: canvas getContext returns null, matchMedia is absent in jsdom. */
function stubMissingPlatform() {
  const getContext = HTMLCanvasElement.prototype.getContext
  const matchMedia = window.matchMedia
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  return () => {
    HTMLCanvasElement.prototype.getContext = getContext
    window.matchMedia = matchMedia
  }
}

afterEach(() => { cleanup() })

const CHECKS = [
  ["Capacity", false],
  ["Exit routes", false],
  ["Catering inside", false],
  ["Theatre aisles", false],
  ["Accessible seating", true],
  ["Covered cables", true],
] as const

function expectCheck(label: string, passed: boolean, checklist: boolean) {
  const name = `${label}${checklist ? " (checklist check)" : ""}: ${passed ? "clear" : "needs work"}`
  expect(within(screen.getByRole("group", { name: "Room checks" })).getByRole("button", { name })).toBeTruthy()
}

/** Controlled wrapper: the editor never owns the layout, the parent does. */
function renderEditor() {
  const onCheck = vi.fn()
  const onExplain = vi.fn()
  let latest = initialVenue()
  function Controlled({ initial }: { initial: VenueLayout }) {
    const [layout, setLayout] = useState(initial)
    latest = layout
    return <VenueEditor layout={layout} onChange={setLayout} onCheck={onCheck} onExplain={onExplain} />
  }
  const view = render(<Controlled initial={initialVenue()} />)
  const floorCell = (x: number, z: number) => {
    const cell = view.container.querySelector<HTMLButtonElement>(`[data-floor-cell="${z * 12 + x}"]`)
    if (!cell) throw new Error(`Missing floor-plan cell ${x},${z}`)
    return cell
  }
  return {
    onCheck, onExplain, view,
    layout: () => latest,
    floorCell,
    moveTo: (id: string, x: number, z: number) => {
      fireEvent.change(screen.getByLabelText("Furniture"), { target: { value: id } })
      fireEvent.click(floorCell(x, z))
    },
  }
}

describe("VenueEditor", () => {
  it("falls back to the floor plan when WebGL is unavailable", () => {
    const restore = stubMissingPlatform()
    try {
      const { view } = renderEditor()
      expect(view.container.querySelector('canvas[data-renderer="fallback"]')).toBeTruthy()
      expect(screen.getByRole("grid", { name: "Room floor plan. One square is 36 inches." })).toBeTruthy()
      expect(screen.getByText("3D unavailable. The floor plan has the same controls.")).toBeTruthy()
      expect((screen.getByRole("button", { name: "3D" }) as HTMLButtonElement).disabled).toBe(true)
      expect(screen.getByRole("button", { name: "Floor plan" }).getAttribute("aria-pressed")).toBe("true")
    } finally { restore() }
  })

  it("shows six blocked checks and a disabled lock for the initial room", () => {
    const restore = stubMissingPlatform()
    try {
      renderEditor()
      expect(screen.getByText("0/6 room checks clear")).toBeTruthy()
      for (const [label, checklist] of CHECKS) expectCheck(label, false, checklist)
      expect((screen.getByRole("button", { name: "Lock layout" }) as HTMLButtonElement).disabled).toBe(true)
      expect(screen.getByRole("button", { name: "Preview outcome" })).toBeTruthy()
    } finally { restore() }
  })

  it("clears only Catering inside after moving the buffet through the floor plan", () => {
    const restore = stubMissingPlatform()
    try {
      const { floorCell, layout } = renderEditor()
      const furniture = screen.getByLabelText("Furniture") as HTMLSelectElement
      const catering = within(furniture).getByRole("option", { name: "Catering 1" }) as HTMLOptionElement
      fireEvent.change(furniture, { target: { value: catering.value } })
      fireEvent.click(floorCell(9, 1))
      expect(layout().items.find(item => item.id === "buffet")).toMatchObject({ x: 9, z: 1 })
      expect(screen.getByText("1/6 room checks clear")).toBeTruthy()
      expectCheck("Catering inside", true, false)
      for (const [label, checklist] of CHECKS) if (label !== "Catering inside") expectCheck(label, false, checklist)
      expect((screen.getByRole("button", { name: "Lock layout" }) as HTMLButtonElement).disabled).toBe(true)
    } finally { restore() }
  })

  it("locks a valid layout, tracks capacity, and ignores creative choices", () => {
    const restore = stubMissingPlatform()
    try {
      const { onCheck, floorCell, moveTo, layout } = renderEditor()
      fireEvent.change(screen.getByLabelText("Guests"), { target: { value: "80" } })
      moveTo("left-0", 1, 3)
      moveTo("welcome", 1, 1)
      moveTo("buffet", 9, 1)
      moveTo("round", 7, 1)
      moveTo("access", 4, 2)
      moveTo("front", 3, 2)
      moveTo("photo", 0, 0)
      fireEvent.change(screen.getByLabelText("Add furniture"), { target: { value: "cover" } })
      fireEvent.click(floorCell(5, 4))
      expect(layout().items.some(item => item.kind === "cover" && item.x === 5 && item.z === 4)).toBe(true)
      expect(screen.getByText("6/6 room checks clear")).toBeTruthy()
      for (const [label, checklist] of CHECKS) expectCheck(label, true, checklist)
      expect(screen.queryByRole("button", { name: "Preview outcome" })).toBeNull()
      const lock = screen.getByRole("button", { name: "Lock layout" }) as HTMLButtonElement
      expect(lock.disabled).toBe(false)
      fireEvent.click(lock)
      expect(onCheck).toHaveBeenCalledTimes(1)
      fireEvent.change(screen.getByLabelText("Guests"), { target: { value: "81" } })
      expect(screen.getByText("4/6 room checks clear")).toBeTruthy()
      expect((screen.getByRole("button", { name: "Lock layout" }) as HTMLButtonElement).disabled).toBe(true)
      fireEvent.change(screen.getByLabelText("Guests"), { target: { value: "80" } })
      expect((screen.getByRole("button", { name: "Lock layout" }) as HTMLButtonElement).disabled).toBe(false)
      fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Midnight Speaker Night" } })
      fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "sunset" } })
      expect(layout().name).toBe("Midnight Speaker Night")
      expect(layout().theme).toBe("sunset")
      expect(screen.getByText("6/6 room checks clear")).toBeTruthy()
      expect((screen.getByRole("button", { name: "Lock layout" }) as HTMLButtonElement).disabled).toBe(false)
    } finally { restore() }
  })
})
