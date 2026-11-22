/** Generic fictional planning room. One model unit is 36 inches; this is not a certified floor plan. */
export const ROOM = { width: 12, depth: 10, capacity: 80, inchesPerUnit: 36 } as const
export type PropKind = "row" | "table" | "registration" | "catering" | "podium" | "screen" | "speaker" | "microphone" | "cable" | "cover" | "accessible" | "reserved" | "sign" | "backdrop" | "bin"
export interface VenueItem { id: string; kind: PropKind; x: number; z: number; turn: 0 | 1 }
export interface VenueLayout { items: VenueItem[]; headcount: number; name: string; theme: "teal" | "sunset" | "sage"; lighting: "warm" | "cool" | "stage"; pattern: "plain" | "stripes" | "dots"; tablecloth: "teal" | "cream" | "sunset" }
export interface Rect { x: number; z: number; w: number; d: number }
export interface VenueSource { record: string; line: number; quote: string; section: null }
export type VenueCheckId = "capacity" | "exits" | "catering" | "theatre" | "accessibility" | "cables"
export interface VenueCheck { id: VenueCheckId; label: string; passed: boolean; message: string; checklist: boolean; sources: readonly VenueSource[] }
const source = (record: string, line: number, quote: string): VenueSource => ({ record, line, quote, section: null })
export const VENUE_SOURCES = {
  capacity: [source("ASU-R-015", 2401, "Designated maximum capacity for any event will not be exceeded at any time.")],
  exits: [source("ASU-R-015", 2401, "Exit aisles, staircases, fire alarm systems and emergency exits may not be blocked at any time.")],
  catering: [source("ASU-R-015", 2392, "All catering must be set up inside the reserved space. Food buffets are not permitted in the hallways.")],
  theatre: [source("ASU-R-014", 2277, "A Theatre Setup includes chairs set up in straight lines, with proper spacing between rows, center and side aisles.")],
  accessibility: [source("ASU-R-019", 3576, "The furniture is movable, or in fixed seating areas, accessible seating options are available for participants with mobility disabilities."), source("ASU-R-019", 3577, "Interior walkways are wide (at least 36”)."), source("ASU-R-019", 3578, "There is plenty of space to maneuver around tables."), source("ASU-R-019", 3581, "Reserved seating near front for participants who are deaf or hard of hearing is available."), source("ASU-R-019", 3582, "Stage and projector screen is easily visible (if in use).")],
  cables: [source("ASU-R-019", 3584, "Electric power cords crossing walkways and aisles are covered.")],
} as const
export const SETUP_SOURCE = source("ASU-R-015", 2399, "Clients are prohibited from moving or rearranging the furniture and will be assessed a fee if the set-up is changed.")
export const PROP_NAMES: Record<PropKind, string> = { row: "Theatre row", table: "Round table", registration: "Registration", catering: "Catering", podium: "Podium", screen: "Portable screen", speaker: "Speaker", microphone: "Microphone", cable: "Power cable", cover: "Cable cover", accessible: "Accessible seat", reserved: "Reserved front seat", sign: "Entrance sign", backdrop: "Backdrop", bin: "Trash bin" }
const SHAPES: Record<PropKind, readonly [number, number, number]> = { row: [4, .55, .9], table: [1.6, 1.6, .8], registration: [2, 1, .85], catering: [2, 1, .9], podium: [1, .7, 1], screen: [2, .25, 2], speaker: [.6, .6, 1.4], microphone: [.25, .25, 1.4], cable: [2, .15, .025], cover: [2, .3, .04], accessible: [1, .7, .02], reserved: [1, .7, .02], sign: [.4, .4, 1.2], backdrop: [2, .25, 2.3], bin: [.6, .6, .75] }
export function footprint(item: VenueItem): Rect { const [w, d] = SHAPES[item.kind]; return { x: item.x, z: item.z, w: item.turn ? d : w, d: item.turn ? w : d } }
export const propHeight = (kind: PropKind) => SHAPES[kind][2]
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - .001 && a.x + a.w > b.x + .001 && a.z < b.z + b.d - .001 && a.z + a.d > b.z + .001
export const inside = (r: Rect) => r.x >= 0 && r.z >= 0 && r.x + r.w <= ROOM.width + .001 && r.z + r.d <= ROOM.depth + .001
export const solid = (kind: PropKind) => !["cable", "cover", "accessible", "reserved"].includes(kind)
export const EXIT_ZONES: readonly Rect[] = [{ x: 0, z: 8, w: 12, d: 2 }, { x: 11, z: .5, w: 1, d: 1.5 }]
export const AISLES: readonly Rect[] = [{ x: 0, z: 2, w: 1, d: 6 }, { x: 5, z: 2, w: 2, d: 6 }, { x: 11, z: 2, w: 1, d: 6 }]
export function initialVenue(): VenueLayout {
  const items: VenueItem[] = []
  for (let row = 0; row < 5; row++) for (const side of ["left", "right"]) items.push({ id: `${side}-${row}`, kind: "row", x: side === "right" ? 7 : row === 0 ? 0 : 1, z: 3 + row, turn: 0 })
  for (const [id, kind, x, z] of [["welcome", "registration", 0, 8], ["buffet", "catering", 13, 3], ["round", "table", 5, 5], ["lectern", "podium", 2, .2], ["audio", "speaker", 10, .2], ["mic", "microphone", 3.5, .4], ["cord", "cable", 5, 4], ["access", "accessible", 4, 7], ["front", "reserved", 8, 7], ["photo", "backdrop", 5, 1], ["wayfinding", "sign", .2, 1], ["waste", "bin", 9, .2]] as const) items.push({ id, kind, x, z, turn: 0 })
  return { items, headcount: 90, name: "Speaker Night", theme: "teal", lighting: "warm", pattern: "plain", tablecloth: "cream" }
}
export function moveProp(layout: VenueLayout, id: string, x: number, z: number): VenueLayout {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return layout
  return { ...layout, items: layout.items.map(item => item.id === id ? { ...item, x: Math.max(0, Math.min(14, Math.round(x * 2) / 2)), z: Math.max(0, Math.min(9, Math.round(z * 2) / 2)) } : item) }
}
export function addProp(layout: VenueLayout, kind: PropKind, x: number, z: number): VenueLayout {
  if (layout.items.length >= 60 || !Object.hasOwn(SHAPES, kind)) return layout
  let n = 1; while (layout.items.some(item => item.id === `prop-${n}`)) n++
  return moveProp({ ...layout, items: [...layout.items, { id: `prop-${n}`, kind, x: 1, z: 1, turn: 0 }] }, `prop-${n}`, x, z)
}
function reachable(target: Rect, obstacles: Rect[]): boolean {
  const cells = new Set<string>(), queue: [number, number][] = [[0, 9], [11, 9]]
  while (queue.length) {
    const [x, z] = queue.shift()!, key = `${x},${z}`
    if (x < 0 || x >= 12 || z < 0 || z >= 10 || cells.has(key) || obstacles.some(r => overlaps(r, { x, z, w: 1, d: 1 }))) continue
    cells.add(key)
    if (overlaps(target, { x, z, w: 1, d: 1 })) return true
    queue.push([x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1])
  }
  return false
}
function visible(target: Rect, obstacles: VenueItem[]): boolean {
  const screens = [{ id: "fixed-wall", x: 6, z: .1 }, ...obstacles.filter(i => i.kind === "screen" && inside(footprint(i))).map(i => { const r = footprint(i); return { id: i.id, x: r.x + r.w / 2, z: r.z + r.d / 2 } })]
  return screens.some(screen => {
    for (let t = .05; t < 1; t += .05) {
      const p = { x: screen.x + (target.x + target.w / 2 - screen.x) * t, z: screen.z + (target.z + target.d / 2 - screen.z) * t, w: .01, d: .01 }
      if (obstacles.some(item => item.id !== screen.id && propHeight(item.kind) > 1.4 && overlaps(footprint(item), p))) return false
    }
    return true
  })
}
export function checkVenue(layout: VenueLayout): VenueCheck[] {
  const blockers = layout.items.filter(i => solid(i.kind)), boxes = blockers.map(footprint), rows = blockers.filter(i => i.kind === "row")
  const clear = (zones: readonly Rect[]) => !boxes.some(box => zones.some(zone => overlaps(box, zone)))
  const collisions = boxes.some((a, i) => boxes.some((b, j) => j > i && overlaps(a, b)))
  const access = layout.items.filter(i => i.kind === "accessible"), reserved = layout.items.filter(i => i.kind === "reserved")
  const markerOk = (item: VenueItem) => inside(footprint(item)) && !boxes.some(b => overlaps(b, footprint(item))) && reachable(footprint(item), boxes) && visible(footprint(item), blockers)
  const frontZ = rows.length ? Math.min(...rows.map(i => i.z)) : 0
  const catering = layout.items.filter(i => i.kind === "catering"), cords = layout.items.filter(i => i.kind === "cable"), covers = layout.items.filter(i => i.kind === "cover").map(footprint)
  const cableCovered = (cord: VenueItem) => {
    const c = footprint(cord), crosses = [...AISLES, ...EXIT_ZONES].some(a => overlaps(a, c))
    return inside(c) && (!crosses || covers.some(cover => cover.x <= c.x + .001 && cover.z <= c.z + .001 && cover.x + cover.w >= c.x + c.w - .001 && cover.z + cover.d >= c.z + c.d - .001))
  }
  const values: [VenueCheckId, string, boolean, string][] = [
    ["capacity", "Capacity", Number.isSafeInteger(layout.headcount) && layout.headcount > 0 && layout.headcount <= ROOM.capacity, "Keep the guest count within this room's 80-person capacity."],
    ["exits", "Exit routes", blockers.every(i => inside(footprint(i))) && clear(EXIT_ZONES), "Keep the rear exit lane and fire alarm clear."],
    ["catering", "Catering inside", catering.length > 0 && catering.every(i => inside(footprint(i))), "Bring the buffet inside the reserved room."],
    ["theatre", "Theatre aisles", rows.length > 0 && rows.every(i => !i.turn) && rows.length * 8 >= layout.headcount && !collisions && clear(AISLES) && rows.every(a => rows.every(b => a.id === b.id || a.x !== b.x || Math.abs(a.z - b.z) >= 1)), "Keep straight rows, spaced apart, with center and side aisles."],
    ["accessibility", "Accessible seating", access.some(markerOk) && reserved.some(i => markerOk(i) && i.z < frontZ) && clear(AISLES), "Keep 36-inch routes, reachable seats, front reservations and screen sightlines."],
    ["cables", "Covered cables", cords.every(cableCovered), "Cover power cords crossing walkways."],
  ]
  return values.map(([id, label, passed, message]) => ({ id, label, passed, message, checklist: id === "accessibility" || id === "cables", sources: VENUE_SOURCES[id] }))
}
export function validVenue(value: unknown): value is VenueLayout {
  if (!value || typeof value !== "object") return false
  const v = value as VenueLayout
  return Array.isArray(v.items) && v.items.length <= 60 && new Set(v.items.map(i => i?.id)).size === v.items.length && v.items.every(i => i && typeof i.id === "string" && /^[a-z0-9-]{1,32}$/.test(i.id) && typeof i.kind === "string" && Object.hasOwn(SHAPES, i.kind) && [i.x, i.z].every(n => Number.isFinite(n) && n >= 0 && n <= 14) && i.z <= 9 && (i.turn === 0 || i.turn === 1)) && Number.isSafeInteger(v.headcount) && v.headcount >= 0 && v.headcount <= 120 && typeof v.name === "string" && v.name.length <= 48 && ["teal", "sunset", "sage"].includes(v.theme) && ["warm", "cool", "stage"].includes(v.lighting) && ["plain", "stripes", "dots"].includes(v.pattern) && ["teal", "cream", "sunset"].includes(v.tablecloth)
}
