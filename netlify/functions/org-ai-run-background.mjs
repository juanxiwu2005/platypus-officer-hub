import { hiddenUnlessEnabled } from "../lib/serverStorage.mts";
import { processAiJob } from "../lib/organization/jobs.mts";
import { runSetupAi } from "./org-ai.mts";
export default hiddenUnlessEnabled(async (req) => {
    await processAiJob(req, runSetupAi);
});
// The suffix enables background execution on the deployed Netlify runtime.
export const config = { path: "/api/org/ai-run", method: "POST" };
