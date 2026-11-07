import type { Channel, Person, Role } from "../../../data/types"

/**
 * What the member preview remembers between its screens: which officer is being previewed and the choices made so far.
 * It lives in sessionStorage (this tab only, gone when the tab closes) under one new key; OB-08 reads it on the Done screen.
 * Only the fields below are ever stored. name is the previewed officer's (fictional) name; email and phone appear only when the
 * visitor typed a different value than the officer's record already holds; phone is dropped again if the channel is Email.
 */
export const MEMBER_KEY = "platypus.v1.onboarding.member"
export const CHANNELS: readonly Channel[] = ["whatsapp", "sms", "email"]
export interface MemberChoice {
  v: 1
  personId: string
  name?: string
  email?: string
  phone?: string
  channel?: Channel
  remindAt?: "morning" | "evening"
}
const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max ? v : undefined

/** Read a stored value back, keeping only the known fields with the right types. Anything else is dropped. */
export function parseChoice(raw: string | null): MemberChoice | null {
  if (!raw) return null
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  const personId = text(o.personId, 80)
  if (o.v !== 1 || !personId) return null
  const out: MemberChoice = { v: 1, personId }
  const name = text(o.name, 80), email = text(o.email, 120), phone = text(o.phone, 40)
  if (name !== undefined) out.name = name
  if (email !== undefined) out.email = email
  if (phone !== undefined) out.phone = phone
  if (typeof o.channel === "string" && (CHANNELS as readonly string[]).includes(o.channel)) out.channel = o.channel as Channel
  if (o.remindAt === "morning" || o.remindAt === "evening") out.remindAt = o.remindAt
  return out
}
export function readChoice(): MemberChoice | null {
  try { return parseChoice(sessionStorage.getItem(MEMBER_KEY)) } catch { return null }
}
export function writeChoice(choice: MemberChoice): void {
  try { sessionStorage.setItem(MEMBER_KEY, JSON.stringify(choice)) } catch { /* storage blocked: the preview still works, it just forgets between screens */ }
}
/** Apply a change; a key set to undefined is removed. */
export function mergeChoice(base: MemberChoice, patch: Partial<Omit<MemberChoice, "v" | "personId">>): MemberChoice {
  const next: Record<string, unknown> = { ...base, ...patch }
  for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key]
  return next as unknown as MemberChoice
}

/** The first officer who is not the president (the member view is for someone else), or the first person. */
export function defaultPersonId(people: Person[], roles: Role[]): string | null {
  const isPresident = (p: Person) => roles.find(r => r.id === p.roleId)?.fn === "president"
  return (people.find(p => !isPresident(p)) ?? people[0])?.id ?? null
}
/** Why this invitation cannot be shown, or null. No invite in the link means "the one in this browser". */
export function inviteProblem(people: Person[], inviteCode: string, invite: string | null, person: string | null): "invite" | "person" | "empty" | null {
  if (!people.length) return "empty"
  if (invite !== null && invite !== inviteCode) return "invite"
  if (person !== null && !people.some(p => p.id === person)) return "person"
  return null
}

export const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "")
/** Words a person can read: tokens with a letter or digit in them ("·" and "—" do not count). */
export const wordCount = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
