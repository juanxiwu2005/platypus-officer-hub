import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { clubDraft } from "../data/settings"
import { seedDemo } from "../data/seed"
import type { DemoState } from "../data/types"
import { orgSteps } from "../engine/playbooks"
import { withOwners } from "../engine/workflow"
import { fmtShort } from "../lib/dates"
import { onboardingCopy } from "../onboarding/copy"
import { BufferChoice } from "../onboarding/founder/firstEvent/BufferChoice"
import { bufferExample } from "../onboarding/founder/firstEvent/bufferExample"
import { bufferRows } from "../onboarding/founder/firstEvent/bufferRows"
import { prepareEvent, previewFor } from "../onboarding/founder/firstEvent/plan"

// FB-3 (docs/feedback-fix/PLAN.md 5.2): the buffer block on the First event screen, rendered on its own with real engine previews.
const c = onboardingCopy.founder.firstEvent
const state = seedDemo(undefined, "v2")
const club = clubDraft(state)
const steps = withOwners(orgSteps(state), club.roles)
const CODE = "11111111-2222-3333-4444-555555555555"
afterEach(cleanup)

async function planned(sentence: string) {
  const r = await prepareEvent(state, club, sentence)
  if (!r.ok) throw new Error(r.notice)
  return (b: number) => previewFor(state, club, r.event, r.date, CODE, steps, b)
}
/** The block with the buffer kept in a parent's state, as FirstEvent keeps it in the draft. `strip` removes every ASU deadline from the preview. */
function Harness({ at, start, strip = false }: { at: (b: number) => DemoState | null; start: number; strip?: boolean }) {
  const [buffer, setBuffer] = useState(start)
  const view = (b: number) => { const p = at(b); return p && strip ? { ...p, nodes: p.nodes.map(n => ({ ...n, officialDeadline: null })) } : p }
  return <BufferChoice buffer={buffer} preview={view(buffer)!} previewAt={view} today={state.today} onChoose={setBuffer} />
}
const group = () => screen.getByRole("group", { name: c.buffer })
const pick = (name: RegExp) => fireEvent.click(within(group()).getByRole("button", { name }))

describe("FB-3 buffer block", () => {
  it("shows three named choices with Standard recommended and pressed, the question and the hint", async () => {
    render(<Harness at={await planned(c.examples[2].sentence)} start={3} />)
    expect(screen.getByRole("heading", { name: c.buffer })).toBeTruthy()
    expect(screen.getByText(c.bufferHint)).toBeTruthy()
    const buttons = within(group()).getAllByRole("button")
    expect(buttons.map(b => b.textContent)).toEqual(["Tight · 1 day", `Standard · 3 days${c.recommended}`, "Safe · 5 days"])
    expect(buttons.map(b => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"])
  })
  it("a stored 7 is a fourth, pressed Custom choice that stays offered after another choice", async () => {
    render(<Harness at={await planned(c.examples[2].sentence)} start={7} />)
    expect(within(group()).getByRole("button", { name: /^Custom · 7 days/ }).getAttribute("aria-pressed")).toBe("true")
    pick(/^Tight/)
    expect(within(group()).getByRole("button", { name: /^Custom · 7 days/ }).getAttribute("aria-pressed")).toBe("false")
    expect(within(group()).getByRole("button", { name: /^Tight/ }).getAttribute("aria-pressed")).toBe("true")
  })
  it("rows carry the engine's dates; a choice that moves one says so in words, and the sentence follows the choice", async () => {
    const at = await planned(c.examples[2].sentence)
    render(<Harness at={at} start={3} />)
    const cells = () => screen.getAllByTestId("buffer-row").map(r => [...r.querySelectorAll("th, td")].map(x => x.textContent))
    expect(cells()).toEqual(bufferRows(at(3)).map(r => [r.title, fmtShort(r.official), fmtShort(r.club)]))
    expect(screen.getByTestId("buffer-effect").textContent).toBe(c.bufferNone)
    pick(/^Safe/)
    const moved = bufferRows(at(5), at(3))
    expect(cells()).toEqual(moved.map(r => [r.title, fmtShort(r.official), fmtShort(r.club) + (r.moved ? ` ${c.movedEarlier}` : "")]))
    expect(screen.getAllByTestId("buffer-moved").length).toBe(moved.filter(r => r.moved).length)
    expect(screen.getByTestId("buffer-effect").textContent).toBe("If something slips by up to 5 working days, you still meet the ASU deadline.")
    pick(/^Standard/)
    expect(screen.getAllByTestId("buffer-moved").map(x => x.textContent)).toEqual(moved.filter(r => r.moved).map(() => c.movedLater))
    pick(/^Tight/)                                                       // nothing changes from Standard to Tight here
    expect(screen.queryAllByTestId("buffer-moved")).toHaveLength(0)
    expect(screen.getByTestId("buffer-effect").textContent).toBe(c.bufferNone)
  })
  it("with no step that has an ASU deadline it falls back to the general worked example, which follows every choice", async () => {
    render(<Harness at={await planned(c.examples[0].sentence)} start={3} strip />)
    expect(screen.queryAllByTestId("buffer-row")).toHaveLength(0)
    expect(screen.queryByTestId("buffer-effect")).toBeNull()
    const seen: string[] = []
    for (const [name, b] of [[/^Tight/, 1], [/^Standard/, 3], [/^Safe/, 5]] as const) {
      pick(name)
      const text = screen.getByTestId("buffer-example").textContent!
      const e = bufferExample(state.today, b)
      expect(text).toBe(c.bufferExample.replace("{official}", new Date(e.official + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })).replace("{club}", new Date(e.club + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })))
      seen.push(text)
    }
    expect(new Set(seen).size).toBe(3)
  })
})
