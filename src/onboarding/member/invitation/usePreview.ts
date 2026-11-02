import { useCallback, useEffect, useRef, useState } from "react"
import { useStore } from "../../../data/store"
import { defaultPersonId, mergeChoice, readChoice, writeChoice, type MemberChoice } from "./choice"

/**
 * Shared by the three member screens: who is being previewed (always an officer of the club in this browser) and what has been chosen so far.
 * It never writes to the club's data and never changes the viewer; the visitor's choices wait in sessionStorage until OB-08's Done screen.
 */
export function usePreview(personParam: string | null = null) {
  const { state } = useStore()
  const [choice, setChoice] = useState<MemberChoice | null>(() => {
    const stored = readChoice()
    return personParam && state.people.some(p => p.id === personParam) && stored?.personId !== personParam ? { v: 1, personId: personParam } : stored
  })
  const [picking, setPicking] = useState(false)
  const person = state.people.find(p => p.id === choice?.personId) ?? state.people.find(p => p.id === defaultPersonId(state.people, state.roles)) ?? null
  const role = state.roles.find(r => r.id === person?.roleId) ?? null
  const boss = state.roles.find(r => r.id === role?.reportsToId) ?? null
  const president = state.people.find(p => p.id === state.roles.find(r => r.fn === "president")?.holderId) ?? null
  // Choices only count for the officer they were made for.
  const stored = person && choice?.personId === person.id ? choice : null
  // A link that names an officer (?person=) wins when it is opened, also when only the address changes (a hash change does not remount this page).
  // After that the picker is free to choose someone else.
  const applied = useRef<string | null>(null)
  useEffect(() => {
    if (!personParam || applied.current === personParam || !state.people.some(p => p.id === personParam)) return
    applied.current = personParam
    const next: MemberChoice = choice?.personId === personParam ? choice : { v: 1, personId: personParam }
    writeChoice(next); setChoice(next)
  }, [choice, personParam, state.people])
  const save = useCallback((patch: Partial<Omit<MemberChoice, "v" | "personId">> = {}) => {
    if (!person) return
    const next = mergeChoice(stored ?? { v: 1, personId: person.id }, patch)
    writeChoice(next); setChoice(next)
  }, [person, stored])
  const choose = useCallback((personId: string) => {
    const next: MemberChoice = { v: 1, personId }
    writeChoice(next); setChoice(next); setPicking(false)
  }, [])
  return { state, person, role, boss, president, stored, save, choose, picking, setPicking }
}
export type Preview = ReturnType<typeof usePreview>
