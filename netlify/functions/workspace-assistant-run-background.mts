import { hiddenUnlessEnabled } from "../lib/serverStorage.mts";
import type { Config } from '@netlify/functions';
import { processAssistantJob } from '../lib/workspaceAssistant/jobs.mts';
export default hiddenUnlessEnabled(async(req:Request)=>{await processAssistantJob(req);});
export const config:Config={path:'/api/workspace/assistant-run',method:'POST'};
