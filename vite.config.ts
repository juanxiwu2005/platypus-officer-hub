/// <reference types="vitest" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// The app is a static site; Netlify serves dist/ and runs netlify/functions at /api/*.
export default defineConfig({
  plugins: [react()],
  // Server storage (Organization Setup, Activity workspace) is hidden unless ORG_SETUP_ENABLED=true.
  // The functions read the variable at run time (netlify/lib/serverStorage.mts); the pages read it here,
  // at build time, so a hidden build has no screen that calls those endpoints.
  define: { __ORG_SETUP_ENABLED__: JSON.stringify(process.env.ORG_SETUP_ENABLED === "true") },
  build: { outDir: "dist", sourcemap: false },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
