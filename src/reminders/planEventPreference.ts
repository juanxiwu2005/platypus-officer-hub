import type { DemoState } from "../data/types"

// This is a browsing preference, never an event assignment or a workspace credential.
function preferenceKey(state: DemoState) {
  let hash = 2166136261
  for (const char of state.demoLinkKey) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return `platypus.plan.event.${(hash >>> 0).toString(16)}`
}
export function recentPlanEvent(state: DemoState): string | undefined {
  try {
    const id = sessionStorage.getItem(preferenceKey(state))
    return state.events.some(event => event.id === id) ? id! : undefined
  } catch { return undefined }
}
export function rememberPlanEvent(state: DemoState, id: string) {
  if (!state.events.some(event => event.id === id)) return
  try { sessionStorage.setItem(preferenceKey(state), id) } catch { /* Task saving does not depend on this preference. */ }
}
