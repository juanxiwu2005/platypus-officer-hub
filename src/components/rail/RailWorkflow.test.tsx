import { afterEach, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { RailProvider, useRail } from "./RailContext"

afterEach(cleanup)
function Fixture() {
  const rail = useRail()
  return <>
    <button type="button" onClick={() => { rail.show({ kind: "workflow" }); rail.setWorkflowDetail(<p>First draft</p>) }}>Select task</button>
    <button type="button" onClick={() => rail.setOpen(false)}>Hide rail</button>
    <button type="button" onClick={() => rail.setWorkflowDetail(<p>Saved draft</p>)}>Refresh draft</button>
    <output data-testid="open">{String(rail.open)}</output>
    <output data-testid="kind">{rail.detail?.kind}</output>
    {rail.workflowDetail}
  </>
}
it("refreshes workflow content without reopening a manually hidden rail", () => {
  render(<RailProvider><Fixture /></RailProvider>)
  fireEvent.click(screen.getByRole("button", { name: "Select task" }))
  expect(screen.getByTestId("open").textContent).toBe("true")
  expect(screen.getByTestId("kind").textContent).toBe("workflow")
  fireEvent.click(screen.getByRole("button", { name: "Hide rail" }))
  fireEvent.click(screen.getByRole("button", { name: "Refresh draft" }))
  expect(screen.getByText("Saved draft")).toBeTruthy()
  expect(screen.getByTestId("open").textContent).toBe("false")
  fireEvent.click(screen.getByRole("button", { name: "Select task" }))
  expect(screen.getByTestId("open").textContent).toBe("true")
})
