import { describe, expect, it } from 'vitest';
import { blankDraft } from '../../organization/presets';
import { upgrade } from '../../organization/setupLogic';
import { DEFAULT_TIMING, FundingSchema, TaskSchema, WorkItemSchema, WorkspaceStateSchema, type WorkspaceEnvelope } from '../contracts';
import { readWorkspaceData } from '../../../netlify/lib/workspaceAssistant/queries.mts';
import { contextPacket, sanitizeModelCommand } from '../../../netlify/lib/workspaceAssistant/engine.mts';
function fixture(){
  const draft=upgrade(blankDraft());draft.name='Club';draft.source={fileName:'constitution.txt',text:'A'.repeat(8000)+'The Finance Lead owns the budget.',checksum:'digest',uploadedAt:'2026-10-26'};
  const tasks=Array.from({length:180},(_,i)=>TaskSchema.parse({id:'task'+i,parentWorkItemId:'event1',title:'Task '+i,stageKey:'prepare',stageTitle:'Prepare',roleIds:[],ownerId:null,updatedAt:'2026-10-26'}));
  const item=WorkItemSchema.parse({id:'event1',name:'Workshop',kind:'member_event',date:'2026-11-19',ownerId:null,templateVersion:1,tasks,createdAt:'2026-10-26',updatedAt:'2026-10-26'});
  item.funding=[FundingSchema.parse({id:'fund1',version:2,source:'college',purpose:'Workshop materials',amount:200,commitments:Array.from({length:25},(_,i)=>({id:'commit'+i,amount:1,purpose:'Item '+i,at:'2026-10-26'}))})];
  const state=WorkspaceStateSchema.parse({schemaVersion:1,workspaceId:'workspace1',revision:1,actorId:null,members:[],workItems:[item],updatedAt:'2026-10-26'});
  const envelope:WorkspaceEnvelope={state,organization:{name:'Club',mission:'',roles:[],departments:[],timingDefaults:DEFAULT_TIMING,contextVersion:1},setupRevision:1,demo:true};return{draft,envelope};
}
describe('bounded cross-page workspace reads',()=>{
  it('does not dump a truncated all-task list into the initial prompt and can retrieve later tasks by ID',()=>{
    const {draft,envelope}=fixture(),packet=contextPacket(envelope,draft,{screen:'home'});
    expect(packet).not.toHaveProperty('tasks');expect(packet.directory[0]).not.toHaveProperty('tasks');
    const detail=readWorkspaceData(envelope,draft,{entity:'task',workItemId:'event1',id:'task179'}) as {task:{id:string}};
    expect(detail.task.id).toBe('task179');
  });
  it('paginates work tasks and can locate a named activity from any page',()=>{
    const {draft,envelope}=fixture(),packet=contextPacket(envelope,draft,{screen:'home'},'Please review Workshop');
    expect(packet.currentWork?.id).toBe('event1');expect(packet.currentWork?.tasks.items).toHaveLength(30);expect(packet.currentWork?.tasks.nextOffset).toBe(30);
    const next=readWorkspaceData(envelope,draft,{entity:'work',id:'event1',offset:150}) as {tasks:{items:{id:string}[];nextOffset:null}};
    expect(next.tasks.items[29].id).toBe('task179');expect(next.tasks.nextOffset).toBeNull();
  });
  it('reads archived constitution source in bounded chunks instead of always sending the entire text',()=>{
    const {draft,envelope}=fixture();expect(JSON.stringify(contextPacket(envelope,draft,{screen:'home'}))).not.toContain('Finance Lead owns');
    const first=readWorkspaceData(envelope,draft,{entity:'organization',section:'constitution'}) as {text:string;nextOffset:number};
    expect(first.text).toHaveLength(8000);expect(first.nextOffset).toBe(8000);
    const next=readWorkspaceData(envelope,draft,{entity:'organization',section:'constitution',offset:8000}) as {text:string};expect(next.text).toContain('Finance Lead owns the budget');
  });
  it('keeps single-request funding commitment pagination separate from the request list',()=>{
    const {draft,envelope}=fixture();const result=readWorkspaceData(envelope,draft,{entity:'funding',workItemId:'event1',id:'fund1',offset:20}) as {items:{commitments:{items:{id:string}[];nextOffset:null}}[]};
    expect(result.items).toHaveLength(1);expect(result.items[0].commitments.items).toHaveLength(5);expect(result.items[0].commitments.items[0].id).toBe('commit20');expect(result.items[0].commitments.nextOffset).toBeNull();
  });
  it('selects the current gate rather than a superseded approved gate',()=>{
    const {draft,envelope}=fixture(),item=envelope.state.workItems[0];item.tasks[0].gateId='current';item.gates=[{id:'old',taskId:'task0',kind:'budget',requestId:'fund1',requestVersion:1,status:'approved',evidence:'Old',decidedBy:null,decidedAt:null,approverIds:[],external:true,reason:''},{id:'current',taskId:'task0',kind:'budget',requestId:'fund1',requestVersion:2,status:'pending',evidence:'',decidedBy:null,decidedAt:null,approverIds:[],external:true,reason:''}];
    expect(readWorkspaceData(envelope,draft,{entity:'task',workItemId:'event1',id:'task0'})).toMatchObject({gate:{id:'current',status:'pending'}});
  });
  it('rejects foreign IDs, credential-like query fields and model calendar deadlines',()=>{
    const {draft,envelope}=fixture();expect(()=>readWorkspaceData(envelope,draft,{entity:'work',id:'other'})).toThrow('workspace');
    expect(()=>readWorkspaceData(envelope,draft,{entity:'work',workspaceId:'other'})).toThrow();
    expect(()=>sanitizeModelCommand({type:'funding.setDeadline',workItemId:'event1',requestId:'fund1',date:'2026-12-01'},envelope,'set')).toThrow('calendar dates');
  });
});
