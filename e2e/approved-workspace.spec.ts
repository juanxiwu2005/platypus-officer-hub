import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { compileOrganization, scopeKey, upgrade } from "../src/organization/setupLogic";
import { fixtureDraft, fixtureFlow } from "../src/organization/testing/fixtures";
import type { Envelope } from "../src/organization/schema";

function confirmed(version = 1) {
  const draft = upgrade(fixtureDraft());
  draft.name = "Fictional River Builders";
  draft.mission = "Build useful projects together.";
  draft.roles[0].title = "Community Captain";
  draft.roles[0].responsibilities = ["Protect the team's approved project scope"];
  const department = draft.departments.find(d => d.id === draft.roles[0].departmentId)!;
  department.name = "Community leadership";
  department.color = "#b34567";
  draft.memberFlow = fixtureFlow(draft);
  draft.memberFlow.title = "River Builders activity";
  draft.riskCheck = { status: "skipped", inputKey: scopeKey(draft, "risk_check"), risks: [], answers: {}, at: "2026-10-26T12:00:00Z" };
  draft.contextVersion = version - 1;
  const compiled = compileOrganization(draft);
  return { workspaceId: "confirmed-private-workspace", revision: version, approved: { ...draft, compiled, contextVersion: version, confirmed: true, confirmedAt: "2026-10-26T12:00:00Z" }, draft: { ...draft, name: "Do not use this unapproved edit" } };
}
async function mock(page: Page, read: () => unknown) {
  await page.route("**/api/org/setup", route => route.fulfill({ json: read() }));
}

test("confirmed organization reaches Home and workflow using approved roles, duties and colors", async ({ page }) => {
  const envelope = confirmed();
  await mock(page, () => envelope);
  await page.goto("/#/phase1");
  await expect(page.getByRole("heading", { name: "Fictional River Builders", exact: true })).toBeVisible();
  await expect(page.getByTestId("approved-workspace")).toHaveAttribute("data-context-version", "1");
  await expect(page.getByRole("heading", { name: "Community Captain", exact: true })).toBeVisible();
  await expect(page.getByText("Protect the team's approved project scope", { exact: true })).toBeVisible();
  await expect(page.getByText("Do not use this unapproved edit", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-department-id="leadership"]')).toHaveCSS("border-color", "rgb(179, 69, 103)");
  await page.getByRole("link", { name: /MEMBER ACTIVITY/ }).click();
  await expect(page.getByRole("heading", { name: "River Builders activity", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Workflow steps" })).toContainText(envelope.approved.memberFlow!.nodes[0].title);
  await page.reload();
  await expect(page.getByTestId("approved-workspace")).toHaveAttribute("data-context-version", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("navigation reloads approved versions and never silently uses old local preview data", async ({ page }) => {
  let envelope = confirmed();
  await mock(page, () => envelope);
  await page.goto("/#/phase1");
  await expect(page.getByTestId("approved-workspace")).toBeVisible();
  envelope = confirmed(2);
  envelope.approved.roles[0].title = "Updated Captain";
  envelope.approved.compiled.alwaysRead.roles.find(r => r.id === envelope.approved.roles[0].id)!.title = "Updated Captain";
  await page.getByRole("link", { name: /MEMBER ACTIVITY/ }).click();
  await expect(page.getByTestId("approved-workspace")).toHaveAttribute("data-context-version", "2");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Updated Captain", exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => k.includes("confirmed-private-workspace")))).toBe(false);
});

test("missing or unavailable approved settings give an explicit setup or retry state", async ({ page }) => {
  let available = true;
  await page.route("**/api/org/setup", route => available ? route.fulfill({ json: { ...confirmed(), approved: null } }) : route.fulfill({ status: 503, json: { message: "Unavailable" } }));
  await page.goto("/#/phase1");
  await expect(page.getByRole("heading", { name: "Confirm your organization", exact: true })).toBeVisible();
  await expect(page.getByTestId("approved-workspace")).toHaveCount(0);
  available = false;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Workspace unavailable", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open previous example preview", exact: true }).click();
  await expect(page.getByText(/Previous example preview · Changes here/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /A little less coordinating/ })).toBeVisible();
});

test("approved Home and workflow support keyboard access and accessibility checks", async ({ page }) => {
  await mock(page, () => confirmed());
  for (const path of ["/#/phase1", "/#/phase1/activity/member"]) {
    await page.goto(path);
    await expect(page.getByTestId("approved-workspace")).toBeVisible();
    const results = await new AxeBuilder({ page }).include(".approved-workspace").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole("link", { name: "Edit organization", exact: true }).focus();
    await expect(page.getByRole("link", { name: "Edit organization", exact: true })).toBeFocused();
  }
});

test("confirming the edited setup opens the same approved workspace without an AI call or unconfirming it", async ({ page }) => {
  const seed = confirmed();
  let record: Envelope = { workspaceId: seed.workspaceId, revision: 0, draft: { ...seed.approved, step: 4, confirmed: false, confirmedAt: null, compiled: null, contextVersion: 0 }, approved: null, updatedAt: "2026-10-26T12:00:00Z", expiresAt: "2026-11-02T12:00:00Z" };
  let aiCalls = 0;
  await page.route("**/api/org/archive**", route => route.fulfill({ json: { saved: true } }));
  await page.route("**/api/org/ai**", route => { aiCalls++; return route.fulfill({ status: 500, json: { message: "No AI expected" } }); });
  await page.route("**/api/org/setup", async route => {
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : { action: "start" };
    if (body.action !== "start") {
      if (body.revision !== record.revision) { await route.fulfill({ status: 409, json: { message: "Newer revision" } }); return; }
      const draft = { ...body.draft, contextVersion: record.draft.contextVersion };
      if (body.action === "confirm") {
        draft.compiled = compileOrganization(draft);
        draft.contextVersion++;
        draft.confirmed = true;
        draft.confirmedAt = "2026-10-26T12:00:00Z";
      } else { draft.confirmed = false; draft.confirmedAt = null; }
      record = { ...record, revision: record.revision + 1, draft, approved: body.action === "confirm" ? structuredClone(draft) : record.approved };
    }
    await route.fulfill({ json: record });
  });
  await page.goto("/#/phase1/setup");
  await page.getByRole("tab", { name: "Activity workflow", exact: true }).click();
  await page.getByLabel("Step title plan", { exact: true }).fill("Collect approved project ideas");
  await page.getByRole("button", { name: "Confirm organization", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your organization is ready.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Go to workspace →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fictional River Builders", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Community Captain", exact: true })).toBeVisible();
  await expect(page.locator('[data-department-id="leadership"]')).toHaveCSS("border-color", "rgb(179, 69, 103)");
  expect(record.draft.confirmed).toBe(true);
  expect(record.approved?.contextVersion).toBe(1);
  await page.getByRole("link", { name: /MEMBER ACTIVITY/ }).click();
  await expect(page.getByRole("region", { name: "Workflow steps" })).toContainText("Collect approved project ideas");
  expect(aiCalls).toBe(0);
});
