import { describe, expect, it } from 'vitest';
import { TaskSchema, WorkItemSchema, WorkspaceStateSchema, type WorkTask } from './contracts';
import { projectStages, selectPriorityTasks, shortChain, taskReady, workspaceToday } from './selectors';
const task=(id:string,patch:Partial<WorkTask>={})=>TaskSchema.parse({id,parentWorkItemId:'event',title:id,stageKey:id,stageTitle:id,roleIds:[],ownerId:'me',updatedAt:'2026-10-26T10:00:00Z',...patch});
const item=(tasks:WorkTask[])=>WorkItemSchema.parse({id:'event',kind:'member_event',name:'Event',date:'2026-11-19',ownerId:'me',templateVersion:1,tasks,createdAt:'2026-10-26T10:00:00Z',updatedAt:'2026-10-26T10:00:00Z'});
describe('Shared activity projections',()=>{
  it('does not treat an inapplicable branch as a completed alternative',()=>{
    const a=task('a',{applicability:'inactive',applicabilityReason:'Not needed for this event'}),b=task('b'),c=task('c',{dependsOn:['a','b'],dependencyMode:'any'});
    const work=item([a,b,c]); expect(taskReady(work,c)).toBe(false);
    b.status='done'; expect(taskReady(work,c)).toBe(true);
    c.dependencyMode='all'; expect(taskReady(work,c)).toBe(true);
  });
  it('keeps workflow order stable when cards are reordered on the personal board',()=>{
    const a=task('a',{rank:100}),b=task('b',{dependsOn:['a'],rank:0});
    expect(projectStages(item([b,a])).map(s=>s.key)).toEqual(['a','b']);
  });
  it('shows parallel current branches together without hiding a blocked branch',()=>{
    const previous=task('previous',{status:'done',completedAt:'2026-10-25T12:00:00Z'});
    const work=item([previous,task('money',{dependsOn:['previous'],status:'stuck'}),task('venue',{dependsOn:['previous']}),task('run',{dependsOn:['money','venue']}),task('close',{dependsOn:['run']})]);
    const chain=shortChain(work); expect(chain).toHaveLength(4);
    expect(chain[1].taskIds).toEqual(['money','venue']); expect(chain[1].blocked).toBe(1); expect(chain[1].completed).toBe(0);
  });
  it('selects existing personal tasks and can expose every important task',()=>{
    const tasks=Array.from({length:5},(_,i)=>task(`task_${i}`,{status:'stuck'}));
    const work=item([...tasks,task('other',{ownerId:'someone_else'})]);
    const state=WorkspaceStateSchema.parse({schemaVersion:1,workspaceId:'workspace',revision:1,actorId:'me',members:[],workItems:[work],updatedAt:'2026-10-26T10:00:00Z'});
    expect(selectPriorityTasks(state,'2026-10-26')).toHaveLength(3);
    const all=selectPriorityTasks(state,'2026-10-26',Infinity);
    expect(all).toHaveLength(5); expect(all[0].task).toBe(state.workItems[0].tasks[0]);
  });
  it('uses the shared schedule deadline and the Phoenix day boundary',()=>{
    expect(workspaceToday(new Date('2026-10-27T01:00:00Z'))).toBe('2026-10-26');
    const work=item([task('late'),task('later')]);
    const state=WorkspaceStateSchema.parse({schemaVersion:1,workspaceId:'workspace',revision:0,actorId:'me',members:[],workItems:[work],updatedAt:'2026-10-26T10:00:00Z'});
    expect(selectPriorityTasks(state,'2026-10-26',3,{event:{covered:true,issues:[],tasks:{late:{start:null,due:'2026-10-25',official:null,issues:[],basis:''}}}})[0].reason).toBe('Overdue');
  });
});
