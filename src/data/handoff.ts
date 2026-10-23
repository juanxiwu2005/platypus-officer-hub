import type { DemoState } from "./types"
import { canLead } from "./changeReview"
import { validDate } from "../lib/commands"
import { handoffDates, applySchedule } from "../engine/schedule"
import { handbookSources, sanitizeHandbook, sourceFingerprint, WEEK_ONE } from "../lib/handbook"
export type HandoffAction =
 |{kind:"start";from:string;to:string}
 |{kind:"roleDate";roleId:string;date:string}
 |{kind:"interview";roleId:string;lines:string[]}
 |{kind:"draft";roleId:string;raw:unknown;fingerprint:string;model:string|null;provider?:string;source:string}
 |{kind:"confirm";roleId:string}
 |{kind:"approve";roleId:string}
 |{kind:"check";roleId:string;itemId:string}
 |{kind:"retainBuffer";keep:boolean}
 |{kind:"complete";roleId:string;incomingName:string}
 |{kind:"review";roleId:string}
export function changeHandoff(s:DemoState,a:HandoffAction):DemoState{
 const record="roleId" in a?s.handoffRoles.find(r=>r.roleId===a.roleId):undefined
 const lead=canLead(s), self=record?.outgoingId===s.viewerId
 const update=(patch:object)=>({...s,handoffRoles:s.handoffRoles.map(r=>r===record?{...r,...patch}:r)})
 if(a.kind==="start"){
  if(!lead||!validDate(a.from)||!validDate(a.to)||a.to<a.from)return s
  if(s.handoff)return {...s,handoff:{...s.handoff,from:a.from,to:a.to}}
  return {...s,handoff:{id:`season:${s.today}`,from:a.from,to:a.to,roleIds:s.roles.map(r=>r.id)},handoffRoles:s.roles.map(r=>({roleId:r.id,outgoingId:r.holderId,interview:[`Example (fictional): Keep our ${r.displayName} materials in the role folder and explain why each task matters.`,`Example (fictional): Ask the next officer to rehearse the first task with a buddy.`],entries:[],sources:[],fingerprint:"",source:"",model:null,confirmed:false,approved:false,checks:[],completed:false,reviewed:false,incomingId:null}))}
 }
 if(a.kind==="retainBuffer")return {...s,people:s.people.map(p=>p.id===s.viewerId?{...p,retainBufferAtHandoff:a.keep}:p)}
 if(!record||!s.handoff)return s
 if(a.kind==="roleDate")return lead&&validDate(a.date)&&!record.completed?update({startDate:a.date}):s
 if(a.kind==="interview"){
  if(!self||record.completed||a.lines.length>20||a.lines.some(t=>typeof t!=="string"||t.length>1500))return s
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
 if(a.kind==="confirm")return self&&record.entries.length&&record.fingerprint===sourceFingerprint(handbookSources(s,record.roleId))?update({confirmed:true}):s
 if(a.kind==="approve")return lead&&record.confirmed&&record.fingerprint===sourceFingerprint(handbookSources(s,record.roleId))?update({approved:true}):s
 if(a.kind==="check"){
  if(record.completed||(!lead&&!self&&record.incomingId!==s.viewerId)||!record.approved||!WEEK_ONE.some(i=>i.id===a.itemId))return s
  return update({checks:record.checks.includes(a.itemId)?record.checks.filter(i=>i!==a.itemId):[...record.checks,a.itemId]})
 }
 if(a.kind==="complete"){
  if(!lead||!record.approved||record.fingerprint!==sourceFingerprint(handbookSources(s,record.roleId))||record.completed||record.checks.length!==WEEK_ONE.length||!a.incomingName.trim()||a.incomingName.length>80||s.people.some(p=>p.name.toLowerCase()===a.incomingName.trim().toLowerCase()))return s
  const old=s.people.find(p=>p.id===record.outgoingId),role=s.roles.find(r=>r.id===record.roleId)
  if(!old||!role||role.holderId!==old.id)return s
  const id=`incoming:${s.handoff.id}:${role.id}`
  const person={...old,id,name:a.incomingName.trim(),email:"",phone:"",personalBufferDays:1,retainBufferAtHandoff:false,bufferHistoryFrom:s.today,busyWeeks:[],careerGoal:"",interests:"",expectations:"",freeSlots:[],setupCompletedOn:null}
  return applySchedule({...update({completed:true,incomingId:id}),viewerId:s.viewerId===old.id?id:s.viewerId,roles:s.roles.map(r=>r.id===role.id?{...r,holderId:id}:r),people:[...s.people.map(p=>p.id===old.id&&!p.retainBufferAtHandoff?{...p,personalBufferDays:1,bufferHistoryFrom:s.today}:p),person],nodes:s.nodes.map(n=>n.ownerId===old.id&&n.status!=="done"?{...n,ownerId:id,ownerVersion:(n.ownerVersion??0)+1,status:"unclaimed",acceptedOn:null,assignedOn:s.today}:n),extensionRequests:s.extensionRequests.map(r=>r.ownerId===old.id&&r.status==="pending"?{...r,status:"cancelled"}:r),silenceCases:s.silenceCases.map(c=>c.ownerId===old.id?{...c,closedOn:s.today}:c)})
 }
 if(a.kind==="review")return (lead||record.incomingId===s.viewerId)&&record.completed&&s.today>=handoffDates(record.startDate??s.handoff.from).review?update({reviewed:true}):s
 return s
}
