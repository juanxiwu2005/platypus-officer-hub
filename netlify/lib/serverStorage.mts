import { json } from "./http.mts"

/**
 * Juanxi 2026-10-27: the server storage that came with Organization Setup and the Activity workspace
 * (Netlify Blobs: private workspaces, drafts, archives, AI jobs) is kept but hidden.
 *
 * Unless ORG_SETUP_ENABLED=true, every endpoint that would read or write it answers 404 before any
 * storage code runs, and the pages that use it are left out of the build (vite.config.ts reads the
 * same variable). The code and its tests stay; setting the variable and redeploying turns it back on.
 */
export function serverStorageEnabled(): boolean {
  const g = globalThis as { Netlify?: { env: { get(k: string): string | undefined } } }
  return (g.Netlify?.env.get("ORG_SETUP_ENABLED") ?? process.env.ORG_SETUP_ENABLED ?? "").trim() === "true"
}

/** Wrap a storage endpoint: 404 with no storage access while server storage is hidden. */
export function hiddenUnlessEnabled<A extends unknown[], R>(handler: (req: Request, ...rest: A) => Promise<R> | R) {
  return async (req: Request, ...rest: A): Promise<R | Response> =>
    serverStorageEnabled() ? handler(req, ...rest) : json({ message: "Not found." }, 404)
}
