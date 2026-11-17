import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { applyMatchingCommand } from "../library"
import { createMatchingExample } from "../examples"
import type { MatchingSetupDocument, MatchingSetupViewProps } from "../setupContracts"
import MatchingSetupView from "./MatchingSetupView"

afterEach(cleanup)

function example(): MatchingSetupDocument {
  const world = createMatchingExample()
  return { version: 1, id: "preview", contextKey: "test-team", revision: 0, updatedAt: "2026-11-17T01:00:00Z", matching: world.state, references: world.references, source: { name: "Fictional constitution", text: "The facilities crew reserves spaces for the club." }, reads: [], decisions: [], audit: [] }
}
function props(document = example()): MatchingSetupViewProps {
  return { document, canEdit: true, busy: false, error: null, onCommand: vi.fn(), onReferencesChange: vi.fn(), onSourceChange: vi.fn(), onRead: vi.fn(), onStop: vi.fn(), onProposal: vi.fn(), onExample: vi.fn(), onExport: vi.fn() }
}
function compactExample() {
  const document = example()
  document.references = { ...document.references, roles: document.references.roles.slice(0, 2), members: document.references.members.slice(0, 4) }
  return document
}
function Controlled({ initial = compactExample() }: { initial?: MatchingSetupDocument }) {
  const [document, setDocument] = useState(initial)
  const options = props(document)
  return <MatchingSetupView {...options} onCommand={command => setDocument(previous => ({ ...previous, matching: applyMatchingCommand(previous.matching, command, { operationId: crypto.randomUUID(), actorId: "member-01", at: "2026-11-17T01:00:00Z", expectedRevision: previous.matching.revision, references: previous.references }) }))} onReferencesChange={references => setDocument(previous => ({ ...previous, references }))} />
}
const section = (name: RegExp) => within(screen.getByRole("region", { name }))

describe("matching setup: explicit source review", () => {
  it("opens the manual path without making an AI request and explains the preview boundary", () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    expect(options.onRead).not.toHaveBeenCalled()
    expect(screen.getByText(/Existing tasks and team records are unchanged/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "New responsibility" })).toBeTruthy()
  })

  it("keeps pasted text until an explicit read and forwards targeted retries", () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    fireEvent.change(screen.getByLabelText("Constitution text"), { target: { value: "The fabrication lead prepares safe, tested robot parts." } })
    expect(options.onRead).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Draft responsibilities" }))
    expect(options.onRead).toHaveBeenLastCalledWith({ name: "Fictional constitution", text: "The fabrication lead prepares safe, tested robot parts." })
    fireEvent.change(screen.getByLabelText("Read one position again"), { target: { value: "role-code" } })
    fireEvent.click(screen.getByRole("button", { name: "Read selected position" }))
    expect(options.onRead).toHaveBeenLastCalledWith(expect.anything(), ["role-code"])
    fireEvent.click(screen.getByRole("button", { name: "Read general duties" }))
    expect(options.onRead).toHaveBeenLastCalledWith(expect.anything(), [])
  })

  it("reads a supported file locally without starting AI", async () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    const file = new File([], "robotics.txt", { type: "text/plain" })
    Object.defineProperty(file, "text", { value: async () => "The fabrication lead prepares safe, tested robot parts." })
    fireEvent.change(screen.getByLabelText("Upload constitution document"), { target: { files: [file] } })
    await waitFor(() => expect(options.onSourceChange).toHaveBeenCalledWith(expect.objectContaining({ name: "robotics.txt", text: expect.stringContaining("fabrication lead") })))
    expect(options.onRead).not.toHaveBeenCalled()
  })

  it("rejects long uploads without truncating or replacing the saved source", async () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    const file = new File([], "too-long.txt", { type: "text/plain" })
    Object.defineProperty(file, "text", { value: async () => "A".repeat(60_001) })
    fireEvent.change(screen.getByLabelText("Upload constitution document"), { target: { files: [file] } })
    expect(await screen.findByText(/nothing was cut automatically/)).toBeTruthy()
    expect(options.onSourceChange).not.toHaveBeenCalled()
    expect(options.onRead).not.toHaveBeenCalled()
  })

  it("keeps text edited while a file is being read", async () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    let finish!: (text: string) => void
    const file = new File([], "slow.txt", { type: "text/plain" })
    Object.defineProperty(file, "text", { value: () => new Promise<string>(resolve => { finish = resolve }) })
    fireEvent.change(screen.getByLabelText("Upload constitution document"), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText("Constitution text"), { target: { value: "My manual replacement text must be preserved." } })
    finish("The old file describes another responsibility.")
    expect(await screen.findByText(/Your edits were kept/)).toBeTruthy()
    expect((screen.getByLabelText("Constitution text") as HTMLTextAreaElement).value).toBe("My manual replacement text must be preserved.")
    expect(options.onSourceChange).not.toHaveBeenCalled()
  })

  it("labels unsupported citations as suggestions and asks before adopting a draft", () => {
    const document = example()
    document.reads = [{ id: "read-one", actorId: "member-01", at: document.updatedAt, status: "completed", message: null, request: { part: "responsibilities", requestId: "read-one", sourceId: "source-one", text: document.source.text, roles: document.references.roles, existingResponsibilities: [] }, response: { part: "responsibilities", requestId: "read-one", sourceId: "source-one", warnings: ["Review suggested scope."], proposals: [{ id: "proposal-one", title: "Sponsor outreach", description: "Contact potential sponsors.", deliverable: "A record of sponsor replies.", exclusions: [], requiredQualificationIds: [], roleIds: [], source: { kind: "suggestion", sourceId: "source-one", quote: "A quote that does not occur in the source.", verified: false } }] } }]
    const options = props(document); render(<MatchingSetupView {...options} />)
    expect(screen.getByText("Suggestion · not verified in source")).toBeTruthy()
    expect(options.onCommand).not.toHaveBeenCalled()
    expect(options.onProposal).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Use as draft" }))
    expect(options.onProposal).toHaveBeenCalledWith("read-one", "proposal-one", "accepted")
  })

  it("makes stop explicit without promising provider cancellation", () => {
    const options = { ...props(), busy: true }; render(<MatchingSetupView {...options} />)
    expect(screen.getByText(/the AI service may still finish/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Stop waiting" }))
    expect(options.onStop).toHaveBeenCalledOnce()
  })
})

describe("matching setup: manual responsibilities and people", () => {
  it("retains a manual form when the controller reports that saving failed", () => {
    const options = props(); const view = render(<MatchingSetupView {...options} />)
    fireEvent.click(screen.getByRole("button", { name: "New responsibility" }))
    fireEvent.change(screen.getByLabelText("Responsibility name"), { target: { value: "Sensor calibration" } })
    fireEvent.change(screen.getByLabelText("What should be delivered?"), { target: { value: "A calibrated sensor log" } })
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
    view.rerender(<MatchingSetupView {...options} error="Storage is full. Keep this draft and export it." />)
    expect((screen.getByLabelText("Responsibility name") as HTMLInputElement).value).toBe("Sensor calibration")
    expect((screen.getByLabelText("What should be delivered?") as HTMLInputElement).value).toBe("A calibrated sensor log")
    expect(screen.getByRole("alert").textContent).toContain("Storage is full")
  })

  it("creates a draft by hand, requires saving edits before confirmation, and confirms separately", () => {
    render(<Controlled />)
    fireEvent.click(screen.getByRole("button", { name: "New responsibility" }))
    fireEvent.change(screen.getByLabelText("Responsibility name"), { target: { value: "Sensor calibration" } })
    fireEvent.change(screen.getByLabelText("What does this responsibility cover?"), { target: { value: "Calibrate the robot sensors." } })
    fireEvent.change(screen.getByLabelText("What should be delivered?"), { target: { value: "A calibrated sensor log" } })
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
    expect(screen.getByRole("button", { name: "Sensor calibration Draft" })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("What should be delivered?"), { target: { value: "A reviewed calibration log" } })
    expect((screen.getByRole("button", { name: "Confirm responsibility" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirm responsibility" }))
    expect(screen.getByRole("button", { name: "Sensor calibration Confirmed" })).toBeTruthy()
  })

  it("keeps relationship IDs when confirming an existing position link", () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    const role = screen.getByText("Facilities Crew", { selector: "summary" }).closest("details")!
    const checkbox = within(role).getByRole("checkbox", { name: "Space coordination" })
    fireEvent.click(checkbox)
    expect(options.onCommand).toHaveBeenCalledWith({ type: "roleBinding.upsert", value: { id: "binding-duty-space", roleId: "role-space", responsibilityId: "duty-space", confirmed: false } })
  })

  it("exposes explicit direct exclusions without changing position membership", () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    const member = section(/Connect people/).getByText("Demo Riley", { selector: "strong" }).closest("details")!
    fireEvent.change(within(member).getByLabelText("Direct responsibility exception"), { target: { value: "exclude" } })
    expect(options.onCommand).toHaveBeenCalledWith({ type: "memberBinding.upsert", value: { id: "direct-space-riley", memberId: "member-02", responsibilityId: "duty-space", decision: "exclude", confirmed: true } })
    expect(options.onReferencesChange).not.toHaveBeenCalled()
  })

  it("does not allow a qualification-unknown member as an effective default", () => {
    render(<Controlled />)
    const team = section(/Connect people/)
    const primary = team.getByLabelText("Default person")
    expect((within(primary).getByRole("option", { name: /Demo Jordan/ }) as HTMLOptionElement).disabled).toBe(true)
    const member = team.getByText("Demo Jordan", { selector: "strong" }).closest("details")!
    fireEvent.change(within(member).getByLabelText("space-account"), { target: { value: "confirmed" } })
    expect((within(primary).getByRole("option", { name: "Demo Jordan" }) as HTMLOptionElement).disabled).toBe(false)
  })

  it("prevents the same person serving as both default and backup", () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    const primary = section(/Connect people/).getByLabelText("Default person")
    fireEvent.change(primary, { target: { value: "member-03" } })
    expect((screen.getByRole("button", { name: "Save default rule" }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/both people must be different/)).toBeTruthy()
  })
})

describe("matching setup: reusable workflow preview", () => {
  it("shows one entry per candidate and names why others cannot take the work", () => {
    render(<MatchingSetupView {...props()} />)
    const result = within(screen.getByTestId("matching-assignment-result"))
    expect(result.getByText("Suggested: Demo Riley")).toBeTruthy()
    expect(result.getAllByText("Demo Riley", { selector: "strong" })).toHaveLength(1)
    expect(result.getByText("required qualification unknown")).toBeTruthy()
    expect(result.getByText("not a current member")).toBeTruthy()
  })

  it("suggests the available backup and never records an actual task assignment", () => {
    const options = props(); render(<MatchingSetupView {...options} />)
    fireEvent.click(screen.getByRole("button", { name: "Prepare the competition poster competition" }))
    const result = within(screen.getByTestId("matching-assignment-result"))
    expect(result.getByText("Suggested: Demo Drew")).toBeTruthy()
    expect(result.getByText(/Confirm the backup before assigning/)).toBeTruthy()
    expect(options.onCommand).not.toHaveBeenCalled()
  })

  it("lets another workflow reuse the same responsibility and previews the shared rule", () => {
    render(<Controlled />)
    fireEvent.click(screen.getByRole("button", { name: "New workflow step" }))
    fireEvent.change(screen.getByLabelText("Workflow"), { target: { value: "open-house" } })
    fireEvent.change(screen.getByLabelText("Step title"), { target: { value: "Reserve an open house room" } })
    fireEvent.change(screen.getByLabelText("Main responsibility"), { target: { value: "duty-space" } })
    fireEvent.change(screen.getByLabelText("Step review"), { target: { value: "confirmed" } })
    fireEvent.click(screen.getByRole("button", { name: "Save step link" }))
    expect(within(screen.getByTestId("matching-assignment-result")).getByText("Suggested: Demo Riley")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Reserve an open house room open-house" })).toBeTruthy()
  })

  it("keeps compound work unresolved", () => {
    render(<MatchingSetupView {...props()} />)
    fireEvent.click(screen.getByRole("button", { name: "Write copy and design graphics competition" }))
    expect(within(screen.getByTestId("matching-assignment-result")).getByText(/Split this step or clarify/)).toBeTruthy()
  })

  it("keeps editing and AI controls disabled for a read-only viewer", () => {
    render(<MatchingSetupView {...props()} canEdit={false} />)
    for (const name of ["New responsibility", "Draft responsibilities", "New workflow step", "Try 12-person example", "Save default rule"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true)
    }
    expect((screen.getByRole("button", { name: "Export preview" }) as HTMLButtonElement).disabled).toBe(false)
  })
})
