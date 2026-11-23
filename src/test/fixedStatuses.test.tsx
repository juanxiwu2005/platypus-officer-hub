import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { seedDemo, SCHEMA_VERSION } from "../data/seed"
import { loadState, STORAGE_KEY, StoreProvider } from "../data/store"
import { STATUS_DEFAULTS, STATUS_ORDER, StatusPill, statusStyles } from "../components/ui"
import { TaskProgress, TASK_STATUS } from "../taskDetails/TaskProgress"
import { aiSnapshot } from "../lib/aiContext"
import type { BoardSettings, DemoState } from "../data/types"
vi.mock("../taskDetails/fileStorage", async original => ({ ...await original<typeof import("../taskDetails/fileStorage")>(), ...await import("./taskFileStorageMock") }))

/**
 * S3 (Juanxi, 2026-11-23): the six task statuses are fixed everywhere. An old save that renamed or recoloured them
 * keeps those fields in its data, unchanged, but every screen shows the default names and colours.
 */
const DEFAULTS = { unclaimed: ["Not claimed", "#5f6763"], accepted: ["To do", "#3a6fd8"], in_progress: ["Working on it", "#b25c00"], waiting: ["Waiting", "#8656cc"], blocked: ["Stuck", "#c0362f"], done: ["Done", "#237a42"] } as const
const board: BoardSettings = {
  labels: { unclaimed: "Up for grabs", accepted: "Ready", in_progress: "Doing", waiting: "On hold", blocked: "Help!", done: "Shipped" },
  colors: { accepted: "#c2418d", done: "#0d7373" },
  tags: [{ id: "food", label: "Food", color: "#0f8a8a" }],
  fields: ["owner"],
}
const oldSave = (): DemoState => { const s = seedDemo("2026-10-22", "v2"); return { ...s, viewerId: "alex", org: { ...s.org, board } } }

afterEach(cleanup)
beforeEach(() => window.localStorage.clear())

describe("six fixed statuses (S3)", () => {
  it("are the owner's six names and colours", () => {
    expect(STATUS_ORDER).toEqual(["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"])
    for (const st of STATUS_ORDER) expect([STATUS_DEFAULTS[st].label, STATUS_DEFAULTS[st].color]).toEqual(DEFAULTS[st])
    expect(TASK_STATUS).toEqual(Object.fromEntries(STATUS_ORDER.map(st => [st, DEFAULTS[st][0]])))
  })

  it("an old save with renamed statuses loads without change and reads with the default names and colours", () => {
    const saved = { ...oldSave(), schemaVersion: SCHEMA_VERSION }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadState()
    expect(loaded.org.board).toEqual(board)
    expect(loaded.nodes.map(n => n.status)).toEqual(saved.nodes.map(n => n.status))
    const styles = statusStyles(loaded)
    for (const st of STATUS_ORDER) expect([styles[st].label, styles[st].color]).toEqual(DEFAULTS[st])
    expect(JSON.stringify(aiSnapshot(loaded))).not.toMatch(/Up for grabs|Shipped|On hold/)
  })

  it("StatusPill and the Task Details status menu show the default names for an old save", () => {
    const s = oldSave(), source = s.nodes.find(n => n.stepKey === "venue")!
    const node = { ...source, ownerId: "alex", status: "accepted" as const }
    const state = { ...s, nodes: s.nodes.map(n => n.id === node.id ? node : n) }
    render(<MemoryRouter><StoreProvider initial={state}>
      <div data-testid="pills">{STATUS_ORDER.map(st => <StatusPill key={st} status={st} />)}</div>
      <TaskProgress node={node} actorId="alex" />
    </StoreProvider></MemoryRouter>)
    const pills = [...screen.getByTestId("pills").querySelectorAll<HTMLElement>("[data-status]")]
    expect(pills.map(p => p.textContent)).toEqual(STATUS_ORDER.map(st => DEFAULTS[st][0]))
    expect(pills.map(p => p.style.getPropertyValue("--pill"))).toEqual(STATUS_ORDER.map(st => DEFAULTS[st][1]))
    const options = within(screen.getByRole("combobox", { name: "Task status" })).getAllByRole("option").map(o => o.textContent)
    expect(options).toEqual(["To do", "Working on it", "Stuck", "Waiting", "Need more time…"])
    expect(document.body.textContent).not.toMatch(/Ready|Doing|On hold|Help!|Shipped|Up for grabs/)
  })
})
