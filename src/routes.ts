import type { Icons } from "./components/icons"

export interface PageDef {
  path: string
  label: string
  icon: keyof typeof Icons
  /** The one question the page answers (plan §6). */
  question: string
  group: "main" | "footer"
}

/** Navigation for v1 (plan §6): 8 pages plus Settings and Help at the bottom. */
export const PAGES: PageDef[] = [
  { path: "/", label: "Today", icon: "today", question: "Who should I nudge today?", group: "main" },
  { path: "/events", label: "Events", icon: "events", question: "Where is each event, and who is up next?", group: "main" },
  { path: "/tasks", label: "Tasks", icon: "tasks", question: "What should I do next?", group: "main" },
  { path: "/team", label: "Team", icon: "team", question: "Who is overloaded, who deserves credit, and when can we meet?", group: "main" },
  { path: "/handoff", label: "Handoff", icon: "handoff", question: "How do we hand over without starting from zero?", group: "main" },
  { path: "/partners", label: "Partners", icon: "partners", question: "Which relationships need a touch?", group: "main" },
  { path: "/rules", label: "Rules", icon: "rules", question: "What does ASU require?", group: "main" },
  { path: "/settings", label: "Settings", icon: "settings", question: "How should Platypus work for this club?", group: "footer" },
  { path: "/help", label: "Help", icon: "help", question: "How does Platypus work?", group: "footer" },
]
