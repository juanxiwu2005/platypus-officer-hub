import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { blankDraft } from "../src/organization/presets";
import {
  fixtureDraft,
  fixtureFlow,
} from "../src/organization/testing/fixtures";
import { upgrade, compileOrganization } from "../src/organization/setupLogic";
import type { Envelope, Stage } from "../src/organization/schema";
async function mockedOnline(page: Page) {
  let record: Envelope = {
    workspaceId: "test-private-workspace",
    revision: 0,
    draft: blankDraft(),
    approved: null,
    updatedAt: "2026-10-26T12:00:00Z",
    expiresAt: "2026-11-01T12:00:00Z",
  };
  const calls: Stage[] = [];
  let requestError = "";
  const uploads = new Map<string, unknown>();
  await page.route("**/api/org/archive**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { eventIds: [], uploads: [] } });
      return;
    }
    const b = route.request().postDataJSON();
    if (b.action === "begin") {
      const m = {
        ...b,
        id: "b0507f2a-6514-4ae0-849a-446c7ba364b0",
        parts: 1,
        createdAt: record.updatedAt,
        complete: false,
      };
      uploads.set(m.id, m);
      await route.fulfill({ json: m });
      return;
    }
    if (b.action === "finish") {
      await route.fulfill({
        json: { ...(uploads.get(b.id) as object), complete: true },
      });
      return;
    }
    await route.fulfill({ json: { saved: true } });
  });
  await page.route("**/api/org/setup", async (route) => {
    const b =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : { action: "start" };
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
        record.draft.compiled = compileOrganization(record.draft);
        record.draft.confirmed = true;
        record.approved = structuredClone(record.draft);
      }
    }
    await route.fulfill({ json: record });
  });
  await page.route("**/api/org/ai", async (route) => {
    const b = route.request().postDataJSON();
    calls.push(b.stage);
    if (requestError) {
      await route.fulfill({ status: 502, json: { message: requestError } });
      return;
    }
    if (b.revision !== record.revision) {
      await route.fulfill({ status: 409, json: { message: "Save latest" } });
      return;
    }
    const meta = {
      stage: b.stage,
      promptVersion: "organization-setup-v3.0",
      model: "test-model",
      provider: "Automated fixture",
      inputHash: "test",
      at: record.updatedAt,
    };
    record = {
      ...record,
      revision: record.revision + 1,
      draft: { ...record.draft, aiRuns: [...record.draft.aiRuns, meta] },
    };
    const d = upgrade(fixtureDraft());
    let data: unknown;
    if (b.stage === "constitution")
      data = {
        name: d.name,
        mission: d.mission,
        roles: d.roles,
        departments: d.departments,
        uncertainties: [],
      };
    else if (b.stage === "member_workflow") data = fixtureFlow(record.draft);
    else if (b.stage === "risk_check") data = { risks: [] };
    else
      data = {
        message: "Rename the marketing position. Other settings stay the same.",
        question: null,
        changes: [
          {
            entity: "role",
            id: "marketing",
            operation: "set",
            field: "title",
            value: "VP of Communications",
          },
        ],
      };
    await route.fulfill({
      json: {
        result: { ...meta, data },
        revision: record.revision,
        updatedAt: record.updatedAt,
      },
    });
  });
  return {
    read: () => record,
    calls,
    fail: (s: string) => {
      requestError = s;
    },
  };
}
async function open(page: Page) {
  const state = await mockedOnline(page);
  await page.goto("/#/phase1/setup");
  await expect(
    page.getByRole("heading", { name: "Start with your constitution." }),
  ).toBeVisible();
  return state;
}
async function team(page: Page) {
  await page
    .getByRole("button", { name: "Use fictional example", exact: true })
    .click();
  await expect(page.getByText(/✓ fictional-constitution.txt/)).toBeVisible();
  await page
    .getByRole("button", { name: "Let AI prepare my team", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A team that looks like yours." }),
  ).toBeVisible();
}
async function responsibilities(page: Page) {
  await team(page);
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Give every role a clear purpose." }),
  ).toBeVisible();
}
async function workflow(page: Page) {
  await responsibilities(page);
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await page
    .getByRole("button", { name: "Skip check for now", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "How your activities come together." }),
  ).toBeVisible();
  await expect(page.getByLabel("Step title plan")).toBeVisible();
}
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
test("source screen hides system prompts and supports source choices", async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByText(
      /View prompt|How should plans move forward|Describe your organization/,
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Paste text", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Upload constitution", { exact: true }),
  ).toHaveAttribute("accept", /\.pdf,\.docx/);
});
for (const ext of ["pdf", "docx", "txt"])
  test(`reads and archives real ${ext} document`, async ({ page }) => {
    const s = await open(page);
    await page
      .getByLabel("Upload constitution", { exact: true })
      .setInputFiles(`public/organization/fictional-constitution.${ext}`);
    await expect(
      page.getByText(`✓ fictional-constitution.${ext}`, { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    expect(s.read().draft.source?.archiveId).toBeTruthy();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
test("paste text is saved before the AI request", async ({ page }) => {
  const s = await open(page);
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page
    .getByLabel("Constitution text", { exact: true })
    .fill(
      "A fictional constitution. The President approves major plans. Marketing leads promotion.",
    );
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  await expect(
    page.getByText("✓ pasted-constitution.txt", { exact: true }),
  ).toBeVisible();
  expect(s.read().draft.source?.text).toContain("fictional constitution");
  expect(s.calls).toHaveLength(0);
});
test("departments come first, with editable colors and compact organization chart", async ({
  page,
}) => {
  const s = await open(page);
  await team(page);
  await expect(
    page.getByRole("tab", { name: "Departments", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("Department name marketing", { exact: true })
    .fill("Communications");
  await page
    .getByRole("tab", { name: "Organization chart", exact: true })
    .click();
  await expect(
    page.getByLabel("Role title marketing_intern", { exact: true }),
  ).toHaveValue("Marketing Intern");
  await expect(
    page.getByLabel("Department for Marketing Intern", { exact: true }),
  ).toContainText("Communications");
  await page
    .getByRole("button", { name: "+ Add a custom role", exact: true })
    .click();
  await page
    .getByLabel("Custom role title", { exact: true })
    .fill("Volunteer Director");
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  await expect
    .poll(() =>
      s.read().draft.roles.some((r) => r.title === "Volunteer Director"),
    )
    .toBe(true);
  expect(s.calls).toEqual(["constitution"]);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
test("responsibilities are editable role bullets and unchanged back/next uses zero calls", async ({
  page,
}) => {
  const s = await open(page);
  await responsibilities(page);
  await page
    .getByLabel("Duty 1 for President", { exact: true })
    .fill("Review major commitments with the board");
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByLabel("Duty 1 for President", { exact: true }),
  ).toHaveValue("Review major commitments with the board");
  expect(s.calls).toEqual(["constitution"]);
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue to your team", exact: true })
    .click();
  expect(s.calls).toEqual(["constitution"]);
});
test("check gate allows explicit skip and healthy AI check", async ({
  page,
}) => {
  const s = await open(page);
  await responsibilities(page);
  await expect(
    page.getByRole("button", { name: "Approve & continue", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Check responsibilities with AI",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("✓ Responsibility review complete.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve & continue", exact: true }),
  ).toBeEnabled();
  expect(s.calls).toEqual(["constitution", "risk_check"]);
});
test("AI proposes changes for approval, and no change is applied before approval", async ({
  page,
}) => {
  const s = await open(page);
  await team(page);
  await page
    .getByLabel("Ask Platypus about this setup", { exact: true })
    .fill("Rename the marketing position to VP of Communications");
  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Review proposed changes" }),
  ).toBeVisible();
  expect(s.read().draft.roles.find((r) => r.id === "marketing")?.title).toBe(
    "Vice President of Marketing",
  );
  await page
    .getByRole("button", { name: "Approve changes", exact: true })
    .click();
  await expect
    .poll(() => s.read().draft.roles.find((r) => r.id === "marketing")?.title)
    .toBe("VP of Communications");
  expect(s.read().draft.messages).toHaveLength(2);
});
test("activity workflow supports inline editing and preserves it after a small upstream edit", async ({
  page,
}, info) => {
  const s = await open(page);
  await workflow(page);
  await page
    .getByLabel("Step title plan", { exact: true })
    .fill("Create our custom activity plan");
  const count = s.calls.length;
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page
    .getByRole("tab", { name: "Leadership & Records", exact: true })
    .click();
  await page
    .getByLabel("Duty 1 for President", { exact: true })
    .fill("Review major invitations and commitments");
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await page
    .getByRole("button", { name: "Skip check for now", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(page.getByLabel("Step title plan", { exact: true })).toHaveValue(
    "Create our custom activity plan",
  );
  expect(s.calls).toHaveLength(count);
  await page.screenshot({
    path: `output/playwright/org-v3-workflow-${info.project.name}.png`,
    fullPage: true,
  });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
test("review shows entered settings and confirmation compiles data without another AI call", async ({
  page,
}, info) => {
  const s = await open(page);
  await workflow(page);
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your organization, ready." }),
  ).toBeVisible();
  await expect(page.getByText("Board work", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Vice President of Marketing", { exact: true }),
  ).toBeVisible();
  const count = s.calls.length;
  await page
    .getByRole("button", { name: "Confirm organization", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your organization is ready." }),
  ).toBeVisible();
  expect(s.read().approved?.compiled?.format).toBe("platypus.organization");
  expect(s.calls).toHaveLength(count);
  await page.screenshot({
    path: `output/playwright/org-v3-complete-${info.project.name}.png`,
    fullPage: true,
  });
});
test("invalid JSON keeps source data and allows a retry without a fake success", async ({
  page,
}) => {
  const s = await open(page);
  await page
    .getByRole("button", { name: "Use fictional example", exact: true })
    .click();
  s.fail(
    "AIR stopped before finishing the response (output limit). Your saved settings are safe.",
  );
  await page
    .getByRole("button", { name: "Let AI prepare my team", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("output limit");
  expect(s.read().draft.source?.archiveId).toBeTruthy();
  expect(s.read().draft.roles).toHaveLength(0);
  s.fail("");
  await page
    .getByRole("button", { name: "Let AI prepare my team", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A team that looks like yours." }),
  ).toBeVisible();
});
test("saved drafts resume after reload", async ({ page }) => {
  const s = await open(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Fictional Future Builders");
  await expect
    .poll(() => s.read().draft.name)
    .toBe("Fictional Future Builders");
  await page.reload();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Fictional Future Builders");
});
test("source screen is accessible and does not overflow", async ({
  page,
}, info) => {
  await open(page);
  const violations = (
    await new AxeBuilder({ page })
      .include(".v3-root")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
  ).violations.map((v) => ({
    id: v.id,
    targets: v.nodes.map((n) => n.target),
  }));
  expect(violations).toEqual([]);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `output/playwright/org-v3-source-${info.project.name}.png`,
    fullPage: true,
  });
});
