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

/** Place each route by its own progress, rather than forcing unrelated tasks into shared vertical columns. */
function progressColumns(nodes: Node[], start: number, end: number) {
  if (nodes.length === 1) return [start + (end - start) / 2]
  return nodes.map((_, index) => start + (end - start) * index / (nodes.length - 1))
}

/**
 * Empty conditional routes must not leave a visual hole. Keep the lowest active
 * route where it belongs, then pack the active routes above it at the standard
 * two-row rhythm. This moves an upper route down when a route beneath it is off.
 */
function packedRows(routes: Route[], groups: { route: Route; nodes: Node[] }[]) {
  const active = routes.map(route => groups.find(group => group.route.id === route.id)!).filter(group => group.nodes.length > 0)
  const out = new Map<string, number>()
  if (!active.length) return out
  const bottom = active.at(-1)!.route.row
  active.forEach((group, index) => out.set(group.route.id, bottom - 2 * (active.length - index - 1)))
  return out
}

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
  const preRows = packedRows(PRE_ROUTES, pre)
  const postRows = packedRows(POST_ROUTES, post)

  // Every active pre-event route occupies the same compact work window. A
  // shorter route therefore reaches its final step near Full Check instead of
  // leaving a long, empty rail on the right.
  const preSpan = Math.max(1, ...pre.map(group => Math.max(0, group.nodes.length - 1)))
  const preStart = 1
  const preEnd = preStart + preSpan
  // Keep a small visible gap for the converging curves and Full Check label.
  const finalCol = preEnd + .9
  const postSpan = Math.max(1, ...post.map(group => Math.max(0, group.nodes.length - 1)))
  const headcountCol = finalCol + 3
  const postStart = headcountCol + 1
  const postEnd = postStart + postSpan
  const stations: Station[] = [
    { key: START_KEY, node: null, col: 0 },
    ...(final ? [{ key: final.id, node: final, col: finalCol }] : []),
    ...(checkin ? [{ key: checkin.id, node: checkin, col: finalCol + 1 }] : []),
    { key: EVENT_KEY, node: null, col: finalCol + 2 },
    ...(headcount ? [{ key: headcount.id, node: headcount, col: headcountCol }] : []),
    { key: END_KEY, node: null, col: postEnd + .9 },
  ]
  const finalIndex = final ? 1 : 0
  const headcountIndex = stations.findIndex(s => s.node?.id === headcount?.id)
  const endIndex = stations.length - 1
  const branches: Branch[] = []
  // On a phone every active route needs its own column to the right of the main line.
  // Folding signed desktop rows with abs() can put unrelated routes in the same lane.
  const branchRow = (row: number) => bothSides ? row : branches.length + 1
  pre.forEach(({ route, nodes: routeNodes }) => {
    if (!routeNodes.length || !final) return
    const ordered = [...routeNodes].sort((a, b) => byRouteOrder(route, a, b))
    const columns = progressColumns(ordered, preStart, preEnd)
    branches.push({ id: route.id, fn: ordered[0].fn, from: 0, to: finalIndex, row: branchRow(preRows.get(route.id) ?? route.row), nodes: ordered.map((node, i) => ({ node, col: columns[i] })) })
  })
  post.forEach(({ route, nodes: routeNodes }) => {
    if (!routeNodes.length || headcountIndex < 0) return
    const ordered = [...routeNodes].sort((a, b) => byRouteOrder(route, a, b))
    const columns = progressColumns(ordered, postStart, postEnd)
    branches.push({ id: route.id, fn: ordered[0].fn, from: headcountIndex, to: endIndex, row: branchRow(postRows.get(route.id) ?? route.row), nodes: ordered.map((node, i) => ({ node, col: columns[i] })) })
  })
  const rows = branches.map(branch => branch.row)
  return { stations, branches, cols: stations.at(-1)!.col, minRow: Math.min(0, ...rows), maxRow: Math.max(0, ...rows) }
}
