import { afterEach, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { RailProvider, useRail } from "../components/rail/RailContext"
import { StoreProvider } from "../data/store"
import { seedDemo } from "../data/seed"
import { applySchedule } from "../engine/schedule"
import type { DemoState } from "../data/types"
import Tasks from "./Tasks"

/** S3: with the Board gone, finished tasks sit in one folded "Done (N)" group at the bottom of the Tasks table. */
afterEach(() => { cleanup(); localStorage.clear() })

function Opened() { const r = useRail(); return r.detail?.kind === "task" ? <p data-testid="opened">{r.detail.id}</p> : null }
function fixture(): DemoState {
  const s = seedDemo(undefined, "v2")
  const source = s.nodes.find(n => n.id === "t-room")!
  const task = (id: string, title: string, ownerId: string, status: "accepted" | "done") =>
    ({ ...source, id, title, ownerId, status, eventId: null, dependsOn: [], ownerVersion: 0, completedOn: status === "done" ? s.today : undefined, anchor: { kind: "fixed" as const, official: null, club: s.today } })
  return applySchedule({ ...s, viewerId: "alex", nodes: [
    task("open-mine", "Print the sign-in sheet", "alex", "accepted"),
    task("done-mine", "Book the photographer", "alex", "done"),
    task("done-team", "Order the pizza", "maya", "done"),
  ] })
}
const show = () => render(<MemoryRouter><StoreProvider initial={fixture()}><RailProvider><Tasks /><Opened /></RailProvider></StoreProvider></MemoryRouter>)
const doneGroup = () => screen.getByRole("button", { name: /^Done \(\d+\)$/ })

it("is folded by default, counts the finished tasks in My tasks and keeps them out of the open list", () => {
  show()
  expect(doneGroup().textContent).toContain("Done (1)")
  expect(doneGroup().getAttribute("aria-expanded")).toBe("false")
  expect(screen.getByText("Print the sign-in sheet")).toBeTruthy()
  expect(screen.queryByText("Book the photographer")).toBeNull()
  expect(screen.queryByText("Order the pizza")).toBeNull()
})

it("opens to the same rows, and a row opens Task Details", () => {
  show()
  fireEvent.click(doneGroup())
  expect(doneGroup().getAttribute("aria-expanded")).toBe("true")
  const rows = within(screen.getByTestId("done-tasks")).getAllByTestId("task-card")
  expect(rows).toHaveLength(1)
  expect(within(rows[0]).getByText("Done")).toBeTruthy()
  fireEvent.click(within(rows[0]).getByRole("button", { name: /Book the photographer/ }))
  expect(screen.getByTestId("opened").textContent).toBe("done-mine")
  fireEvent.click(doneGroup())
  expect(screen.queryByText("Book the photographer")).toBeNull()
})

it("follows the scope: Team tasks also lists a teammate's finished task, with its owner", () => {
  show()
  fireEvent.change(screen.getByRole("combobox", { name: "Task scope" }), { target: { value: "team" } })
  expect(doneGroup().textContent).toContain("Done (2)")
  fireEvent.click(doneGroup())
  const done = within(screen.getByTestId("done-tasks"))
  expect(done.getAllByTestId("task-card")).toHaveLength(2)
  expect(done.getByText("Order the pizza")).toBeTruthy()
  expect(done.getByText("Maya")).toBeTruthy()
})
