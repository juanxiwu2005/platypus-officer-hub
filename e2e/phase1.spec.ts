// The previous setup is retained as a reference route after the user-requested AI setup replacement.
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { noOverflow } from "./helpers";
async function setup(page: Page) {
  await page.goto("/#/phase1/setup-legacy");
}
async function next(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function skipToMap(page: Page) {
  await setup(page);
  await next(page);
  await page
    .getByRole("button", { name: "Skip constitution", exact: true })
    .click();
  await next(page);
}
test.beforeEach(async ({ page }) => {
  await page.goto("/#/phase1?example=1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test("Phase1 home has one primary composer and opens both workflow kinds", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: /A little less coordinating/ }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your goal" })).toHaveCount(1);
  await page.getByRole("button", { name: "Plan a member activity" }).click();
  await page
    .getByRole("button", { name: "Review workflow", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Founder Connections", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await page.getByRole("button", { name: "Handle a board obligation" }).click();
  await page
    .getByRole("button", { name: "Review workflow", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Board Representatives", exact: true }),
  ).toBeVisible();
  expect(await noOverflow(page)).toBeLessThanOrEqual(1);
});
test("Phase1 asks one classification question for an unclear goal", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Your goal" })
    .fill("Help us improve");
  await page.getByRole("button", { name: "Submit goal" }).click();
  await expect(
    page.getByText("Is this for your members or for the executive board?"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Board obligation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review workflow", exact: true })
    .click();
  await expect(page).toHaveURL(/activity\/executive/);
});
test("Phase1 onboarding saves and resumes the current step", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Fictional Future Builders");
  await next(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Start with what’s already written." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Fictional Future Builders");
});
test("Phase1 skips constitution, confirms custom context and returns home", async ({
  page,
}) => {
  await skipToMap(page);
  await expect(
    page.getByText("Your responsibility map", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Advanced · approvers, support & detailed capabilities"),
  ).toBeVisible();
  expect(await page.locator(".p1-advanced[open]").count()).toBe(0);
  await next(page);
  await page
    .getByRole("button", { name: "Confirm organization", exact: true })
    .click();
  await expect(
    page.getByText("Your confirmed context", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Founder Connections/ })
    .last()
    .click();
  await expect(page.getByText("Confirmed · v1", { exact: true })).toBeVisible();
});
test("Phase1 constitution suggestions include evidence and accept edit reject", async ({
  page,
}) => {
  await setup(page);
  await next(page);
  await page
    .getByRole("button", { name: "Use fictional example", exact: true })
    .click();
  await expect(page.locator(".p1-suggestion")).toHaveCount(7);
  await expect(page.locator("blockquote").first()).toContainText(
    "President approves",
  );
  await expect(page.getByText("90% confidence", { exact: true })).toHaveCount(
    7,
  );
  const rows = page.locator(".p1-suggestion");
  await rows
    .nth(0)
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await rows.nth(1).getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Suggested role title").fill("VP of Programs");
  await page.getByRole("button", { name: "Save edited suggestion" }).click();
  for (let i = 2; i < 7; i++)
    await rows
      .nth(i)
      .getByRole("button", { name: "Reject", exact: true })
      .click();
  await next(page);
  await expect(page.getByRole("textbox", { name: "Role 8 title" })).toHaveValue(
    "VP of Programs",
  );
  expect(await noOverflow(page)).toBeLessThanOrEqual(1);
});
test("Phase1 supports fictional constitution file upload", async ({ page }) => {
  await setup(page);
  await next(page);
  await page
    .getByLabel("Upload fictional constitution", { exact: true })
    .setInputFiles("public/phase1/fictional-constitution.txt");
  await expect(page.locator(".p1-suggestion")).toHaveCount(7);
});
test("Phase1 constitution conflict keeps the manual choice unless explicitly changed", async ({
  page,
}) => {
  await setup(page);
  await next(page);
  await page
    .getByRole("button", { name: "Use fictional example", exact: true })
    .click();
  const rows = page.locator(".p1-suggestion");
  for (let i = 0; i < 7; i++)
    await rows
      .nth(i)
      .getByRole("button", { name: i === 5 ? "Accept" : "Reject", exact: true })
      .click();
  await next(page);
  await next(page);
  await expect(
    page.getByText(
      "Your manual setting is Marketing. The constitution suggests External Relations.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep Marketing", exact: false })
    .click();
  await expect(page.getByLabel("Companies & sponsors owner")).toHaveValue(
    "role-3",
  );
  await next(page);
  await expect(
    page.getByText(/Company relationships: Marketing/),
  ).toBeVisible();
});
test("Phase1 custom role can own several capabilities", async ({ page }) => {
  await setup(page);
  await next(page);
  await page
    .getByRole("button", { name: "Skip constitution", exact: true })
    .click();
  await page.getByText("Add a custom role", { exact: true }).click();
  await page.getByLabel("New role title").fill("Community Builder");
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  await next(page);
  await page
    .getByLabel("Event planning owner", { exact: true })
    .selectOption({ label: "Community Builder" });
  await page
    .getByLabel("Staffing and manpower owner", { exact: true })
    .selectOption({ label: "Community Builder" });
  await next(page);
  await expect(page.locator(".p1-summary-roles")).toContainText(
    "Community Builder",
  );
  await expect(page.locator(".p1-summary-roles")).toContainText(
    "Event planning · Staffing and manpower",
  );
});
test("Phase1 organization B routes company relationships to External Relations", async ({
  page,
}) => {
  await page.getByLabel("Demo organization").selectOption("B");
  await page
    .getByRole("link", { name: /Founder Connections/ })
    .last()
    .click();
  await expect(
    page.getByText("External Relations", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Outreach", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /Show all \d+ steps/ }).click();
  await page.getByRole("button", { name: /Partner Meeting/ }).click();
  await expect(
    page.getByRole("region", { name: "Task details" }),
  ).toContainText("External Relations");
});
test("Phase1 workspace reviews, rejects and approves a local plan; task status is clickable", async ({
  page,
}) => {
  await page.goto("/#/phase1/activity/executive");
  await page.getByRole("button", { name: "Review plan", exact: true }).click();
  await page.getByRole("button", { name: "Reject plan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Review plan", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Review plan", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approved preview" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Review the school notice/ }).click();
  await page.getByLabel("Task status").selectOption("Done");
  await expect(page.locator(".p1-task-row").first()).toContainText("Done");
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page.locator(".p1-board")).toContainText("Done");
  expect(await noOverflow(page)).toBeLessThanOrEqual(1);
});
test("Phase1 keyboard can operate setup and submit the composer", async ({
  page,
}) => {
  await page.getByRole("textbox", { name: "Your goal" }).focus();
  await page.keyboard.type("Plan a member workshop");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Review workflow", exact: true }),
  ).toBeVisible();
  await setup(page);
  await page
    .getByRole("button", { name: "Community & social", exact: false })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Community & social", exact: false }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Start with what’s already written." }),
  ).toBeVisible();
});
test("Phase1 touch targets and screenshots on home, setup and workspace", async ({
  page,
}, info) => {
  for (const [name, route] of [
    ["home", "/phase1"],
    ["setup", "/phase1/setup-legacy"],
    ["workspace", "/phase1/activity/member"],
  ]) {
    await page.goto("/#" + route);
    expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    const small = await page
      .locator(".p1 button:visible,.p1 select:visible")
      .evaluateAll((els) =>
        els
          .filter((e) => e.getBoundingClientRect().height < 43)
          .map((e) => e.textContent),
      );
    expect(small).toEqual([]);
    await page.screenshot({
      path: `output/playwright/phase1-${name}-${info.project.name}.png`,
      fullPage: true,
    });
  }
});
for (const [label, route] of [
  ["home", "/phase1"],
  ["onboarding", "/phase1/setup-legacy"],
  ["workspace", "/phase1/activity/member"],
])
  test(`Phase1 accessibility ${label}`, async ({ page }) => {
    await page.goto("/#" + route);
    const result = await new AxeBuilder({ page })
      .include(".p1")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
test("Phase1 approved context survives a draft edit and reload; skip link keeps the route", async ({
  page,
}) => {
  await skipToMap(page);
  await next(page);
  await page
    .getByRole("button", { name: "Confirm organization", exact: true })
    .click();
  await setup(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByLabel("Companies & sponsors owner").selectOption("role-5");
  await page.reload();
  await page.goto("/#/phase1/activity/member");
  await expect(page.locator(".p1-next")).toContainText(
    "Company outreach belongs to Marketing",
  );
  await page.locator(".p1-skip").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/phase1\/activity\/member/);
  await expect(page.locator("#p1-main")).toBeFocused();
});
test("Phase1 asks one responsibility question when an owner is unknown", async ({
  page,
}) => {
  await skipToMap(page);
  await page.getByLabel("Companies & sponsors owner").selectOption("");
  await next(page);
  await page
    .getByRole("button", { name: "Confirm organization", exact: true })
    .click();
  await page.goto("/#/phase1/activity/member");
  await page
    .getByRole("textbox", { name: "Your goal" })
    .fill("Who should contact the company?");
  await page.getByRole("button", { name: "Submit goal" }).click();
  await expect(
    page.getByText("Who should own company and sponsor relationships?", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".p1-reply .p1-choices button")).toHaveCount(4);
  await expect(
    page.getByText("Add another option", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review plan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Approve preview", exact: true }),
  ).toBeDisabled();
});
