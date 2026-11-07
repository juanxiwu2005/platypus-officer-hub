/** Filled in at build time by vite.config.ts (Netlify sets COMMIT_REF, BRANCH and CONTEXT while building). */
declare const __BUILD_INFO__: { version: string; commit: string; branch: string; context: string } | undefined

/** Which build of the app a file came from. "unknown" when the build did not say (a local build without Netlify's variables). */
export const BUILD_INFO = typeof __BUILD_INFO__ === "object" && __BUILD_INFO__ ? __BUILD_INFO__ : { version: "unknown", commit: "unknown", branch: "unknown", context: "unknown" }
