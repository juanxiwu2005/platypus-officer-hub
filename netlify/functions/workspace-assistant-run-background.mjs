import { hiddenUnlessEnabled } from "../lib/serverStorage.mts";
import { processAssistantJob } from '../lib/workspaceAssistant/jobs.mts';
export default hiddenUnlessEnabled(async (req) => { await processAssistantJob(req); });
export const config = { path: '/api/workspace/assistant-run', method: 'POST' };
