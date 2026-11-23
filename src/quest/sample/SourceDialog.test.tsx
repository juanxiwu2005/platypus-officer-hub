import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import SourceDialog from "./SourceDialog"
import { SETUP_SOURCE } from "./venue"
import { policySourceById } from "../../data/policyCatalog"
import { questSchedule } from "../../engine/questSchedule"
import { fmtShort } from "../../lib/dates"

const clock = questSchedule()
const proto = HTMLDialogElement.prototype
const originalShowModal = proto.showModal
const originalClose = proto.close

// jsdom lacks the native dialog methods; these stubs mirror native state and events.
beforeAll(() => {
  proto.showModal = function (this: HTMLDialogElement) { this.open = true }
  proto.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event("close"))
  }
})
afterEach(cleanup)
afterAll(() => {
  proto.showModal = originalShowModal
  proto.close = originalClose
})

const renderDialog = (ids: readonly string[], onClose = () => {}) =>
  render(<SourceDialog ids={ids} clock={clock} onClose={onClose} />)

describe("SourceDialog", () => {
  it("shows both 2.3 clauses on one line group with an ellipsis gap and the ASU-R-013 citation", () => {
    const { container } = renderDialog(["2.3"])
    expect(container.querySelector("dialog")!.open).toBe(true)
    const quote = container.querySelector(".sample-source-quote")!
    expect(quote.textContent).toContain("User Accounts can be requested by up to three (3) elected officers")
    expect(quote.textContent).toContain("Organization advisors are not eligible to serve as requestors for student organizations")
    const gaps = container.querySelectorAll(".sample-source-gap")
    expect(gaps).toHaveLength(1)
    expect(gaps[0].textContent).toBe("… ")
    const cite = container.querySelector(".sample-source-cite")!
    expect(cite.textContent).toContain("ASU-R-013 · line 2143")
    const link = screen.getByRole("link", { name: "Open in Handbook" })
    expect(link.getAttribute("href")).toBe(policySourceById("ASU-R-013")!.sourceUrl)
  })

  it("joins the split 5.4 RFF quote across lines 9742–9743 and offers the artwork source", () => {
    const { container } = renderDialog(["2.3", "5.4"])
    fireEvent.change(screen.getByLabelText("Rule"), { target: { value: "1" } })
    expect(screen.getByRole("option", { name: "Rule 5.4: Use licensed merchandise vendors; flag logos and attach artwork to the RFF.", selected: true })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "1" } })
    const quote = container.querySelector(".sample-source-quote")!
    expect(quote.textContent).toContain('branded content, "Expense Includes Logo" must be selected on the RFF.')
    expect(container.querySelector(".sample-source-cite")!.textContent).toContain("ASU-R-047 · lines 9742–9743")
    expect(screen.getByRole("option", { name: "ASU-R-047 · line 9744" })).toBeTruthy()
  })

  it("shows the engine-shifted RITM date for 2.5 without a literal product date", () => {
    renderDialog(["2.5"])
    const note = screen.getByText(`RITM number: ${fmtShort(clock.deadlines.ritm.date)} — ${clock.deadlines.ritm.explanation} Closed days move earlier.`)
    expect(note).toBeTruthy()
  })

  it("appends venue.setup with the exact setup quote when a venue topic is shown", () => {
    const { container } = renderDialog(["venue.capacity"])
    fireEvent.change(screen.getByLabelText("Rule"), { target: { value: "1" } })
    expect(container.querySelector(".sample-source-quote")!.textContent).toBe(SETUP_SOURCE.quote)
    expect(container.querySelector(".sample-source-cite")!.textContent).toContain("ASU-R-015 · line 2399")
    expect(screen.getByText("Practice proposal. Venue staff confirm the reserved setup.")).toBeTruthy()
  })

  it("calls onClose once when Back triggers the native close", () => {
    const onClose = vi.fn()
    renderDialog(["2.3"], onClose)
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
