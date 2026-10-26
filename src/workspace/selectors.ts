import type { WorkItem, WorkTask, WorkspaceState, WorkSchedule } from './contracts';

export interface StageProjection {
  id: string; key: string; title: string; tasks: WorkTask[]; taskIds: string[];
  completed: number; total: number; blocked: number; activeBranches: number;
  status: 'completed'|'current'|'upcoming';
}
export function taskSatisfied(item: WorkItem, id: string): boolean {
  const task = item.tasks.find(t => t.id === id);
  if (!task) return false;
  if (task.applicability === 'inactive') return !!task.applicabilityReason.trim();
  if (task.status !== 'done' || task.needsReview) return false;
  return task.kind !== 'approval' || item.gates.some(g => g.id === task.gateId && g.status === 'approved');
}
export function taskReady(item: WorkItem, task: WorkTask): boolean {
  if (task.applicability === 'inactive' || task.needsReview || task.blockers.length) return false;
  if (!task.dependsOn.length) return true;
  return task.dependencyMode === 'any'
    ? task.dependsOn.some(id => taskSatisfied(item, id))
    : task.dependsOn.every(id => taskSatisfied(item, id));
}
/** Presentation projection only. An OR gate does not cancel its other branches. */
export function projectStages(item: WorkItem): StageProjection[] {
  const by = new Map<string, WorkTask[]>();
  [...item.tasks].sort((a,b) => a.rank-b.rank || a.id.localeCompare(b.id)).forEach(task => {
    if (task.applicability === 'inactive') return;
    by.set(task.stageKey, [...(by.get(task.stageKey) ?? []), task]);
  });
  let foundCurrent = false;
  return [...by].map(([key,tasks]) => {
    const required = tasks.filter(t => t.applicability === 'required');
    // Optional-only stages use their visible tasks for display, but do not block work elsewhere.
    const counted = required.length ? required : tasks;
    const completed = counted.filter(t => taskSatisfied(item,t.id)).length;
    const done = completed === counted.length;
    const current = !done && (!foundCurrent || tasks.some(t => t.status === 'working' || t.status === 'stuck'));
    if (current) foundCurrent = true;
    return {id:key,key,title:tasks[0].stageTitle,tasks,taskIds:tasks.map(t=>t.id),completed,total:counted.length,
      blocked:tasks.filter(t=>t.status==='stuck'||t.needsReview).length,
      activeBranches:tasks.filter(t=>t.status!=='done'&&(taskReady(item,t)||t.status==='working'||t.status==='stuck')).length,
      status:done?'completed':current?'current':'upcoming'};
  });
}
export function shortChain(item: WorkItem): StageProjection[] {
  const stages=projectStages(item);
  const at=stages.findIndex(s=>s.status==='current');
  if (at<0) return stages.slice(-4);
  const previous=stages.slice(0,at).filter(s=>s.status==='completed').at(-1);
  return [...(previous?[previous]:[]),...stages.slice(at,at+3)];
}
export function workItemStatus(item: WorkItem): 'completed'|'stuck'|'working'|'to_do' {
  const required=item.tasks.filter(t=>t.applicability==='required');
  if(required.length && required.every(t=>taskSatisfied(item,t.id))) return 'completed';
  if(item.tasks.some(t=>t.applicability!=='inactive'&&(t.status==='stuck'||t.needsReview))) return 'stuck';
  return item.tasks.some(t=>t.status==='working'||t.status==='done')?'working':'to_do';
}
export interface PriorityTask { task: WorkTask; workItem: WorkItem; reason: string; priority: number; due: string|null; }
/** Select the existing personal queue; never ask a model to invent a second task list. */
export function selectPriorityTasks(state: WorkspaceState, today = new Date().toISOString().slice(0,10), limit=3, schedules: Record<string,WorkSchedule> = {}): PriorityTask[] {
  if(!state.actorId) return [];
  const rows:PriorityTask[]=[];
  for(const workItem of state.workItems) for(const task of workItem.tasks) {
    if(task.status==='done'||task.applicability==='inactive'||(task.ownerId!==state.actorId&&!task.collaboratorIds.includes(state.actorId))) continue;
    const due=schedules[workItem.id]?.tasks[task.id]?.due ?? task.dueOverride;
    const ready=taskReady(workItem,task);
    const approval=task.kind==='approval'&&ready;
    const overdue=!!due&&due<today;
    const soon=!!due&&due>=today&&(Date.parse(due)-Date.parse(today))/86400000<=2;
    const priority=(task.needsReview?1100:0)+(approval?1000:0)+(task.status==='stuck'?900:0)+(overdue?800:soon?600:0)+(ready?200:0)+(task.status==='working'?100:0);
    const reason=task.needsReview?'Changes need review':approval?'Approval needed':task.status==='stuck'?(task.blockers[0]?.reason??'Stuck'):overdue?'Overdue':soon?'Due soon':ready?'Ready to work':'Waiting for an earlier step';
    rows.push({task,workItem,reason,priority,due:due??null});
  }
  rows.sort((a,b)=>b.priority-a.priority||(a.due??'9999').localeCompare(b.due??'9999')||a.task.rank-b.task.rank||a.task.id.localeCompare(b.task.id));
  return rows.slice(0,Math.max(0,limit));
}
