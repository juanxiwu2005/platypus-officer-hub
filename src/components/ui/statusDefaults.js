/** Default status words and colours (v1.1). Kept free of React so the store can use them. */
export const STATUS_ORDER = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"];
export const STATUS_DEFAULTS = {
    unclaimed: { label: "Not claimed", color: "#5f6763" },
    accepted: { label: "To do", color: "#3a6fd8" },
    in_progress: { label: "Working on it", color: "#b25c00" },
    waiting: { label: "Waiting", color: "#8656cc" },
    blocked: { label: "Stuck", color: "#c0362f" },
    done: { label: "Done", color: "#237a42" },
};
/** Every colour keeps white text at WCAG AA contrast (4.5:1). */
export const PALETTE = ["#5f6763", "#3a6fd8", "#b25c00", "#8656cc", "#c0362f", "#237a42", "#0d7373", "#b0367c", "#86650f", "#4a5568"];
