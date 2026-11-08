import type { ReminderMode } from "./types"

/**
 * The walkthrough's Reminders screen (P3-H): the three answers, in the fixed order the screen shows them. The value is only stored
 * (org.settings.reminderMode) and exported for the study; no part of the app sends anything because of it.
 */
export const REMINDER_MODES = ["auto_email", "review_then_self", "review_then_auto"] as const satisfies readonly ReminderMode[]
export const isReminderMode = (v: unknown): v is ReminderMode => typeof v === "string" && (REMINDER_MODES as readonly string[]).includes(v)
/** The radio button's data-testid, which the interaction log keeps (`payload.testid`): the export reads the choice back from it. */
export const reminderModeTestId = (mode: ReminderMode) => `reminder-mode-${mode}`
