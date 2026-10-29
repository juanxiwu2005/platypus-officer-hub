import { canLead } from "./permissions"
import type { Contact, ContactVisibility, DemoState, Interaction, InteractionKind, Organization, PreferredChannel, RelationStage } from "./types"

/** Club CRM (v1.3): organizations, contacts and a shared interaction timeline. Pure functions over DemoState. */

export const CONTACT_TYPES = ["Vendor", "Guest speaker", "Sponsor", "Partner club", "Campus office", "Venue", "Speaker agency"]
export const STAGES: { id: RelationStage; label: string; hint: string }[] = [
  { id: "cold", label: "Cold", hint: "No real conversation yet" },
  { id: "warm", label: "Warm", hint: "Has talked with us" },
  { id: "active", label: "Active", hint: "Working together now" },
  { id: "dormant", label: "Dormant", hint: "Went quiet" },
]
export const KINDS: { id: InteractionKind; label: string }[] = [
  { id: "email", label: "Email" }, { id: "call", label: "Call" }, { id: "meeting", label: "Meeting" }, { id: "event", label: "At an event" }, { id: "other", label: "Other" },
]
export const CHANNELS: { id: PreferredChannel; label: string }[] = [
  { id: "", label: "No preference" }, { id: "email", label: "Email" }, { id: "phone", label: "Phone call" }, { id: "text", label: "Text" },
  { id: "instagram", label: "Instagram" }, { id: "linkedin", label: "LinkedIn" }, { id: "in_person", label: "In person" },
]
export const SOURCES = ["Previous officers", "Campus event", "Cold outreach", "Member referral", "Other"]

const stageIds = STAGES.map(s => s.id)
const kindIds = KINDS.map(k => k.id)
const channelIds = CHANNELS.map(c => c.id)
const isDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "")
const cleanTags = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.map(t => clip(t, 24).toLowerCase()).filter(Boolean))].slice(0, 8) : []
/** Turn "catering, Tempe" into ["catering", "tempe"]. */
export const parseTags = (text: string) => cleanTags(text.split(","))

const ownerHolder = (s: DemoState, c: Contact) => s.roles.find(r => r.id === c.ownerRoleId)?.holderId ?? null

/** Who may see a contact: everyone for "all"; for "leads" only the president/VP, the owning role and the person who added it. */
export function canSeeContact(s: DemoState, c: Contact): boolean {
  return c.visibility !== "leads" || canLead(s) || ownerHolder(s, c) === s.viewerId || c.createdBy === s.viewerId
}
export const visibleContacts = (s: DemoState) => s.contacts.filter(c => canSeeContact(s, c))
/** Owner or lead may edit a contact; the shared timeline is open to everyone who can see it. */
export const canEditContact = (s: DemoState, c: Contact) => canLead(s) || ownerHolder(s, c) === s.viewerId
export function canEditOrg(s: DemoState, o: Organization) {
  return canLead(s) || o.createdBy === s.viewerId || s.contacts.some(c => c.organizationId === o.id && ownerHolder(s, c) === s.viewerId)
}

export const daysSince = (s: DemoState, c: Contact) => c.lastContact ? Math.round((Date.parse(s.today + "T12:00:00Z") - Date.parse(c.lastContact + "T12:00:00Z")) / 86400000) : null
/** late = never contacted or past the contact interval; warn = in the last quarter of it. */
export function contactTone(s: DemoState, c: Contact): "late" | "warn" | "good" {
  const d = daysSince(s, c)
  return d === null || d >= c.cadenceDays ? "late" : d >= c.cadenceDays * .75 ? "warn" : "good"
}
export const nextEvent = (s: DemoState, c: Contact) => s.events.filter(e => c.eventIds.includes(e.id) && e.date >= s.today).sort((a, b) => a.date.localeCompare(b.date))[0]
/** The newest unfinished "next step" on a contact's timeline. */
export function nextStep(s: DemoState, contactId: string): Interaction | undefined {
  return s.interactions.filter(i => i.contactId === contactId && i.nextStep && !i.nextDone).sort((a, b) => b.date.localeCompare(a.date))[0]
}
export const timeline = (s: DemoState, f: { contactId?: string; organizationId?: string }) =>
  s.interactions.filter(i => (f.contactId && i.contactId === f.contactId) || (f.organizationId && (i.organizationId === f.organizationId || s.contacts.some(c => c.id === i.contactId && c.organizationId === f.organizationId))))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

export const orgName = (s: DemoState, id: string | null) => s.organizations.find(o => o.id === id)?.name ?? ""

/** Find an organization by name (case-insensitive) or create it. Empty name means "no organization". */
function resolveOrg(s: DemoState, name: string, type: string): { state: DemoState; id: string | null } {
  const n = clip(name, 80)
  if (!n) return { state: s, id: null }
  const found = s.organizations.find(o => o.name.toLowerCase() === n.toLowerCase())
  if (found) return { state: s, id: found.id }
  const o: Organization = { id: `o-${s.organizations.length}-${Date.now().toString(36)}`, name: n, type: clip(type, 40) || "Partner", website: "", email: "", phone: "", address: "", tags: [], notes: "", createdBy: s.viewerId }
  return { state: { ...s, organizations: [...s.organizations, o] }, id: o.id }
}

export interface ContactInput {
  name: string
  organization: string
  relation: string
  ownerRoleId: string
  cadenceDays: number
  title?: string
  email?: string
  phone?: string
  social?: string
  preferredChannel?: PreferredChannel
  tags?: string[]
  stage?: RelationStage
  source?: string
  introducedById?: string | null
  visibility?: ContactVisibility
}

/** Any member may add a contact; it is owned by a role (default: the viewer's own). */
export function addContact(s: DemoState, a: ContactInput): DemoState {
  const name = clip(a.name, 80)
  if (!name || !s.roles.some(r => r.id === a.ownerRoleId) || !Number.isInteger(a.cadenceDays) || a.cadenceDays < 1 || a.cadenceDays > 365) return s
  if (!s.people.some(p => p.id === s.viewerId)) return s
  const relation = clip(a.relation, 40) || "Partner"
  const { state, id: organizationId } = resolveOrg(s, a.organization, relation)
  const contact: Contact = {
    id: `c-${s.contacts.length}-${Date.now().toString(36)}`, name, title: clip(a.title, 80), organizationId, relation,
    email: clip(a.email, 120), phone: clip(a.phone, 40), social: clip(a.social, 120),
    preferredChannel: channelIds.includes(a.preferredChannel as PreferredChannel) ? a.preferredChannel! : "",
    tags: cleanTags(a.tags), stage: stageIds.includes(a.stage as RelationStage) ? a.stage! : "cold", source: clip(a.source, 40),
    introducedById: a.introducedById && s.people.some(p => p.id === a.introducedById) ? a.introducedById : null,
    visibility: a.visibility === "leads" ? "leads" : "all", lastContact: null, cadenceDays: a.cadenceDays, ownerRoleId: a.ownerRoleId, eventIds: [], createdBy: s.viewerId,
  }
  return { ...state, contacts: [...state.contacts, contact] }
}

export type ContactPatch = Partial<Pick<Contact, "name" | "title" | "relation" | "email" | "phone" | "social" | "preferredChannel" | "tags" | "stage" | "source" | "introducedById" | "visibility" | "cadenceDays" | "ownerRoleId" | "eventIds">> & { organization?: string }

export function updateContact(s: DemoState, id: string, patch: ContactPatch): DemoState {
  const c = s.contacts.find(x => x.id === id)
  if (!c || !canEditContact(s, c)) return s
  const next: Contact = { ...c }
  let state = s
  if (patch.name !== undefined) { const v = clip(patch.name, 80); if (!v) return s; next.name = v }
  if (patch.title !== undefined) next.title = clip(patch.title, 80)
  if (patch.relation !== undefined) next.relation = clip(patch.relation, 40) || c.relation
  if (patch.email !== undefined) next.email = clip(patch.email, 120)
  if (patch.phone !== undefined) next.phone = clip(patch.phone, 40)
  if (patch.social !== undefined) next.social = clip(patch.social, 120)
  if (patch.preferredChannel !== undefined) { if (!channelIds.includes(patch.preferredChannel)) return s; next.preferredChannel = patch.preferredChannel }
  if (patch.tags !== undefined) next.tags = cleanTags(patch.tags)
  if (patch.stage !== undefined) { if (!stageIds.includes(patch.stage)) return s; next.stage = patch.stage }
  if (patch.source !== undefined) next.source = clip(patch.source, 40)
  if (patch.introducedById !== undefined) next.introducedById = patch.introducedById && s.people.some(p => p.id === patch.introducedById) ? patch.introducedById : null
  if (patch.visibility !== undefined) next.visibility = patch.visibility === "leads" ? "leads" : "all"
  if (patch.cadenceDays !== undefined) { if (!Number.isInteger(patch.cadenceDays) || patch.cadenceDays < 1 || patch.cadenceDays > 365) return s; next.cadenceDays = patch.cadenceDays }
  if (patch.ownerRoleId !== undefined) { if (!canLead(s) || !s.roles.some(r => r.id === patch.ownerRoleId)) return s; next.ownerRoleId = patch.ownerRoleId }
  if (patch.eventIds !== undefined) next.eventIds = patch.eventIds.filter(e => s.events.some(ev => ev.id === e))
  if (patch.organization !== undefined) { const r = resolveOrg(s, patch.organization, next.relation); state = r.state; next.organizationId = r.id }
  return { ...state, contacts: state.contacts.map(x => x.id === id ? next : x) }
}

export type OrgPatch = Partial<Pick<Organization, "name" | "type" | "website" | "email" | "phone" | "address" | "tags" | "notes">>

export function addOrganization(s: DemoState, name: string, type: string): DemoState {
  const n = clip(name, 80)
  if (!n || !s.people.some(p => p.id === s.viewerId) || s.organizations.some(o => o.name.toLowerCase() === n.toLowerCase())) return s
  return resolveOrg(s, n, type).state
}

export function updateOrganization(s: DemoState, id: string, patch: OrgPatch): DemoState {
  const o = s.organizations.find(x => x.id === id)
  if (!o || !canEditOrg(s, o)) return s
  const next = { ...o }
  if (patch.name !== undefined) {
    const v = clip(patch.name, 80)
    if (!v || s.organizations.some(x => x.id !== id && x.name.toLowerCase() === v.toLowerCase())) return s
    next.name = v
  }
  if (patch.type !== undefined) next.type = clip(patch.type, 40) || o.type
  if (patch.website !== undefined) next.website = clip(patch.website, 160)
  if (patch.email !== undefined) next.email = clip(patch.email, 120)
  if (patch.phone !== undefined) next.phone = clip(patch.phone, 40)
  if (patch.address !== undefined) next.address = clip(patch.address, 160)
  if (patch.tags !== undefined) next.tags = cleanTags(patch.tags)
  if (patch.notes !== undefined) next.notes = clip(patch.notes, 1000)
  return { ...s, organizations: s.organizations.map(x => x.id === id ? next : x) }
}

/** Leads only. Removes the contact and its timeline. */
export function deleteContact(s: DemoState, id: string): DemoState {
  if (!canLead(s) || !s.contacts.some(c => c.id === id)) return s
  return { ...s, contacts: s.contacts.filter(c => c.id !== id), interactions: s.interactions.filter(i => i.contactId !== id) }
}

/** Leads only, and only once no contact belongs to it (nobody is orphaned by accident). */
export function deleteOrganization(s: DemoState, id: string): DemoState {
  if (!canLead(s) || !s.organizations.some(o => o.id === id) || s.contacts.some(c => c.organizationId === id)) return s
  return { ...s, organizations: s.organizations.filter(o => o.id !== id), interactions: s.interactions.filter(i => i.organizationId !== id) }
}

export interface InteractionInput {
  contactId: string | null
  organizationId?: string | null
  date: string
  kind: InteractionKind
  summary: string
  outcome?: string
  nextStep?: string
  nextDue?: string | null
  eventId?: string | null
}

/** Anyone who can see the contact may log what happened. A past-or-today date also moves "last contact". */
export function logInteraction(s: DemoState, a: InteractionInput): DemoState {
  const contact = a.contactId ? s.contacts.find(c => c.id === a.contactId) : undefined
  const orgId = contact ? null : a.organizationId ?? null
  if (!s.people.some(p => p.id === s.viewerId) || (a.contactId && (!contact || !canSeeContact(s, contact))) || (!contact && !s.organizations.some(o => o.id === orgId))) return s
  const summary = clip(a.summary, 500)
  if (!summary || !isDate(a.date) || a.date > s.today || !kindIds.includes(a.kind)) return s
  const nextStep = clip(a.nextStep, 200)
  if (a.nextDue && !isDate(a.nextDue)) return s
  const entry: Interaction = {
    id: `i-${s.interactions.length}-${Date.now().toString(36)}`, contactId: contact?.id ?? null, organizationId: orgId, date: a.date, kind: a.kind, byId: s.viewerId,
    summary, outcome: clip(a.outcome, 200), nextStep, nextDue: nextStep && a.nextDue ? a.nextDue : null, nextDone: false,
    eventId: a.eventId && s.events.some(e => e.id === a.eventId) ? a.eventId : null,
  }
  const contacts = contact && (!contact.lastContact || a.date > contact.lastContact) ? s.contacts.map(c => c.id === contact.id ? { ...c, lastContact: a.date } : c) : s.contacts
  return { ...s, contacts, interactions: [...s.interactions, entry] }
}

/** The author, the contact's owner or a lead can tick off a next step or delete an entry. */
export function updateInteraction(s: DemoState, id: string, change: { nextDone?: boolean; delete?: boolean }): DemoState {
  const i = s.interactions.find(x => x.id === id)
  const contact = s.contacts.find(c => c.id === i?.contactId)
  if (!i || (i.byId !== s.viewerId && !canLead(s) && !(contact && ownerHolder(s, contact) === s.viewerId))) return s
  if (change.delete) return { ...s, interactions: s.interactions.filter(x => x.id !== id) }
  return change.nextDone === undefined ? s : { ...s, interactions: s.interactions.map(x => x.id === id ? { ...x, nextDone: change.nextDone! } : x) }
}
