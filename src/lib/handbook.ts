import type { DemoState, HandbookSource, HandbookEntry } from "../data/types"
import { dossierOwner, dossierSources, roleTasks, taskText } from "./roleDossier"
import { ruleSourceName } from "../data/rules"
/**
 * Everything a handbook may quote, in this order: the outgoing officer's tasks, then the role dossier (deadlines and standing steps,
 * contacts, lessons), then the interview points. The same records for every viewer (leads-only contacts are left out), so a draft made by
 * one person can be confirmed and approved by another. See src/lib/roleDossier.ts.
 */
export function handbookSources(s:DemoState,roleId:string):HandbookSource[]{
 const role=s.roles.find(r=>r.id===roleId), record=s.handoffRoles.find(r=>r.roleId===roleId)
 if(!role)return []
 const tasks=roleTasks(s,role,dossierOwner(s,roleId))
 return [...tasks.map(n=>({id:`task:${n.id}`,kind:"task" as const,nodeId:n.id,text:taskText(n)})),...dossierSources(s,roleId),...(record?.interview??[]).map((text,i)=>({id:`interview:${roleId}:${i+1}`,kind:"interview" as const,text}))]
}
/** The handbook's sections, in reading order (see sectionOf in handbookDraft.ts). Here so the store can check a section name. */
export const HANDBOOK_SECTIONS=["From the outgoing officer","Calendar","In flight","People","Lessons","Finished work"] as const
export const sourceFingerprint=(sources:HandbookSource[])=>JSON.stringify(sources)
/**
 * Whether a drafted handbook is still current: every line it quotes is still among the role's records with the same text.
 * New records (another quiet task, a new contact) do not make it stale; a changed or removed quoted record does (Juanxi 2026-11-09).
 */
export const handbookFresh=(record:{entries:HandbookEntry[]},sources:HandbookSource[])=>record.entries.length>0&&record.entries.every(e=>sources.some(s=>s.id===e.sourceId&&s.text===e.text))
/** Extractive drafting: the model selects/order sources; every displayed word is from a cited record.
 * Free text, dates, unknown source IDs and all other output fields are discarded. */
export function sanitizeHandbook(raw:unknown,sources:HandbookSource[]):HandbookEntry[]{
 const data=raw&&typeof raw==="object"?raw as {entries?:unknown}:{}
 const seen=new Set<string>()
 return (Array.isArray(data.entries)?data.entries:[]).slice(0,12).flatMap(x=>{
   const id=x&&typeof x==="object"?(x as {sourceId?:unknown}).sourceId:null
   const source=sources.find(s=>s.id===id)
   if(!source||seen.has(source.id))return []
   seen.add(source.id);return [{sourceId:source.id,text:source.text}]
 })
}
export const WEEK_ONE=[
 {id:"confirm",text:"By day 3: acknowledge the role, join the team channel, confirm a buddy and where contact details belong.",source:"SEO New Officer Onboarding §0"},
 {id:"mission",text:"By day 7: align on mission, personal interests, 1–3 outcomes, available resources, expectations and the reporting rhythm; confirm the one-page trust agreement.",source:"SEO Onboarding §1"},
 {id:"systems",text:"By day 7: set up organization email, calendar and systems; find room booking, event registration, funding guidance and the file archive.",source:"SEO Onboarding §3"},
 {id:"r16",text:"Contact the advisor; complete training; read the handbook and constitution; update Sun Devil Central and bank access; calendar spring re-registration.",source:ruleSourceName("R16")},
 {id:"leadership",text:"Schedule all six leadership modules within the first month.",source:"SEO Onboarding §2"},
 {id:"followup",text:"Schedule the week-two check and day-30 one-to-one review.",source:"SEO Onboarding §4"},
]
