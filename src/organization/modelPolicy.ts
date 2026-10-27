/** Server-selected AIR routing. Client text never chooses an arbitrary model. */
export const MODEL_POLICY_VERSION = "air-task-routing-v3";
export const AIR_MODELS = {
  fast: "muse-glimmer-30b",
  structured: "gemma4-31b-it",
  reasoning: "glm-5-3",
} as const;
export type AiTask =
  | "setup.risk_check"
  | "setup.edit"
  | "setup.constitution"
  | "setup.responsibilities"
  | "setup.member_workflow"
  | "setup.board_workflow"
  | "setup.guide"
  | "chat"
  | "ask"
  | "parse_brief"
  | "classify"
  | "command"
  | "plan_draft"
  | "handbook_draft"
  | "nudge_draft";
export function routeTask(task?: AiTask, mode: "fast" | "deep" = "fast") {
  const deep = mode === "deep" && !!task?.startsWith("setup.");
  return {
    model: deep
      ? AIR_MODELS.reasoning
      : task?.startsWith("setup.") && task !== "setup.edit"
        ? AIR_MODELS.structured
        : AIR_MODELS.fast,
    reasoningEffort: deep ? ("low" as const) : ("none" as const),
    minOutputTokens: deep ? 7500 : 0,
    version: MODEL_POLICY_VERSION,
  };
}
