import type { Icons } from "./components/icons"

export interface PageDef {
  path: string
  /** The navigation label. */
  label: string
  /** The page head, when it differs from the label (FB-8: the Plan item opens the Events page). */
  title?: string
  icon: keyof typeof Icons
  /** The one question the page answers (plan §6). */
  question: string
  /**
   * main = the side navigation; more = inside the collapsible "More" (FB-8); footer = Settings at the bottom;
   * plan = reached from Plan's "Events | Tasks" switch, not a navigation item of its own.
   * sub = reached from another page (the handoff workspace is opened from Playbook during Playbook phase 1).
   */
  group: "main" | "more" | "footer" | "plan" | "sub"
  /** Other paths that make this item the current one (FB-8: Plan is current on /tasks too). */
  also?: string[]
}

/**
 * Navigation (FB-8, docs/feedback-fix/PLAN.md §12.2): the product does two things, reminding officers and handing a role over,
 * Team is a primary item. Partners (src/archive/partners) and Help (src/archive/help) are archived; Settings stays at the bottom.
 */
export const PAGES: PageDef[] = [
  { path: "/", label: "Reminders", icon: "reminders", question: "Who needs a reminder, and who hasn't answered?", group: "main" },
  { path: "/events", label: "Plan", title: "Events", icon: "events", question: "What has to happen, and who owns it?", group: "main", also: ["/tasks"] },
  { path: "/team", label: "Team", icon: "team", question: "Who is overloaded, who deserves credit, and when can we meet?", group: "main" },
  { path: "/playbook", label: "Playbook", icon: "playbook", question: "What has this club learned, and what does the school require?", group: "main", also: ["/handoff"] },
  { path: "/handoff", label: "Handoff", icon: "handoff", question: "How do we hand over without starting from zero?", group: "sub" },
  { path: "/rules", label: "Rules", icon: "rules", question: "What does ASU require?", group: "main" },
  { path: "/tasks", label: "Tasks", icon: "tasks", question: "What has to happen, and who owns it?", group: "plan" },
  { path: "/settings", label: "Settings", icon: "settings", question: "How should Platypus work for this club?", group: "footer" },
]

/** Plan's two pages, in the order of the "Events | Tasks" switch. */
export const PLAN_PAGES = [{ path: "/events", label: "Events" }, { path: "/tasks", label: "Tasks" }] as const

/** Is `item` the current navigation item at `pathname`? */
export const isCurrent = (item: PageDef, pathname: string) => item.path === "/" ? pathname === "/" : [item.path, ...(item.also ?? [])].some(p => pathname === p || pathname.startsWith(`${p}/`))
