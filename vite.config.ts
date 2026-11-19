import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { readFileSync } from "node:fs"

// Which build a participant's exported file came from (src/lib/buildInfo.ts). Netlify sets these while building;
// a local build says "unknown". Only short, non-secret identifiers.
const env = (name: string) => (process.env[name] || "").replace(/[^\w./-]/g, "").slice(0, 60) || "unknown"
const BUILD_INFO = {
  version: (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string }).version ?? "unknown",
  commit: process.env.VITE_COMMIT_REF ? env("VITE_COMMIT_REF") : env("COMMIT_REF"),
  branch: env("BRANCH"),
  context: env("CONTEXT"),
}

// The app is a static site; Netlify serves dist/ and runs netlify/functions at /api/*.
export default defineConfig({
  plugins: [react()],
  // Server storage (Organization Setup, Activity workspace) is hidden unless ORG_SETUP_ENABLED=true.
  // The functions read the variable at run time (netlify/lib/serverStorage.mts); the pages read it here,
  // at build time, so a hidden build has no screen that calls those endpoints.
  define: { __ORG_SETUP_ENABLED__: JSON.stringify(process.env.ORG_SETUP_ENABLED === "true"), __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // These foundational packages only depend on each other, never on app modules.
        // Keep the shared React runtime cacheable across independently loaded screens.
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react-runtime"
          // The shared deterministic reminders have no store or UI dependency.
          if (/\/src\/reminders\/(engine|runtime)\.ts$/.test(id)) return "reminder-rules"
          // Keep the shared graph/template/calendar rules cacheable across editor and execution screens.
          // This pure dependency closure has no store or React imports, so its initializers cannot
          // depend on the entry module. It remains an eager shared download: splitting improves cache
          // boundaries and entry artifact size, not the total JavaScript needed or parsed by Today.
          if (/\/src\/(?:data\/workflowTemplates|engine\/(?:playbooks|schedule|calendar|workflow(?:Branches|Policy)?)|lib\/(?:flowEdit|flowOrder|stepOrder|workflowEffort)|components\/flow\/metro)\.ts$/.test(id)) return "workflow-rules"
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
