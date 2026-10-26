import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { workspaceFixture } from '../src/workspace/testing/fixtures';
import { TaskSchema, WorkItemSchema, type WorkspaceEnvelope, type WorkspaceMutation } from '../src/workspace/contracts';
import { compileOrganization, scopeKey, upgrade } from '../src/organization/setupLogic';
import { fixtureDraft, fixtureFlow } from '../src/organization/testing/fixtures';
import { applyWorkspaceCommand } from '../netlify/lib/workspace/runtime.mts';
import { validateWorkspaceCommand } from '../netlify/lib/workspace/commands.mts';

function approved() {
  const draft=upgrade(fixtureDraft());draft.memberFlow=fixtureFlow(draft);draft.riskCheck={status:'skipped',inputKey:scopeKey(draft,'risk_check'),risks:[],answers:{},at:'2026-10-26T12:00:00Z'};
  draft.confirmed=true;draft.confirmedAt='2026-10-26T12:00:00Z';draft.contextVersion=1;draft.compiled=compileOrganization(draft);return draft;
}
async function runtime(page:Page, envelope=workspaceFixture()) {
  const requests:WorkspaceMutation[]=[];
  let beforeSave:(()=>Promise<void>)|null=null;
  let aiCalls=0;
  await page.route('**/api/workspace/assistant**',route=>{aiCalls++;return route.fulfill({status:503,json:{message:'No real model calls in this test'}});});
  await page.route('**/api/workspace',async route=>{
    if(route.request().method()==='POST') {
      const body=route.request().postDataJSON() as WorkspaceMutation;requests.push(body);
      await beforeSave?.();
      if(body.revision!==envelope.state.revision){await route.fulfill({status:409,json:{message:'A newer workspace revision is available.'}});return;}
      try {const state=applyWorkspaceCommand(envelope.state,envelope.organization,validateWorkspaceCommand(body.command),approved(),new Date().toISOString());state.revision++;envelope={...envelope,state};}
      catch(e){await route.fulfill({status:400,json:{message:(e as Error).message}});return;}
    }
    await route.fulfill({json:envelope});
  });
  return {requests,get envelope(){return envelope;},get aiCalls(){return aiCalls;},holdSave:(handler:(()=>Promise<void>)|null)=>{beforeSave=handler;}};
}
const nav=(page:Page,name:string)=>page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name,exact:true});

test('priority actions come from existing tasks and expand the same queue',async({page})=>{
  const envelope=workspaceFixture(),item=envelope.state.workItems[0];
  item.tasks=Array.from({length:6},(_,i)=>TaskSchema.parse({...item.tasks[0],id:`priority_${i}`,title:`Assigned task ${i+1}`,rank:i,stageKey:`phase_${i}`,stageTitle:`Phase ${i+1}`}));
  const mocked=await runtime(page,envelope);await page.goto('/#/phase1');
  const priorities=page.getByRole('region',{name:'Your priority tasks'});
  await expect(priorities.getByRole('listitem')).toHaveCount(3);
  await priorities.getByRole('button',{name:'View all 6 open tasks'}).click();
  await expect(priorities.getByRole('listitem')).toHaveCount(6);
  for(const task of item.tasks)await expect(priorities.getByRole('link',{name:task.title,exact:true})).toBeVisible();
  expect(mocked.aiCalls).toBe(0);expect(mocked.requests).toHaveLength(0);
});

test('fifteen member activities use one searchable list and exclude board projects',async({page})=>{
  const envelope=workspaceFixture(),original=envelope.state.workItems[0];
  envelope.state.workItems=Array.from({length:15},(_,i)=>WorkItemSchema.parse({...original,id:`event_${i}`,name:`Member event ${i+1}`,tasks:[{...original.tasks[0],id:`event_task_${i}`,parentWorkItemId:`event_${i}`}]}));
  envelope.state.workItems.push(WorkItemSchema.parse({...original,id:'board',kind:'executive_work',name:'Board budget preparation',tasks:[]}));
  await runtime(page,envelope);await page.goto('/#/phase1/activities');
  await expect(page.locator('.aw-activity-row')).toHaveCount(15);
  await expect(page.getByText('Board budget preparation',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByRole('searchbox').fill('Member event 15');
  await expect(page.locator('.aw-activity-row')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test('personal board drag or keyboard action changes the same event task and completion history',async({page,isMobile})=>{
  const mocked=await runtime(page);await page.goto('/#/phase1/tasks');
  const board=page.getByTestId('workspace-task-board'),card=board.locator('[data-task-id="plan"]');
  await expect(card).toBeVisible();
  const working=board.getByRole('region',{name:'Working on it',exact:true});
  if(isMobile)await card.getByRole('combobox').selectOption('working');else await card.dragTo(working);
  await expect(working.locator('[data-task-id="plan"]')).toBeVisible();
  expect(mocked.requests.at(-1)?.command).toMatchObject({type:'task.move',taskId:'plan',status:'working'});
  await working.locator('[data-task-id="plan"]').getByRole('button',{name:'Complete',exact:true}).click();
  await expect(board.locator('[data-task-id="plan"]')).toHaveCount(0);
  await page.getByText('Completed · 1',{exact:true}).click();
  await expect(page.locator('.aw-completed').getByRole('link',{name:'Collect approved project ideas',exact:true})).toBeVisible();
  await nav(page,'Activities').click();await expect(page.locator('.aw-activity-row').getByText('1/2 steps',{exact:true})).toBeVisible();
  await page.locator('.aw-activity-row').getByRole('link',{name:'Open timeline →'}).click();
  await expect(page.getByRole('region',{name:'Activity timeline'})).toBeVisible();
  await expect(page.getByText('1/1 complete',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('1/1 complete',{exact:true})).toBeVisible();
  expect(mocked.aiCalls).toBe(0);
});

test('unfinished creation survives refresh and cancelling Back retains its input',async({page})=>{
  await runtime(page);await page.goto('/#/phase1');await nav(page,'Activities').click();
  await page.getByRole('button',{name:'+ Create activity',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'Create member activity'});
  await dialog.getByLabel('Name',{exact:true}).fill('Unfinished member workshop');
  await dialog.getByLabel('Activity date',{exact:true}).fill('2026-11-25');
  page.once('dialog',prompt=>prompt.dismiss());await page.goBack();
  await expect(dialog.getByLabel('Name',{exact:true})).toHaveValue('Unfinished member workshop');
  await expect(page).toHaveURL(/phase1\/activities/);
  page.once('dialog',prompt=>prompt.accept());await page.reload();
  await page.getByRole('button',{name:'Resume unfinished form'}).click();dialog=page.getByRole('dialog',{name:'Create member activity'});
  await expect(dialog.getByLabel('Name',{exact:true})).toHaveValue('Unfinished member workshop');
  await expect(dialog.getByLabel('Activity date',{exact:true})).toHaveValue('2026-11-25');
  await dialog.getByRole('button',{name:'Create and assign tasks',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Unfinished member workshop',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Resume unfinished form'})).toHaveCount(0);
});

test('saving blocks navigation until the shared task mutation has completed',async({page})=>{
  const mocked=await runtime(page);let release!:()=>void;const saving=new Promise<void>(resolve=>{release=resolve;});mocked.holdSave(()=>saving);
  await page.goto('/#/phase1/tasks');const card=page.getByTestId('workspace-task-board').locator('[data-task-id="plan"]');
  await card.getByRole('combobox').selectOption('working');await expect(page.getByText('Saving your change…',{exact:true})).toBeVisible();
  await nav(page,'Activities').click();await expect(page).toHaveURL(/phase1\/tasks/);
  release();await expect(page.getByText('Saving your change…',{exact:true})).toHaveCount(0);
  await nav(page,'Activities').click();await expect(page.getByRole('heading',{name:'Activities',exact:true})).toBeVisible();
});

test('personal board and creation modal retain keyboard access and accessible labels',async({page})=>{
  await runtime(page);await page.goto('/#/phase1/tasks');await expect(page.getByTestId('workspace-task-board')).toBeVisible();
  const results=await new AxeBuilder({page}).include('#live-main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await nav(page,'Activities').click();await page.getByRole('button',{name:'+ Create activity',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Create member activity'});
  await dialog.getByRole('button',{name:'Create and assign tasks',exact:true}).focus();await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button',{name:'Close creation form'})).toBeFocused();
});
