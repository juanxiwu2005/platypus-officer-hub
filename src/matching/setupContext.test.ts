import { expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { matchingSetupContext } from "./setupContext"
import { createSetupDocument, loadSetupDocument, saveSetupDocument, sourceSetup } from "./setupWorkspace"

it("isolates a new setup that reuses the club name, person IDs and demo date, preserving the old preview", () => {
  const first = seedDemo(), second = structuredClone(first)
  second.org.inviteCode = "new-fictional-invitation"
  second.people[0].name = "Different Fictional President"
  const contextKey = matchingSetupContext(first), nextContext = matchingSetupContext(second)
  expect(nextContext).not.toBe(contextKey)
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  const initial = { contextKey, references: { organizationId: first.org.id, roles: [], members: [] }, memberships: [] }
  const document = sourceSetup(createSetupDocument(initial), { name: "Old fictional rules", text: "Prior preview remains recoverable." }, "fictional-editor")
  saveSetupDocument(storage, document, null)
  expect(loadSetupDocument(storage, { ...initial, contextKey: nextContext }).document!.source.text).toBe("")
  expect(loadSetupDocument(storage, initial).document!.source.text).toBe("Prior preview remains recoverable.")
})
