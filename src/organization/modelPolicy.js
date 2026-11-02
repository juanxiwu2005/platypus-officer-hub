/** Server-selected AIR routing. Client text never chooses an arbitrary model. */
export const MODEL_POLICY_VERSION = "air-task-routing-v3";
export const AIR_MODELS = {
    fast: "muse-glimmer-30b",
    structured: "gemma4-31b-it",
    reasoning: "glm-5-3",
};
export function routeTask(task, mode = "fast") {
    const deep = mode === "deep" && !!task?.startsWith("setup.");
    return {
        model: deep
            ? AIR_MODELS.reasoning
            : task?.startsWith("setup.") && task !== "setup.edit"
                ? AIR_MODELS.structured
                : AIR_MODELS.fast,
        reasoningEffort: deep ? "low" : "none",
        minOutputTokens: deep ? 7500 : 0,
        version: MODEL_POLICY_VERSION,
    };
}
