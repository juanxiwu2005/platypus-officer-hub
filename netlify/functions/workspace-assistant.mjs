import { hiddenUnlessEnabled } from "../lib/serverStorage.mts";
import { assistantHandler } from '../lib/workspaceAssistant/jobs.mts';
export default hiddenUnlessEnabled(assistantHandler);
export const config = { path: '/api/workspace/assistant', method: ['GET', 'POST'] };
