import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { blankDraft } from "../src/organization/presets";
import {
  fixtureDraft,
  fixtureResult,
} from "../src/organization/testing/fixtures";
import type { Envelope, Stage } from "../src/organization/schema";
async function mockedOnline(page: Page) {
  let record: Envelope = {
    workspaceId: "test-private-workspace",
    revision: 0,
    draft: blankDraft(),
    approved: null,
    updatedAt: "2026-10-25T12:00:00Z",
    expiresAt: "2026-11-01T12:00:00Z",
  };
  await page.route("**/api/org/setup", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({ json: record });
      return;
    }
    const b = req.postDataJSON();
    if (b.action !== "start") {
      if (b.revision !== record.revision) {
        await route.fulfill({
          status: 409,
          json: { message: "Stale revision" },
        });
        return;
      }
      record = {
        ...record,
        revision: record.revision + 1,
        draft: { ...b.draft, aiRuns: record.draft.aiRuns },
      };
      if (b.action === "confirm") {
        record.draft.confirmed = true;
        record.draft.contextVersion++;
        record.approved = structuredClone(record.draft);
      }
    }
    await route.fulfill({ json: record });
  });
  await page.route("**/api/org/ai", async (route) => {
    const b = route.request().postDataJSON();
    if (b.revision !== record.revision) {
      await route.fulfill({
        status: 409,
        json: { message: "Save latest settings" },
      });
      return;
    }
    const meta = {
      stage: b.stage as Stage,
      promptVersion: "organization-setup-v2.2",
      model: "test-model",
      provider: "Automated test fixture",
      inputHash: "test-hash",
      at: "2026-10-25T12:00:00Z",
    };
    record = {
      ...record,
      revision: record.revision + 1,
      draft: { ...record.draft, aiRuns: [...record.draft.aiRuns, meta] },
    };
    const d = record.draft.roles.length ? record.draft : fixtureDraft();
    await route.fulfill({
      json: {
        result: { ...meta, data: fixtureResult(b.stage, d) },
        revision: record.revision,
        updatedAt: record.updatedAt,
      },
    });
  });
  return () => record;
}
async function open(page: Page) {
  const read = await mockedOnline(page);
  await page.goto("/#/phase1/setup");
  await expect(
    page.getByRole("heading", { name: "Start with your constitution." }),
  ).toBeVisible();
  return read;
}
async function team(page: Page) {
  await page
    .getByRole("button", { name: "Use fictional example", exact: true })
    .click();
  await expect(
    page.getByText("fictional-constitution.txt", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let AI prepare my team" }).click();
  await expect(
    page.getByRole("heading", { name: "Does this look like your team?" }),
  ).toBeVisible();
}
async function matrix(page: Page) {
  await team(page);
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A shared picture of who does what." }),
  ).toBeVisible();
}
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
test("AI setup starts from constitution, without organization categories", async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByText("Professional development", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("How should plans move forward", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Paste text", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Upload constitution", { exact: true }),
  ).toHaveAttribute("accept", /\.pdf,\.docx/);
  await expect(
    page.getByText("Saved online", { exact: false }).first(),
  ).toBeVisible();
});
for (const ext of ["pdf", "docx", "txt"])
  test(`AI setup reads a real ${ext} file`, async ({ page }) => {
    await open(page);
    await page
      .getByLabel("Upload constitution", { exact: true })
      .setInputFiles(`public/organization/fictional-constitution.${ext}`);
    await expect(
      page.getByText(`fictional-constitution.${ext}`, { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
test("AI setup accepts pasted text and persists it before requesting AI", async ({
  page,
}) => {
  const read = await open(page);
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page
    .getByLabel("Constitution text", { exact: true })
    .fill(
      "A fictional constitution. The President approves plans. Marketing coordinates promotion.",
    );
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  await expect(
    page.getByText("pasted-constitution.txt", { exact: true }),
  ).toBeVisible();
  expect(read().draft.source?.text).toContain("fictional constitution");
});
test("AI setup extracts grouped roles with evidence and shows custom role input directly", async ({
  page,
}) => {
  await open(page);
  await team(page);
  await expect(
    page.getByRole("heading", {
      name: "Marketing & Communication",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", {
      name: "Role title marketing_intern",
      exact: true,
    }),
  ).toHaveValue("Marketing Intern");
  await expect(page.getByLabel("Role title", { exact: true })).toBeVisible();
  await page
    .getByLabel("Role title", { exact: true })
    .fill("Volunteer Coordinator");
  await page
    .locator(".os-add-role")
    .getByRole("button", { name: "Add role", exact: true })
    .click();
  await expect(page.locator(".os-role-card input").last()).not.toHaveValue("");
});
test("AI setup uses department groups and multiple role checkboxes", async ({
  page,
}) => {
  const read = await open(page);
  await matrix(page);
  const a = page.getByRole("checkbox", {
      name: "Vice President of Marketing: Create and share promotion",
      exact: true,
    }),
    b = page.getByRole("checkbox", {
      name: "Marketing Intern: Create and share promotion",
      exact: true,
    });
  await expect(a).toBeChecked();
  await expect(b).toBeChecked();
  await b.uncheck();
  await b.check();
  await expect(
    page.getByRole("combobox", { name: /owner|approver|support/i }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("cell", { name: "Finance & Purchasing", exact: true })
      .first(),
  ).toBeVisible();
  expect(read().draft.roles).toHaveLength(9);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
test("AI setup renders member flow, edits responsible roles, and reviews AI changes", async ({
  page,
}, info) => {
  await open(page);
  await matrix(page);
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "From opportunity to a great program." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ Add step", exact: true }).click();
  await page
    .getByLabel("New step title", { exact: true })
    .fill("Review accessible participation");
  await page
    .getByRole("button", { name: "Add to workflow", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected workflow step" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Vice President of Marketing", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Marketing Intern", exact: true })
    .check();
  await page
    .getByLabel("Tell Platypus what to change", { exact: true })
    .fill("Keep the venue and registration in parallel.");
  await page
    .getByRole("button", { name: "Suggest an update", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Review the suggested workflow" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Discard suggestion", exact: true })
    .click();
  await expect(page.getByLabel("Step title", { exact: true })).toHaveValue(
    "Review accessible participation",
  );
  await page.screenshot({
    path: `output/playwright/org-member-${info.project.name}.png`,
    fullPage: true,
  });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
test("AI setup completes board planning, two context tiers and exact prompt review", async ({
  page,
}, info) => {
  const read = await open(page);
  await matrix(page);
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await page
    .getByRole("button", { name: "This matches our workflow", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little structure for board work." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tabling event", exact: true })
    .click();
  await expect(page.locator(".os-content .os-flow-editor")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Let AI prepare this plan", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate with AI", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept update", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep this plan & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to work together." }),
  ).toBeVisible();
  await expect(
    page.getByText("READ WITH EVERY REQUEST", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("READ WHEN NEEDED", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review all prompts", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "The instructions behind your setup" }),
  ).toBeVisible();
  await expect(page.locator("dialog details")).toHaveCount(5);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "I have reviewed the AI instructions.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirm organization", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your organization is ready." }),
  ).toBeVisible();
  expect(read().approved?.guide).toBeTruthy();
  expect(read().approved?.boardGoal).toContain("tabling");
  expect(read().approved?.boardFlow?.title).toContain("tabling");
  await page.screenshot({
    path: `output/playwright/org-review-${info.project.name}.png`,
    fullPage: true,
  });
});
test("AI setup resumes saved online changes after reload", async ({ page }) => {
  const read = await open(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Fictional Future Builders");
  await expect.poll(() => read().draft.name).toBe("Fictional Future Builders");
  await page.reload();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Fictional Future Builders");
});
test("AI setup clearly reports provider errors and does not invent success", async ({
  page,
}) => {
  await open(page);
  await page.route("**/api/org/ai", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "AI is not configured on the server." },
    }),
  );
  await page.getByRole("button", { name: "Let AI prepare my team" }).click();
  await expect(page.getByRole("alert")).toContainText("AI is not configured");
  await expect(
    page.getByRole("heading", { name: "Start with your constitution." }),
  ).toBeVisible();
});
test("AI setup has usable touch targets and accessible source screen", async ({
  page,
}, info) => {
  await open(page);
  const violations = (
    await new AxeBuilder({ page })
      .include(".os")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
  ).violations.map((v) => ({
    id: v.id,
    targets: v.nodes.map((n) => n.target),
  }));
  expect(violations).toEqual([]);
  const small = await page
    .locator(".os button:visible,.os select:visible")
    .evaluateAll((els) =>
      els
        .filter((e) => e.getBoundingClientRect().height < 43)
        .map((e) => e.textContent),
    );
  expect(small).toEqual([]);
  await page.screenshot({
    path: `output/playwright/org-source-${info.project.name}.png`,
    fullPage: true,
  });
});

test("AI setup waits for a background AIR job and applies only its completed suggestion", async ({
  page,
}) => {
  const read = await open(page);
  let polls = 0,
    started = 0;
  await page.route("**/api/org/ai-run", async (route) => {
    started++;
    await route.fulfill({ status: 202, body: "" });
  });
  await page.route("**/api/org/ai?*", async (route) => {
    polls++;
    const record = read();
    if (polls === 1) {
      await route.fulfill({
        json: { jobId: "fictional-job", status: "running" },
      });
      return;
    }
    await route.fulfill({
      json: {
        jobId: "fictional-job",
        status: "done",
        response: {
          result: {
            stage: "constitution",
            data: fixtureResult("constitution"),
            model: "AIR-test",
            provider: "Automated test fixture",
            promptVersion: "organization-setup-v2.2",
            inputHash: "test",
            at: "2026-10-25T12:00:00Z",
          },
          revision: record.revision,
          updatedAt: record.updatedAt,
        },
      },
    });
  });
  await page.route("**/api/org/ai", async (route) =>
    route.fulfill({
      status: 202,
      json: { jobId: "fictional-job", status: "queued" },
    }),
  );
  await page
    .getByRole("button", { name: "Use fictional example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let AI prepare my team", exact: true })
    .click();
  await expect(
    page.getByText("AIR may need extra time", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Does this look like your team?" }),
  ).toBeVisible({ timeout: 10000 });
  expect(started).toBe(1);
  expect(polls).toBe(2);
});
