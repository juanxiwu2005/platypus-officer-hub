import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { seedDemo } from "../data/seed"
import { StoreProvider, useStore } from "../data/store"
import { TaskDetail } from "../components/TaskDetail"
import { computeSchedule } from "../engine/schedule"
import type { DemoState } from "../data/types"
vi.mock("../taskDetails/fileStorage", async original => ({ ...await original<typeof import("../taskDetails/fileStorage")>(), ...await import("./taskFileStorageMock") }))
afterEach(() => { cleanup(); localStorage.clear() })
let state: DemoState
function Live() { const store = useStore(); state = store.state; return <TaskDetail node={state.nodes[0]} actorId={state.viewerId} /> }
function show(budget = false) { const s = seedDemo(undefined, "v2"), source = s.nodes.find(n => n.stepKey === (budget ? "budgetRequest" : "venue"))!; render(<MemoryRouter><StoreProvider initial={{ ...s, viewerId: "alex", nodes: [{ ...source, status: "accepted" }] }}><Live /></StoreProvider></MemoryRouter>) }
it("keeps the computed due compact and omits private planning dates", () => { show(); expect(screen.getByRole("heading", { name: state.nodes[0].title })).toBeTruthy(); expect(screen.getByTestId("task-due").textContent).not.toMatch(/ASU|Start/); expect(screen.queryByText("Why this date")).toBeNull(); expect(screen.getByTestId("task-detail").textContent).not.toContain("Personal planning start") })
it("keeps financial evidence separate from completion authority", async () => { show(true); await waitFor(() => expect((screen.getByLabelText("Details") as HTMLTextAreaElement).disabled).toBe(false)); fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Fictional application submitted" } }); fireEvent.click(screen.getByRole("button", { name: "Submit result" })); expect(state.nodes[0].status).toBe("accepted"); await waitFor(() => expect(state.nodes[0].taskWork?.submissions).toHaveLength(1)); expect(screen.getByRole("link", { name: "Event Budget" })).toBeTruthy() })
it("preserves date-engine computation when due and owner change together", () => { show(); fireEvent.click(screen.getByRole("button", { name: "Edit" })); fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2027-03-25" } }); fireEvent.change(screen.getByLabelText("Owner"), { target: { value: "sam" } }); fireEvent.click(screen.getByRole("button", { name: "Save changes" })); expect(state.nodes[0].ownerId).toBe("sam"); expect(state.nodes[0].clubDeadlineOverride).toBe("2027-03-25"); expect(state.nodes[0].clubDeadline).toBe(computeSchedule(state).nodes[state.nodes[0].id].club) })
