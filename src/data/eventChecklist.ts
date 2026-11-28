import type { EventCheck } from "./types"

// TODO (event intake redesign): map situation-based steps to reviewed checklist keys here and
// branch conditions in workflowBranches.ts. stepKind is the authored category, not an answer:
// changing a step's category must never silently check event flags or rewrite old event tasks.

/** The event form's selectable facts, shared with workflow branch requirements. */
export const EVENT_CHECKLIST: readonly { key: EventCheck; label: string }[] = [
  { key: "funding", label: "Need funding or reimbursement" }, { key: "food", label: "Food or beverage" }, { key: "externalFood", label: "External food provider" }, { key: "onsiteFood", label: "On-site food preparation or food truck" },
  { key: "speaker", label: "External speaker, artist, or performer" }, { key: "partner", label: "Partner, sponsor, co-host, vendor, or contract" }, { key: "travel", label: "Travel or off-site participant trip" }, { key: "parking", label: "Parking, shuttle, loading, or transportation" },
  { key: "advisor", label: "Advisor involvement required" }, { key: "access", label: "Accessibility accommodation or access support" }, { key: "safety", label: "Security, EMS, VIP, media, protest, or elevated safety risk" }, { key: "outdoor", label: "Outdoor special-use setup or equipment" },
  { key: "alcohol", label: "Alcohol" }, { key: "drone", label: "Drone or model aircraft" }, { key: "media", label: "Music, livestream, recording, or media use" }, { key: "prize", label: "Prize, raffle, fundraising, ticket, or donation activity" },
  { key: "schoolApproval", label: "School or college-specific approval" }, { key: "rsvp", label: "RSVP registration needed" },
]

/**
 * The New event form's "This event has…" chips (Option A, Juanxi 2026-11-28), in display order. `speaker` shows as "Guest
 * speaker or performer" and also sets the event's `speaker` field. Food has its own Yes/No select; every other item sits
 * under "Other checklists".
 */
export const COMMON_EVENT_CHECKS: readonly EventCheck[] = ["speaker", "funding", "externalFood", "partner", "advisor", "rsvp"]
/** The checklist items the form folds under "Other checklists": everything except food and the common chips. */
export const OTHER_EVENT_CHECKLIST = EVENT_CHECKLIST.filter(item => item.key !== "food" && !COMMON_EVENT_CHECKS.includes(item.key))
