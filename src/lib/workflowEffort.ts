/** Whole working days accepted by workflow editors. An empty draft is not a zero-day task. */
export function parseEffortDays(raw: unknown): number | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null
  if (typeof raw === "string" && !/^\d+$/.test(raw.trim())) return null
  const days = typeof raw === "number" ? raw : Number(raw.trim())
  return Number.isInteger(days) && days >= 0 && days <= 30 ? days : null
}

/** An explicit estimate edit changes the start calculation without discarding calibrated due dates or links. */
export function effortEditPatch(raw: unknown): { estDays: number; startPolicy: "effort" } | null {
  const days = parseEffortDays(raw)
  return days === null ? null : { estDays: days, startPolicy: "effort" }
}
