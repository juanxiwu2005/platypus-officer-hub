/** A literal excerpt keeps the visible short name inside the accessible full name. */
export function taskShortTitle(title: string): string {
  return title.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ") || "Untitled task"
}
