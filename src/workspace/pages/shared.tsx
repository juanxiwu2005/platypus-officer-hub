import { Link } from 'react-router-dom';
import { projectStages, shortChain, workItemStatus, workspaceToday } from '../selectors';
import type { TaskStatus, WorkItem, WorkTask, WorkspaceMember } from '../contracts';

export const STATUS_LABELS: Record<TaskStatus|'completed', string> = { to_do: 'To Do', working: 'Working on it', stuck: 'Stuck', done: 'Done', completed: 'Completed' };
export const todayInArizona = workspaceToday;
export function shortDate(value: string|null) {
  if (!value) return 'Date not set';
  return new Date(value + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Phoenix' });
}
export function memberName(members: WorkspaceMember[], id: string|null) { return members.find(m => m.id === id)?.name ?? 'Needs assignment'; }
export function Status({ status }: { status: TaskStatus|'completed' }) { return <span className={`aw-status aw-${status}`}>{STATUS_LABELS[status]}</span>; }
export function TaskLink({ item, task, children }: { item: WorkItem; task: WorkTask; children?: React.ReactNode }) { return <Link to={`/phase1/work/${item.id}?task=${task.id}`}>{children ?? task.title}</Link>; }
export function WorkStatus({ item }: { item: WorkItem }) { return <Status status={workItemStatus(item)} />; }
export function CompactChain({ item }: { item: WorkItem }) {
  const stages = shortChain(item);
  if (!stages.length) return <span className="aw-muted">No workflow steps yet</span>;
  return <ol className="aw-short-chain" aria-label={`Workflow progress for ${item.name}`}>
    {stages.map(stage => <li key={stage.id} className={`aw-stage-${stage.status}`}>
      <span className="aw-stage-state">{stage.status === 'completed' ? 'Completed' : stage.status === 'current' ? 'Now' : 'Next'}</span>
      <details><summary>{stage.title}</summary><ul>{stage.tasks.map(task => <li key={task.id}><TaskLink item={item} task={task} /><span>{STATUS_LABELS[task.status]}</span></li>)}</ul></details>
      <small>{stage.completed}/{stage.total} complete{stage.blocked ? ` · ${stage.blocked} blocked` : stage.activeBranches > 1 ? ` · ${stage.activeBranches} active` : ''}</small>
    </li>)}
  </ol>;
}
export function workflowProgress(item: WorkItem) {
  const stages = projectStages(item);
  return { completed: stages.reduce((sum, s) => sum+s.completed, 0), total: stages.reduce((sum,s) => sum+s.total, 0) };
}
