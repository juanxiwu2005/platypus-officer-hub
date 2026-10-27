import { addDays, fromISO } from "../lib/dates"

/**
 * ASU calendar used for business-day math (rule engine, plan §4 mechanism 1).
 * Holidays: official ASU holiday schedule (university closed). Spring break and fall break are NOT
 * closures (the university stays open), so they count as business days but are flagged for events.
 * Re-check every term. Checked 2026-10-22; Fall 2027 and Spring 2028 added 2026-10-27.
 * The data covers only CALENDAR_START..CALENDAR_END (derived from TERMS below). Any date the engine
 * computes outside that range raises the red "calendar_range" issue instead of being guessed.
 */
export const CALENDAR_SOURCES = [
  { label: "ASU holiday schedule (2027 and 2028 columns)", url: "https://cfo.asu.edu/holiday-schedule" },
  { label: "ASU academic calendar (Registrar): Fall 2026 to Fall 2027", url: "https://registrar.asu.edu/academic-calendar" },
  { label: "ASU Registrar projected dates: Spring 2028 (not final)", url: "https://registrar.asu.edu/projected-dates-future-semesters" },
]
export const CALENDAR_CHECKED_ON = "2026-10-27"

export const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-05-25": "Memorial Day",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-11": "Veterans Day",
  "2026-11-26": "Thanksgiving",
  "2026-11-27": "Thanksgiving",
  "2026-12-24": "Winter break (university closed)",
  "2026-12-25": "Winter break (university closed)",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-05-31": "Memorial Day",
  "2027-07-05": "Independence Day (observed)",
  "2027-09-06": "Labor Day",
  "2027-11-11": "Veterans Day",
  "2027-11-25": "Thanksgiving",
  "2027-11-26": "Thanksgiving",
  "2027-12-24": "Winter break (university closed)",
  "2027-12-27": "Winter break (university closed)",
  "2027-12-31": "New Year's Day (observed)",
  "2028-01-17": "Martin Luther King Jr. Day",
  "2028-05-29": "Memorial Day",
  "2028-07-04": "Independence Day",
  "2028-09-04": "Labor Day",
  "2028-11-10": "Veterans Day (observed)",
  "2028-11-23": "Thanksgiving",
  "2028-11-24": "Thanksgiving",
  "2028-12-25": "Winter break (university closed)",
  "2028-12-26": "Winter break (university closed)",
}

export interface Period {
  from: string
  to: string
  label: string
}

/** Final exam weeks (rule R13: no events). */
export const FINALS: Period[] = [
  { from: "2026-12-07", to: "2026-12-12", label: "Fall 2026 final exams" },
  { from: "2027-05-03", to: "2027-05-08", label: "Spring 2027 final exams" },
  { from: "2027-12-06", to: "2027-12-11", label: "Fall 2027 final exams" },
  { from: "2028-05-01", to: "2028-05-06", label: "Spring 2028 final exams (projected)" },
]

/** Classes in session (Session C). Outside these, most members are away. */
export const TERMS: Period[] = [
  { from: "2026-08-20", to: "2026-12-12", label: "Fall 2026" },
  { from: "2027-01-11", to: "2027-05-08", label: "Spring 2027" },
  { from: "2027-08-19", to: "2027-12-11", label: "Fall 2027" },
  { from: "2028-01-10", to: "2028-05-06", label: "Spring 2028 (projected)" },
]

/** Breaks when the university is open but classes are excused. */
export const BREAKS: Period[] = [
  { from: "2026-10-10", to: "2026-10-13", label: "Fall break" },
  { from: "2027-03-07", to: "2027-03-14", label: "Spring break" },
  { from: "2027-10-09", to: "2027-10-12", label: "Fall break" },
  { from: "2028-03-05", to: "2028-03-12", label: "Spring break (projected)" },
]

/** First and last day the calendar data above covers. Outside this range the engine cannot know term, finals or break dates. */
export const CALENDAR_START = TERMS.reduce((a, t) => (t.from < a ? t.from : a), TERMS[0].from)
export const CALENDAR_END = TERMS.reduce((a, t) => (t.to > a ? t.to : a), TERMS[0].to)
export const outsideCalendar = (d: string) => d < CALENDAR_START || d > CALENDAR_END

export const inPeriod = (d: string, p: Period) => d >= p.from && d <= p.to
export const findPeriod = (d: string, ps: Period[]) => ps.find(p => inPeriod(d, p)) ?? null

export const isWeekend = (d: string) => {
  const w = fromISO(d).getDay()
  return w === 0 || w === 6
}

/** A day ASU offices are open. */
export const isBusinessDay = (d: string) => !isWeekend(d) && !(d in HOLIDAYS)

/** A day a given person can work. */
export type WorkDay = (d: string) => boolean

/**
 * Why a business day is not a student work day: finals week, between semesters, or the person's busy week.
 * Club work is planned only on student work days; ASU's own deadlines still count every business day.
 */
export function studentOffReason(d: string, busy?: Set<string>): string | null {
  if (busy?.has(d)) return "busy week"
  const f = findPeriod(d, FINALS)
  if (f) return "finals week"
  if (!findPeriod(d, TERMS)) return "break between semesters"
  return null
}

/** Busy weeks are stored as the Monday of each week; the whole Monday–Sunday is blocked. */
export function busyDays(busyWeeks: string[] = []): Set<string> {
  const blocked = new Set<string>()
  for (const monday of busyWeeks) for (let i = 0; i < 7; i++) blocked.add(addDays(monday, i))
  return blocked
}

export function personalWorkDay(busyWeeks: string[] = []): WorkDay {
  const busy = busyDays(busyWeeks)
  return d => isBusinessDay(d) && studentOffReason(d, busy) === null
}

const GUARD = 800

/** Move `n` working days from `d` (negative = earlier). n = 0 returns `d` unchanged. */
export function shiftWork(d: string, n: number, ok: WorkDay = isBusinessDay): string {
  let x = d
  let k = Math.abs(n)
  const step = n < 0 ? -1 : 1
  for (let i = 0; k > 0 && i < GUARD; i++) {
    x = addDays(x, step)
    if (ok(x)) k--
  }
  return x
}

/** `d` if it is a working day, otherwise the closest earlier working day. */
export function onOrBefore(d: string, ok: WorkDay = isBusinessDay): string {
  let x = d
  for (let i = 0; !ok(x) && i < GUARD; i++) x = addDays(x, -1)
  return x
}

/** `d` if it is a working day, otherwise the closest later working day. */
export function onOrAfter(d: string, ok: WorkDay = isBusinessDay): string {
  let x = d
  for (let i = 0; !ok(x) && i < GUARD; i++) x = addDays(x, 1)
  return x
}

/** Reasons (busy week, finals week, break) for business days strictly between a and b that were skipped. */
export function skippedReasons(a: string, b: string, busyWeeks: string[] = []): string[] {
  const busy = busyDays(busyWeeks)
  const out = new Set<string>()
  for (let x = addDays(a, 1), i = 0; x < b && i < GUARD; x = addDays(x, 1), i++) {
    if (!isBusinessDay(x)) continue
    const r = studentOffReason(x, busy)
    if (r) out.add(r)
  }
  return [...out]
}

export const minDate = (...ds: (string | null | undefined)[]) =>
  ds.filter((d): d is string => !!d).reduce<string | null>((a, b) => (a === null || b < a ? b : a), null)
export const maxDate = (...ds: (string | null | undefined)[]) =>
  ds.filter((d): d is string => !!d).reduce<string | null>((a, b) => (a === null || b > a ? b : a), null)
