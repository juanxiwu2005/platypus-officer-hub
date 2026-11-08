import type { DemoState, Person, Role, RoleHandoff } from "./types"
import { demoEmail } from "./structure"
import { canLead } from "./changeReview"
import { validDate } from "../lib/commands"
import { handoffDates, applySchedule } from "../engine/schedule"
import { handbookSources, sanitizeHandbook, sourceFingerprint, WEEK_ONE } from "../lib/handbook"
import { addNotices } from "./taskWorkflow"
/** Who takes the role over: a new person, someone already in the club (an officer or a former officer), or nobody yet (the role stays open). */
export type Successor=|{kind:"new";name:string}|{kind:"existing";personId:string}|{kind:"vacant"}
export type HandoffAction =
 |{kind:"start";from:string;to:string}
 |{kind:"startRole";roleId:string}
 |{kind:"roleDate";roleId:string;date:string}
 |{kind:"interview";roleId:string;lines:string[]}
 |{kind:"draft";roleId:string;raw:unknown;fingerprint:string;model:string|null;provider?:string;source:string}
 |{kind:"confirm";roleId:string}
 |{kind:"approve";roleId:string}
 |{kind:"check";roleId:string;itemId:string}
 |{kind:"retainBuffer";keep:boolean}
 |{kind:"complete";roleId:string;incomingName?:string;successor?:Successor}
 |{kind:"review";roleId:string}
export function changeHandoff(s:DemoState,a:HandoffAction):DemoState{
 const record="roleId" in a?s.handoffRoles.find(r=>r.roleId===a.roleId):undefined
 const lead=canLead(s), self=record?.outgoingId===s.viewerId
 // A role nobody holds has no one to interview: the president answers for it (Handoff stage 2).
 const speaks=self||(lead&&!!record&&!s.roles.find(r=>r.id===record.roleId)?.holderId)
 const update=(patch:object)=>({...s,handoffRoles:s.handoffRoles.map(r=>r===record?{...r,...patch}:r)})
 if(a.kind==="start"){
  if(!lead||!validDate(a.from)||!validDate(a.to)||a.to<a.from)return s
  if(s.handoff){const {partial:_one,...season}=s.handoff;return syncSeasonRoles({...s,handoff:{...season,from:a.from,to:a.to}})}
  // The interview starts empty (the page shows a hint), so step 1 only counts once the outgoing officer has saved something.
  return {...s,handoff:{id:`season:${s.today}`,from:a.from,to:a.to,roleIds:s.roles.map(r=>r.id)},handoffRoles:s.roles.map(seasonRecord)}
 }
 if(a.kind==="startRole"){
  const role=s.roles.find(r=>r.id===a.roleId)
  if(!lead||!role)return s
  const fresh=seasonRecord(role)
  if(!s.handoff)return {...s,handoff:{id:`season:${s.today}`,from:s.today,to:handoffDates(s.today).review,roleIds:[role.id],partial:true},handoffRoles:[fresh]}
  const old=s.handoffRoles.find(h=>h.roleId===role.id)
  if(old&&!old.completed)return s
  // A role left open at its last handoff is reopened with the interview and handbook it already has; a role handed to someone starts a new round.
  const next=old&&!role.holderId&&old.incomingId===null?{...old,completed:false,reviewed:false,checks:[],outgoingId:old.outgoingId}:fresh
  return {...s,handoff:{...s.handoff,roleIds:s.handoff.roleIds.includes(role.id)?s.handoff.roleIds:[...s.handoff.roleIds,role.id]},handoffRoles:old?s.handoffRoles.map(h=>h===old?next:h):[...s.handoffRoles,next]}
 }
 if(a.kind==="retainBuffer")return {...s,people:s.people.map(p=>p.id===s.viewerId?{...p,retainBufferAtHandoff:a.keep}:p)}
 if(!record||!s.handoff)return s
 if(a.kind==="roleDate")return lead&&validDate(a.date)&&!record.completed?update({startDate:a.date}):s
 if(a.kind==="interview"){
  if(!speaks||record.completed||a.lines.length>20||a.lines.some(t=>typeof t!=="string"||t.length>1500))return s
  return update({interview:a.lines.map(t=>t.trim()).filter(Boolean),entries:[],sources:[],fingerprint:"",confirmed:false,approved:false,source:"",model:null})
 }
 if(a.kind==="draft"){
  if((!self&&!lead)||record.completed)return s
  const sources=handbookSources(s,record.roleId)
  if(a.fingerprint!==sourceFingerprint(sources))return s
  const entries=sanitizeHandbook(a.raw,sources)
  if(!entries.length)return s
  return update({entries,sources,fingerprint:a.fingerprint,source:a.source.slice(0,120),model:a.model?.slice(0,100)??null,confirmed:false,approved:false})
 }
 if(a.kind==="confirm")return speaks&&record.entries.length&&record.fingerprint===sourceFingerprint(handbookSources(s,record.roleId))?update({confirmed:true}):s
 if(a.kind==="approve")return lead&&record.confirmed&&record.fingerprint===sourceFingerprint(handbookSources(s,record.roleId))?update({approved:true}):s
 if(a.kind==="check"){
  if(record.completed||(!lead&&!self&&record.incomingId!==s.viewerId)||!record.approved||!WEEK_ONE.some(i=>i.id===a.itemId))return s
  return update({checks:record.checks.includes(a.itemId)?record.checks.filter(i=>i!==a.itemId):[...record.checks,a.itemId]})
 }
 if(a.kind==="complete")return completeHandoff(s,record,a.successor??{kind:"new",name:a.incomingName??""})
 if(a.kind==="review")return (lead||record.incomingId===s.viewerId)&&record.completed&&s.today>=handoffDates(record.startDate??s.handoff.from).review?update({reviewed:true}):s
 return s
}

/** A season record for one role: the role's current holder is the outgoing officer; nothing is filled in yet. */
export const seasonRecord=(r:Role):RoleHandoff=>({roleId:r.id,outgoingId:r.holderId,interview:[],entries:[],sources:[],fingerprint:"",source:"",model:null,confirmed:false,approved:false,checks:[],completed:false,reviewed:false,incomingId:null})
/** While a season is open, a role added later (Settings) joins it, so its card and handbook work like the others. No season: unchanged. */
export function syncSeasonRoles(s:DemoState):DemoState{
 if(!s.handoff||s.handoff.partial)return s
 const holderOf=(id:string)=>s.roles.find(r=>r.id===id)?.holderId??null
 // A role open when the season began and filled since (Settings) now has an outgoing officer.
 const refreshed=s.handoffRoles.map(h=>!h.completed&&h.outgoingId===null&&holderOf(h.roleId)?{...h,outgoingId:holderOf(h.roleId)}:h)
 const missing=s.roles.filter(r=>!refreshed.some(h=>h.roleId===r.id))
 const changed=missing.length>0||refreshed.some((h,i)=>h!==s.handoffRoles[i])
 if(!changed)return s
 return {...s,handoff:{...s.handoff,roleIds:[...s.handoff.roleIds,...missing.map(r=>r.id).filter(id=>!s.handoff!.roleIds.includes(id))]},handoffRoles:[...refreshed,...missing.map(seasonRecord)]}
}
/** A fictional example.org address for a new officer, distinct from everyone's (Settings requires one). */
function uniqueDemoEmail(s:DemoState,name:string):string{
 const taken=new Set(s.people.map(p=>p.email.toLowerCase()))
 const base=demoEmail(name),[local]=base.split("@")
 for(let n=1;;n++){const email=n===1?base:`${local}.${n}@example.org`;if(!taken.has(email.toLowerCase()))return email}
}

const blankPerson=(roleId:string):Omit<Person,"id"|"name"|"email">=>({roleId,channels:["email"],remindAt:"morning",busyWeeks:[],careerGoal:"",interests:"",personalBufferDays:1,personalBufferEnabled:true,phone:"",expectations:"",freeSlots:[],setupCompletedOn:null})
/**
 * Finish a role handoff. The successor is a new person, someone already in the club, or nobody (the role stays open).
 * Moves: the role's holder; the outgoing officer's open tasks (they become Not claimed, proposed to the successor, who
 * must tap "I've got it"; with no successor they have no owner); the outgoing officer becomes a former officer.
 * A club member who takes a role leaves their old one open. The president role always keeps a holder.
 */
function completeHandoff(s:DemoState,record:RoleHandoff,succ:Successor):DemoState{
 const role=s.roles.find(r=>r.id===record.roleId)
 if(!canLead(s)||!s.handoff||!role||record.completed||!record.approved||record.fingerprint!==sourceFingerprint(handbookSources(s,record.roleId)))return s
 if(role.holderId&&role.holderId!==record.outgoingId)return s
 if(succ.kind!=="vacant"&&record.checks.length!==WEEK_ONE.length)return s
 const holder=s.people.find(p=>p.id===role.holderId)
 if(role.holderId&&!holder)return s
 let incoming:Person|null=null,vacated:Role|undefined
 if(succ.kind==="vacant"){
  if(role.fn==="president"||!holder)return s
 }else if(succ.kind==="new"){
  const name=succ.name.trim()
  if(!name||name.length>80||s.people.some(p=>p.name.toLowerCase()===name.toLowerCase()))return s
  let id=`incoming:${s.handoff.id}:${role.id}`
  for(let n=2;s.people.some(p=>p.id===id);n++)id=`incoming:${s.handoff.id}:${role.id}:${n}`
  const {leftOn:_formerMark,...profile}=holder??{...blankPerson(role.id),id,name,email:""}
  incoming={...profile,id,name,email:uniqueDemoEmail(s,name),phone:"",roleId:role.id,personalBufferDays:1,retainBufferAtHandoff:false,bufferHistoryFrom:s.today,busyWeeks:[],careerGoal:"",interests:"",expectations:"",freeSlots:[],setupCompletedOn:null}
 }else{
  const p=s.people.find(x=>x.id===succ.personId)
  if(!p||p.id===role.holderId||p.id===record.outgoingId)return s
  vacated=s.roles.find(r=>r.holderId===p.id&&r.id!==role.id)
  if(vacated?.fn==="president")return s
  const {leftOn:_formerMark,...profile}=p
  incoming={...profile,roleId:role.id}
 }
 // The outgoing officer's open tasks. If they already moved to another role, only the tasks of this role's function go.
 const from=holder?.id??record.outgoingId
 const moved=new Set(s.nodes.filter(n=>!!from&&n.ownerId===from&&n.status!=="done"&&(!!holder||n.fn===role.fn)).map(n=>n.id))
 const owner=incoming?.id??null
 const president=s.roles.find(r=>r.fn==="president")?.holderId??s.viewerId
 let next:DemoState=applySchedule({...s,
  handoffRoles:s.handoffRoles.map(h=>h===record?{...record,completed:true,incomingId:owner}:h),
  viewerId:holder&&s.viewerId===holder.id?(owner??president):s.viewerId,
  roles:s.roles.map(r=>r.id===role.id?{...r,holderId:owner}:r.id===vacated?.id?{...r,holderId:null}:r),
  people:[...s.people.map(p=>p.id===incoming?.id?incoming:p.id===holder?.id?{...p,leftOn:s.today,...(p.retainBufferAtHandoff?{}:{personalBufferDays:1,bufferHistoryFrom:s.today})}:p),...(incoming&&!s.people.some(p=>p.id===incoming!.id)?[incoming]:[])],
  nodes:s.nodes.map(n=>moved.has(n.id)?{...n,ownerId:owner,ownerVersion:(n.ownerVersion??0)+1,status:"unclaimed" as const,acceptedOn:null,assignedOn:s.today}:n),
  extensionRequests:s.extensionRequests.map(r=>r.status==="pending"&&moved.has(r.nodeId)?{...r,status:"cancelled" as const}:r),
  silenceCases:s.silenceCases.map(c=>!c.closedOn&&moved.has(c.nodeId)?{...c,closedOn:s.today}:c)})
 const first=[...moved][0]
 if(incoming&&first)next=addNotices(next,first,[incoming.id],"info",`${moved.size} open task${moved.size===1?"":"s"} from ${role.displayName} ${moved.size===1?"is":"are"} waiting for you. Tap “I've got it” on each one you take.`,`handoff:${s.handoff.id}:${role.id}:${incoming.id}`)
 return next
}
