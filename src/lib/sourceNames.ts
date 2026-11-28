import { POLICY_CATALOG } from "../data/policyCatalog"
import { ruleSourceName } from "../data/rules"

/**
 * People read a policy source by its name, never by its record ID (Juanxi, 2026-11-25). IDs such as "ASU-R-038" and
 * "R06" stay in data, AI requests, logs, URLs and test hooks; only what reaches the screen, a screen reader or a
 * message goes through these helpers. Pure lookups over data the entry bundle already holds. Engine code in the
 * shared workflow-rules chunk uses ruleSourceName from src/data/rules.ts instead, so the catalog stays out of it.
 */
export { UNKNOWN_SOURCE_NAME } from "../data/rules"

/** "ASU-R-004" → the catalog's official name; "R06" → the rule's first source label; anything else → a neutral name. */
export const sourceName = (id: string): string =>
  POLICY_CATALOG.find(record => record.recordId === id.trim().toUpperCase())?.officialName ?? ruleSourceName(id)

/** The first ID for each distinct source name, in order: two rules from one handbook show the handbook once. */
export function distinctSources(ids: readonly string[]): { id: string; name: string }[] {
  const byName = new Map<string, string>()
  for (const id of ids) { const name = sourceName(id); if (!byName.has(name)) byName.set(name, id) }
  return [...byName].map(([name, id]) => ({ id, name }))
}

/** Distinct source names for a list of IDs, in order. */
export const sourceNames = (ids: readonly string[]): string[] => distinctSources(ids).map(source => source.name)

// "R06", "ASU R16", "ASU-R-004", and runs such as "R03, R16" or "R11 / R12" in text the app wrote itself.
const ID = String.raw`(?:ASU-R-\d{3}|R(?:0[1-9]|1[0-6]))\b`
const RUN = new RegExp(String.raw`\b(?:ASU )?${ID}(?:\s*(?:,|/|and)\s*${ID})*`, "g")

/**
 * Rewrites the record IDs in text the app wrote itself (a rule answer's "[R06]", a dossier deadline's "(R03, R16)")
 * as source names, so text saved before this change reads like new text. Not applied to AI-written prose.
 */
export const withSourceNames = (text: string): string =>
  text.replace(RUN, run => sourceNames(run.match(new RegExp(ID, "g")) ?? []).join("; "))
