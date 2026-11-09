import type { DemoState, Person, Role, RoleHandoff } from "./types"
import { demoEmail } from "./structure"
import { canLead } from "./changeReview"
import { validDate } from "../lib/commands"
import { handoffDates, applySchedule } from "../engine/schedule"
import { HANDBOOK_SECTIONS, handbookFresh, handbookSources, sanitizeHandbook, sourceFingerprint, WEEK_ONE } from "../lib/handbook"
import { addNotices } from "./taskWorkflow"
import { handoffQuestions, READBACK_PROMPTS, readBackFlags } from "../lib/handoffQuestions"
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
 |{kind:"setIncoming";roleId:string;successor:{kind:"new";name:string}|{kind:"existing";personId:string}}
 |{kind:"clearIncoming";roleId:string}
 |{kind:"complete";roleId:string;incomingName?:string;successor?:Successor}
 |{kind:"review";roleId:string;day?:7|30;clarity?:number;confidence?:number;welcome?:number;missing?:string}
 |{kind:"acceptReview";roleId:string;day:7|30}
 |{kind:"answerQuestion";roleId:string;id:string;answer?:string;skip?:boolean}
 |{kind:"readSection";roleId:string;section:string;mark:"got"|"unclear"}
 |{kind:"readBack";roleId:string;answers:string[]}
 |{kind:"resolveReadBack";roleId:string;index:number;add:boolean}
 |{kind:"startShadow";roleId:string}
export function changeHandoff(s:DemoState,a:HandoffAction):DemoState{
 const record="roleId" in a?s.handoffRoles.find(r=>r.roleId===a.roleId):undefined
 const lead=canLead(s), self=record?.outgoingId===s.viewerId
 // A role nobody holds has no one to interview: the president answers for it (Handoff stage 2).
 const speaks=self||(lead&&!!record&&!s.roles.find(r=>r.id===record.roleId)?.holderId)
 const update=(patch:object)=>({...s,handoffRoles:s.handoffRoles.map(r=>r===record?{...r,...patch}:r)})
 // A handbook is current while every line it quotes is still in the role's records, word for word (Juanxi 2026-11-09: new records alone do not make it stale).
 const fresh=()=>!!record&&handbookFresh(record,handbookSources(s,record.roleId))
 if(a.kind==="start"){
  if(!lead||!validDate(a.from)||!validDate(a.to)||a.to<a.from)return s
  if(s.handoff){const {partial:_one,...season}=s.handoff;return syncSeasonRoles({...s,handoff:{...season,from:a.from,to:a.to}})}
  // The interview starts empty (the page shows a hint), so step 1 only counts once the outgoing officer has saved something.
  return {...keepHistory(s,s.handoffRoles),handoff:{id:`season:${s.today}`,from:a.from,to:a.to,roleIds:s.roles.map(r=>r.id)},handoffRoles:s.roles.map(seasonRecord)}
 }
 if(a.kind==="startRole"){
  const role=s.roles.find(r=>r.id===a.roleId)
  if(!lead||!role)return s
  const old0=s.handoffRoles.find(h=>h.roleId===role.id)
  // What earlier new officers said was missing (accepted by the president) stays with the role for the next round.
  const fresh={...seasonRecord(role),...(old0?.reviews?.some(x=>x.accepted)?{reviews:old0.reviews.filter(x=>x.accepted)}:{})}
  if(!s.handoff)return {...keepHistory(s,s.handoffRoles),handoff:{id:`season:${s.today}`,from:s.today,to:handoffDates(s.today).review,roleIds:[role.id],partial:true},handoffRoles:[fresh]}
  const old=s.handoffRoles.find(h=>h.roleId===role.id)
  if(old&&!old.completed)return s
  // A role left open at its last handoff is reopened with the interview and handbook it already has; a role handed to someone starts a new round.
  const next=old&&!role.holderId&&old.incomingId===null?{...old,completed:false,reviewed:false,checks:[],outgoingId:old.outgoingId}:fresh
  // The finished round is kept in handoffHistory, never overwritten (D-6a: keep history).
  return {...(old&&next===fresh?keepHistory(s,[old]):s),handoff:{...s.handoff,roleIds:s.handoff.roleIds.includes(role.id)?s.handoff.roleIds:[...s.handoff.roleIds,role.id]},handoffRoles:old?s.handoffRoles.map(h=>h===old?next:h):[...s.handoffRoles,next]}
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
 if(a.kind==="confirm")return speaks&&record.entries.length&&fresh()?update({confirmed:true}):s
 if(a.kind==="approve")return lead&&record.confirmed&&fresh()?update({approved:true}):s
 if(a.kind==="check"){
  // The first-week list belongs to the new officer, after the handover (Handoff stage 3): nothing to tick while the role is still with its old holder.
  if(!record.completed||!record.approved||(!lead&&record.incomingId!==s.viewerId)||!WEEK_ONE.some(i=>i.id===a.itemId))return s
  return update({checks:record.checks.includes(a.itemId)?record.checks.filter(i=>i!==a.itemId):[...record.checks,a.itemId]})
 }
 const addLine=(line:string,patch:object={})=>update({interview:[...record.interview,line.slice(0,1500)],entries:[],sources:[],fingerprint:"",confirmed:false,approved:false,source:"",model:null,...patch})
 const incoming=!!record.incomingId&&record.incomingId===s.viewerId
 if(a.kind==="answerQuestion"){
  const q=handoffQuestions(s,record).find(x=>x.id===a.id)
  const text=(a.answer??"").trim()
  if(!speaks||record.completed||!q||q.status!=="open"||(!a.skip&&(!text||text.length>1000||record.interview.length>=20)))return s
  const done={...q,status:a.skip?"skipped" as const:"answered" as const,answer:a.skip?"":text}
  const questions=[...(record.questions??[]).filter(x=>x.id!==q.id),done]
  return a.skip?update({questions}):addLine(`Q: ${q.text} A: ${text}`,{questions})
 }
 if(a.kind==="readSection"){
  if(!incoming||!(HANDBOOK_SECTIONS as readonly string[]).includes(a.section)||(a.mark!=="got"&&a.mark!=="unclear"))return s
  const id=`q:unclear:${a.section}`,have=(record.questions??[]).find(x=>x.id===id)
  const questions=a.mark==="unclear"&&!have?[...(record.questions??[]),{id,text:`The new officer found “${a.section}” unclear. What would help?`,kind:"unclear" as const,status:"open" as const,answer:""}]:record.questions
  return update({reading:{...record.reading,[a.section]:a.mark},questions})
 }
 if(a.kind==="readBack"){
  if(!incoming||!record.entries.length||a.answers.length!==READBACK_PROMPTS.length||a.answers.some(x=>typeof x!=="string"||x.length>500))return s
  const answers=a.answers.map(x=>x.trim()),flags=readBackFlags(answers,record.completed?record.sources:handbookSources(s,record.roleId),record.entries.map(e=>e.sourceId))
  return update({readBack:{answers,flags:flags.map(flagged=>({flagged,resolved:false}))}})
 }
 if(a.kind==="resolveReadBack"){
  const rb=record.readBack,f=rb?.flags[a.index]
  if(!rb||!f||!f.flagged||f.resolved||!(speaks||lead)||record.completed&&!lead||(a.add&&(record.completed||record.interview.length>=20)))return s
  const flags=rb.flags.map((x,i)=>i===a.index?{...x,resolved:true}:x)
  const line=`Read-back: Q: ${READBACK_PROMPTS[a.index]} A: ${rb.answers[a.index]}`
  return a.add?addLine(line,{readBack:{...rb,flags}}):update({readBack:{...rb,flags}})
 }
 if(a.kind==="startShadow"){
  const who=record.outgoingId,open=s.nodes.filter(n=>!!who&&n.ownerId===who&&n.status!=="done"&&n.status!=="blocked")
  const pick=[...open].sort((x,y)=>Number(y.tier==="light")-Number(x.tier==="light")||(x.clubDeadline??"9").localeCompare(y.clubDeadline??"9"))[0]
  if(!lead||!record.incomingId||record.completed||record.shadowNodeId||!pick)return s
  return addNotices(update({shadowNodeId:pick.id}),pick.id,[record.incomingId],"info",`You are shadowing “${pick.title}” with ${s.people.find(p=>p.id===who)?.name??"the outgoing officer"}. Watch how it is done; the task stays with them.`,`shadow:${record.roleId}:${pick.id}`)
 }
 if(a.kind==="acceptReview"){
  const r=record.reviews?.find(x=>x.day===a.day)
  return lead&&r&&r.missing&&!r.accepted?update({reviews:record.reviews!.map(x=>x===r?{...x,accepted:true}:x)}):s
 }
 if(a.kind==="setIncoming")return nameSuccessor(s,record,a.successor)
 // The reading, read-back and shadow task belonged to the person no longer named; the next one starts clean. Questions they raised stay for the outgoing officer.
 if(a.kind==="clearIncoming")return lead&&!record.completed&&record.incomingId?update({incomingId:null,reading:{},readBack:null,shadowNodeId:null}):s
 if(a.kind==="complete")return completeHandoff(s,record,a.successor??(a.incomingName!==undefined?{kind:"new",name:a.incomingName}:undefined))
 if(a.kind==="review"){
  const day=a.day??30,scored=a.clarity!==undefined||a.confidence!==undefined||a.welcome!==undefined||a.missing!==undefined
  const dates=handoffDates(record.startDate??s.handoff.from)
  if(!record.completed||s.today<(day===7?dates.weekOne:dates.review)||(record.reviews??[]).some(x=>x.day===day))return s
  if(!scored)return day===30&&(lead||incoming)?update({reviewed:true}):s
  // Scores come from the new officer only, and only the president and they read them (Q5).
  const ok=(n:unknown)=>Number.isInteger(n)&&(n as number)>=1&&(n as number)<=5
  if(!incoming||!ok(a.clarity)||!ok(a.confidence)||!ok(a.welcome)||typeof(a.missing??"")!=="string"||(a.missing??"").length>500)return s
  const entry={day,on:s.today,clarity:a.clarity!,confidence:a.confidence!,welcome:a.welcome!,missing:(a.missing??"").trim(),accepted:false}
  return update({reviews:[...(record.reviews??[]),entry],...(day===30?{reviewed:true}:{})})
 }
 return s
}

/** Finished rounds (and any record a new season replaces) go to handoffHistory, so a second handoff of a role never erases the first one. */
function keepHistory(s:DemoState,records:RoleHandoff[]):DemoState{
 const done=records.filter(r=>r.completed||r.interview.length||r.entries.length)
 return done.length?{...s,handoffHistory:[...(s.handoffHistory??[]),...done.map(r=>({...r,season:s.handoff?.id??null}))]}:s
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
/**
 * Saves from before the Handoff redesign (v14–v21): a finished handoff there left the outgoing officer looking like a current officer
 * without a role and gave the new one an empty email, so Settings could never be saved again (B1). Mark such people as former officers
 * and give a new officer with no email a fictional example.org one. Nothing else changes; returns the same object when nothing is wrong.
 */
export function repairLegacyHandoff(s:DemoState):DemoState{
 const holds=new Set(s.roles.map(r=>r.holderId).filter(Boolean))
 const outgoing=new Set((s.handoffRoles??[]).filter(h=>h.completed).map(h=>h.outgoingId).filter(Boolean))
 let changed=false
 const people=s.people.map(p=>{
  let q=p
  if(!p.leftOn&&!p.incomingFor&&!holds.has(p.id)&&outgoing.has(p.id)){q={...q,leftOn:s.handoffRoles.find(h=>h.completed&&h.outgoingId===p.id)?.completedOn??s.today};changed=true}
  if(!p.email.trim()&&p.id.startsWith("incoming:")){q={...q,email:uniqueDemoEmail(s,p.name)};changed=true}
  return q
 })
 return changed?{...s,people}:s
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
function completeHandoff(s:DemoState,record:RoleHandoff,given:Successor|undefined):DemoState{
 const role=s.roles.find(r=>r.id===record.roleId)
 if(!canLead(s)||!s.handoff||!role||record.completed||!record.approved||!handbookFresh(record,handbookSources(s,record.roleId)))return s
 if(role.holderId&&role.holderId!==record.outgoingId)return s
 // A successor already named (setIncoming) is the one who takes over; naming another one now would be a second, conflicting decision.
 if(record.incomingId&&given)return s
 const succ:Successor|undefined=record.incomingId?{kind:"existing",personId:record.incomingId}:given
 if(!succ)return s
 const holder=s.people.find(p=>p.id===role.holderId)
 if(role.holderId&&!holder)return s
 let incoming:Person|null=null,vacated:Role|undefined
 if(succ.kind==="vacant"){
  if(role.fn==="president"||!holder)return s
 }else if(succ.kind==="new"){
  incoming=newPerson(s,role,succ.name)
  if(!incoming)return s
 }else{
  const p=s.people.find(x=>x.id===succ.personId)
  if(!p||p.id===role.holderId||p.id===record.outgoingId)return s
  vacated=s.roles.find(r=>r.holderId===p.id&&r.id!==role.id)
  if(vacated?.fn==="president")return s
  const {leftOn:_formerMark,incomingFor:_waiting,...profile}=p
  incoming={...profile,roleId:role.id}
 }
 // The outgoing officer's open tasks. If they already moved to another role, only the tasks of this role's function go.
 const from=holder?.id??record.outgoingId
 const moved=new Set(s.nodes.filter(n=>!!from&&n.ownerId===from&&n.status!=="done"&&(!!holder||n.fn===role.fn)).map(n=>n.id))
 const owner=incoming?.id??null
 const president=s.roles.find(r=>r.fn==="president")?.holderId??s.viewerId
 let next:DemoState=applySchedule({...s,
  handoffRoles:s.handoffRoles.map(h=>h===record?{...record,completed:true,incomingId:owner,completedOn:s.today}:h),
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

/**
 * Name the next holder before the handoff is finished (the president only). A new person is created now, marked `incomingFor`
 * (not an officer yet); someone already in the club just gets an incoming term. Either way they can read the handbook and the
 * open tasks, but not change them, until Finish role handoff. Change the choice with clearIncoming first.
 */
function nameSuccessor(s:DemoState,record:RoleHandoff,succ:{kind:"new";name:string}|{kind:"existing";personId:string}):DemoState{
 const role=s.roles.find(r=>r.id===record.roleId)
 if(!canLead(s)||!s.handoff||!role||record.completed||record.incomingId)return s
 const set=(personId:string,people=s.people)=>({...s,people,handoffRoles:s.handoffRoles.map(h=>h===record?{...h,incomingId:personId}:h)})
 if(succ.kind==="existing"){
  const p=s.people.find(x=>x.id===succ.personId)
  if(!p||p.incomingFor||p.id===role.holderId||p.id===record.outgoingId||s.roles.some(r=>r.holderId===p.id&&r.fn==="president"))return s
  return set(p.id)
 }
 const person=newPerson(s,role,succ.name)
 if(!person)return s
 person.incomingFor=role.id
 return set(person.id,[...s.people,person])
}

/** A new fictional person for a role, with a free id, name and example.org email; null when the name is empty, too long or already in the club. */
function newPerson(s:DemoState,role:Role,rawName:string):Person|null{
 const name=rawName.trim()
 if(!name||name.length>80||s.people.some(p=>p.name.toLowerCase()===name.toLowerCase()))return null
 // Never reuse the id of someone named and then dropped: old notices and history would point at the new person.
 const used=new Set([...s.people.map(p=>p.id),...s.notifications.map(n=>n.recipientId),...(s.roleTerms??[]).map(t=>t.personId),...s.handoffRoles.flatMap(h=>[h.incomingId,h.outgoingId]),...(s.handoffHistory??[]).flatMap(h=>[h.incomingId,h.outgoingId])])
 let id=`incoming:${s.handoff!.id}:${role.id}`
 for(let n=2;used.has(id);n++)id=`incoming:${s.handoff!.id}:${role.id}:${n}`
 return {...blankPerson(role.id),id,name,email:uniqueDemoEmail(s,name),bufferHistoryFrom:s.today}
}
