import type { DemoState, Node, RoleFunction } from "../../data/types"
import type { Schedule } from "../../engine/schedule"

/**
 * Event workflow layout.
 *
 * The pre-event plan is deliberately a five-route diagram, not a critical-path
 * chart: Start fans out to Event Lead, Speaker, Marketing, Finance and Special
 * Event, then the active routes meet at Full Check. Dates still come solely
 * from the scheduler; they must never decide where a node sits on this diagram.
 */
export const EVENT_KEY = "__event__"
export const START_KEY = "__start__"
export const END_KEY = "__end__"

export interface Station { key: string; node: Node | null; col: number }
export interface Branch { id: string; fn: RoleFunction; from: number; to: number; row: number; nodes: { node: Node; col: number }[] }
export interface MetroLayout { stations: Station[]; branches: Branch[]; cols: number; minRow: number; maxRow: number }

type Route = { id: string; keys: string[]; row: number }

const PRE_ROUTES: Route[] = [
  { id: "event-lead", keys: ["plan", "backup", "venuechoice", "registry", "venue", "moderator", "materials", "draft", "approve", "offvenue", "ritm"], row: -5 },
  { id: "speaker", keys: ["partner", "speakerPacket", "travel", "partnerReview", "parking", "sap"], row: -3 },
  { id: "marketing", keys: ["marketingNeeds", "contentCreation", "promotionItems", "rsvp", "content", "reminder", "mktneeds", "flyer", "partnerreview", "promo"], row: -1 },
  { id: "finance", keys: ["budget", "foodCompliance", "quotes", "budgetRequest", "budgetApproval", "purchaseRequest", "purchaseApproval", "orderPlaced", "quote", "foodex", "dining", "usg", "usgspeaker", "foodplan"], row: 1 },
  { id: "special-event", keys: ["advisor", "access", "security", "eams", "permit", "alcohol", "drone", "schoolApproval"], row: 3 },
]

const POST_ROUTES: Route[] = [
  { id: "close-event", keys: ["thankyou", "feedback", "documentation", "archive"], row: -3 },
  { id: "close-marketing", keys: ["postmarketing", "photoBackup"], row: -1 },
  { id: "close-finance", keys: ["invoice", "attendance", "spending", "financeRecord", "closeout"], row: 1 },
]

const byRouteOrder = (route: Route, a: Node, b: Node) => route.keys.indexOf(a.stepKey ?? "") - route.keys.indexOf(b.stepKey ?? "")

/** Build stable swimlanes from the approved workflow routes. */
export function metroLayout(state: DemoState, _sched: Schedule, eventId: string, bothSides = true): MetroLayout {
  const nodes = state.nodes.filter(n => n.eventId === eventId)
  const byKey = new Map(nodes.filter(n => n.stepKey).map(n => [n.stepKey!, n]))
  const final = byKey.get("finalcheck") ?? byKey.get("review")
  const checkin = byKey.get("checkin") ?? byKey.get("runshow")
  const headcount = byKey.get("headcount")
  const pre = PRE_ROUTES.map(route => ({ route, nodes: route.keys.map(key => byKey.get(key)).filter((n): n is Node => !!n) }))
  const post = POST_ROUTES.map(route => ({ route, nodes: route.keys.map(key => byKey.get(key)).filter((n): n is Node => !!n) }))
  const placed = new Set(["finalcheck", "review", "checkin", "runshow", "headcount", ...PRE_ROUTES.flatMap(r => r.keys), ...POST_ROUTES.flatMap(r => r.keys)])
  // Custom template steps remain visible rather than disappearing. Their phase
  // chooses whether they join the pre-check or close-out side.
  const extraPre = nodes.filter(n => !placed.has(n.stepKey ?? "") && n.phase !== "close")
  const extraPost = nodes.filter(n => !placed.has(n.stepKey ?? "") && n.phase === "close")
  if (extraPre.length) pre.push({ route: { id: "other-pre", keys: extraPre.map(n => n.stepKey ?? n.id), row: 6 }, nodes: extraPre })
  if (extraPost.length) post.push({ route: { id: "other-close", keys: extraPost.map(n => n.stepKey ?? n.id), row: 4 }, nodes: extraPost })

  const preWidth = Math.max(1, ...pre.map(x => x.nodes.length))
  // Keep one compact reading column per task. The named milestones do not need
  // empty spacer columns between them: their labels sit above/below the line.
  // Give the convergence enough room that incoming curves stop beside the
  // Full Check label instead of visually crossing it.
  const finalCol = preWidth + 1.75
  const stations: Station[] = [
    { key: START_KEY, node: null, col: 0 },
    ...(final ? [{ key: final.id, node: final, col: finalCol }] : []),
    ...(checkin ? [{ key: checkin.id, node: checkin, col: finalCol + 1 }] : []),
    { key: EVENT_KEY, node: null, col: finalCol + 2 },
    ...(headcount ? [{ key: headcount.id, node: headcount, col: finalCol + 3 }] : []),
    { key: END_KEY, node: null, col: finalCol + 4 + Math.max(1, ...post.map(x => x.nodes.length)) },
  ]
  const finalIndex = final ? 1 : 0
  const headcountIndex = stations.findIndex(s => s.node?.id === headcount?.id)
  const endIndex = stations.length - 1
  const branchRow = (row: number, offset: number) => bothSides ? row : Math.max(1, Math.abs(row) * 2 + offset)
  const branches: Branch[] = []
  pre.forEach(({ route, nodes: routeNodes }, index) => {
    if (!routeNodes.length || !final) return
    branches.push({ id: route.id, fn: routeNodes[0].fn, from: 0, to: finalIndex, row: branchRow(route.row, index), nodes: [...routeNodes].sort((a, b) => byRouteOrder(route, a, b)).map((node, i) => ({ node, col: i + 1 + (node.stepKey === "reminder" ? .35 : 0) })) })
  })
  post.forEach(({ route, nodes: routeNodes }, index) => {
    if (!routeNodes.length || headcountIndex < 0) return
    branches.push({ id: route.id, fn: routeNodes[0].fn, from: headcountIndex, to: endIndex, row: branchRow(route.row, index + pre.length), nodes: [...routeNodes].sort((a, b) => byRouteOrder(route, a, b)).map((node, i) => ({ node, col: stations[headcountIndex].col + i + 1 })) })
  })
  const rows = branches.map(branch => branch.row)
  return { stations, branches, cols: stations.at(-1)!.col, minRow: Math.min(0, ...rows), maxRow: Math.max(0, ...rows) }
}
