import type { Config } from '@netlify/functions';
import { assistantHandler } from '../lib/workspaceAssistant/jobs.mts';
export default assistantHandler;
export const config:Config={path:'/api/workspace/assistant',method:['GET','POST']};
