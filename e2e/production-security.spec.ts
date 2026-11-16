import { expect, test } from "@playwright/test";

test("Router 7 keeps existing pages and the funding alias working", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [path, title] of [["/", "Reminders"], ["/events", "Events"], ["/tasks", "Tasks"], ["/team", "Team"], ["/funding", "Events"], ["/handoff", "Handoff"], ["/partners", "Partners"], ["/rules", "Rules"], ["/settings", "Settings"], ["/help", "Help"]]) {
    await page.goto(`/#${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    if (path === "/funding") await expect(page).toHaveURL(/#\/events$/);
  }
  expect(errors).toEqual([]);
});

test("untrusted redirect parameters and unknown hashes stay inside the app", async ({ page, baseURL }) => {
  for (const hash of ["/funding?redirect=//outside.example", "/missing?next=https://outside.example", "/https://outside.example", "/%2F%2Foutside.example", "/%5C%5Coutside.example"]) {
    await page.goto(`/#${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(hash.startsWith("/funding") ? "Events" : "Reminders");
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    expect(new URL(page.url()).hash).toBe(hash.startsWith("/funding") ? "#/events" : "#/");
  }
});
