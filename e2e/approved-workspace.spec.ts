import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { workspaceFixture } from '../src/workspace/testing/fixtures';
import { compileOrganization, scopeKey, upgrade } from '../src/organization/setupLogic';
import { fixtureDraft, fixtureFlow } from '../src/organization/testing/fixtures';
import type { Envelope } from '../src/organization/schema';
import type { WorkspaceEnvelope } from '../src/workspace/contracts';
async function mockRuntime(page:Page,read:()=>WorkspaceEnvelope) {
  await page.route('**/api/workspace',route=>route.fulfill({json:read()}));
}
test('current organization reaches Home and real activities without displaying setup duties',async({page})=>{
  await mockRuntime(page,()=>workspaceFixture());await page.goto('/#/phase1');
  await expect(page.getByText('Fictional River Builders',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:'Member Programs',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Executive Board',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your team',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Edit organization',exact:true})).toHaveCount(0);
  await page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name:'Activities',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Activities',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'River Builders gathering',exact:true}).last().click();
  await expect(page.getByRole('heading',{name:'River Builders gathering',exact:true})).toBeVisible();
  await expect(page.getByText('Collect approved project ideas',{exact:true}).first()).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'River Builders gathering',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test('navigation refreshes organization data without writing the legacy preview repository',async({page})=>{
  let envelope=workspaceFixture();await mockRuntime(page,()=>envelope);await page.goto('/#/phase1');
  await expect(page.getByText('Fictional River Builders',{exact:true}).first()).toBeVisible();
  envelope=workspaceFixture('Updated River Builders',2);
  await page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name:'Activities',exact:true}).click();
  await expect(page.getByText('Updated River Builders',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Fictional River Builders',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('confirmed-private-workspace')))).toBe(false);
});
test('unavailable runtime offers setup and retry rather than substituting fictional seed data',async({page})=>{
  await page.route('**/api/workspace',route=>route.fulfill({status:503,json:{message:'Workspace temporarily unavailable'}}));await page.goto('/#/phase1');
  await expect(page.getByRole('alert').first()).toContainText('Workspace temporarily unavailable');
  await expect(page.getByRole('link',{name:'Open organization setup',exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry connection',exact:true})).toBeVisible();
  await expect(page.getByText('Desert Founders',{exact:true})).toHaveCount(0);
});
test('Home and activity details retain keyboard access and accessibility',async({page})=>{
  await mockRuntime(page,()=>workspaceFixture());
  for(const path of ['/#/phase1','/#/phase1/work/river_event']) {
    await page.goto(path);await expect(page.getByText('Fictional River Builders',{exact:true}).first()).toBeVisible();
    const results=await new AxeBuilder({page}).include('#live-main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
    const setup=page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name:'Organization setup',exact:true});await setup.focus();await expect(setup).toBeFocused();
  }
});
test('setup confirmation retains the template and opens runtime with no AI generation or unconfirmation',async({page})=>{
  const draft=upgrade(fixtureDraft());draft.name='Fictional River Builders';draft.memberFlow=fixtureFlow(draft);draft.step=4;
  draft.riskCheck={status:'skipped',inputKey:scopeKey(draft,'risk_check'),risks:[],answers:{},at:'2026-10-26T12:00:00Z'};
  let record:Envelope={workspaceId:'confirmed-private-workspace',revision:0,draft,approved:null,updatedAt:'2026-10-26T12:00:00Z',expiresAt:'2026-11-02T12:00:00Z'};let aiCalls=0;
  await page.route('**/api/org/archive**',route=>route.fulfill({json:{saved:true,uploads:[]}}));
  await page.route('**/api/org/ai**',route=>{aiCalls++;return route.fulfill({status:500,json:{message:'No AI expected'}});});
  await page.route('**/api/workspace/assistant**',route=>{aiCalls++;return route.fulfill({status:500,json:{message:'No AI expected'}});});
  await page.route('**/api/org/setup',async route=>{
    const body=route.request().method()==='POST'?route.request().postDataJSON():{action:'start'};
    if(body.action!=='start') {
      if(body.revision!==record.revision){await route.fulfill({status:409,json:{message:'Newer revision'}});return;}
      const next={...body.draft,contextVersion:record.draft.contextVersion};
      if(body.action==='confirm'){next.compiled=compileOrganization(next);next.contextVersion++;next.confirmed=true;next.confirmedAt=record.updatedAt;}
      record={...record,revision:record.revision+1,draft:next,approved:body.action==='confirm'?structuredClone(next):record.approved};
    }await route.fulfill({json:record});
  });
  await mockRuntime(page,()=>{const runtime=workspaceFixture(record.approved?.name??'Your organization');runtime.state.workItems=[];return runtime;});
  await page.goto('/#/phase1/setup');await page.getByRole('tab',{name:'Activity workflow',exact:true}).click();
  await page.getByLabel('Step title plan',{exact:true}).fill('Collect approved project ideas');await page.getByRole('button',{name:'Confirm organization',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your organization is ready.',exact:true})).toBeVisible();await page.getByRole('link',{name:'Go to workspace →',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Member Programs',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Executive Board',exact:true})).toBeVisible();
  expect(record.draft.confirmed).toBe(true);expect(record.approved?.contextVersion).toBe(1);
  expect(record.approved?.memberFlow?.nodes.find(n=>n.id==='plan')?.title).toBe('Collect approved project ideas');expect(aiCalls).toBe(0);
});
