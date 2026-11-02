/**
 * Is the first-run walkthrough switched on? Off by default, so the site behaves exactly as before.
 * On when the build says so (VITE_ONBOARDING_WALKTHROUGH=true on Netlify) or the link carries walkthrough=1.
 * The app uses a hash router, so a link can carry the flag before the "#" (https://site/?walkthrough=1#/) or after it (…/#/?walkthrough=1):
 * both are read.
 */
export function walkthroughEnabled(opts) {
    if (opts.buildFlag === "true")
        return true;
    return [opts.windowSearch, opts.routerSearch].some(s => new URLSearchParams(s ?? "").get("walkthrough") === "1");
}
