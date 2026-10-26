import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoleSchema, DepartmentSchema } from '../../organization/schema';
import { TaskSchema, WorkItemSchema, type WorkspaceEnvelope, type WorkspaceMutation } from '../contracts';
import { WorkspaceProvider } from '../client';
import WorkspacePages from './WorkspacePages';

const now='2026-10-26T15:00:00.000Z';
function fixture():WorkspaceEnvelope {
  const roles=[RoleSchema.parse({id:'programs',title:'Program lead',departmentId:'planning',responsibilities:['Coordinate member activities'],source:'manual'})];
  const tasks=Array.from({length:7},(_,i)=>TaskSchema.parse({id:`task_${i}`,parentWorkItemId:'member_event',title:`Existing task ${i}`,stageKey:`phase_${i}`,stageTitle:`Stage ${i}`,roleIds:['programs'],ownerId:'alex',status:i===0?'done':'to_do',dueOverride:`2026-10-${String(26+i).padStart(2,'0')}`,rank:i,updatedAt:now,completedAt:i===0?now:null}));
  // Keep the final task date valid when a month boundary is crossed.
  tasks[6].dueOverride='2026-11-01';
  const item=WorkItemSchema.parse({id:'member_event',kind:'member_event',name:'Member gathering',date:'2026-11-19',ownerId:'alex',templateVersion:1,tasks,createdAt:now,updatedAt:now});
  const board=WorkItemSchema.parse({id:'board_project',kind:'executive_work',name:'Executive recruitment',date:'2026-11-20',ownerId:'alex',templateVersion:1,tasks:[],createdAt:now,updatedAt:now});
  return {state:{schemaVersion:1,workspaceId:'private_workspace',revision:1,actorId:'alex',members:[{id:'alex',name:'Alex Example',roleIds:['programs'],access:'manager'}],workItems:[item,board],updatedAt:now},organization:{name:'Example Club',mission:'A fictional test club',roles,departments:[DepartmentSchema.parse({id:'planning',name:'Programs',color:'#315caa',source:'manual'})],timingDefaults:{itemsWeeks:8,quotesWeeks:7,budgetWeeks:6},contextVersion:2},setupRevision:3,demo:true};
}
let current:WorkspaceEnvelope;
let posts:WorkspaceMutation[];
let intercept:((mutation:WorkspaceMutation)=>Response|Promise<Response>)|null;
beforeEach(()=>{
  current=fixture();posts=[];intercept=null;
  vi.stubGlobal('fetch',vi.fn(async (_url:unknown,init?:RequestInit)=>{
    if(init?.method==='POST'){
      const mutation=JSON.parse(String(init.body)) as WorkspaceMutation;
      posts.push(mutation);
      if(intercept)return intercept(mutation);
      const command=mutation.command;
      if(command.type==='task.complete'||command.type==='task.move'){
        const item=current.state.workItems.find(item=>item.id===command.workItemId)!;
        const task=item.tasks.find(task=>task.id===command.taskId)!;
        task.status=command.type==='task.complete'?'done':command.status;
        task.completedAt=task.status==='done'?now:null;
        if(command.type==='task.move'&&command.blocker)task.blockers=[command.blocker];
      } else if(command.type==='work.applyTiming'){
        current.state.workItems.find(item=>item.id===command.workItemId)!.timingDefaults=command.timingDefaults;
      } else if(command.type==='work.create'){
        current.state.workItems.push(WorkItemSchema.parse({...command.input,templateVersion:2,tasks:[],createdAt:now,updatedAt:now}));
      }
      current.state.revision++;
    }
    return Response.json(structuredClone(current));
  }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function open(path='/phase1') {return render(<MemoryRouter initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><WorkspaceProvider><WorkspacePages/></WorkspaceProvider></MemoryRouter>);}

describe('workspace pages use existing server tasks',()=>{
  it('shows the highest-priority existing tasks and expands the same personal queue',async()=>{
    open();
    const region=await screen.findByRole('region',{name:'Your priority tasks'});
    expect(within(region).getAllByRole('listitem')).toHaveLength(3);
    const taskLinks=within(region).getAllByRole('link').filter(link=>link.textContent?.startsWith('Existing task'));
    expect(taskLinks.map(link=>link.textContent)).toEqual(['Existing task 1','Existing task 2','Existing task 3']);
    fireEvent.click(within(region).getByRole('button',{name:'View all 6 open tasks'}));
    expect(within(region).getAllByRole('listitem')).toHaveLength(6);
    expect(within(region).queryByText('Existing task 0')).toBeNull();
    expect(posts).toHaveLength(0);
  });
  it('keeps executive work out of the member list and searches fifteen events without event tabs',async()=>{
    const original=current.state.workItems[0];
    current.state.workItems=[...Array.from({length:15},(_,i)=>({...structuredClone(original),id:`event_${i}`,name:`Member event ${i+1}`})),current.state.workItems[1]];
    open('/phase1/activities');
    const list=await screen.findByRole('generic',{name:'Member activity list'}).catch(()=>screen.getByLabelText('Member activity list'));
    expect(list.querySelectorAll('.aw-activity-row')).toHaveLength(15);
    expect(within(list).queryByText('Executive recruitment')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Member event 15'}});
    expect(list.querySelectorAll('.aw-activity-row')).toHaveLength(1);
  });
  it('completes a board task through the shared command and reflects it in the activity view',async()=>{
    open('/phase1/tasks');
    const board=await screen.findByTestId('workspace-task-board');
    expect(within(board).getAllByRole('region')).toHaveLength(3);
    const card=board.querySelector('[data-task-id="task_1"]') as HTMLElement;
    fireEvent.click(within(card).getByRole('button',{name:'Complete'}));
    await waitFor(()=>expect(posts.some(post=>post.command.type==='task.complete')).toBe(true));
    await waitFor(()=>expect(board.querySelector('[data-task-id="task_1"]')).toBeNull());
    fireEvent.click(screen.getByText('Completed · 2'));
    const completed=screen.getByText('Completed · 2').parentElement!;
    expect(within(completed).getByRole('link',{name:'Existing task 1'})).toBeTruthy();
    fireEvent.click(screen.getByRole('link',{name:'Browse activities'}));
    await screen.findByRole('heading',{name:'Activities'});
    expect(screen.getByText('2/7 steps')).toBeTruthy();
  });
  it('requires a blocker reason instead of applying an unexplained Stuck state',async()=>{
    open('/phase1/tasks');
    const board=await screen.findByTestId('workspace-task-board');
    const card=board.querySelector('[data-task-id="task_1"]') as HTMLElement;
    fireEvent.change(within(card).getByRole('combobox'),{target:{value:'stuck'}});
    const dialog=screen.getByRole('dialog',{name:'What is blocking this task?'});
    expect(posts).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText('What needs to happen?'),{target:{value:'Waiting for the venue reply'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Save blocker'}));
    await waitFor(()=>expect(posts).toHaveLength(1));
    expect(posts[0].command).toMatchObject({type:'task.move',taskId:'task_1',status:'stuck',blocker:{reason:'Waiting for the venue reply'}});
  });
  it('defaults to the event timeline and keeps task details separate from the assistant',async()=>{
    open('/phase1/work/member_event?task=task_1');
    await screen.findByRole('region',{name:'Activity timeline'});
    expect(screen.getByRole('button',{name:'Timeline'}).getAttribute('aria-pressed')).toBe('true');
    const dialog=screen.getByRole('dialog',{name:'Existing task 1'});
    expect(within(dialog).getByText('Official deadline')).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Edit organization'})).toBeNull();
  });
  it('opens the same creation form from an AI intent and ignores model dates',async()=>{
    open('/phase1/activities');
    await screen.findByRole('heading',{name:'Activities'});
    window.dispatchEvent(new CustomEvent('platypus:open-create',{detail:{kind:'member_event',prefill:{name:'AI suggested workshop',description:'A draft to review',date:'2030-01-01'}}}));
    const dialog=await screen.findByRole('dialog',{name:'Create member activity'});
    expect((within(dialog).getByLabelText('Activity date') as HTMLInputElement).value).toBe('');
    fireEvent.change(within(dialog).getByLabelText('Activity date'),{target:{value:'2026-11-25'}});
    fireEvent.click(within(dialog).getByRole('button',{name:'Create and assign tasks'}));
    await waitFor(()=>expect(posts).toHaveLength(1));
    expect(posts[0].command).toMatchObject({type:'work.create',input:{name:'AI suggested workshop',date:'2026-11-25'}});
  });
  it('replays the identical mutation ID after a lost save response',async()=>{
    intercept=async mutation=>{
      if(posts.length===1){current.state.workItems[0].tasks[1].status='done';current.state.revision++;throw new TypeError('Connection interrupted');}
      expect(mutation.requestId).toBe(posts[0].requestId);
      return Response.json(structuredClone(current));
    };
    open('/phase1/tasks');
    const board=await screen.findByTestId('workspace-task-board');
    fireEvent.click(within(board.querySelector('[data-task-id="task_1"]') as HTMLElement).getByRole('button',{name:'Complete'}));
    fireEvent.click(await screen.findByRole('button',{name:'Retry this save'}));
    await waitFor(()=>expect(board.querySelector('[data-task-id="task_1"]')).toBeNull());
    expect(posts).toHaveLength(2);
    expect(posts[1]).toEqual(posts[0]);
  });
  it('keeps the current snapshot on conflict and asks to load the latest version',async()=>{
    intercept=()=>Response.json({message:'A newer version exists.'},{status:409});
    open('/phase1/tasks');
    const board=await screen.findByTestId('workspace-task-board');
    fireEvent.click(within(board.querySelector('[data-task-id="task_1"]') as HTMLElement).getByRole('button',{name:'Complete'}));
    await screen.findByRole('button',{name:'Load latest version'});
    expect(board.querySelector('[data-task-id="task_1"]')).toBeTruthy();
    expect(posts).toHaveLength(1);
  });
  it('previews timing differences and only applies after explicit confirmation',async()=>{
    current.state.workItems[0].timingDefaults={itemsWeeks:10,quotesWeeks:9,budgetWeeks:8};
    open('/phase1/work/member_event');
    fireEvent.click(await screen.findByRole('button',{name:'Review latest timing defaults'}));
    const dialog=screen.getByRole('dialog',{name:'Review timing defaults'});
    expect(posts).toHaveLength(0);
    expect(within(dialog).getByText('10 weeks before')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button',{name:'Apply reviewed timing changes'}));
    await waitFor(()=>expect(posts).toHaveLength(1));
    expect(posts[0].command).toMatchObject({type:'work.applyTiming',timingDefaults:{itemsWeeks:8,quotesWeeks:7,budgetWeeks:6}});
  });
});
