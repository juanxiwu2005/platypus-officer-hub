import type { DemoState } from "../data/types"
import { canLead, isOfficer } from "../data/permissions"
import { EVENT_STEPS } from "../engine/playbooks"
import type { MatchingCommand, MatchingState } from "./contracts"
import type { OrganizationMatchingContext } from "./businessContracts"
import type { MatchingSetupDocument } from "./setupContracts"
import { matchingSetupContext } from "./setupContext"
import { canonical } from "./validation"
import { commandSetup, createSetupDocument, parseSetupDocument } from "./setupWorkspace"
import { organizationMatchingReferences, standardRequirementCommands, validOrganizationMatching } from "./adapters"

const permitted = (s: DemoState) => s.schemaVersion >= 23 && canLead(s) && s.people.some(p => p.id === s.viewerId && isOfficer(p))
const meta = ({ matching: _matching, references: _references, ...setup }: MatchingSetupDocument): OrganizationMatchingContext["setup"] => setup
const memberSettings = (doc: MatchingSetupDocument) => Object.fromEntries(doc.references.members.map(({ id, active, availability, qualifications }) => [id, { active, availability, qualifications }]))

export function organizationSetupDocument(s: DemoState): MatchingSetupDocument | null {
  const matching = validOrganizationMatching(s)
  if (!matching || !s.matchingContext) return null
  try { return parseSetupDocument({ ...s.matchingContext.setup, matching, references: organizationMatchingReferences(s) }) } catch { return null }
}

function withCatalog(s: DemoState, doc: MatchingSetupDocument): MatchingSetupDocument {
  return commandSetup(doc, [...standardRequirementCommands(doc.matching, "seo-event", EVENT_STEPS),
    ...(s.org.eventWorkflow ? standardRequirementCommands(doc.matching, "club-event", s.org.eventWorkflow.steps) : [])], s.viewerId)
}

/** Explicit opt-in only: creating the library never rewrites an existing task or grants a role. */
export function initializeOrganizationMatching(s: DemoState): DemoState {
  if (!permitted(s) || s.matching !== undefined || s.matchingContext !== undefined) return s
  let doc = createSetupDocument({ contextKey: "initializing", references: {
    organizationId: s.org.id,
    roles: s.roles.map(r => ({ id: r.id, title: r.displayName })),
    members: s.people.map(p => ({ id: p.id, name: p.name, active: isOfficer(p), availability: "unknown", qualifications: {} })),
  }, memberships: s.people.filter(p => s.roles.some(r => r.id === p.roleId)).map(p => ({ id: crypto.randomUUID(), roleId: p.roleId, memberId: p.id, confirmed: true })) })
  doc = withCatalog(s, { ...doc, contextKey: `organization:${doc.id}` })
  return { ...s, org: { ...s.org, matchingWorkspaceId: doc.id, settings: { ...s.org.settings, matchingMode: "responsibilities" } }, matching: doc.matching,
    matchingContext: { setup: meta(doc), memberSettings: memberSettings(doc), overrides: [] } }
}

/** A preview is a reviewed import, never a second long-lived source or a way to replace receipt history. */
export function importOrganizationMatching(s: DemoState, rawPreview: MatchingSetupDocument): DemoState {
  if (!permitted(s)) return s
  const preview = parseSetupDocument(rawPreview)
  if (s.matchingContext?.importedPreviewId === preview.id) return s
  let previewScope: unknown, actualScope: unknown
  try { previewScope = JSON.parse(preview.contextKey); actualScope = JSON.parse(matchingSetupContext(s)) } catch { throw new Error("This example belongs to another team. Use the current team's preview or configure responsibilities here.") }
  if (!Array.isArray(previewScope) || !Array.isArray(actualScope) || canonical(previewScope.slice(0, -1)) !== canonical(actualScope.slice(0, -1))) throw new Error("The team changed after this preview was created. Keep its export and review a current-team preview first.")
  if (preview.references.roles.some(r => !s.roles.some(actual => actual.id === r.id)) || preview.references.members.some(p => !s.people.some(actual => actual.id === p.id))) throw new Error("Some preview positions or people do not exist in this team. Resolve those references before importing.")
  if (s.matching !== undefined && !validOrganizationMatching(s)) throw new Error("Keep and export the unreadable matching data before recovery; it cannot be replaced by this preview.")
  if (s.matching && (s.matching.responsibilities.length || s.matching.assignments.length || s.matchingContext?.overrides.length)) throw new Error("An organization library already exists. Edit it directly; importing cannot replace its responsibilities or assignment history.")
  const id = s.org.matchingWorkspaceId ?? crypto.randomUUID()
  // Preserve the reviewed configuration, but prototype assignments are never real task assignments.
  const matching: MatchingState = { ...structuredClone(preview.matching), organizationId: id, assignments: [], events: [], revision: 0, updatedAt: null }
  const refs = { organizationId: id, roles: s.roles.map(r => ({ id: r.id, title: r.displayName })), members: s.people.map(p => {
    const proposed = preview.references.members.find(x => x.id === p.id)
    return { id: p.id, name: p.name, active: isOfficer(p) && (proposed?.active ?? true), availability: proposed?.availability ?? "unknown" as const, qualifications: proposed?.qualifications ?? {} }
  }) }
  let doc: MatchingSetupDocument = { ...structuredClone(preview), id, contextKey: `organization:${id}`, matching, references: refs }
  const at = new Date().toISOString(), revision = doc.revision + 1
  doc = { ...doc, revision, updatedAt: at, audit: [...doc.audit, { revision, actorId: s.viewerId, at, kind: "example", detail: { action: "imported_preview", previewId: preview.id, originalMatching: preview.matching } }] }
  doc = withCatalog(s, doc)
  return { ...s, org: { ...s.org, matchingWorkspaceId: id, settings: { ...s.org.settings, matchingMode: "responsibilities" } }, matching: doc.matching,
    matchingContext: { setup: meta(doc), memberSettings: memberSettings(doc), overrides: [], importedPreviewId: preview.id } }
}

/** Save one canonical document. Actual roster names and assignment receipts cannot be rewritten by a settings form. */
export function saveOrganizationSetup(s: DemoState, input: MatchingSetupDocument, expectedRevision: number): DemoState {
  if (!permitted(s)) return s
  const previous = organizationSetupDocument(s)
  if (!previous || !s.matchingContext) throw new Error("The organization's matching data needs recovery before it can be edited.")
  const doc = parseSetupDocument(input, previous.contextKey)
  if (doc.id !== previous.id || expectedRevision !== previous.revision || doc.revision !== previous.revision + 1) throw new Error("The organization library changed. Export your draft and reopen it before saving.")
  if (canonical(doc.matching.assignments) !== canonical(previous.matching.assignments) || previous.matching.responsibilities.some(r => !doc.matching.responsibilities.some(next => next.id === r.id))) throw new Error("Settings cannot remove responsibility records or rewrite assignment history.")
  const actual = organizationMatchingReferences(s)
  if (canonical(doc.references.roles) !== canonical(actual.roles) || doc.references.members.length !== actual.members.length
    || doc.references.members.some(p => !actual.members.some(a => a.id === p.id && a.name === p.name) || (p.active && !s.people.some(a => a.id === p.id && isOfficer(a))))) throw new Error("Manage positions and people in Team settings. This form can only confirm current members' matching qualifications and availability.")
  if (doc.matching.events.length < previous.matching.events.length || canonical(doc.matching.events.slice(0, previous.matching.events.length)) !== canonical(previous.matching.events)) throw new Error("The matching audit history changed. Keep your draft and reopen the library.")
  return { ...s, matching: doc.matching, matchingContext: { ...s.matchingContext, setup: meta(doc), memberSettings: memberSettings(doc) } }
}

export function commandOrganizationMatching(s: DemoState, command: MatchingCommand): DemoState {
  const doc = organizationSetupDocument(s)
  if (!doc || !permitted(s)) return s
  const next = commandSetup(doc, [command], s.viewerId)
  return next === doc ? s : saveOrganizationSetup(s, next, doc.revision)
}

export function refreshOrganizationMatchingCatalog(s: DemoState): DemoState {
  const doc = organizationSetupDocument(s)
  if (!doc || !permitted(s)) return s
  const next = withCatalog(s, doc)
  return next === doc ? s : saveOrganizationSetup(s, next, doc.revision)
}
