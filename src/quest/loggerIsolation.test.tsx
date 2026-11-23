import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Link, MemoryRouter } from "react-router-dom"
import { UiLogger } from "../components/UiLogger"
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), click: vi.fn(), edit: vi.fn(), away: vi.fn(), cleanClick: vi.fn(), cleanEdit: vi.fn(), cleanAway: vi.fn() }))
vi.mock("../data/store", () => ({ useStore: () => ({ getLog: () => [], persistenceFailed: false }), saveLog: vi.fn() }))
vi.mock("../lib/uiLog", () => ({ emitUi: mocks.navigate, publishUi: vi.fn(), installUiCapture: mocks.click, installEditCapture: mocks.edit, installAwayCapture: mocks.away }))
beforeEach(() => { vi.clearAllMocks(); mocks.click.mockReturnValue(mocks.cleanClick); mocks.edit.mockReturnValue(mocks.cleanEdit); mocks.away.mockReturnValue(mocks.cleanAway) })
afterEach(cleanup)
it("does not install study capture on the Quest route", () => {
  render(<MemoryRouter initialEntries={["/quest"]}><UiLogger /></MemoryRouter>)
  expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.click).not.toHaveBeenCalled(); expect(mocks.edit).not.toHaveBeenCalled(); expect(mocks.away).not.toHaveBeenCalled()
})
it("removes capture when entering Quest and restores normal application capture on leaving", () => {
  render(<MemoryRouter initialEntries={["/events"]}><UiLogger /><Link to="/quest">Play</Link><Link to="/events">Return</Link></MemoryRouter>)
  expect(mocks.click).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByText("Play"))
  expect(mocks.cleanClick).toHaveBeenCalledTimes(1); expect(mocks.cleanEdit).toHaveBeenCalledTimes(1); expect(mocks.cleanAway).toHaveBeenCalledTimes(1)
  expect(mocks.click).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByText("Return"))
  expect(mocks.click).toHaveBeenCalledTimes(2)
})
