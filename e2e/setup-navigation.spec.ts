import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { clickCurve } from "./graph";
import { blankDraft } from "../src/organization/presets";
import { fixtureDraft } from "../src/organization/testing/fixtures";
import {
  upgrade,
  scopeKey,
  compileOrganization,
} from "../src/organization/setupLogic";
import type { Envelope, SetupDraft } from "../src/organization/schema";

function preparedDraft(): SetupDraft {
  const d = upgrade(fixtureDraft());
  d.memberFlow = {
    title: "Fictional purchasing workflow",
    explanation: "",
    raci: [],
    nodes: [
      {
        id: "items",
        title: "Confirm items",
        roleIds: ["president"],
        dependsOn: [],
        position: { x: 0, y: 0 },
        milestoneKey: "items" as const,
      },
      {
        id: "quotes",
        title: "Confirm quotes",
        roleIds: ["president"],
        dependsOn: ["items"],
        position: { x: 300, y: 0 },
        milestoneKey: "quotes" as const,
      },
      {
        id: "request",
        title: "Submit budget request",
        roleIds: ["president"],
        dependsOn: ["quotes"],
        position: { x: 600, y: 0 },
        milestoneKey: "budget_request" as const,
      },
      {
        id: "custom",
        title: "Custom fixed preparation",
        roleIds: ["president"],
        dependsOn: [],
        position: { x: 0, y: 260 },
        milestoneKey: "items" as const,
        timing: {
          offsetDays: 12,
          unit: "business" as const,
          source: "manual" as const,
        },
      },
    ].map((n) => ({
      ...n,
      description: "",
      actionIds: [],
      dependencyMode: "all",
      basis: "Fictional setup test",
    })),
  };
  d.riskCheck = {
    status: "skipped",
    inputKey: scopeKey(d, "risk_check"),
    risks: [],
    answers: {},
    at: "2026-10-26T12:00:00Z",
  };
  d.generated.constitution = scopeKey(d, "constitution");
  return d;
}
async function mockSetup(page: Page, draft: SetupDraft = blankDraft()) {
  let record: Envelope = {
    workspaceId: "setup-navigation-workspace",
    revision: 1,
    draft,
    approved: null,
    updatedAt: "2026-10-26T12:00:00Z",
    expiresAt: "2026-11-01T12:00:00Z",
  };
  const calls: unknown[] = [];
  await page.route("**/api/workspace", async (route) => {
    const d = upgrade(record.draft);
    await route.fulfill({
      json: {
        demo: true,
        setupRevision: record.revision,
        state: {
          schemaVersion: 1,
          workspaceId: record.workspaceId,
          revision: 1,
          actorId: "demo-president",
          members: [
            {
              id: "demo-president",
              name: "Fictional President",
              roleIds: ["president"],
              access: "manager",
            },
          ],
          workItems: [],
          updatedAt: record.updatedAt,
        },
        organization: {
          name: d.name,
          mission: d.mission,
          roles: d.roles,
          departments: d.departments,
          contextVersion: d.contextVersion,
          timingDefaults: d.timingDefaults ?? {
            itemsWeeks: 8,
            quotesWeeks: 7,
            budgetWeeks: 6,
          },
        },
      },
    });
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
          json: { message: "A newer online version is available." },
        });
        return;
      }
      record = { ...record, revision: record.revision + 1, draft: b.draft };
      if (b.action === "confirm") {
        record.draft.compiled = compileOrganization(record.draft);
        record.draft.confirmed = true;
        record.approved = structuredClone(record.draft);
      }
    }
    await route.fulfill({ json: record });
  });
  await page.route("**/api/org/archive**", async (route) => {
    await route.fulfill({
      json:
        route.request().method() === "GET"
          ? {
              uploads: [
                {
                  id: "f9c1e410-658e-4d56-b635-81077b9f98f2",
                  fileName: "fictional-constitution.txt",
                  createdAt: record.updatedAt,
                  complete: true,
                },
              ],
              eventIds: [],
            }
          : { saved: true },
    });
  });
  await page.route("**/api/workspace/assistant**", async (route) => {
    calls.push({
      url: route.request().url(),
      method: route.request().method(),
    });
    await route.fulfill({
      status: 503,
      json: {
        message: "This offline navigation check must not generate AI content.",
      },
    });
  });
  await page.route("**/api/org/ai**", async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      json: {
        message: "This offline navigation check must not generate AI content.",
      },
    });
  });
  await page.goto("/#/phase1/setup");
  await expect(
    page.getByRole("navigation", {
      name: "Organization setup progress",
      exact: true,
    }),
  ).toBeVisible();
  return {
    read: () => record,
    calls,
    replace: (draft: SetupDraft) => {
      record = { ...record, revision: record.revision + 1, draft };
    },
  };
}
async function chapter(page: Page, name: string) {
  await page
    .getByRole("navigation", {
      name: "Organization setup progress",
      exact: true,
    })
    .getByRole("button", { name: new RegExp(name) })
    .click();
}

test("all five chapters can be visited before generating data, with explicit empty states and zero AI calls", async ({
  page,
}) => {
  const s = await mockSetup(page);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Saved before chapter navigation");
  await chapter(page, "Your team");
  await expect(
    page.getByText(
      "Prepare your team from Constitution, or add your departments and roles here.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect
    .poll(() => s.read().draft.name)
    .toBe("Saved before chapter navigation");
  await chapter(page, "Responsibilities");
  await expect(
    page.getByText(
      "Prepare your team before reviewing responsibilities. Your other settings stay saved.",
      { exact: true },
    ),
  ).toBeVisible();
  await chapter(page, "Activity workflow");
  await expect(
    page.getByLabel("Confirm items weeks before activity", { exact: true }),
  ).toHaveValue("8");
  await expect(
    page.getByLabel("Confirm quotes weeks before activity", { exact: true }),
  ).toHaveValue("7");
  await expect(
    page.getByLabel("Submit budget request weeks before activity", {
      exact: true,
    }),
  ).toHaveValue("6");
  await chapter(page, "Review");
  await expect(
    page.getByText(
      "Your setup is not complete yet. Prepare the team and activity workflow before confirming; you can visit any chapter.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm organization", exact: true }),
  ).toBeDisabled();
  await chapter(page, "Constitution");
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Saved before chapter navigation");
  expect(s.calls).toHaveLength(0);
});

test("timing defaults persist across free navigation and only update applicable non-manual node targets", async ({
  page,
}) => {
  const s = await mockSetup(page, preparedDraft());
  await chapter(page, "Activity workflow");
  await page
    .getByLabel("Confirm items weeks before activity", { exact: true })
    .fill("9");
  await expect.poll(() => s.read().draft.timingDefaults?.itemsWeeks).toBe(9);
  const flow = () => s.read().draft.memberFlow!;
  expect(flow().nodes.find((n) => n.id === "items")?.timing).toEqual({
    offsetDays: 63,
    unit: "calendar",
    source: "organization-default",
  });
  expect(flow().nodes.find((n) => n.id === "custom")?.timing).toEqual({
    offsetDays: 12,
    unit: "business",
    source: "manual",
  });
  await expect(
    page
      .locator('[data-node-id="items"]')
      .getByText("63 days before activity", { exact: true }),
  ).toBeVisible();
  await chapter(page, "Your team");
  await chapter(page, "Activity workflow");
  await expect(
    page.getByLabel("Confirm items weeks before activity", { exact: true }),
  ).toHaveValue("9");
  await page
    .getByRole("button", { name: "Restore timing defaults", exact: true })
    .click();
  await expect
    .poll(() => s.read().draft.timingDefaults)
    .toEqual({ itemsWeeks: 8, quotesWeeks: 7, budgetWeeks: 6 });
  expect(flow().nodes.find((n) => n.id === "custom")?.timing?.offsetDays).toBe(
    12,
  );
  expect(s.calls).toHaveLength(0);
});

test("relative timing is ordered around activity day and distinguishes defaults from actual steps", async ({
  page,
}) => {
  const d = preparedDraft();
  d.memberFlow!.nodes.push({
    ...d.memberFlow!.nodes[3],
    id: "followup",
    title: "Send follow-up",
    milestoneKey: undefined,
    timing: { offsetDays: -2, unit: "calendar", source: "manual" },
  });
  await mockSetup(page, d);
  await chapter(page, "Activity workflow");
  const band = page.getByRole("region", {
    name: "Workflow relative timing",
    exact: true,
  });
  await expect(band.locator("li b")).toHaveText([
    "Confirm items",
    "Confirm quotes",
    "Submit budget request",
    "Custom fixed preparation",
    "Activity day",
    "Send follow-up",
  ]);
  await band
    .getByRole("button", { name: "Confirm quotes 49 days before", exact: true })
    .click();
  await expect(page.locator('[data-node-id="quotes"]')).toBeInViewport();
  await expect(band.getByText(/Default funding timing/)).toHaveCount(0);
});

test("an activity without purchasing steps displays funding defaults as guidance only", async ({
  page,
}) => {
  const d = preparedDraft();
  d.memberFlow!.nodes = [
    {
      ...d.memberFlow!.nodes[0],
      title: "Welcome members",
      milestoneKey: undefined,
    },
  ];
  const s = await mockSetup(page, d);
  await chapter(page, "Activity workflow");
  const band = page.getByRole("region", {
    name: "Workflow relative timing",
    exact: true,
  });
  await expect(band).toContainText(
    "Default funding timing · when funding is needed",
  );
  await expect(band.locator("li b")).toHaveText([
    "Confirm items",
    "Confirm quotes",
    "Submit budget request",
    "Activity day",
  ]);
  await expect(band.getByRole("button")).toHaveCount(0);
  expect(s.read().draft.memberFlow!.nodes).toHaveLength(1);
});

test("affected steps are reviewed together while node-level review and dependency mode controls stay hidden", async ({
  page,
}) => {
  const d = preparedDraft();
  d.memberFlow!.nodes[0].needsReview = true;
  d.memberFlow!.nodes[1].needsReview = true;
  const s = await mockSetup(page, d);
  await chapter(page, "Activity workflow");
  await expect(page.getByText("Connections", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Mark reviewed/)).toHaveCount(0);
  await expect(page.getByLabel(/Join rule/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Approve & continue", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Review affected changes", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Review affected changes",
    exact: true,
  });
  await expect(
    dialog.getByRole("button", {
      name: "Confirm reviewed changes",
      exact: true,
    }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").nth(0).check();
  await dialog.getByRole("checkbox").nth(1).check();
  await dialog
    .getByRole("button", { name: "Confirm reviewed changes", exact: true })
    .click();
  await expect
    .poll(() => s.read().draft.memberFlow!.nodes.some((n) => n.needsReview))
    .toBe(false);
  await expect(
    page.getByRole("button", { name: "Approve & continue", exact: true }),
  ).toBeEnabled();
  expect(s.calls).toHaveLength(0);
});

test("selected curve deletion has an undo that retains unrelated node edits, with a touch and keyboard alternative", async ({
  page,
}, info) => {
  const s = await mockSetup(page, preparedDraft());
  await chapter(page, "Activity workflow");
  if (info.project.name.startsWith("desktop")) {
    await clickCurve(
      page.locator('.react-flow__edge[data-id="items-quotes"]'),
    );
    await page
      .getByRole("button", { name: "Delete selected link", exact: true })
      .click();
  } else {
    await page
      .getByText("Edit links with keyboard or touch", { exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Delete link from Confirm items to Confirm quotes",
        exact: true,
      })
      .click();
    await page
      .getByText("Edit links with keyboard or touch", { exact: true })
      .click();
  }
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "quotes")!
          .dependsOn,
    )
    .toEqual([]);
  await page
    .getByLabel("Step title items", { exact: true })
    .fill("Approved item selection");
  await page
    .getByRole("button", { name: "Undo link deletion", exact: true })
    .click();
  await expect
    .poll(
      () =>
        s.read().draft.memberFlow!.nodes.find((n) => n.id === "quotes")!
          .dependsOn,
    )
    .toEqual(["items"]);
  expect(
    s.read().draft.memberFlow!.nodes.find((n) => n.id === "items")!.title,
  ).toBe("Approved item selection");
  await page
    .getByText("Edit links with keyboard or touch", { exact: true })
    .click();
  await page.getByLabel("Link from", { exact: true }).selectOption("request");
  await page.getByLabel("Link to", { exact: true }).selectOption("items");
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("loop");
  expect(
    s.read().draft.memberFlow!.nodes.find((n) => n.id === "items")!.dependsOn,
  ).toEqual([]);
});

test("chapter navigation retains unsaved member input when this device cannot protect it", async ({
  page,
}) => {
  const s = await mockSetup(page, preparedDraft());
  await chapter(page, "Your team");
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("platypus.member-input."))
        throw new DOMException("Storage full", "QuotaExceededError");
      write.call(this, key, value);
    };
  });
  await page
    .getByLabel("Fictional member name", { exact: true })
    .fill("Fictional unsaved member");
  await page.getByRole("button", { name: /^1 Constitution$/ }).click();
  await expect(
    page.getByLabel("Fictional member name", { exact: true }),
  ).toHaveValue("Fictional unsaved member");
  await expect(
    page.getByText(
      "Save or copy this member input before leaving; this device could not protect it.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(s.read().draft.step).toBe(1);
});

test("original files are discoverable as Organization documents inside Constitution", async ({
  page,
}) => {
  await mockSetup(page);
  await expect(
    page.getByRole("button", { name: "Files", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "View organization documents", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Organization documents", exact: true }),
  ).toContainText("fictional-constitution.txt");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await chapter(page, "Your team");
  await expect(
    page.getByRole("button", {
      name: "View organization documents",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("freely clickable chapters, timing and link actions remain accessible", async ({
  page,
}) => {
  await mockSetup(page, preparedDraft());
  await chapter(page, "Activity workflow");
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
