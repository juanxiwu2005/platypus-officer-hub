import type { DemoState, Node } from "../data/types"
import { taskActionLink } from "../reminders/actionLinks"
import { validTaskLinks } from "./data"
import type { TaskExternalLink } from "./contracts"

/** Per-task overrides do not mutate the workflow template. An explicit empty list means no links. */
export function taskLinks(state: DemoState, node: Node): TaskExternalLink[] {
  if (node.externalLinks !== undefined) return validTaskLinks(node.externalLinks) ? node.externalLinks : []
  if (node.stepKey === "venue") return state.events.find(e => e.id === node.eventId)?.venue === "offcampus" ? [] : [
    { label: "Student Union requests", url: "https://eoss.asu.edu/student-unions/submit-a-space-request" },
    { label: "Mazevo reservations", url: "https://mymazevo.com/" },
    { label: "ASU space reservations", url: "https://azstateu.aaiscloud.com/AZStateU/Default.aspx?home" },
  ]
  const link = taskActionLink(node)
  return link ? [{ label: link.label.replace(/^Open /, ""), url: link.url }] : []
}
