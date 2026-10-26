import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace, workspaceId } from '../client';
import type { TaskStatus, WorkItem, WorkSchedule, WorkTask } from '../contracts';
import { taskReady } from '../selectors';
import { memberName, shortDate, STATUS_LABELS, TaskLink } from './shared';

interface TaskRow { item: WorkItem; task: WorkTask; }
export default function TaskBoard({ schedules }: { schedules: Record<string, WorkSchedule> }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const [filter, setFilter] = useState('');
  const [drag, setDrag] = useState<string|null>(null);
  const [over, setOver] = useState<TaskStatus|null>(null);
  const [notice, setNotice] = useState('');
  const [stuck, setStuck] = useState<TaskRow|null>(null);
  const [reason, setReason] = useState('');
  const [kind, setKind] = useState<'waiting_approval'|'waiting_dependency'|'external_response'|'needs_help'>('needs_help');
  const [target, setTarget] = useState('');
  const [showFuture, setShowFuture] = useState(false);
  const actor = envelope?.state.members.find(m => m.id === envelope.state.actorId);
  const rows = useMemo(() => envelope?.state.workItems.flatMap(item => item.tasks
    .filter(task => task.applicability !== 'inactive' && (task.ownerId === actor?.id || (!!actor && task.collaboratorIds.includes(actor.id))) && (!filter || item.id === filter))
    .map(task => ({ item, task }))) ?? [], [envelope, actor?.id, filter]);
  const allVisible = showFuture ? rows : rows.filter(row => row.task.status !== 'to_do' || taskReady(row.item, row.task));
  const future = rows.filter(row => row.task.status === 'to_do' && !taskReady(row.item, row.task)).length;
  const canControl = (task: WorkTask) => actor?.access === 'manager' || task.ownerId === actor?.id;
  const perform = async (row: TaskRow, status: TaskStatus, beforeId?: string|null) => {
    if (mutating || !canControl(row.task)) return;
    setNotice('');
    if (row.task.kind === 'approval') { setNotice('Record the approval decision inside its activity. Moving a card cannot approve funding.'); return; }
    if (status === 'stuck') { setStuck(row); setReason(''); setTarget(''); setKind('needs_help'); return; }
    try {
      await mutate(status === 'done' ? { type: 'task.complete', workItemId: row.item.id, taskId: row.task.id } : { type: 'task.move', workItemId: row.item.id, taskId: row.task.id, status, beforeId });
      setNotice(status === 'done' ? 'Task completed. Activity progress has been updated.' : 'Task updated.');
    } catch (e) { setNotice((e as Error).message); }
  };
  const complete = rows.filter(row => row.task.status === 'done');
  const drop = (e: DragEvent, status: TaskStatus, beforeId: string|null = null) => {
    e.preventDefault(); e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain') || drag;
    const row = rows.find(row => row.task.id === id);
    setDrag(null); setOver(null);
    if (row) void perform(row, status, beforeId);
  };
  return <>
    <header className="aw-page-head"><div><span className="aw-eyebrow">PERSONAL WORKFLOW</span><h1>My tasks</h1><p>{actor ? `${actor.name} · ${rows.filter(row => row.task.status !== 'done').length} open tasks` : 'Choose a demo member to see assigned work.'}</p></div><Link to="/phase1/activities" className="aw-button">Browse activities</Link></header>
    {!actor && <p className="aw-note">Set up test members and their roles in <Link to="/phase1/setup">Your team</Link>. This is a private demo workspace, not a signed-in organization account.</p>}
    <div className="aw-filter-bar"><label>Activity or board work<select aria-label="Filter my tasks by activity" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All assigned work</option>{envelope?.state.workItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{future > 0 && <label className="aw-checkbox"><input type="checkbox" checked={showFuture} onChange={e => setShowFuture(e.target.checked)} />Show {future} tasks waiting for earlier steps</label>}</div>
    {notice && <p className="aw-note" role="status">{notice}<button aria-label="Dismiss task update" onClick={() => setNotice('')}>×</button></p>}
    <div className="aw-board" data-testid="workspace-task-board">
      {(['to_do', 'working', 'stuck'] as const).map(status => {
        const cards = allVisible.filter(row => row.task.status === status).sort((a,b) => a.task.rank-b.task.rank || a.task.id.localeCompare(b.task.id));
        return <section key={status} className={`aw-board-column aw-board-${status} ${over === status ? 'aw-drop-over' : ''}`} aria-label={STATUS_LABELS[status]} onDragOver={e => { if (!mutating) { e.preventDefault(); setOver(status); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }} onDrop={e => drop(e, status)}>
          <header><h2>{STATUS_LABELS[status]}</h2><span>{cards.length}</span></header>
          {cards.map(row => {
            const { item, task } = row;
            const plan = schedules[item.id]?.tasks[task.id];
            const ready = taskReady(item, task);
            const enabled = canControl(task) && !mutating && task.kind !== 'approval';
            return <article key={task.id} className={`aw-task-card ${drag === task.id ? 'aw-dragging' : ''}`} data-task-id={task.id} draggable={enabled} onDragStart={e => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; setDrag(task.id); }} onDragEnd={() => { setDrag(null); setOver(null); }} onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(status); }} onDrop={e => drop(e, status, task.id)}>
              <span className="aw-eyebrow">{item.name}</span><TaskLink item={item} task={task} />
              <div className="aw-task-meta"><span>{shortDate(plan?.due ?? task.dueOverride)}</span><span>{task.ownerId === actor?.id ? 'You own this' : `Supporting ${memberName(envelope?.state.members ?? [], task.ownerId)}`}</span></div>
              {!ready && task.status === 'to_do' && <p className="aw-muted">Waiting for an earlier step</p>}
              {task.blockers.map(blocker => <p className="aw-blocker" key={blocker.id}>{blocker.reason}</p>)}
              {task.needsReview && <p className="aw-blocker">Upstream changes need review</p>}
              {task.kind === 'approval' ? <TaskLink item={item} task={task}>Review approval →</TaskLink> : <div className="aw-task-actions"><label className="aw-sr-only" htmlFor={`move-${task.id}`}>Move {task.title}</label><select id={`move-${task.id}`} value={status} disabled={!enabled} onChange={e => void perform(row, e.target.value as TaskStatus)}>{(['to_do','working','stuck'] as const).map(value => <option key={value} value={value} disabled={value === 'working' && !ready}>{STATUS_LABELS[value]}</option>)}</select><button disabled={!enabled || !ready} onClick={() => void perform(row, 'done')}>Complete</button></div>}
            </article>;
          })}
          {!cards.length && <p className="aw-column-empty">{status === 'to_do' ? 'No tasks ready to start.' : status === 'working' ? 'Nothing in progress.' : 'No blocked tasks.'}</p>}
        </section>;
      })}
    </div>
    <details className="aw-completed"><summary>Completed · {complete.length}</summary>{complete.length ? complete.map(row => <div key={row.task.id}><TaskLink item={row.item} task={row.task} /><span>{row.item.name}</span><button disabled={mutating || actor?.access !== 'manager'} onClick={() => void mutate({ type: 'task.reopen', workItemId: row.item.id, taskId: row.task.id }).then(() => setNotice('Task reopened. Related activity steps have been checked.')).catch(e => setNotice(e.message))}>Reopen</button></div>) : <p>No completed tasks yet.</p>}</details>
    {stuck && <div className="aw-modal-backdrop"><div className="aw-modal aw-small-modal" role="dialog" aria-modal="true" aria-labelledby="aw-stuck-title"><header><h2 id="aw-stuck-title">What is blocking this task?</h2><button aria-label="Close blocker form" disabled={mutating} onClick={() => setStuck(null)}>×</button></header><p>{stuck.task.title}</p><form onSubmit={e => {
      e.preventDefault();
      void mutate({ type: 'task.move', workItemId: stuck.item.id, taskId: stuck.task.id, status: 'stuck', blocker: { id: workspaceId(), kind, targetId: target || null, reason, at: new Date().toISOString(), resumeStatus: stuck.task.status === 'working' ? 'working' : 'to_do' } }).then(() => { setStuck(null); setNotice('Blocker recorded. Independent work can continue.'); }).catch(e => setNotice(e.message));
    }}><fieldset disabled={mutating}><label>Reason type<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="needs_help">Need help</option><option value="waiting_approval">Waiting for approval</option><option value="waiting_dependency">Waiting for another step</option><option value="external_response">Waiting for an external reply</option></select></label><label>Related step or approval<select value={target} onChange={e => setTarget(e.target.value)}><option value="">No linked step</option>{stuck.item.tasks.filter(task => task.id !== stuck.task.id).map(task => <option key={task.id} value={task.gateId ?? task.id}>{task.title}</option>)}</select></label><label>What needs to happen?<textarea autoFocus required maxLength={400} value={reason} onChange={e => setReason(e.target.value)} /></label><footer><button type="button" onClick={() => setStuck(null)}>Cancel</button><button type="submit" className="aw-primary" disabled={!reason.trim()}>Save blocker</button></footer></fieldset></form></div></div>}
  </>;
}
