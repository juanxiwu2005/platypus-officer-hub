import type { DemoState } from "./types"
import type { RunFlowDefinition } from "./runFlow"

/**
 * Reducer steps whose code loads only with the screen that sends them, to keep the entry bundle under its budget.
 * Each module fills its slot when it loads; until then the action changes nothing. Only that screen dispatches it.
 */
export const lazyActions: { editRunFlow?: (state: DemoState, eventId: string, definition: RunFlowDefinition) => DemoState } = {}
