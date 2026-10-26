import type { Config } from "@netlify/functions";
import { processAiJob } from "../lib/organization/jobs.mts";
import { runSetupAi } from "./org-ai.mts";
export default async (req: Request) => {
  await processAiJob(req, runSetupAi);
};
// The suffix enables background execution on the deployed Netlify runtime.
export const config: Config = { path: "/api/org/ai-run", method: "POST" };
