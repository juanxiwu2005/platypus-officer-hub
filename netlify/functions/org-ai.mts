import type { Config } from "@netlify/functions";
import { ZodError } from "zod";
import { chatJSON, AIError } from "../lib/ai.mts";
import { json, readJSON } from "../lib/http.mts";
import {
  checkOrigin,
  acquireAiLease,
  digest,
  readSession,
  recordRun,
  SetupError,
} from "../lib/organization/storage.mts";
import { PROMPTS, PROMPT_VERSION } from "../../src/organization/prompts.ts";
import { STAGES, type Stage } from "../../src/organization/schema.ts";
import {
  contextPacket,
  validateAiOutput,
} from "../../src/organization/validation.ts";
import { referenceMemberFlow } from "../../src/organization/presets.ts";
export default async (req: Request) => {
  let release: (() => Promise<unknown>) | null = null;
  try {
    checkOrigin(req);
    const body = await readJSON(req, 12000);
    if (!STAGES.includes(body.stage as Stage))
      throw new SetupError("Unknown AI setup step.");
    const stage = body.stage as Stage;
    const { entry } = await readSession(req);
    if (body.revision !== entry.revision)
      throw new SetupError("Save the latest settings before asking AI.", 409);
    const recent = entry.draft.aiRuns.filter(
      (r) => Date.now() - Date.parse(r.at) < 10 * 60 * 1000,
    );
    if (recent.length >= 30)
      throw new SetupError(
        "Please wait a few minutes before requesting another AI revision.",
        429,
      );
    const instruction =
      typeof body.instruction === "string"
        ? body.instruction.slice(0, 1500)
        : "";
    const input = JSON.stringify({
      context: contextPacket(entry.draft, stage),
      instruction,
      referencePlaybook:
        stage === "member_workflow" ? referenceMemberFlow() : undefined,
      currentWorkflow:
        stage === "member_workflow"
          ? entry.draft.memberFlow
          : stage === "board_workflow"
            ? entry.draft.boardFlow
            : undefined,
    });
    release = await acquireAiLease(req);
    const reply = await chatJSON({
      system: PROMPTS[stage].system,
      user: input,
      maxTokens: stage.includes("workflow")
        ? 4200
        : stage === "constitution"
          ? 3400
          : 2400,
      temperature: 0.1,
      timeoutMs: 45000,
    });
    const data = validateAiOutput(
      stage,
      reply.data,
      entry.draft,
      !!instruction,
    );
    const run = {
      stage,
      promptVersion: PROMPT_VERSION,
      model: reply.model,
      provider: reply.provider,
      at: new Date().toISOString(),
      inputHash: digest(input),
    };
    const saved = await recordRun(req, entry.revision, run);
    return json({
      result: { ...run, data },
      revision: saved.revision,
      updatedAt: saved.updatedAt,
    });
  } catch (e) {
    if (e instanceof SetupError) return json({ message: e.message }, e.status);
    if (e instanceof AIError)
      return json({ message: e.message, code: e.code }, e.status);
    if (e instanceof ZodError) {
      console.warn(
        "Organization AI schema mismatch",
        e.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
      );
      return json(
        {
          message:
            "AI returned an incomplete suggestion. Please retry; no settings were applied.",
        },
        502,
      );
    }
    return json(
      {
        message:
          "The AI suggestion could not be prepared. No generated changes were applied.",
      },
      502,
    );
  } finally {
    if (release) await release().catch(() => {});
  }
};
export const config: Config = { path: "/api/org/ai", method: "POST" };
