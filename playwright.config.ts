import { defineConfig, devices } from "@playwright/test"

// Server storage (Organization Setup, Activity workspace) is hidden unless the site is built with
// ORG_SETUP_ENABLED=true. The normal projects test the shipped, hidden build. The specs below need
// the storage screens, so they run against a second build with the switch on (their API is mocked).
const STORAGE_SPECS = /(organization-setup|setup-navigation|activity-workspace|approved-workspace)\.spec\.ts$/
const launch = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // PW_CHROMIUM lets a machine with a preinstalled Chromium run the suite without downloading browsers.
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure", ...launch },
  webServer: [
    { command: "npm run preview", url: "http://localhost:4173", reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: "ORG_SETUP_ENABLED=true npx vite build --outDir dist-storage && npx vite preview --outDir dist-storage --port 4174 --strictPort", url: "http://localhost:4174", reuseExistingServer: !process.env.CI, timeout: 180_000 },
  ],
  projects: [
    { name: "desktop", testIgnore: STORAGE_SPECS, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testIgnore: STORAGE_SPECS, use: { ...devices["Pixel 7"] } },
    { name: "desktop-storage", testMatch: STORAGE_SPECS, use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4174" } },
    { name: "mobile-storage", testMatch: STORAGE_SPECS, use: { ...devices["Pixel 7"], baseURL: "http://localhost:4174" } },
  ],
})
