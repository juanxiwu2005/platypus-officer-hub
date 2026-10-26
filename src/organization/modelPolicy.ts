/** Server-selected AIR routing. Client text never chooses an arbitrary model. */
export const MODEL_POLICY_VERSION = "air-task-routing-v1";
export const AIR_MODELS = {
  fast: "gemma4-31b-it",
  reasoning: "glm-5-3",
} as const;
export type AiTask =
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
export function routeTask(task?: AiTask) {
  const deepSetup =
    task === "setup.member_workflow" ||
    task === "setup.board_workflow" ||
    task === "setup.guide";
  const deepSync = task === "command" || task === "plan_draft";
  return {
    model: deepSetup || deepSync ? AIR_MODELS.reasoning : AIR_MODELS.fast,
    // Deliberate low effort for background graphs; synchronous legacy requests stay short.
    reasoningEffort: deepSetup ? ("low" as const) : ("none" as const),
    minOutputTokens: deepSetup ? 7500 : 0,
    version: MODEL_POLICY_VERSION,
  };
}
