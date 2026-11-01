import { describe, expect, it, vi } from 'vitest';
import { blankDraft } from '../../organization/presets';
import { upgrade } from '../../organization/setupLogic';
import { DEFAULT_TIMING, WorkspaceStateSchema, type WorkspaceEnvelope, type WorkspaceCommand, TaskSchema, WorkItemSchema } from '../contracts';
import { applyOrganizationProposal, assistantContext, contextPacket, sanitizeModelCommand, validateAnswer } from '../../../netlify/lib/workspaceAssistant/engine.mts';

function fixture(){
  const draft=upgrade(blankDraft());draft.name='Demo Society';draft.mission='Help members learn.';
  draft.departments=[{id:'programs',name:'Programs',color:'#315caa',source:'manual',quote:''}];
  draft.roles=[{id:'lead',title:'Programs Lead',departmentId:'programs',responsibilities:['Plan events'],source:'manual',quote:'',confidence:1,parentRoleId:null}];
  draft.memberFlow={title:'Member workflow',explanation:'',raci:[],nodes:[{id:'plan',title:'Plan event',description:'',actionIds:[],roleIds:['lead'],dependsOn:[],dependencyMode:'all',position:{x:0,y:0},basis:'Manual'}]};
  const task=TaskSchema.parse({id:'task1',parentWorkItemId:'event1',title:'Confirm speaker',stageKey:'prepare',stageTitle:'Prepare event',roleIds:['lead'],ownerId:'member1',updatedAt:'2026-10-26T12:00:00Z'});
  const item=WorkItemSchema.parse({id:'event1',name:'Workshop',kind:'member_event',date:'2026-11-19',ownerId:'member1',templateVersion:1,tasks:[task],createdAt:'2026-10-26T12:00:00Z',updatedAt:'2026-10-26T12:00:00Z'});
  const state=WorkspaceStateSchema.parse({schemaVersion:1,workspaceId:'workspace1',revision:3,actorId:'member1',members:[{id:'member1',name:'Demo Lead',roleIds:['lead'],access:'manager'}],workItems:[item],updatedAt:'2026-10-26T12:00:00Z'});
  const envelope:WorkspaceEnvelope={state,organization:{name:draft.name,mission:draft.mission,roles:draft.roles,departments:draft.departments,timingDefaults:DEFAULT_TIMING,contextVersion:1},setupRevision:5,demo:true};
  return {draft,envelope};
}
describe('workspace assistant proposal boundaries',()=>{
  it.each(['/phase1','/phase1/setup','/phase1/tasks','/phase1/activities','/phase1/board','/phase1/work/event1'])('accepts only known internal navigation: %s',async path=>{
    const {draft,envelope}=fixture();
    const answer=await validateAnswer({message:'Open.',actions:[{kind:'navigate',path}]},{draft,envelope,instruction:'open',jobId:'job1',validateCommand:v=>v as WorkspaceCommand});
    expect(answer.actions).toEqual([expect.objectContaining({kind:'navigate',path})]);
  });
  it.each(['https://outside.example','//outside.example','\\\\outside.example','/\\outside.example','javascript:alert(1)','data:text/html,test',' /phase1','/phase1\n','/phase1?redirect=//outside.example','/phase1#//outside.example','/phase1/work/missing','/phase1/work/event1/../../outside','/phase1/work/event1%2f..','/phase1/work/event1?next=//outside.example','/%2f%2foutside.example'])('rejects untrusted navigation without previewing a mutation: %s',async path=>{
    const {draft,envelope}=fixture(),preview=vi.fn(),before=structuredClone(envelope);
    await expect(validateAnswer({message:'Open.',actions:[{kind:'navigate',path}]},{draft,envelope,instruction:'open',jobId:'job1',validateCommand:v=>v as WorkspaceCommand,preview})).rejects.toThrow('destination');
    expect(preview).not.toHaveBeenCalled();
    expect(envelope).toEqual(before);
  });
  it('keeps immutable IDs when a proposed organization name changes',()=>{
    const {draft}=fixture(),next=applyOrganizationProposal(draft,{name:'New Society'});
    expect(next.name).toBe('New Society');expect(next.roles.map(r=>r.id)).toEqual(['lead']);expect(next.memberFlow?.nodes[0].roleIds).toEqual(['lead']);expect(next.confirmed).toBe(false);expect(draft.name).toBe('Demo Society');
  });
  it('marks only reviewable semantics while preserving prior workflow content',()=>{
    const {draft}=fixture(),next=applyOrganizationProposal(draft,{mission:'Run a different program'});
    expect(next.memberFlow?.nodes[0].needsReview).toBe(true);expect(next.memberFlow?.nodes[0].title).toBe('Plan event');
  });
  it('retains default timing and specific node timing as machine-readable fields',()=>{
    const {draft}=fixture(),next=applyOrganizationProposal(draft,{timingDefaults:{itemsWeeks:9,quotesWeeks:8,budgetWeeks:7},nodeTimings:[{id:'plan',milestoneKey:'items',timing:{offsetDays:63,unit:'calendar',source:'manual'}}]});
    expect(next.timingDefaults?.budgetWeeks).toBe(7);expect(next.memberFlow?.nodes[0].timing?.offsetDays).toBe(63);
  });
  it('rejects unknown selected objects and workspace spoofing',()=>{
    const {draft,envelope}=fixture();
    expect(()=>assistantContext(envelope,draft,{screen:'team',workspaceId:'other'})).toThrow('another workspace');
    expect(()=>assistantContext(envelope,draft,{screen:'work',workItemId:'event1',taskId:'missing'})).toThrow('existing task');
    expect(()=>assistantContext(envelope,draft,{screen:'team',entityType:'role',entityId:'missing'})).toThrow('organization item');
  });
  it('does not include source uploads, API credentials, or other members busy weeks',()=>{
    const {draft,envelope}=fixture();envelope.state.members[0].busyWeeks=['2026-11-02'];
    const packet=contextPacket(envelope,draft,{screen:'home'}),encoded=JSON.stringify(packet);
    expect(encoded).not.toContain('busyWeeks');expect(packet.members[0]).toEqual({id:'member1',name:'Demo Lead',roleIds:['lead']});expect(encoded).not.toContain('cookie');expect(encoded).not.toContain('API_KEY');
  });
  it('blocks model identity switching and permission escalation',()=>{
    const {envelope}=fixture();
    expect(()=>sanitizeModelCommand({type:'actor.select',memberId:'member1'},envelope,'switch')).toThrow('identity');
    expect(()=>sanitizeModelCommand({type:'member.upsert',member:{id:'new',name:'New member',roleIds:[],access:'manager'}},envelope,'add')).toThrow('permissions');
    const raw=sanitizeModelCommand({type:'member.upsert',member:{id:'member1',name:'Renamed',roleIds:['lead']}},envelope,'rename') as {member:{access:string}};
    expect(raw.member.access).toBe('manager');
  });
  it('discards model-created completed statuses, fake approval links and dates on new tasks',()=>{
    const {envelope}=fixture();const value=sanitizeModelCommand({type:'task.add',workItemId:'event1',task:{id:'newtask',title:'Draft flyer',stageKey:'prepare',stageTitle:'Prepare event',roleIds:['lead'],ownerId:'member1',kind:'approval',gateId:'fake',status:'done',completedAt:'2020-01-01',dueOverride:'2026-11-11',officialRules:[{ruleId:'fake',days:99,unit:'calendar'}]}},envelope,'add') as {task:ReturnType<typeof TaskSchema.parse>};
    expect(value.task.status).toBe('to_do');expect(value.task.kind).toBe('task');expect(value.task.gateId).toBeNull();expect(value.task.completedAt).toBeNull();expect(value.task.officialRules).toEqual([]);expect(value.task.dueOverride).toBeNull();
  });
  it('requires real user-supplied evidence for recording approval',()=>{
    const {envelope}=fixture(),command={type:'gate.decide',workItemId:'event1',gateId:'gate1',decision:'approved',evidence:'Advisor approved by email'};
    expect(()=>sanitizeModelCommand(command,envelope,'please approve it')).toThrow('actual approval');
    expect(sanitizeModelCommand(command,envelope,'Record: Advisor approved by email')).toEqual(command);
  });
  it('rejects model-written dates in work and task updates',()=>{
    const {envelope}=fixture();expect(()=>sanitizeModelCommand({type:'work.update',workItemId:'event1',patch:{date:'2026-12-01'}},envelope,'change')).toThrow('dates');
    expect(()=>sanitizeModelCommand({type:'task.update',workItemId:'event1',taskId:'task1',patch:{dueOverride:'2026-12-01'}},envelope,'change')).toThrow('deadlines');
  });
  it('opens a human creation form and strips generated dates',async()=>{
    const {draft,envelope}=fixture();const answer=await validateAnswer({message:'Review this new activity.',actions:[{kind:'create',input:{kind:'member_event',name:'New workshop',date:'2026-12-01'}}]},{draft,envelope,instruction:'plan workshop',jobId:'job1',validateCommand:v=>v as WorkspaceCommand});
    expect(answer.actions[0]).toMatchObject({kind:'create',input:{kind:'member_event',date:null,name:'New workshop'}});
  });
  it('refuses generated workflow references to unknown roles',async()=>{
    const {draft,envelope}=fixture();const flow=structuredClone(draft.memberFlow!);flow.nodes[0].roleIds=['nonexistent'];
    await expect(validateAnswer({message:'Review.',actions:[{kind:'create',input:{kind:'executive_work',name:'Board project',flow}}]},{draft,envelope,instruction:'plan',jobId:'job1',validateCommand:v=>v as WorkspaceCommand})).rejects.toThrow('unknown role');
  });
  it('previews authorized commands and derives the review title from their actual values',async()=>{
    const {draft,envelope}=fixture(),preview=vi.fn(async()=>({}));
    const answer=await validateAnswer({message:'Review the change.',actions:[{kind:'command',title:'A harmless update',command:{type:'work.update',workItemId:'event1',patch:{name:'Renamed workshop'}}}]},{draft,envelope,instruction:'rename',jobId:'job1',validateCommand:v=>v as WorkspaceCommand,preview});
    expect(preview).toHaveBeenCalledOnce();expect(answer.actions[0].title).toContain('Renamed workshop');expect(answer.actions[0].title).not.toBe('A harmless update');
  });
  it('only repeats known dates and refuses outside navigation',async()=>{
    const {draft,envelope}=fixture(),options={draft,envelope,instruction:'ask',jobId:'job1',validateCommand:(v:unknown)=>v as WorkspaceCommand};
    const answer=await validateAnswer({message:'Activity 2026-11-19. New date 2027-03-01.',actions:[]},options);
    expect(answer.message).toContain('2026-11-19');expect(answer.message).not.toContain('2027-03-01');
    await expect(validateAnswer({message:'Open.',actions:[{kind:'navigate',path:'https://outside.example'}]},options)).rejects.toThrow('destination');
  });
});
