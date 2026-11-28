import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { addDays } from "../lib/dates"
import { respond, suggestionsFor, type ChatCard } from "../lib/assistant"

// Audit C7: Ask suggestion chips follow the page and the viewer's role, and every chip gets a real local answer.
// The app's own demo (v2), which carries the sample Playbook.
const base = { ...seedDemo(undefined, "v2"), aiEnabled: false }
const as = (id: string) => ({ ...base, viewerId: id })
const PAGES = ["/", "/events", "/tasks", "/team", "/playbook", "/handoff", "/rules", "/settings"]

const deadEnd = (c: ChatCard) =>
  (c.kind === "text" && /couldn't safely match|can only handle set requests/.test(c.text)) || (c.kind === "rule" && !c.inScope)

describe("Ask suggestion chips", () => {
  it("gives a member on Playbook the Playbook chips, with no nudge or reminder chip", () => {
    const chips = suggestionsFor("/playbook", as("maya"))
    expect(chips).toEqual(["Can members bring homemade food?", "Summarize the funding answers", "What should a new treasurer read first?"])
    expect(chips.join(" ")).not.toMatch(/nudge/i)
  })

  it("offers the reminder chip only to the president or vice president, and never says nudge", () => {
    expect(suggestionsFor("/", as("alex"))).toContain("Who needs a reminder?")
    for (const page of PAGES) {
      expect(suggestionsFor(page, as("maya")), page).not.toContain("Who needs a reminder?")
      for (const viewer of ["alex", "maya"]) expect(suggestionsFor(page, as(viewer)).join(" "), `${page} ${viewer}`).not.toMatch(/nudge/i)
    }
    expect(suggestionsFor("/", as("maya"))).toContain("What's due this week?")
  })

  it("has no chips for archived pages and does not repeat the top-tasks chip everywhere", () => {
    for (const archived of ["/partners", "/funding"]) expect(suggestionsFor(archived, as("alex"))).toEqual(suggestionsFor("/", as("alex")))
    const pagesWithTop = PAGES.filter(page => suggestionsFor(page, as("maya")).includes("What are my top 5 tasks?"))
    expect(pagesWithTop.length).toBeLessThanOrEqual(2)
  })

  it("answers every chip locally with AI off, for a lead and for a member", async () => {
    for (const viewer of ["alex", "maya"]) for (const page of PAGES) for (const chip of suggestionsFor(page, as(viewer))) {
      const reply = await respond(chip, as(viewer), viewer, null, page, [])
      expect(reply.cards.length, `${page} ${chip}`).toBeGreaterThan(0)
      expect(reply.cards.some(deadEnd), `${page} ${viewer} ${chip}`).toBe(false)
    }
  }, 30_000) // about 48 replies, each of which may run the forecast

  it("lists only the viewer's open tasks due within seven days", async () => {
    const s = as("maya")
    const reply = await respond("What's due this week?", s, "maya", null, "/", [])
    const card = reply.cards[0]
    const end = addDays(s.today, 7)
    if (card.kind === "tasks") {
      expect(card.title).toBe("Due this week")
      for (const id of card.nodeIds) {
        const n = s.nodes.find(x => x.id === id)!
        expect(n.ownerId).toBe("maya")
        expect(n.status).not.toBe("done")
        expect(n.clubDeadline! <= end).toBe(true)
      }
    } else {
      expect(card).toEqual({ kind: "text", text: "Nothing of yours is due in the next 7 days." })
      expect(s.nodes.some(n => n.ownerId === "maya" && n.status !== "done" && n.clubDeadline && n.clubDeadline <= end)).toBe(false)
    }
  })

  it("summarizes a Playbook category and lists a role's questions from the club's own Playbook", async () => {
    const summary = (await respond("Summarize the funding answers", as("maya"), "maya", null, "/playbook", [])).cards[0]
    expect(summary.kind === "text" && summary.text).toMatch(/^Funding: 3 questions\./)
    expect(summary.kind === "text" && summary.text).toContain("How far ahead must an event funding request go in? We submit 5 weeks ahead")
    const first = (await respond("What should a new treasurer read first?", as("maya"), "maya", null, "/playbook", [])).cards[0]
    expect(first.kind === "text" && first.text).toMatch(/^Start with these for the Treasurer:\n1\. How far ahead must an event funding request go in\?/)
    const empty = { ...base, playbook: { questions: [], answers: [] } }
    expect((await respond("Summarize the funding answers", empty, "maya", null, "/playbook", [])).cards[0]).toEqual({ kind: "text", text: "No Funding questions in the Playbook yet." })
  })

  it("calls the at-risk list Needs a reminder only for those who can send one", async () => {
    const lead = (await respond("Who needs a reminder?", as("alex"), "alex", null, "/", [])).cards[0]
    expect(lead).toMatchObject({ kind: "tasks", title: "Needs a reminder", remind: true })
    const member = (await respond("What is at risk?", as("maya"), "maya", null, "/events", [])).cards[0]
    expect(member).toMatchObject({ kind: "tasks", title: "At risk", remind: false })
  })
})
