import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { HashRouter } from "react-router-dom"
import { StoreProvider } from "../data/store"
import { seedDemo } from "../data/seed"
import App from "../App"

// I12: "View as" and "AI features" live in the Demo menu, and a "Viewing as" line shows whose view the demo is in.
vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} })

async function open() {
  window.location.hash = "#/"
  render(<StoreProvider initial={seedDemo("2026-10-31")}><HashRouter><App /></HashRouter></StoreProvider>)
  return screen.findByTestId("demo-menu")
}
const menu = () => document.querySelector<HTMLElement>(".menu[role=group][aria-label=\"Demo controls\"]")!
const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, " ").trim()

describe("I12: Demo menu and the Viewing as line", () => {
  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear() })
  afterEach(cleanup)

  it("keeps View as and AI features inside the closed Demo menu, not in the bar", async () => {
    const pill = await open()
    expect(text(pill)).toMatch(/^Demo · /)
    expect(menu().hidden).toBe(true)
    expect(menu().contains(screen.getByTestId("view-as"))).toBe(true)
    expect(menu().contains(screen.getByRole("checkbox", { name: "AI features", hidden: true }))).toBe(true)
    expect(screen.queryByTestId("more-toggle")).toBeNull()
    expect(screen.queryByTestId("viewing-as")).toBeNull()
    expect(screen.getByTestId("viewing-as-slot").getAttribute("role")).toBe("status")
  })

  it("opens, switches person, shows Viewing as with name and role, and Switch back restores the president", async () => {
    const pill = await open()
    fireEvent.click(pill)
    expect(pill.getAttribute("aria-expanded")).toBe("true")
    expect(menu().hidden).toBe(false)
    // The study-task controls stay in the same menu, unchanged.
    expect(within(menu()).getByRole("button", { name: "Start task 2" })).toBeTruthy()
    fireEvent.change(within(menu()).getByLabelText("View as"), { target: { value: "maya" } })
    expect(pill.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(pill)
    const line = await screen.findByTestId("viewing-as")
    expect(text(line)).toMatch(/^Viewing as Maya · Treasurer/)
    expect(screen.getByTestId("viewing-as-slot").contains(line)).toBe(true)
    fireEvent.click(within(line).getByRole("button", { name: "Switch back" }))
    expect(screen.queryByTestId("viewing-as")).toBeNull()
    expect((screen.getByTestId("view-as") as HTMLSelectElement).value).toBe("alex")
  })

  it("closes with Escape and returns focus to the pill; the AI switch still works", async () => {
    const pill = await open()
    fireEvent.click(pill)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(menu().hidden).toBe(true)
    expect(document.activeElement).toBe(pill)
    fireEvent.click(pill)
    const ai = within(menu()).getByRole("checkbox", { name: "AI features" })
    expect((ai as HTMLInputElement).checked).toBe(true)
    fireEvent.click(ai)
    expect((screen.getByRole("checkbox", { name: "AI features", hidden: true }) as HTMLInputElement).checked).toBe(false)
  })

  it("hiding the line lasts for this person in this session, and comes back for someone else", async () => {
    const pill = await open()
    fireEvent.click(pill)
    fireEvent.change(screen.getByTestId("view-as"), { target: { value: "maya" } })
    fireEvent.click(await screen.findByRole("button", { name: "Hide this notice" }))
    expect(screen.queryByTestId("viewing-as")).toBeNull()
    expect(JSON.parse(window.sessionStorage.getItem("platypus.viewingAs.hidden") ?? "[]")).toEqual(["maya"])
    fireEvent.change(screen.getByTestId("view-as"), { target: { value: "sam" } })
    expect(text(await screen.findByTestId("viewing-as"))).toMatch(/^Viewing as Sam · /)
  })
})
