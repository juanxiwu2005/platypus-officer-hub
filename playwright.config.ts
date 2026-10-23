import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // PW_CHROMIUM lets a machine with a preinstalled Chromium run the suite without downloading browsers.
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure", ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}) },
  webServer: { command: "npm run preview", url: "http://localhost:4173", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
