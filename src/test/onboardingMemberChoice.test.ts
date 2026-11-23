import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { CHANNELS, defaultPersonId, fill, inviteProblem, mergeChoice, parseChoice, wordCount, type MemberChoice } from "../onboarding/member/invitation/choice"
import { previewPatch, previewProblem } from "../onboarding/member/invitation/profile"
import { onboardingCopy } from "../onboarding/copy"

const state = seedDemo()
const maya = state.people.find(p => p.id === "maya")!

describe("member preview: what is remembered between the screens", () => {
  it("keeps only the known fields with the right types and drops everything else", () => {
    const raw = JSON.stringify({ v: 1, personId: "maya", name: "Maya Chen", email: "m@example.org", phone: "480-555-0100", channel: "sms", remindAt: "evening", asuId: "9999000001", careerGoal: "x", extra: { a: 1 } })
    expect(parseChoice(raw)).toEqual({ v: 1, personId: "maya", name: "Maya Chen", email: "m@example.org", phone: "480-555-0100", channel: "sms", remindAt: "evening" })
  })
  it("rejects a broken value, the wrong version, a missing person and bad channels", () => {
    expect(parseChoice(null)).toBeNull()
    expect(parseChoice("{nope")).toBeNull()
    expect(parseChoice("[]")).toBeNull()
    expect(parseChoice(JSON.stringify({ v: 2, personId: "maya" }))).toBeNull()
    expect(parseChoice(JSON.stringify({ v: 1 }))).toBeNull()
    expect(parseChoice(JSON.stringify({ v: 1, personId: "maya", channel: "fax", remindAt: "noon", name: 5 }))).toEqual({ v: 1, personId: "maya" })
    expect(CHANNELS).toEqual(["whatsapp", "sms", "email"])
  })
  it("merges a change and removes a key that is set to undefined", () => {
    const base: MemberChoice = { v: 1, personId: "maya", phone: "480-555-0100", channel: "sms" }
    expect(mergeChoice(base, { channel: "email", phone: undefined })).toEqual({ v: 1, personId: "maya", channel: "email" })
  })
})

describe("member preview: who is shown", () => {
  it("defaults to the first officer who is not the president", () => {
    expect(defaultPersonId(state.people, state.roles)).toBe("maya")
    expect(defaultPersonId([], [])).toBeNull()
    const pres = state.people.filter(p => state.roles.find(r => r.id === p.roleId)?.fn === "president")
    expect(defaultPersonId(pres, state.roles)).toBe(pres[0].id)
  })
  it("treats a link with no invite as this browser's invitation, and rejects a wrong code, an unknown officer or an empty club", () => {
    const code = state.org.inviteCode
    expect(inviteProblem(state.people, code, null, null)).toBeNull()
    expect(inviteProblem(state.people, code, code, "maya")).toBeNull()
    expect(inviteProblem(state.people, code, "nope", null)).toBe("invite")
    expect(inviteProblem(state.people, code, code, "ghost")).toBe("person")
    expect(inviteProblem([], code, null, null)).toBe("empty")
  })
})

describe("member preview: the profile rules are Settings' rules", () => {
  it("accepts the officer's own record, never carries an ASU ID, and rejects what Settings rejects", () => {
    const ok = previewPatch(maya, null)
    expect(ok.asuId).toBe("")
    expect(previewProblem(state.people, maya, ok)).toBeNull()
    expect(previewProblem(state.people, maya, previewPatch(maya, null, { email: "maya@gmail.com" }))).toMatch(/example\.org/)
    expect(previewProblem(state.people, maya, previewPatch(maya, null, { name: "  " }))).toBeTruthy()
    expect(previewProblem(state.people, maya, previewPatch(maya, null, { phone: "480-123-4567" }))).toMatch(/555-01xx/)
    expect(previewProblem(state.people, maya, previewPatch(maya, null, { phone: "480-555-0142" }))).toBeNull()
    expect(previewProblem(state.people, maya, previewPatch(maya, null, { name: "alex rivera" }))).toBe(onboardingCopy.member.invitation.duplicate)
  })
  it("uses the stored choices over the officer's record", () => {
    const patch = previewPatch(maya, { v: 1, personId: "maya", channel: "email", remindAt: "morning", name: "Maya C." })
    expect(patch).toMatchObject({ name: "Maya C.", channels: ["email"], remindAt: "morning" })
  })
})

describe("member preview: copy", () => {
  it("fills templates and counts only readable words", () => {
    expect(fill(onboardingCopy.member.invitation.lead, { president: "Alex Rivera", role: "Treasurer" })).toBe("Alex Rivera invited you to be Treasurer")
    expect(fill("Hi {name}", {})).toBe("Hi ")
    expect(wordCount("Previewing as Maya Chen · Change — now")).toBe(6)
  })
  it("keeps the example reminder to what the spec asks for: a time word and the reply instruction", () => {
    const c = onboardingCopy.member.reminders
    const text = fill(c.bubble, { name: "Maya", when: c.whenEvening })
    expect(text).toContain("this evening")
    expect(text).toContain("Reply")
    expect(fill(c.bubble, { name: "Maya", when: c.whenMorning })).toContain("this morning")
    expect(onboardingCopy.member.invitation.gets).toHaveLength(3)
  })
})
