import type { AssistantContext } from './protocol';

/** Derive cold/deep-link selections before child effects or lazy pages have mounted. */
export function routeAssistantContext(path: string, search = ''): AssistantContext {
  const rawId=path.match(/\/work\/([^/]+)/)?.[1];
  let workItemId=rawId;
  if(rawId)try{workItemId=decodeURIComponent(rawId);}catch{/* Invalid paths are rejected by server lookup. */}
  const taskId=new URLSearchParams(search).get('task');
  return {
    screen:path.includes('/setup')?'constitution':path.includes('/tasks')?'tasks':path.includes('/activities')?'activities':path.includes('/board')?'board':workItemId?'work':'home',
    ...(workItemId?{workItemId}:{}),
    ...(workItemId&&taskId&&/^[a-zA-Z0-9_-]{1,100}$/.test(taskId)?{taskId}:{}),
  };
}
