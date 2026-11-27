import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { RailProvider } from "../components/rail/RailContext"
import { StoreProvider, reducer, useStore } from "../data/store"
import { seedDemo } from "../data/seed"
import type { DemoState, LogEntry, ReminderMode } from "../data/types"
import { installEditCapture, installUiCapture, type UiEvent } from "../lib/uiLog"
import Today from "../pages/Today"
import { ReminderHistoryPanel } from "./DigestPanel"
import { clearDrafts } from "./draft"

// R-S0 §4 on the shipped seed club (Sat Oct 31): Maya 1 task, Jordan 3, Priya 1. Real prepare and record; nothing is sent.
const LINE = "Thanks for jumping on this one."
let latest: DemoState
let log: () => LogEntry[]
function Observer() { const store = useStore(); latest = store.state; log = store.getLog; return null }
const club = (mode: ReminderMode) => {
  const s = seedDemo(undefined, "v2")
  return reducer({ ...s, org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } } }, { type: "upgradeReminderPlan" })
}
const show = (mode: ReminderMode) => render(<MemoryRouter><StoreProvider initial={club(mode)}><RailProvider><Observer /><Today /><ReminderHistoryPanel /></RailProvider></StoreProvider></MemoryRouter>)
const row = (id: string) => within(document.querySelector<HTMLElement>(`[data-testid="rq-person"][data-recipient="${id}"]`)!)
async function openRow(id: string, name: string) {
  fireEvent.click(row(id).getByRole("button", { name: `Email to ${name}` }))
  return row(id).findByTestId("rq-draft", undefined, { timeout: 8000 })
}
const bodyOf = (id: string) => row(id).getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement
const type = (field: HTMLInputElement | HTMLTextAreaElement, value: string) => fireEvent.input(field, { target: { value } })

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { cleanup(); clearDrafts(); localStorage.clear(); vi.unstubAllGlobals() })

describe("the editable email in a person's row", () => {
  it("review_then_auto: add a line, lose a link, put it back, undo and redo, then Send records the edited email", async () => {
    show("review_then_auto")
    const box = within(await openRow("maya", "Maya Chen"))
    expect(box.getByTestId("rq-draft-to").textContent).toBe("maya.chen@example.org")
    const body = bodyOf("maya")
    const token = body.value.match(/\[Open task: [^\]]+\]/)![0]
    expect(body.value).not.toMatch(/https?:/)
    expect(box.getByTestId("rq-draft-restore").getAttribute("aria-disabled")).toBe("true")
    type(body, body.value.replace(/^(Hi Maya,)/, `$1\n\n${LINE}`))
    expect(box.getByTestId("rq-draft-restore").getAttribute("aria-disabled")).toBe("false")
    type(body, body.value.replace(token, ""))
    const send = row("maya").getByRole("button", { name: "Send to Maya" }) as HTMLButtonElement
    expect(box.getByTestId("rq-draft-missing").textContent).toContain("Missing link: ")
    expect(send.disabled).toBe(true)
    fireEvent.click(box.getByTestId("rq-draft-putback"))
    expect(box.queryByTestId("rq-draft-missing")).toBeNull()
    expect(send.disabled).toBe(false)
    // Undo takes back Put back (one step); the keyboard shortcuts work in the box.
    fireEvent.click(box.getByTestId("rq-draft-undo"))
    expect(bodyOf("maya").value).not.toContain(token)
    fireEvent.keyDown(bodyOf("maya"), { key: "y", ctrlKey: true })
    expect(bodyOf("maya").value).toContain(token)
    fireEvent.keyDown(bodyOf("maya"), { key: "z", metaKey: true })
    expect(bodyOf("maya").value).not.toContain(token)
    fireEvent.keyDown(bodyOf("maya"), { key: "Z", ctrlKey: true, shiftKey: true })
    expect(bodyOf("maya").value).toContain(token)
    expect(bodyOf("maya").value).toContain(LINE)
    const subject = box.getByRole("textbox", { name: "Subject" }) as HTMLInputElement
    type(subject, "")
    expect(box.getByTestId("rq-draft-limits").textContent).toBe("Add a subject.")
    expect(send.disabled).toBe(true)
    type(subject, "A quick note")
    fireEvent.click(send, { detail: 1 })
    await waitFor(() => expect(latest.reminderRuntime!.digests).toHaveLength(1), { timeout: 8000 })
    const snap = latest.reminderRuntime!.digests![0]
    expect(snap).toMatchObject({ edited: true, subject: "A quick note", recipientId: "maya", via: "platypus" })
    expect(snap.body).toContain(LINE)
    expect(snap.body).toContain(`Open task: ${snap.taskUrls[0]}`)
    expect(snap.original!.body).not.toContain(LINE)
    expect(screen.getByTestId("rq-edited").textContent).toBe("Edited")
  })

  it("collapsing and reopening a row, or opening another row, keeps the edit", async () => {
    show("review_then_auto")
    await openRow("jordan", "Jordan Patel")
    type(bodyOf("jordan"), `${bodyOf("jordan").value}\n${LINE}`)
    fireEvent.click(row("jordan").getByRole("button", { name: "Email to Jordan Patel" }))
    await openRow("maya", "Maya Chen")
    await openRow("jordan", "Jordan Patel")
    expect(bodyOf("jordan").value.endsWith(LINE)).toBe(true)
    fireEvent.click(row("jordan").getByTestId("rq-draft-restore"))
    expect(bodyOf("jordan").value).not.toContain(LINE)
    fireEvent.click(row("jordan").getByTestId("rq-draft-undo"))
    expect(bodyOf("jordan").value.endsWith(LINE)).toBe(true)
  })

  it("review_then_self: Open in Gmail uses the draft and fills To; I sent this survives collapsing the row", async () => {
    show("review_then_self")
    await openRow("jordan", "Jordan Patel")
    type(bodyOf("jordan"), bodyOf("jordan").value.replace(/^(Hi Jordan,)/, `$1\n\n${LINE}`))
    const gmail = row("jordan").getByRole("link", { name: "Open in Gmail" })
    const url = new URL(gmail.getAttribute("href")!)
    expect(url.host).toBe("mail.google.com")
    expect(url.searchParams.get("to")).toBe("jordan.patel@example.org")
    const mailed = url.searchParams.get("body")!
    expect(mailed).toContain(LINE)
    expect(mailed).not.toContain("[Open task:")
    expect(mailed.match(/Open task: https?:\/\/\S+access=\S+/g)).toHaveLength(3)
    expect(row("jordan").queryByTestId("rq-person-sent-self")).toBeNull()
    fireEvent.click(gmail)
    expect(row("jordan").getByTestId("rq-person-sent-self")).toBeTruthy()
    fireEvent.click(row("jordan").getByRole("button", { name: "Email to Jordan Patel" }))
    await openRow("jordan", "Jordan Patel")
    fireEvent.click(row("jordan").getByTestId("rq-person-sent-self"), { detail: 1 })
    await waitFor(() => expect(latest.reminderRuntime!.digests).toHaveLength(1), { timeout: 8000 })
    const snap = latest.reminderRuntime!.digests![0]
    expect(snap).toMatchObject({ edited: true, via: "manual", recipientId: "jordan" })
    expect(`${snap.subject}\n\n${snap.body}`).toBe(snap.text)
    expect(snap.body).toBe(mailed)
  })

  it("review_then_self: a missing link turns Open in Gmail off and says why", async () => {
    show("review_then_self")
    await openRow("maya", "Maya Chen")
    type(bodyOf("maya"), bodyOf("maya").value.replace(/\[Open task: [^\]]+\]/, ""))
    expect(row("maya").queryByRole("link", { name: "Open in Gmail" })).toBeNull()
    expect(row("maya").getByRole("button", { name: "Open in Gmail" }).getAttribute("aria-disabled")).toBe("true")
    expect(row("maya").getByTestId("rq-draft-missing").textContent).toMatch(/^Missing link: .+Put back links$/)
  })

  it("Send all sends each current draft, and stops with a named reason when one has a missing link", async () => {
    show("review_then_auto")
    await openRow("jordan", "Jordan Patel")
    type(bodyOf("jordan"), bodyOf("jordan").value.replace(/\[Open task: [^\]]+\]/, ""))
    fireEvent.click(row("jordan").getByRole("button", { name: "Email to Jordan Patel" }))
    expect(row("jordan").getByText("Put back the task link first.")).toBeTruthy()
    fireEvent.click(screen.getByTestId("send-all-digests"))
    await screen.findByText("Put back the task link in Jordan's email first.", undefined, { timeout: 8000 })
    expect(latest.reminderRuntime!.digests ?? []).toEqual([])
    await openRow("jordan", "Jordan Patel")
    fireEvent.click(row("jordan").getByTestId("rq-draft-putback"))
    type(bodyOf("jordan"), `${bodyOf("jordan").value}\n${LINE}`)
    fireEvent.click(screen.getByTestId("send-all-digests"))
    await waitFor(() => expect(latest.reminderRuntime!.digests).toHaveLength(3), { timeout: 8000 })
    const snaps = latest.reminderRuntime!.digests!
    expect(snaps.map(d => [d.recipientId, d.edited ?? false])).toEqual([["maya", false], ["jordan", true], ["priya", false]])
    expect(snaps[1].body.endsWith(LINE)).toBe(true)
  })

  it("auto_email keeps the read-only preview", async () => {
    show("auto_email")
    await waitFor(() => expect(latest.reminderRuntime!.digests?.length ?? 0).toBeGreaterThan(0), { timeout: 8000 })
    const person = document.querySelector<HTMLElement>('[data-testid="rq-person"]')!
    fireEvent.click(within(person).getByTestId("rq-person-toggle"))
    await within(person).findByTestId("digest-mail", undefined, { timeout: 8000 })
    expect(within(person).queryByTestId("rq-draft")).toBeNull()
  })
})

describe("research logging", () => {
  it("typed subject and body never reach the interaction log; buttons log fixed names", async () => {
    const events: UiEvent[] = []
    const stopClicks = installUiCapture(document, e => events.push(e), { trustedOnly: false })
    const stopEdits = installEditCapture(document, e => events.push(e), { trustedOnly: false })
    try {
      show("review_then_self")
      await openRow("maya", "Maya Chen")
      const secret = "SECRET-TYPED-LINE-73"
      const subject = row("maya").getByRole("textbox", { name: "Subject" }) as HTMLInputElement
      act(() => subject.focus())
      type(subject, `Hello ${secret}`)
      const body = bodyOf("maya")
      act(() => body.focus())
      type(body, `${body.value}\n${secret} body`)
      type(body, body.value.replace(/\[Open task: [^\]]+\]/, ""))
      for (const id of ["rq-draft-putback", "rq-draft-undo", "rq-draft-redo", "rq-draft-restore", "rq-draft-undo"]) fireEvent.click(row("maya").getByTestId(id))
      fireEvent.click(row("maya").getByRole("link", { name: "Open in Gmail" }))
      fireEvent.click(row("maya").getByTestId("rq-person-sent-self"), { detail: 1 })
      await waitFor(() => expect(latest.reminderRuntime!.digests).toHaveLength(1), { timeout: 8000 })
      expect(latest.reminderRuntime!.digests![0].body).toContain(secret)
      const written = JSON.stringify([events, log()])
      expect(written).not.toContain(secret)
      expect(written).not.toContain("[Open task:")
      expect(events.filter(e => e.type === "ui.edit").map(e => e.payload.field)).toEqual(expect.arrayContaining(["Subject", "Message"]))
      expect(events.filter(e => e.type === "ui.click").map(e => e.payload.testid)).toEqual(expect.arrayContaining(["rq-draft-putback", "rq-draft-undo", "rq-draft-redo", "rq-draft-restore", "rq-person-gmail"]))
      const gmail = events.find(e => e.payload.testid === "rq-person-gmail")!
      expect(gmail.payload.href).toBe("mail.google.com/mail/")
    } finally { stopClicks(); stopEdits() }
  })
})
