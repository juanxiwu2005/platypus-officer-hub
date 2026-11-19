import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, useLocation, useSearchParams } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { StoreProvider, reducer, useStore } from "../data/store"
import type { DemoState } from "../data/types"
import { RailProvider } from "../components/rail/RailContext"
import { planEntryFixture, PLAN_EVENT, PLAN_OTHER, PLAN_ROOM } from "../test/planEntryFixture"
import { makeTaskAccessGrant, taskAccessToken, taskAccessUrl } from "./taskAccess"
import { planTaskPath, resolvePlanEntry } from "./planEntry"
import { buildReminderFacts, reminderPeople } from "./facts"
import { buildReminderMail } from "./mail"
import { validatedReminderMessage } from "./message"
import PlanTaskPanel from "./PlanTaskPanel"

vi.mock("../taskDetails/fileStorage", async original => ({ ...await original<typeof import("../taskDetails/fileStorage")>(), ...await import("../test/taskFileStorageMock") }))
beforeAll(() => vi.stubGlobal("crypto", webcrypto))
beforeEach(() => localStorage.clear())
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

async function issued() {
  const s = planEntryFixture(), grant = await makeTaskAccessGrant(s, PLAN_ROOM)
  const state = reducer(s, { type: "issueTaskAccessGrant", grant })
  return { state, grant, token: taskAccessToken(grant) }
}
const params = (path: string) => new URLSearchParams(path.slice(path.indexOf("?") + 1))

describe("Plan entry boundaries", () => {
  it("binds the message URL to the actual event and task, while accepting saved legacy links", async () => {
    const { state, grant } = await issued(), facts = buildReminderFacts(state, PLAN_ROOM)!
    const url = taskAccessUrl("https://demo.example.org", grant, facts.eventId)
    expect(url).toContain("/#/events?event=plan-speaker&node=plan-room&access=")
    const recipient = reminderPeople(state).find(p => p.id === grant.recipientId)!
    for (const taskUrl of [url, taskAccessUrl("https://demo.example.org", grant)]) {
      const mail = buildReminderMail({ today: state.today, facts, recipient, taskUrl })
      expect(mail.checked).toBe(true)
      expect(mail.body.match(/https?:\/\/\S+/g)).toEqual([taskUrl])
      expect(validatedReminderMessage(state, { ...mail, channel: "email", preparedOn: state.today, accessId: grant.id }, PLAN_ROOM)).toBeTruthy()
    }
    for (const bad of [url.replace("node=plan-room", "node=plan-requirements"), url.replace("event=plan-speaker", "event=plan-other-event"), url + "&reply=done", url + "&event=plan-speaker", "https://demo.example.org/#/events?event=x&node=y"]) {
      expect(buildReminderMail({ today: state.today, facts, recipient, taskUrl: bad }).checked).toBe(false)
    }
  })
  it("preserves opaque IDs and keeps URL selection separate from task ownership", async () => {
    const { state, grant, token } = await issued()
    const query = params(planTaskPath(PLAN_EVENT, PLAN_OTHER, token, PLAN_ROOM))
    const before = structuredClone(state), result = resolvePlanEntry(state, query, grant)
    expect(result).toMatchObject({ error: null, node: { id: PLAN_OTHER }, origin: { id: PLAN_ROOM }, readOnly: true })
    expect(state).toEqual(before)
    const opaque = params(planTaskPath("event:1/&?", "task:2/#?", token))
    expect(opaque.get("event")).toBe("event:1/&?")
    expect(opaque.get("node")).toBe("task:2/#?")
  })
  it.each([
    ["missing task", { node: "missing" }],
    ["wrong event", { event: "plan-other-event" }],
    ["cross-event task", { node: "plan-other-event-task" }],
    ["forged origin", { from: PLAN_OTHER }],
    ["missing task parameter", { node: "" }],
  ])("rejects %s instead of opening a fallback task", async (_name, changes) => {
    const { state, grant, token } = await issued(), query = params(planTaskPath(PLAN_EVENT, PLAN_ROOM, token))
    for (const [key, value] of Object.entries(changes)) query.set(key, value)
    expect(resolvePlanEntry(state, query, grant).error).toBeTruthy()
  })
  it("needs a separately active workspace member; the token never establishes a workspace identity", async () => {
    const { state, grant, token } = await issued(), query = params(planTaskPath(PLAN_EVENT, PLAN_ROOM, token))
    expect(resolvePlanEntry({ ...state, viewerId: "unknown" }, query, grant).error).toBeTruthy()
    expect(resolvePlanEntry({ ...state, people: state.people.map(p => p.id === state.viewerId ? { ...p, leftOn: state.today } : p) }, query, grant).error).toBeTruthy()
    expect(resolvePlanEntry(state, query).error).toBeTruthy()
    expect(resolvePlanEntry(state, query, undefined, true)).toMatchObject({ checking: true, error: null })
  })
})

let latest: DemoState
function PanelHost() {
  latest = useStore().state
  const [query] = useSearchParams(), location = useLocation()
  return <><output data-testid="path">{location.search}</output><PlanTaskPanel nodeId={query.get("node") ?? ""} /></>
}
async function show(state: DemoState, path: string) {
  render(<MemoryRouter initialEntries={[path]}><StoreProvider initial={state}><RailProvider><PanelHost /></RailProvider></StoreProvider></MemoryRouter>)
  await screen.findByRole("heading", { name: /Reserve a room|Confirm event requirements/ })
  await waitFor(() => expect(screen.queryByText("Opening draft…")).toBeNull())
}
describe("Plan task panel", () => {
  it("keeps the owner grant on its original task and preserves autosaved work across node navigation", async () => {
    const { state, token } = await issued()
    await show(state, planTaskPath(PLAN_EVENT, PLAN_ROOM, token))
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Room draft kept while reading requirements" } })
    await waitFor(() => expect(screen.getByTestId("task-autosave-status").textContent).toContain("Draft saved automatically"))
    fireEvent.change(screen.getByLabelText("View task in this event"), { target: { value: PLAN_OTHER } })
    await screen.findByText("40 attendees. Accessible room. Projector required.")
    expect(screen.queryByText("PRIVATE unsubmitted notes")).toBeNull()
    expect(screen.queryByRole("textbox", { name: "Details" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Submit|Edit|Add files/ })).toBeNull()
    expect(screen.getByRole("button", { name: "Download requirements.txt" })).toBeTruthy()
    fireEvent.click(screen.getByRole("link", { name: /Reserve a room/ }))
    await waitFor(() => expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Room draft kept while reading requirements"))
    fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(latest.nodes.find(n => n.id === PLAN_ROOM)?.status).toBe("done"))
    expect(latest.viewerId).toBe("alex")
    expect(latest.nodes.find(n => n.id === PLAN_ROOM)?.taskWork?.submissions[0].authorId).toBe("jordan")
    expect(latest.nodes.find(n => n.id === PLAN_OTHER)?.taskWork?.drafts[0].details).toBe("PRIVATE unsubmitted notes")
  })
  it("uses normal member permissions for a direct Plan bookmark without a token", async () => {
    await show(planEntryFixture("jordan"), planTaskPath(PLAN_EVENT, PLAN_OTHER))
    expect(screen.getByText("40 attendees. Accessible room. Projector required.")).toBeTruthy()
    expect(screen.queryByRole("textbox", { name: "Details" })).toBeNull()
    expect(screen.queryByText("PRIVATE unsubmitted notes")).toBeNull()
  })
})
