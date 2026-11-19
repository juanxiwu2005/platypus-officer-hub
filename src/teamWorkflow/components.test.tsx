import { useRef, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { TeamPeopleSetup } from "./TeamPeopleSetup"
import { TeamSwimlanes } from "./TeamSwimlanes"
import { compileTeamLanes, emptyTeamMap } from "./lanes"
import { exampleDirectory } from "./examples"

afterEach(cleanup)
function People() {
  const [directory, setDirectory] = useState(exampleDirectory)
  const serial = useRef(0)
  return <TeamPeopleSetup directory={directory} onChange={setDirectory} createId={() => `test-${serial.current++}`} />
}

describe("P1 controlled people component", () => {
  it("edits an existing role's manager and keeps the team select independent", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: /^Edit Finance Assistant\b/ }))
    const manager = screen.getByLabelText("Reports to") as HTMLSelectElement
    expect(manager.value).toBe("associate")
    fireEvent.change(manager, { target: { value: "treasurer" } })
    expect((screen.getByLabelText("Reports to") as HTMLSelectElement).value).toBe("treasurer")
    expect((screen.getByLabelText("Team") as HTMLSelectElement).value).toBe("finance")
  })
  it("adds a direct report with a manager/team selected and empty name/email", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: /^Edit Finance Associate\b/ }))
    fireEvent.click(screen.getByRole("button", { name: "+ Add direct report" }))
    expect((screen.getByLabelText("Reports to") as HTMLSelectElement).value).toBe("associate")
    expect((screen.getByLabelText("Team") as HTMLSelectElement).value).toBe("finance")
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("")
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Taylor Example" } })
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "taylor@example.org" } })
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Taylor Example")
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("taylor@example.org")
  })
  it("omits self/descendant managers from a role's choices", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: /^Edit Treasurer\b/ }))
    const options = within(screen.getByLabelText("Reports to")).getAllByRole("option").map(o => o.textContent)
    expect(options).not.toContain("Treasurer"); expect(options).not.toContain("Finance Associate"); expect(options).not.toContain("Finance Assistant")
    expect(options).toContain("Executive VP")
  })
  it("creates an empty team without creating a role", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: "+ Add team" }))
    fireEvent.change(screen.getByLabelText("Team name"), { target: { value: "Research Lab" } })
    fireEvent.submit(screen.getByRole("form", { name: "New team" }))
    const newTeam = screen.getByRole("region", { name: "Research Lab team" })
    expect(within(newTeam).queryAllByRole("article")).toHaveLength(0)
    expect(within(newTeam).getByText(/Drop a role here/)).toBeTruthy()
    expect(screen.getAllByRole("article")).toHaveLength(7)
  })
  it("adds a role to an existing team without creating a team", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: "+ Add role" }))
    const form = screen.getByRole("form", { name: "New role" })
    fireEvent.change(within(form).getByLabelText("Role title"), { target: { value: "Grant Analyst" } })
    fireEvent.change(within(form).getByLabelText("Team"), { target: { value: "finance" } })
    fireEvent.change(within(form).getByLabelText("Reports to"), { target: { value: "associate" } })
    fireEvent.submit(form)
    expect(within(screen.getByRole("region", { name: "Finance team" })).getAllByRole("article")).toHaveLength(4)
    expect(screen.getAllByRole("region", { name: / team$/ })).toHaveLength(5)
  })
  it("moves a role using the accessible select, preserving contact and manager", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: /^Edit Finance Assistant\b/ }))
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "marketing" } })
    const marketing = screen.getByRole("region", { name: "Marketing team" })
    expect(within(marketing).getByLabelText("Reports to")).toBeTruthy()
    expect((screen.getByLabelText("Reports to") as HTMLSelectElement).value).toBe("associate")
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("jamie@example.org")
  })
  it("supports drag into a team without changing the reporting relationship", () => {
    render(<People />)
    const transfer = { setData() {}, getData: () => "assistant", effectAllowed: "move" }
    fireEvent.dragStart(screen.getByRole("button", { name: "Drag Finance Assistant to a team" }), { dataTransfer: transfer })
    fireEvent.drop(screen.getByRole("region", { name: "Operations team" }), { dataTransfer: transfer })
    fireEvent.click(within(screen.getByRole("region", { name: "Operations team" })).getByRole("button", { name: /^Edit Finance Assistant\b/ }))
    expect((screen.getByLabelText("Reports to") as HTMLSelectElement).value).toBe("associate")
  })
  it("does not silently replace the lead when Treasurer leaves Finance", () => {
    render(<People />)
    fireEvent.click(screen.getByRole("button", { name: /^Edit Treasurer\b/ }))
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "operations" } })
    const finance = screen.getByRole("region", { name: "Finance team" })
    expect((within(finance).getByLabelText("Team lead") as HTMLSelectElement).value).toBe("")
  })
})

describe("team lane shell", () => {
  it("renders empty teams as lanes, and missing ownership as an alert rather than a sixth lane", () => {
    const compilation = compileTeamLanes("custom", [{ key: "task" }], exampleDirectory(), emptyTeamMap("custom"))
    const { container } = render(<TeamSwimlanes compilation={compilation} renderLane={lane => <p>{lane.steps.map(s => s.key).join(", ")}</p>} />)
    expect(container.querySelectorAll("[data-team-lane]")).toHaveLength(5)
    expect(screen.getByRole("alert").textContent).toContain("task")
    expect(screen.queryByText("Unassigned team")).toBeNull()
  })
  it("does not render a misleading valid-looking graph from duplicate team IDs", () => {
    const d = exampleDirectory(); d.teams.push({ ...d.teams[0] })
    const compilation = compileTeamLanes("custom", [], d, emptyTeamMap("custom"))
    const { container } = render(<TeamSwimlanes compilation={compilation} renderLane={() => null} />)
    expect(container.querySelectorAll("[data-team-lane]")).toHaveLength(0)
    expect(screen.getByRole("alert")).toBeTruthy()
  })
})
