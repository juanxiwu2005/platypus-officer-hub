// Keep test configuration and failure explanations in English; use PW_* variables for local overrides.
import { defineConfig, devices } from "@playwright/test"

// Several git worktrees can run tests at the same time: give each its own ports (docs/design-upgrade/README.md).
const PORT = process.env.PW_PORT || "4173"
const launch = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // PW_CHROMIUM lets a machine with a preinstalled Chromium run the suite without downloading browsers.
  // Motion is tested by the dx-*.spec.ts files, which switch it back on; every other spec runs with Reduce Motion so animations never make it flaky.
  use: { baseURL: `http://localhost:${PORT}`, reducedMotion: "reduce", trace: "retain-on-failure", ...launch },
  webServer: { command: "npm run preview", url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
