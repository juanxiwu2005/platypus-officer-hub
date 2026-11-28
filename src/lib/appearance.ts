/**
 * Settings → My preferences → Appearance (docs/DESIGN_TOKENS.md section 14).
 *
 * A per-browser viewer preference, not club data: it lives in its own localStorage key, outside the demo state, so
 * Export my data does not include it and the Demo menu's reset keeps it (the error page's "Reset demo data" clears every
 * platypus.* key, this one too, which falls back to the default). "system" (the default) stores nothing and lets the
 * `prefers-color-scheme` media rules decide, including live OS changes; "light" and "dark" set `data-theme` on <html>.
 *
 * The first paint is handled by the small inline script in index.html, which reads the same key before any CSS or
 * JavaScript loads. This module is only imported by the lazily loaded Settings page, so it adds nothing to the entry bundle.
 */
export const APPEARANCE_KEY = "platypus.v1.appearance"
export const APPEARANCES = ["system", "light", "dark"] as const
export type Appearance = (typeof APPEARANCES)[number]
export const APPEARANCE_LABELS: Record<Appearance, string> = { system: "Follow system", light: "Always light", dark: "Always dark" }

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">
const local = (): Store | null => { try { return window.localStorage } catch { return null } }

/** The stored choice; anything missing, unknown or unreadable is "system". */
export function readAppearance(storage: Store | null = local()): Appearance {
  try {
    const v = storage?.getItem(APPEARANCE_KEY)
    return v === "light" || v === "dark" ? v : "system"
  } catch {
    return "system"
  }
}

/** Save the choice. Returns false when storage is unavailable (the choice then lasts only until the page reloads). */
export function saveAppearance(value: Appearance, storage: Store | null = local()): boolean {
  try {
    if (!storage) return false
    if (value === "system") storage.removeItem(APPEARANCE_KEY)
    else storage.setItem(APPEARANCE_KEY, value)
    return true
  } catch {
    return false
  }
}

/** The theme that actually shows. */
export function resolveTheme(value: Appearance, systemDark: boolean): "light" | "dark" {
  return value === "system" ? (systemDark ? "dark" : "light") : value
}

/**
 * Apply a choice to the document at once, without a reload. Mirrors the inline script in index.html:
 * `data-theme` on <html>, the color-scheme meta, and which theme-color meta (each tagged with data-scheme) the browser
 * uses for its own chrome. "system" puts every one back to the media queries in index.html.
 */
export function applyAppearance(value: Appearance, doc: Document = document): void {
  const html = doc.documentElement
  if (value === "system") delete html.dataset.theme
  else html.dataset.theme = value
  const scheme = doc.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
  if (scheme) scheme.content = value === "system" ? "light dark" : value
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-scheme]')) {
    const own = meta.dataset.scheme
    // setAttribute, not the .media property, which older browsers do not reflect on <meta>.
    meta.setAttribute("media", value === "system" ? `(prefers-color-scheme: ${own})` : own === value ? "all" : "not all")
  }
}
