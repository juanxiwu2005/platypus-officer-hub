/** P5-06B regression: real Promotion interactions through the CommsScenes adapter, driven by a controlled draft built from the real schedule. */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import CommsScenes from "./CommsScenes"
import { initialSample, type SampleDraft } from "./model"
import { questSchedule } from "../../engine/questSchedule"
const schedule = questSchedule()
interface Log { edits: Partial<SampleDraft>[]; checks: number; draft: SampleDraft }
const makeLog = (): Log => ({ edits: [], checks: 0, draft: initialSample(schedule) })
function Scene({ stage, log }: { stage: "handoff" | "promotion"; log: Log }) {
  const [draft, setDraft] = useState<SampleDraft>(() => initialSample(schedule))
  log.draft = draft
  return (
    <CommsScenes stage={stage} draft={draft}
      onEdit={(values) => { log.edits.push(values); setDraft((d) => ({ ...d, ...structuredClone(values) })) }}
      onCheck={() => { log.checks += 1 }} />
  )
}
const harness = (stage: "handoff" | "promotion", log: Log) => render(<Scene stage={stage} log={log} />)
/** Native Enter in jsdom: only click the real button when keyDown was not prevented. */
function pressEnter(el: Element) { if (fireEvent.keyDown(el, { key: "Enter" })) fireEvent.click(el) }
const dropCol = (el: Element) => el.closest("[data-drop-col]")?.getAttribute("data-drop-col") ?? ""
const status = () => screen.getByRole("status").textContent
const button = (name: string | RegExp) => screen.getByRole("button", { name })
describe("Promotion repair bench", () => {
  afterEach(cleanup)
  it("fixes the poster and the print count through real edits", () => {
    const log = makeLog()
    harness("promotion", log)
    const name = button("Desert Founders Society @ ASU")
    expect(name.getAttribute("aria-pressed")).toBe("false"); fireEvent.click(name)
    expect(log.draft.promotion).toEqual({ namingFixed: true, markRemoved: false, printCount: 120, vendor: null, logoFlag: false, artworkAttached: false })
    expect(button("Desert Founders Society at ASU®").getAttribute("aria-pressed")).toBe("true"); fireEvent.click(button("Reserved university mark")); expect(log.draft.promotion.markRemoved).toBe(true)
    expect(button("Original club mark").getAttribute("aria-pressed")).toBe("true")
    const count = screen.getByLabelText("Print count") as HTMLInputElement
    fireEvent.change(count, { target: { value: "101" } }); expect(log.draft.promotion.printCount).toBe(101); expect(count.value).toBe("101")
    expect((screen.getByLabelText("Print quantity") as HTMLInputElement).value).toBe("101"); expect(screen.getByText("$505 / $500")).toBeTruthy()
    fireEvent.change(count, { target: { value: "100" } })
    expect(log.draft.promotion.printCount).toBe(100)
    expect(screen.getByText("$500 / $500")).toBeTruthy()
    expect(log.checks).toBe(0)
  })
  it("moves the merchandise order by keyboard and stamps the logo", () => {
    const log = makeLog()
    harness("promotion", log)
    expect(screen.getAllByText("Merchandise order")).toHaveLength(1)
    expect(screen.getAllByText("Artwork proof")).toHaveLength(1)
    const order = button("Merchandise order")
    order.focus()
    pressEnter(order) // Enter not prevented while unpicked: the click picks it
    expect(order.getAttribute("aria-pressed")).toBe("true")
    expect(dropCol(order)).toBe("tray")
    fireEvent.keyDown(order, { key: "ArrowRight" })
    expect(button("Licensed vendor").getAttribute("aria-pressed")).toBe("true")
    fireEvent.keyDown(order, { key: "ArrowRight" })
    pressEnter(order) // picked: keyDown is prevented, so only the component's own Enter places it
    expect(log.draft.promotion.vendor).toBe("unverified")
    const moved = button("Merchandise order")
    expect(dropCol(moved)).toBe("unverified")
    expect(status()).toBe("Merchandise order is at Unverified vendor.")
    expect(document.activeElement?.textContent).toBe("Merchandise order")
    fireEvent.click(moved) // pick again; the cursor starts at its current destination
    fireEvent.keyDown(moved, { key: "ArrowLeft" })
    pressEnter(moved)
    expect(log.draft.promotion.vendor).toBe("licensed")
    expect(dropCol(button("Merchandise order"))).toBe("licensed")
    const stamp = button("Expense Includes Logo")
    fireEvent.click(stamp)
    expect(log.draft.promotion.logoFlag).toBe(true)
    expect(stamp.getAttribute("aria-pressed")).toBe("true")
    expect(log.checks).toBe(0)
  })
  it("round-trips the artwork proof and only the parent sees Send for review", () => {
    const log = makeLog()
    harness("promotion", log)
    const proof = button("Artwork proof")
    fireEvent.click(proof)
    fireEvent.keyDown(proof, { key: "ArrowRight" })
    pressEnter(proof)
    expect(log.draft.promotion.artworkAttached).toBe(true)
    expect(dropCol(button("Artwork proof"))).toBe("rff")
    const back = button("Artwork proof")
    fireEvent.click(back)
    fireEvent.keyDown(back, { key: "ArrowLeft" }) // rff -> tray
    pressEnter(back)
    expect(log.draft.promotion.artworkAttached).toBe(false)
    expect(dropCol(button("Artwork proof"))).toBe("tray")
    const again = button("Artwork proof")
    fireEvent.click(again)
    fireEvent.keyDown(again, { key: "ArrowRight" }) // tray -> rff
    pressEnter(again)
    expect(log.draft.promotion.artworkAttached).toBe(true)
    fireEvent.click(button("Expense Includes Logo"))
    const editsBefore = log.edits.length
    fireEvent.click(button("Send for review"))
    expect(log.checks).toBe(1)
    expect(log.edits).toHaveLength(editsBefore)
    expect(log.draft.promotion).toEqual({ namingFixed: false, markRemoved: false, printCount: 120, vendor: null, logoFlag: true, artworkAttached: true })
    expect(status()).toBe("Artwork proof is at RFF folder.") // no hidden completion or judge text
  })
  it("cancels with Escape and keeps state on no-op clicks and target focus", () => {
    const log = makeLog()
    harness("promotion", log)
    const order = button("Merchandise order")
    fireEvent.click(order) // picked; cursor at its current destination (tray)
    fireEvent.keyDown(order, { key: "Escape" })
    expect(order.getAttribute("aria-pressed")).toBe("false")
    expect(status()).toBe("Cancelled.")
    expect(document.activeElement).toBe(order)
    pressEnter(order) // unpicked: the click picks it again
    pressEnter(order) // picked: placing at the current destination is a no-op that keeps focus
    expect(status()).toBe("Merchandise order stays at Riley's tray.")
    expect(document.activeElement?.textContent).toBe("Merchandise order")
    expect(log.draft.promotion.vendor).toBeNull()
    fireEvent.click(button("RFF folder")) // no paper picked
    expect(status()).toBe("Pick a paper first.")
    expect(log.draft.promotion.artworkAttached).toBe(false)
    const proof = button("Artwork proof")
    fireEvent.click(proof)
    const rff = button("RFF folder")
    fireEvent.focus(rff) // Tab lands on the target: the cursor follows
    expect(rff.getAttribute("aria-pressed")).toBe("true")
    fireEvent.keyDown(rff, { key: "ArrowLeft" }) // arrows move the cursor and the focus between targets
    expect(document.activeElement?.textContent).toBe("Riley's tray")
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" })
    expect(document.activeElement?.textContent).toBe("RFF folder")
    pressEnter(document.activeElement as Element) // Enter on the target places the picked paper
    expect(log.draft.promotion.artworkAttached).toBe(true)
    expect(status()).toBe("Artwork proof is at RFF folder.")
    fireEvent.click(button("Merchandise order")) // a different picked paper
    fireEvent.keyDown(button("RFF folder"), { key: "Escape" }) // Escape from another control still cancels
    expect(status()).toBe("Cancelled.")
    expect(button("Merchandise order").getAttribute("aria-pressed")).toBe("false")
    expect(document.activeElement?.textContent).toBe("Merchandise order")
  })
  it("switches the adapter to the handoff stage without breaking the hooks", () => {
    const log = makeLog()
    const view = harness("promotion", log)
    fireEvent.click(button("Desert Founders Society @ ASU"))
    expect(log.draft.promotion.namingFixed).toBe(true)
    view.rerender(<Scene stage="handoff" log={log} />)
    expect(button("Hand over")).toBeTruthy()
    expect(button("Approval")).toBeTruthy()
    expect(button("RITM number")).toBeTruthy()
    expect(button("Confirmed room")).toBeTruthy()
    expect(log.draft.promotion.namingFixed).toBe(true) // same draft, no reset
    expect(log.checks).toBe(0)
  })
})
