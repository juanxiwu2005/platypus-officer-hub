import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { seedDemo } from "../data/seed"
import { StoreProvider } from "../data/store"
import { RailProvider } from "../components/rail/RailContext"
import { Rail } from "../components/rail/Rail"
import { Contributions } from "../pages/Team"

/**
 * The Contributions board is not rendered since Cheers R1 (it returns later for the president only), so the browser tests that
 * opened it were replaced (2026-11-26): this test keeps its drill-down working, and e2e/cheers.spec.ts checks that a Team hover
 * card stays open when the pointer moves into it (the same Hover component and CSS).
 */
afterEach(() => { cleanup(); localStorage.clear() })

describe("Contributions board (kept for its return)", () => {
  it("a button in a row's hover card opens that task in the side panel", async () => {
    const s = seedDemo(undefined, "v2")
    render(<MemoryRouter initialEntries={["/team"]}><StoreProvider initial={s}><RailProvider><Contributions /><Rail /></RailProvider></StoreProvider></MemoryRouter>)
    const board = screen.getByTestId("contribution-board")
    const buttons = [...board.querySelectorAll<HTMLButtonElement>(".hover-card button")]
    expect(buttons.length, "the seed has finished steps on the board").toBeGreaterThan(0)
    const title = buttons[0].textContent!
    expect(s.nodes.some(n => n.title === title)).toBe(true)
    fireEvent.click(buttons[0])
    const detail = await screen.findByTestId("task-detail")
    expect(within(detail).getByRole("heading", { name: title })).toBeTruthy()
  })
})
