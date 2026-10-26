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
  let saveFailure = 0;
  let saveDelay = 0;
  const saves: string[] = [];
  const responses: Partial<Record<Stage, unknown>> = {};
  const requests: {
    stage: Stage;
    selection?: unknown;
    instruction?: string;
    requestId?: string;
  }[] = [];
  const uploads = new Map<string, unknown>();
  await page.route("**/api/org/archive**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: route.request().url().includes("action=history")
          ? {
              versions: [
                {
                  revision: 1,
                  at: record.updatedAt,
                  organization: { name: "Earlier fictional organization" },
                  departments: [],
                  roles: [],
                  workflow: null,
                },
              ],
            }
          : { eventIds: [], uploads: [] },
      });
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
      saves.push(b.action);
      if (saveDelay)
        await new Promise((resolve) => setTimeout(resolve, saveDelay));
      if (saveFailure) {
        await route.fulfill({
          status: saveFailure,
          json: {
            message:
              saveFailure === 409
                ? "Stale revision"
                : "Save service unavailable",
          },
        });
        return;
      }
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
    requests.push(b);
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
    if (Object.prototype.hasOwnProperty.call(responses, b.stage))
      data = responses[b.stage as Stage];
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
    requests,
    saves,
    delaySave: (ms: number) => {
      saveDelay = ms;
    },
    respond: (stage: Stage, data: unknown) => {
      responses[stage] = data;
    },
    failSave: (status: number) => {
      saveFailure = status;
    },
    advance: (name: string) => {
      record = {
        ...record,
        revision: record.revision + 1,
        draft: { ...record.draft, name },
      };
    },
    approve: (name: string) => {
      record = {
        ...record,
        revision: record.revision + 1,
        draft: { ...record.draft, name, confirmed: true },
      };
      record.approved = structuredClone(record.draft);
    },
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
    await expect.poll(() => s.read().draft.source?.archiveId).toBeTruthy();
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

test("a manual graph edit preserves a preceding AI clarification conversation", async ({
  page,
}) => {
  const s = await open(page);
  await team(page);
  await page
    .getByRole("tab", { name: "Organization chart", exact: true })
    .click();
  s.respond("edit", {
    message: "Please clarify.",
    question: "Which responsibilities should move?",
    changes: [],
  });
  await page
    .getByLabel("Ask Platypus about this setup", { exact: true })
    .fill("Move these responsibilities");
  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(
    page.getByText("Which responsibilities should move?", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Role title president", { exact: true })
    .fill("Club President");
  await expect
    .poll(() => s.read().draft.roles.find((r) => r.id === "president")!.title)
    .toBe("Club President");
  expect(s.read().draft.messages).toHaveLength(2);
  expect(s.read().draft.messages![1].text).toBe(
    "Which responsibilities should move?",
  );
  await expect(
    page.getByText("Which responsibilities should move?", { exact: true }),
  ).toBeVisible();
});

test("Next position updates the assistant's selected role before a direct request", async ({
  page,
}) => {
  const s = await open(page);
  await responsibilities(page);
  await page.getByLabel("Duty 1 for President", { exact: true }).click();
  await page
    .getByRole("button", { name: "Next position →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Vice President of Professional Development",
      exact: true,
    }),
  ).toBeVisible();
  s.respond("edit", {
    message: "Please clarify.",
    question: "Which duty needs a change?",
    changes: [],
  });
  await page
    .getByLabel("Ask Platypus about this setup", { exact: true })
    .fill("Adjust this role's duties");
  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(
    page.getByText("Which duty needs a change?", { exact: true }),
  ).toBeVisible();
  expect(
    s.requests.filter((r) => r.stage === "edit").at(-1)!.selection,
  ).toEqual({
    screen: "responsibilities",
    entityType: "role",
    entityId: "programs",
  });
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
  await expect(page.getByRole("navigation", { name: "Organization setup progress" }).getByText("Board work", { exact: true })).toHaveCount(0);
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
  const saves = s.saves.length;
  await page
    .getByRole("link", { name: "Go to workspace →", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/phase1$/);
  expect(s.read().draft.confirmed).toBe(true);
  expect(s.saves).toHaveLength(saves);
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

test("leaving within the autosave delay saves the full draft before Home", async ({
  page,
}) => {
  const s = await open(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Immediate local edit");
  await page.getByRole("link", { name: "← Home", exact: true }).click();
  await expect(page).toHaveURL(/#\/phase1$/);
  expect(s.read().draft.name).toBe("Immediate local edit");
});

test("real browser Back and Forward wait for pending edits", async ({
  page,
}) => {
  const s = await mockedOnline(page);
  await page.goto("/#/phase1");
  await page.getByRole("link", { name: "Organization setup", exact: true }).click();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Saved before browser Back");
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/#\/phase1$/);
  await expect(page.getByRole("heading", { name: "Confirm your organization", exact: true })).toBeVisible();
  expect(s.read().draft.name).toBe("Saved before browser Back");
  await page.evaluate(() => window.history.forward());
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Saved before browser Back");
});

test("real browser Back stays in setup when saving fails", async ({ page }) => {
  const s = await mockedOnline(page);
  await page.goto("/#/phase1");
  await page.getByRole("link", { name: "Organization setup", exact: true }).click();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toBeVisible();
  s.failSave(503);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Keep this local edit after Back");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("alert")).toContainText(
    "Save service unavailable",
  );
  await expect(page).toHaveURL(/#\/phase1\/setup$/);
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Keep this local edit after Back");
});

test("consecutive browser Back gestures cannot bypass the pending save", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Extra desktop history entries use the sidebar; Back/Forward is tested on both sizes.",
  );
  const s = await mockedOnline(page);
  await page.goto("/#/phase1");
  await page
    .getByRole("link", { name: "Activity workflow", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Organization setup", exact: true })
    .click();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toBeVisible();
  s.delaySave(250);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Keep pending consecutive Back edits");
  await page.evaluate(() => {
    window.history.back();
    setTimeout(() => window.history.back(), 20);
  });
  await expect(page).toHaveURL(/#\/phase1\/activity\/member$/);
  await expect(page.getByRole("heading", { name: "Confirm your organization", exact: true })).toBeVisible();
  expect(s.read().draft.name).toBe("Keep pending consecutive Back edits");
});

test("a failed navigation save stays in setup and restores the local copy after reload", async ({
  page,
}) => {
  const s = await open(page);
  s.failSave(503);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Recovered after failed save");
  await page.getByRole("link", { name: "← Home", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Save service unavailable",
  );
  await expect(page).toHaveURL(/#\/phase1\/setup$/);
  expect(s.read().draft.name).not.toBe("Recovered after failed save");
  page.on("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Recovered after failed save");
  s.failSave(0);
  await page.getByRole("link", { name: "← Home", exact: true }).click();
  await expect(page).toHaveURL(/#\/phase1$/);
  expect(s.read().draft.name).toBe("Recovered after failed save");
});

test("a conflicting online revision is never silently replaced on refresh", async ({
  page,
}) => {
  const s = await open(page);
  s.advance("Newer online organization");
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("My local organization");
  await page.getByRole("link", { name: "← Home", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Resolve saved versions" }),
  ).toBeVisible();
  expect(s.read().draft.name).toBe("Newer online organization");
  page.on("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Newer online organization");
  await expect(
    page.getByRole("button", { name: "Restore my local copy", exact: true }),
  ).toBeVisible();
  expect(s.read().draft.name).toBe("Newer online organization");
  await page
    .getByRole("button", { name: "Restore my local copy", exact: true })
    .click();
  await expect.poll(() => s.read().draft.name).toBe("My local organization");
});

for (const restore of [true, false])
  test(`local recovery against a confirmed online version ${restore ? "returns to editing" : "keeps the confirmed screen"}`, async ({
    page,
  }) => {
    const s = await open(page);
    s.failSave(503);
    await page
      .getByLabel("Organization name", { exact: true })
      .fill("Unconfirmed local draft");
    await page.getByRole("link", { name: "← Home", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Save service unavailable",
    );
    s.failSave(0);
    s.approve("Confirmed online version");
    page.on("dialog", (dialog) => void dialog.accept());
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Your organization is ready.",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: restore ? "Restore my local copy" : "Use latest online version",
        exact: true,
      })
      .click();
    if (restore) {
      await expect(
        page.getByLabel("Organization name", { exact: true }),
      ).toHaveValue("Unconfirmed local draft");
      await expect.poll(() => s.read().draft.confirmed).toBe(false);
    } else {
      await expect(
        page.getByRole("region", { name: "Resolve saved versions" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: "Your organization is ready.",
          exact: true,
        }),
      ).toBeVisible();
      expect(s.read().draft.confirmed).toBe(true);
    }
  });

test("unsent assistant and new-role inputs survive a reload", async ({
  page,
}) => {
  await open(page);
  await team(page);
  await page
    .getByLabel("Ask Platypus about this setup", { exact: true })
    .fill("Please keep my unsent instruction");
  await page
    .getByRole("button", { name: "+ Add a custom role", exact: true })
    .click();
  await page
    .getByLabel("Custom role title", { exact: true })
    .fill("Unfinished Volunteer Director");
  page.on("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByLabel("Custom role title", { exact: true }),
  ).toHaveValue("Unfinished Volunteer Director");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByLabel("Ask Platypus about this setup", { exact: true }),
  ).toHaveValue("Please keep my unsent instruction");
});

test("automatic healthy checks are cached when revisiting Check", async ({
  page,
}) => {
  const s = await open(page);
  await responsibilities(page);
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await expect(
    page.getByText("✓ Responsibility review complete.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Leadership & Records", exact: true })
    .click();
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await expect(
    page.getByText("✓ Responsibility review complete.", { exact: true }),
  ).toBeVisible();
  expect(s.calls.filter((stage) => stage === "risk_check")).toHaveLength(1);
});

test("entering Check still allows an explicit skip before any AI request", async ({
  page,
}) => {
  const s = await open(page);
  await responsibilities(page);
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await expect(
    page.getByText("The check starts shortly. You can skip before it begins.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Skip check for now", exact: true })
    .click();
  await expect(
    page.getByText("✓ Check skipped by you.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Leadership & Records", exact: true })
    .click();
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  expect(s.calls.filter((stage) => stage === "risk_check")).toHaveLength(0);
});

test("multiple risk cards preserve custom instructions and apply fixes only after final approval", async ({
  page,
}) => {
  const s = await open(page);
  await responsibilities(page);
  const original = s
    .read()
    .draft.roles.find((r) => r.id === "president")!.responsibilities;
  const change = (duties: string[]) => ({
    entity: "role",
    id: "president",
    operation: "set",
    field: "responsibilities",
    value: duties,
  });
  s.respond("risk_check", {
    risks: [
      {
        id: "budget",
        title: "Budget decision ownership",
        explanation: "A major commitment needs clear authority.",
        roleIds: ["president"],
        options: [
          {
            id: "board",
            label: "President approves major commitments",
            changes: [change([...original, "Approve major commitments"])],
          },
          {
            id: "review",
            label: "President coordinates board review",
            changes: [change([...original, "Coordinate board review"])],
          },
        ],
      },
      {
        id: "records",
        title: "Decision records ownership",
        explanation: "A major decision needs a durable record.",
        roleIds: ["president"],
        options: [
          {
            id: "owner",
            label: "President keeps decision records",
            changes: [change([...original, "Keep decision records"])],
          },
          {
            id: "delegate",
            label: "President delegates decision records",
            changes: [change([...original, "Delegate decision records"])],
          },
        ],
      },
    ],
  });
  await page.getByRole("tab", { name: "✓ Check", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Budget decision ownership",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Custom risk instruction", { exact: true })
    .fill("Keep the whole board informed of large commitments");
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  await page
    .getByLabel("Custom risk instruction", { exact: true })
    .fill("Retain these separate records instructions");
  await page
    .getByRole("button", { name: "Previous question", exact: true })
    .click();
  await expect(
    page.getByLabel("Custom risk instruction", { exact: true }),
  ).toHaveValue("Keep the whole board informed of large commitments");
  s.respond("edit", {
    message: "Use your specific board instruction.",
    question: null,
    changes: [
      change([...original, "Keep board informed of large commitments"]),
    ],
  });
  await page
    .getByRole("button", { name: "Ask AI for this fix", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Decision records ownership",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Custom risk instruction", { exact: true }),
  ).toHaveValue("Retain these separate records instructions");
  await page
    .getByRole("button", {
      name: "President keeps decision records",
      exact: true,
    })
    .click();
  expect(
    s.read().draft.roles.find((r) => r.id === "president")!.responsibilities,
  ).toEqual(original);
  await page
    .getByRole("button", { name: "Review selected fixes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve changes", exact: true })
    .click();
  await expect(
    page.getByText("✓ Responsibility review complete.", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        s.read().draft.roles.find((r) => r.id === "president")!
          .responsibilities,
    )
    .toEqual([
      ...original,
      "Keep board informed of large commitments",
      "Keep decision records",
    ]);
});

test("workflow selection and a chosen historical revision reach a reviewable AI proposal", async ({
  page,
}) => {
  const s = await open(page);
  await workflow(page);
  await page.getByLabel("Step title plan", { exact: true }).click();
  await page
    .getByRole("button", { name: "View configuration history", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use this version", exact: true })
    .click();
  await page
    .getByLabel("Ask Platypus about this setup", { exact: true })
    .fill("Restore the selected step title");
  s.respond("edit", {
    message: "Proposed restoration only.",
    question: null,
    changes: [
      {
        entity: "node",
        id: "plan",
        operation: "set",
        field: "title",
        value: "Earlier reviewed title",
      },
    ],
  });
  await page.getByRole("button", { name: "Send →", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Review proposed changes", exact: true }),
  ).toBeVisible();
  const request = s.requests.filter((r) => r.stage === "edit").at(-1)!;
  expect(request.selection).toEqual({
    screen: "workflow",
    entityType: "node",
    entityId: "plan",
  });
  expect(request.instruction).toBe(
    "Use history revision 1: Restore the selected step title",
  );
  expect(request.requestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(
    s.read().draft.memberFlow!.nodes.find((n) => n.id === "plan")!.title,
  ).not.toBe("Earlier reviewed title");
  await page
    .getByRole("button", { name: "Approve changes", exact: true })
    .click();
  await expect(page.getByLabel("Step title plan", { exact: true })).toHaveValue(
    "Earlier reviewed title",
  );
});

const compactFlow = () => ({
  title: "Compact fictional activity",
  explanation: "A small flow for exercising actual graph controls.",
  raci: [],
  nodes: [
    {
      id: "plan",
      title: "Plan activity",
      position: { x: 0, y: 0 },
      dependsOn: [],
    },
    {
      id: "prepare",
      title: "Prepare activity",
      position: { x: 300, y: 0 },
      dependsOn: ["plan"],
    },
    {
      id: "run",
      title: "Run activity",
      position: { x: 300, y: 260 },
      dependsOn: [],
    },
  ].map((n) => ({
    ...n,
    description: "",
    actionIds: [],
    roleIds: ["president"],
    dependencyMode: "all",
    basis: "Fictional test setup",
  })),
});

async function dragBetween(
  page: Page,
  from: ReturnType<Page["locator"]>,
  to: ReturnType<Page["locator"]>,
) {
  const a = await from.boundingBox(),
    b = await to.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, {
    steps: 20,
  });
  await page.mouse.up();
}

test("actual curve connections can be added, deleted, reconnected and reject loops", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Mouse connection gestures are checked on desktop; accessible connections are checked on both sizes.",
  );
  const s = await open(page);
  s.respond("member_workflow", compactFlow());
  await workflow(page);
  const graph = page.getByLabel("Editable activity workflow", { exact: true });
  const node = (id: string) =>
    graph.locator(`.react-flow__node[data-id="${id}"]`);
  await dragBetween(
    page,
    node("plan").locator(".react-flow__handle.source"),
    node("run").locator(".react-flow__handle.target"),
  );
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "run")!.dependsOn,
    )
    .toEqual(["plan"]);
  const edge = graph.locator('.react-flow__edge[data-id="plan-run"]');
  await expect(edge).toHaveCount(1);
  expect(
    await edge.locator("path.react-flow__edge-path").getAttribute("d"),
  ).toContain("C");
  await edge.click({ force: true });
  await page.keyboard.press("Delete");
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "run")!.dependsOn,
    )
    .toEqual([]);
  const original = graph.locator('.react-flow__edge[data-id="plan-prepare"]');
  await original.click({ force: true });
  await dragBetween(
    page,
    original.locator(".react-flow__edgeupdater-target"),
    node("run").locator(".react-flow__handle.target"),
  );
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "run")!.dependsOn,
    )
    .toEqual(["plan"]);
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "prepare")!
          .dependsOn,
    )
    .toEqual([]);
  await dragBetween(
    page,
    node("run").locator(".react-flow__handle.source"),
    node("plan").locator(".react-flow__handle.target"),
  );
  await expect(page.getByRole("alert")).toContainText("loop");
  expect(
    s.read().draft.memberFlow!.nodes.find((n) => n.id === "plan")!.dependsOn,
  ).toEqual([]);
});

test("inline owners, accessible dependencies and node addition work at both sizes", async ({
  page,
}) => {
  const s = await open(page);
  s.respond("member_workflow", compactFlow());
  await workflow(page);
  const node = page.locator('.react-flow__node[data-id="plan"]');
  await node.locator("summary").filter({ hasText: "President" }).click();
  await node
    .getByRole("checkbox", { name: "Vice President of Marketing", exact: true })
    .check();
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "plan")!.roleIds,
    )
    .toEqual(["president", "marketing"]);
  await node.locator("summary").filter({ hasText: "President" }).click();
  await node.getByText("Connections", { exact: true }).click();
  await node
    .getByRole("checkbox", {
      name: "Plan activity follows Run activity",
      exact: true,
    })
    .check();
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "plan")!
          .dependsOn,
    )
    .toEqual(["run"]);
  await node
    .getByRole("checkbox", {
      name: "Plan activity follows Run activity",
      exact: true,
    })
    .uncheck();
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "plan")!
          .dependsOn,
    )
    .toEqual([]);
  await node.getByText("Connections", { exact: true }).click();
  await page
    .getByRole("button", { name: "Add step after Plan activity", exact: true })
    .click();
  await expect.poll(() => s.read().draft.memberFlow!.nodes.length).toBe(4);
  const added = s
    .read()
    .draft.memberFlow!.nodes.find((n) => n.title === "New step")!;
  expect(added.dependsOn).toEqual(["plan"]);
  expect(
    s.read().draft.memberFlow!.nodes.find((n) => n.id === "prepare")!.dependsOn,
  ).toEqual([added.id]);
});

test("organization reporting lines retain manual decisions after real drag, reconnect and deletion", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Desktop pointer gestures; selects remain available on phones.",
  );
  const s = await open(page);
  const d = upgrade(fixtureDraft());
  s.respond("constitution", {
    name: d.name,
    mission: d.mission,
    departments: d.departments,
    roles: d.roles.filter((r) =>
      ["president", "marketing", "marketing_intern"].includes(r.id),
    ),
    uncertainties: [],
  });
  await team(page);
  await page
    .getByRole("tab", { name: "Organization chart", exact: true })
    .click();
  const graph = page.getByLabel("Editable organization chart", { exact: true });
  const node = (id: string) =>
    graph.locator(`.react-flow__node[data-id="${id}"]`);
  const from = await node("marketing_intern").boundingBox(),
    to = await node("marketing").boundingBox();
  await page.mouse.move(from!.x + 90, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(to!.x + 90, to!.y + 10, { steps: 20 });
  await page.mouse.up();
  await expect
    .poll(
      () =>
        s.read().draft.roles.find((r) => r.id === "marketing_intern")!
          .parentRoleId,
    )
    .toBe("marketing");
  expect(
    s.read().draft.roles.find((r) => r.id === "marketing_intern")!.manualFields,
  ).toContain("parentRoleId");
  const edge = graph.locator(
    '.react-flow__edge[data-id="marketing-marketing_intern"]',
  );
  await edge.click({ force: true });
  await dragBetween(
    page,
    edge.locator(".react-flow__edgeupdater-source"),
    node("president").locator(".react-flow__handle.source"),
  );
  await expect
    .poll(
      () =>
        s.read().draft.roles.find((r) => r.id === "marketing_intern")!
          .parentRoleId,
    )
    .toBe("president");
  await graph
    .locator('.react-flow__edge[data-id="president-marketing_intern"]')
    .click({ force: true });
  await page.keyboard.press("Delete");
  await expect
    .poll(
      () =>
        s.read().draft.roles.find((r) => r.id === "marketing_intern")!
          .parentRoleId,
    )
    .toBe(null);
  expect(
    s.read().draft.roles.find((r) => r.id === "marketing_intern")!.manualFields,
  ).toContain("parentRoleId");
});

test("team, responsibilities and activity editor have no serious accessibility violations", async ({
  page,
}) => {
  const s = await open(page);
  s.respond("member_workflow", compactFlow());
  await team(page);
  const check = async () => {
    const result = await new AxeBuilder({ page })
      .include(".v3-root")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  await page
    .getByRole("tab", { name: "Organization chart", exact: true })
    .click();
  await check();
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await check();
  await page
    .getByRole("button", { name: "Skip check for now", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve & continue", exact: true })
    .click();
  await expect(
    page.getByLabel("Step title plan", { exact: true }),
  ).toBeVisible();
  await check();
});

test("direct hash navigation saves before leaving setup", async ({ page }) => {
  const s = await open(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Saved before a direct hash change");
  await page.evaluate(() => {
    window.location.hash = "/phase1";
  });
  await expect(page).toHaveURL(/#\/phase1$/);
  expect(s.read().draft.name).toBe("Saved before a direct hash change");
});

test("failed direct hash navigation keeps the current setup and edits", async ({
  page,
}) => {
  const s = await open(page);
  s.failSave(503);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Keep edits after a failed hash change");
  await page.evaluate(() => {
    window.location.hash = "/phase1";
  });
  await expect(page.getByRole("alert")).toContainText(
    "Save service unavailable",
  );
  await expect(page).toHaveURL(/#\/phase1\/setup$/);
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Keep edits after a failed hash change");
});

test("unsent inputs cannot be lost through Home when local recovery storage is unavailable", async ({
  page,
}) => {
  await open(page);
  await team(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("platypus_org_recovery_v1_"))
        throw new DOMException(
          "Recovery storage quota exceeded",
          "QuotaExceededError",
        );
      return original.call(this, key, value);
    };
  });
  await page
    .getByLabel("Ask Platypus about this setup", { exact: true })
    .fill("Keep this unsent instruction when storage is unavailable");
  await page.getByRole("link", { name: "← Home", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your unsent form inputs could not be saved",
  );
  await expect(page).toHaveURL(/#\/phase1\/setup$/);
  await expect(
    page.getByLabel("Ask Platypus about this setup", { exact: true }),
  ).toHaveValue("Keep this unsent instruction when storage is unavailable");
});

test("local recovery storage failure does not trap an online-saved draft with no unsent inputs", async ({
  page,
}) => {
  const s = await open(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Saved online despite local quota");
  await expect
    .poll(() => s.read().draft.name)
    .toBe("Saved online despite local quota");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("platypus_org_recovery_v1_"))
        throw new DOMException(
          "Recovery storage quota exceeded",
          "QuotaExceededError",
        );
      return original.call(this, key, value);
    };
  });
  await page.getByRole("link", { name: "← Home", exact: true }).click();
  await expect(page).toHaveURL(/#\/phase1$/);
  expect(s.read().draft.name).toBe("Saved online despite local quota");
});
