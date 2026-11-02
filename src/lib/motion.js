/** Small helpers for motion that the design-upgrade styles (src/styles/dx-*.css) cannot do on their own. */
/** How long a design-upgrade token lasts, in milliseconds. The CSS is the one place the time is written. */
export function tokenMs(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? (v.endsWith("ms") ? n : n * 1000) : fallback;
}
/** True when the person asked the system for less motion. */
export function prefersReducedMotion() {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
