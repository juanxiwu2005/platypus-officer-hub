export function begin(steps, onEvent) { const current = steps[0] ?? ""; if (current)
    onEvent?.(current, "enter"); return { current, visited: current ? [current] : [], skipped: [], complete: false }; }
export function forward(state, steps, onEvent) { const next = steps[steps.indexOf(state.current) + 1]; if (!next) {
    onEvent?.(state.current, "complete");
    return { ...state, complete: true };
} onEvent?.(state.current, "leave"); onEvent?.(next, "enter"); return { ...state, current: next, visited: [...new Set([...state.visited, next])] }; }
export function back(state, steps, onEvent) { const previous = steps[steps.indexOf(state.current) - 1]; if (!previous)
    return state; onEvent?.(state.current, "back"); onEvent?.(previous, "enter"); return { ...state, current: previous }; }
export function skip(state, steps, onEvent) { onEvent?.(state.current, "skip"); return { ...forward(state, steps, onEvent), skipped: [...new Set([...state.skipped, state.current])] }; }
