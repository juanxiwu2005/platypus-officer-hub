import { hiddenUnlessEnabled } from "../lib/serverStorage.mts";
import { v3Request, validateV3, historicalContext, historyRevision, validateSelection, } from "../lib/organization/v3.mts";
import { store } from "../lib/organization/storage.mts";
import { flowResponseSchema } from "../../src/organization/flowResponseSchema.ts";
import { ZodError } from "zod";
import { chatJSON, AIError, getConfig, isAirPreset } from "../lib/ai.mts";
import { routeTask, MODEL_POLICY_VERSION, } from "../../src/organization/modelPolicy.ts";
import { stable } from "../../src/organization/setupLogic.ts";
import { json, readJSON } from "../lib/http.mts";
import { archiveEvent, checkOrigin, acquireAiLease, digest, readSession, recordRun, SetupError, } from "../lib/organization/storage.mts";
import { PROMPTS, PROMPT_VERSION } from "../../src/organization/prompts.ts";
import { STAGES } from "../../src/organization/schema.ts";
import { contextPacket, validateAiOutput, } from "../../src/organization/validation.ts";
import { referenceMemberFlow } from "../../src/organization/presets.ts";
const setting = (name) => {
    const runtime = globalThis;
    return (runtime.Netlify?.env.get(name) ?? process.env[name] ?? "").trim();
};
/** Fingerprint effective execution settings, never credentials or other bindings. */
export function setupCacheProfile(stage, deep, responseSchema) {
    const config = getConfig();
    const route = isAirPreset() && setting("AI_MODEL_ROUTING") !== "off"
        ? routeTask(`setup.${stage}`, deep ? "deep" : "fast")
        : null;
    return {
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: route?.model ?? config.model,
        routeVersion: MODEL_POLICY_VERSION,
        routingEnabled: !!route,
        reasoningEffort: route?.reasoningEffort ?? (setting("AI_REASONING_EFFORT") ||
            (isAirPreset() ? "none" : "")),
        jsonMode: config.jsonMode,
        responseSchema,
    };
}
export const runSetupAi = async (req, timeoutMs = 45000) => {
    let workspaceId = "";
    let phase = "request";
    let release = null;
    try {
        checkOrigin(req);
        const body = await readJSON(req, 12000);
        if (!STAGES.includes(body.stage))
            throw new SetupError("Unknown AI setup step.");
        const stage = body.stage;
        const { entry } = await readSession(req);
        workspaceId = entry.workspaceId;
        if (body.revision !== entry.revision)
            throw new SetupError("Save the latest settings before asking AI.", 409);
        const recent = entry.draft.aiRuns.filter((r) => Date.now() - Date.parse(r.at) < 10 * 60 * 1000);
        if (recent.length >= 30)
            throw new SetupError("Please wait a few minutes before requesting another AI revision.", 429);
        const instruction = typeof body.instruction === "string"
            ? body.instruction.slice(0, 1500)
            : "";
        const v3 = entry.draft.uiVersion === 3;
        let request;
        try {
            const selection = v3
                ? validateSelection(entry.draft, body.selection)
                : undefined;
            request = v3 ? v3Request(entry.draft, stage, instruction, selection) : null;
        }
        catch (e) {
            throw new SetupError(e.message);
        }
        if (request &&
            stage === "edit" &&
            /histor|previous|restore|earlier|以前|历史|恢复/i.test(instruction))
            try {
                Object.assign(request.input, {
                    history: await historicalContext(workspaceId, historyRevision(instruction)),
                });
            }
            catch (e) {
                throw new SetupError(e.message, 404);
            }
        const input = request
            ? JSON.stringify(request.input)
            : JSON.stringify({
                context: contextPacket(entry.draft, stage),
                instruction,
                referencePlaybook: stage === "member_workflow" ? referenceMemberFlow() : undefined,
                currentWorkflow: stage === "member_workflow"
                    ? entry.draft.memberFlow
                    : stage === "board_workflow"
                        ? entry.draft.boardFlow
                        : undefined,
            });
        const system = request?.system ?? PROMPTS[stage]?.system;
        if (!system)
            throw new SetupError("This step no longer requires AI.");
        const promptVersion = request?.version ?? PROMPT_VERSION;
        const cacheKey = `ai-cache/${workspaceId}/${digest(stable([
            promptVersion,
            system,
            JSON.parse(input),
            body.deep === true,
            setupCacheProfile(stage, body.deep === true, request?.responseSchema),
        ]))}`;
        const cache = v3
            ? await store().getWithMetadata(cacheKey, { type: "json" })
            : null;
        await archiveEvent(workspaceId, "ai.requested", {
            stage,
            promptVersion,
            system,
            input: JSON.parse(input),
            mode: body.deep === true ? "deep" : "fast",
        }, "ai");
        if (cache) {
            const prior = cache.data;
            phase = "semantic_validation";
            const data = validateV3(stage, prior.data, entry.draft);
            const run = {
                ...prior.run,
                stage,
                promptVersion,
                at: new Date().toISOString(),
                durationMs: 0,
                cached: true,
            };
            phase = "persistence";
            const saved = await recordRun(req, entry.revision, run);
            await archiveEvent(workspaceId, "ai.cache.hit", { stage, cacheKey, inputHash: digest(input) }, "ai");
            return json({
                result: { ...run, data },
                revision: saved.revision,
                updatedAt: saved.updatedAt,
            });
        }
        release = await acquireAiLease(req, timeoutMs * 2 + 30000);
        phase = "provider";
        const reply = await chatJSON({
            task: `setup.${stage}`,
            mode: body.deep === true ? "deep" : "fast",
            responseSchema: request
                ? request.responseSchema
                : stage.includes("workflow")
                    ? flowResponseSchema(entry.draft)
                    : undefined,
            system,
            onResponse: async (observation) => {
                const archived = await archiveEvent(workspaceId, "ai.provider.response", { stage, promptVersion, ...observation }, "ai");
                await store().setJSON(`diagnostics/${workspaceId}/latest-ai`, {
                    eventId: archived.id,
                });
            },
            user: input,
            maxTokens: v3
                ? stage === "constitution"
                    ? 12000
                    : stage === "edit"
                        ? 5000
                        : stage === "risk_check"
                            ? 7000
                            : 2400
                : stage.includes("workflow")
                    ? 4200
                    : stage === "constitution"
                        ? 3400
                        : 2400,
            temperature: 0.1,
            timeoutMs,
        });
        await archiveEvent(workspaceId, "ai.provider.returned", { stage, reply }, "ai");
        phase = "semantic_validation";
        const data = v3
            ? validateV3(stage, reply.data, entry.draft)
            : validateAiOutput(stage, reply.data, entry.draft, !!instruction);
        const run = {
            stage,
            promptVersion,
            model: reply.model,
            provider: reply.provider,
            at: new Date().toISOString(),
            inputHash: digest(input),
            requestedModel: reply.requestedModel,
            reasoningEffort: reply.reasoningEffort,
            servedReasoningEffort: reply.servedReasoningEffort,
            durationMs: reply.ms,
            routingVersion: reply.routingVersion,
            inputChars: reply.inputChars,
            outputChars: reply.outputChars,
            inputTokens: reply.inputTokens,
            outputTokens: reply.outputTokens,
            finishReason: reply.finishReason,
            headersMs: reply.headersMs,
            firstTokenMs: reply.firstTokenMs,
            queuedMs: typeof body.queuedMs === "number"
                ? Math.max(0, Math.min(body.queuedMs, 600000))
                : undefined,
            clientPreparationMs: typeof body.clientPreparationMs === "number"
                ? body.clientPreparationMs
                : undefined,
            cached: false,
        };
        phase = "persistence";
        if (v3)
            await store().setJSON(cacheKey, { data: reply.data, run });
        const saved = await recordRun(req, entry.revision, run);
        return json({
            result: { ...run, data },
            revision: saved.revision,
            updatedAt: saved.updatedAt,
        });
    }
    catch (e) {
        if (workspaceId)
            await archiveEvent(workspaceId, "ai.rejected", {
                message: e.message,
                classification: e instanceof ZodError ? "schema" : phase,
                code: e instanceof AIError ? e.code : undefined,
                diagnostics: e instanceof AIError ? e.diagnostics : undefined,
            }, "ai").catch(() => { });
        if (e instanceof SetupError)
            return json({ message: e.message }, e.status);
        if (e instanceof AIError)
            return json({ message: e.message, code: e.code }, e.status);
        if (e instanceof ZodError) {
            console.warn("Organization AI schema mismatch", e.issues.map((i) => ({
                path: i.path.join("."),
                code: i.code,
                message: i.message,
            })));
            return json({
                message: `AI returned an incomplete suggestion (${e.issues
                    .slice(0, 4)
                    .map((i) => i.path.join(".") + ": " + i.code)
                    .join(", ")}). Please retry; no settings were applied.`,
            }, 502);
        }
        return json({
            message: "The AI suggestion could not be prepared. No generated changes were applied.",
        }, 502);
    }
    finally {
        if (release)
            await release().catch(() => { });
    }
};
import { startAiJob } from "../lib/organization/jobs.mts";
export default hiddenUnlessEnabled(startAiJob);
export const config = { path: "/api/org/ai", method: ["GET", "POST"] };
