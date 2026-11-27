import type { ReminderMode } from "./types"

/**
 * The walkthrough's Reminders screen (P3-H): the three answers, in the fixed order the screen shows them. The value is only stored
 * (org.settings.reminderMode) and exported for the study. Updated reminders use it for local demo records;
 * no external mail is sent.
 */
export const REMINDER_MODES = ["auto_email", "review_then_self", "review_then_auto"] as const satisfies readonly ReminderMode[]
/**
 * S2 (Juanxi, 2026-11-22): the sending mode a new club starts with, "I review, Platypus sends". Used by the sample club (seedDemo) and by
 * every club created through setup when no mode is given. Existing saves keep whatever they have, including no choice.
 */
export const DEFAULT_REMINDER_MODE: ReminderMode = "review_then_auto"
export const isReminderMode = (v: unknown): v is ReminderMode => typeof v === "string" && (REMINDER_MODES as readonly string[]).includes(v)
/**
 * The Settings wording of the choice (the same words the former walkthrough screen used, so the log's `ui.change` names are unchanged).
 * It lives here, not in the onboarding copy, because Settings is now the only place that offers the choice.
 */
export const REMINDER_MODE_COPY = {
  title: "How should reminders go out?",
  options: {
    auto_email: { title: "Send automatically", body: "Platypus emails the officer on that date." },
    review_then_self: { title: "I review, then I send", body: "Platypus drafts it. You check and send it." },
    review_then_auto: { title: "I review, Platypus sends", body: "You check the draft. Platypus sends it." },
  },
} as const satisfies { title: string; options: Record<ReminderMode, { title: string; body: string }> }
/** The radio button's data-testid, which the interaction log keeps (`payload.testid`): the export reads the choice back from it. */
export const reminderModeTestId = (mode: ReminderMode) => `reminder-mode-${mode}`
