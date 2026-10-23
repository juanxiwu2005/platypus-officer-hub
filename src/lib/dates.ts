/** Small date helpers. All dates are local calendar days stored as "YYYY-MM-DD". */
export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const fromISO = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, n: number): string => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000)

/** Next date on or after `s` that falls on weekday `wd` (0 = Sunday). */
export const onOrAfterWeekday = (s: string, wd: number): string => {
  let x = s
  while (fromISO(x).getDay() !== wd) x = addDays(x, 1)
  return x
}

export const fmtShort = (s: string): string =>
  fromISO(s).toLocaleDateString("en-US", { month: "short", day: "numeric" })

export const fmtLong = (s: string): string =>
  fromISO(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
