import type { EventCheck } from "./types"

/** The event form's selectable facts, shared with workflow branch requirements. */
export const EVENT_CHECKLIST: readonly { key: EventCheck; label: string }[] = [
  { key: "funding", label: "Need funding or reimbursement" }, { key: "food", label: "Food or beverage" }, { key: "externalFood", label: "External food provider" }, { key: "onsiteFood", label: "On-site food preparation or food truck" },
  { key: "speaker", label: "External speaker, artist, or performer" }, { key: "partner", label: "Partner, sponsor, co-host, vendor, or contract" }, { key: "travel", label: "Travel or off-site participant trip" }, { key: "parking", label: "Parking, shuttle, loading, or transportation" },
  { key: "advisor", label: "Advisor involvement required" }, { key: "access", label: "Accessibility accommodation or access support" }, { key: "safety", label: "Security, EMS, VIP, media, protest, or elevated safety risk" }, { key: "outdoor", label: "Outdoor special-use setup or equipment" },
  { key: "alcohol", label: "Alcohol" }, { key: "drone", label: "Drone or model aircraft" }, { key: "media", label: "Music, livestream, recording, or media use" }, { key: "prize", label: "Prize, raffle, fundraising, ticket, or donation activity" },
  { key: "schoolApproval", label: "School or college-specific approval" }, { key: "rsvp", label: "RSVP registration needed" },
]
