export type StepEvent = "enter" | "leave" | "back" | "skip" | "complete" | "exit"
export interface StepState { current: string; visited: string[]; skipped: string[]; complete: boolean }
export type OnEvent = (step: string, event: StepEvent) => void
export function begin(steps: string[], onEvent?: OnEvent): StepState { const current = steps[0] ?? ""; if (current) onEvent?.(current, "enter"); return { current, visited: current ? [current] : [], skipped: [], complete: false } }
export function forward(state: StepState, steps: string[], onEvent?: OnEvent): StepState { const next = steps[steps.indexOf(state.current) + 1]; if (!next) { onEvent?.(state.current, "complete"); return { ...state, complete: true } } onEvent?.(state.current, "leave"); onEvent?.(next, "enter"); return { ...state, current: next, visited: [...new Set([...state.visited, next])] } }
export function back(state: StepState, steps: string[], onEvent?: OnEvent): StepState { const previous = steps[steps.indexOf(state.current) - 1]; if (!previous) return state; onEvent?.(state.current, "back"); onEvent?.(previous, "enter"); return { ...state, current: previous } }
export function skip(state: StepState, steps: string[], onEvent?: OnEvent): StepState { onEvent?.(state.current, "skip"); return { ...forward(state, steps, onEvent), skipped: [...new Set([...state.skipped, state.current])] } }
