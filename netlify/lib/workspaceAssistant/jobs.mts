import { z } from 'zod';
import { chatJSON, getConfig } from '../ai.mts';
import { routeTask } from '../../../src/organization/modelPolicy.ts';
import { json, readJSON } from '../http.mts';
import { archiveEvent, checkOrigin, digest, readSession, saveSession, readSetupOperationReceipt, SetupError, store, acquireAiLease } from '../organization/storage.mts';
import { historicalContext, historyRevision } from '../organization/v3.mts';
import { stable } from '../../../src/organization/setupLogic.ts';
import { AssistantContextSchema, type AssistantAnswer, type AssistantContext } from '../../../src/workspace/assistant/protocol.ts';
import { loadWorkspace, mutateWorkspace, previewWorkspaceCommand, readWorkspaceReceipt } from '../workspace/storage.mts';
import { validateWorkspaceCommand } from '../workspace/commands.mts';
import { ReadQuerySchema, readWorkspaceData } from './queries.mts';
import { ASSISTANT_PROMPT, ASSISTANT_VERSION, assistantContext, contextPacket, applyOrganizationProposal, validateAnswer } from './engine.mts';

type Job = {
  id:string; status:'queued'|'running'|'done'|'error'; startedAt:number; instruction:string; context:AssistantContext;
  revision:number; setupRevision:number; conversation:{role:'user'|'assistant';text:string}[]; deep:boolean;
  answer?:AssistantAnswer; message?:string; applied?:Record<string,{revision:number;setupRevision:number}>; lastRevision?:number; lastSetupRevision?:number;
};
const key=(workspaceId:string,id:string)=>`workspace-assistant/${workspaceId}/${id}`;
const publicJob=(job:Job)=>({jobId:job.id,status:job.status,...(job.answer?{answer:job.answer}:{}),...(job.message?{message:job.message}:{})});
const failure=(e:unknown)=>e instanceof Error&&'status'in e&&typeof e.status==='number'?json({message:e.message},e.status):e instanceof z.ZodError?json({message:'The assistant request did not pass validation.'},400):json({message:(e as Error).message||'The assistant is unavailable. No changes were applied.'},503);
async function readJob(req:Request,id:string){
  if(!z.string().uuid().safeParse(id).success)throw new SetupError('Select an existing AI request.',400);
  const {entry}=await readSession(req),blob=await store().getWithMetadata(key(entry.workspaceId,id),{type:'json'});
  if(!blob)throw new SetupError('This AI proposal is not available in your workspace.',404);
  return {entry,job:blob.data as Job,etag:blob.etag,key:key(entry.workspaceId,id)};
}
const requestSchema=z.object({action:z.literal('ask'),requestId:z.string().uuid(),revision:z.number().int().min(0),setupRevision:z.number().int().min(0),instruction:z.string().trim().min(1).max(2000),context:AssistantContextSchema,deep:z.boolean().default(false),conversation:z.array(z.object({role:z.enum(['user','assistant']),text:z.string().max(2000)})).max(8).default([])}).strict();
export async function assistantHandler(req:Request){
  try{
    checkOrigin(req);
    if(req.method==='GET'){
      const current=await readJob(req,new URL(req.url).searchParams.get('jobId')??'');
      if(['queued','running'].includes(current.job.status)&&Date.now()-current.job.startedAt>10*60*1000)return json({jobId:current.job.id,status:'error',message:'AI did not finish in time. Your data is unchanged.'});
      return json(publicJob(current.job));
    }
    const body=await readJSON(req,30000);
    if(body.action==='apply')return await applyJob(req,body);
    const request=requestSchema.parse(body),{entry}=await readSession(req),envelope=await loadWorkspace(req);
    const selected=assistantContext(envelope,entry.draft,request.context),jobKey=key(entry.workspaceId,request.requestId),blobs=store();
    const existing=await blobs.getWithMetadata(jobKey,{type:'json'});
    if(existing){const old=existing.data as Job;if(old.instruction!==request.instruction||old.revision!==request.revision||old.setupRevision!==request.setupRevision||stable(old.context)!==stable(selected)||old.deep!==request.deep||stable(old.conversation)!==stable(request.conversation))throw new SetupError('This request ID was already used for different input.',409);return json(publicJob(old),['queued','running'].includes(old.status)?202:200);}
    if(envelope.state.revision!==request.revision||entry.revision!==request.setupRevision)throw new SetupError('Save and reload your latest changes before asking AI.',409);
    const activeKey=`workspace-assistant-active/${entry.workspaceId}`,active=await blobs.getWithMetadata(activeKey,{type:'json'});
    if(active){const previous=active.data as {id:string;at:number};if(Date.now()-previous.at<10*60*1000){const old=await blobs.getWithMetadata(key(entry.workspaceId,previous.id),{type:'json'});if(old&&['queued','running'].includes((old.data as Job).status))throw new SetupError('AI is still preparing your previous request. No second request was started.',429);}}
    const claim=await blobs.setJSON(activeKey,{id:request.requestId,at:Date.now()},active?{onlyIfMatch:active.etag}:{onlyIfNew:true});
    if(!claim.modified)throw new SetupError('Another assistant request started first. Reload its progress.',409);
    const job:Job={id:request.requestId,status:'queued',startedAt:Date.now(),instruction:request.instruction,context:selected,revision:request.revision,setupRevision:request.setupRevision,conversation:request.conversation,deep:request.deep};
    await archiveEvent(entry.workspaceId,'assistant.queued',{...job,version:ASSISTANT_VERSION},'user',job.id+'-queued');
    const saved=await blobs.setJSON(jobKey,job,{onlyIfNew:true});
    if(!saved.modified)return json(publicJob((await readJob(req,job.id)).job),202);
    return json(publicJob(job),202);
  }catch(e){return failure(e);}
}
export async function processAssistantJob(req:Request){
  let current:Awaited<ReturnType<typeof readJob>>|undefined,release:(()=>Promise<unknown>)|undefined,phase='request';
  try{
    checkOrigin(req);const body=z.object({jobId:z.string().uuid()}).strict().parse(await readJSON(req,2000));current=await readJob(req,body.jobId);
    if(current.job.status!=='queued'||Date.now()-current.job.startedAt>10*60*1000)return;
    const job={...current.job,status:'running' as const},claimed=await store().setJSON(current.key,job,{onlyIfMatch:current.etag});
    if(!claimed.modified)return;
    current={...current,job};
    phase='snapshot';
    const envelope=await loadWorkspace(req),{entry}=await readSession(req);
    if(envelope.state.revision!==job.revision||entry.revision!==job.setupRevision)throw new SetupError('Your data changed before AI started. Ask again using the latest version.',409);
    const packet=contextPacket(envelope,entry.draft,assistantContext(envelope,entry.draft,job.context),job.instruction);
    if(/histor|previous|restore|earlier|以前|历史|恢复/i.test(job.instruction))Object.assign(packet,{history:await historicalContext(entry.workspaceId,historyRevision(job.instruction))});
    const input={...packet,instruction:job.instruction,recentConversation:job.conversation};
    const selected=envelope.state.workItems.find(w=>w.id===job.context.workItemId);
    const structure=selected?stable(selected.tasks.map(t=>({id:t.id,title:t.title,dependsOn:[...t.dependsOn].sort(),mode:t.dependencyMode,applicability:t.applicability,roleIds:[...t.roleIds].sort()})).sort((a,b)=>a.id.localeCompare(b.id))):null;
    const config=getConfig(),route=routeTask('setup.edit',job.deep?'deep':'fast');
    const groupCacheKey=selected&&/summari[sz]|group|collapse|phase|stage|分组|汇总|归纳|阶段/i.test(job.instruction)?`workspace-assistant-groups/${entry.workspaceId}/${digest(stable({version:ASSISTANT_VERSION,instruction:job.instruction.trim().toLowerCase(),workItemId:selected.id,structure,provider:config.provider,baseUrl:config.baseUrl,configuredModel:config.model,route}))}`:null;
    const cached=groupCacheKey?await store().getWithMetadata(groupCacheKey,{type:'json'}):null;
    if(cached){const command=validateWorkspaceCommand(cached.data);await previewWorkspaceCommand(req,command);const answer=await validateAnswer({message:'Review these workflow phases. The tasks and their completion states are preserved.',actions:[{kind:'command',command}]},{envelope,draft:entry.draft,instruction:job.instruction,jobId:job.id,validateCommand:validateWorkspaceCommand});await archiveEvent(entry.workspaceId,'assistant.group-cache.hit',{jobId:job.id,cacheKey:groupCacheKey},'ai',job.id+'-cache');await store().setJSON(current.key,{...job,status:'done',answer});return;}
    await archiveEvent(entry.workspaceId,'assistant.requested',{version:ASSISTANT_VERSION,system:ASSISTANT_PROMPT,input,jobId:job.id},'ai',job.id+'-requested');
    release=await acquireAiLease(req,9*60*1000);
    const deadline=Date.now()+450000,toolResults:{queries:unknown[];results:unknown[]}[]=[];
    let finalData:unknown;
    for(let pass=0;pass<3;pass++){
      phase='provider';const remaining=deadline-Date.now();if(remaining<5000)throw new Error('The assistant reached its read time limit. Please name one activity or task.');
      const user=JSON.stringify({...input,...(toolResults.length?{toolResults}:{})});
      if(user.length>180000)throw new Error('Please narrow this question to one activity or task so the assistant can read the relevant records.');
      if(pass)await archiveEvent(entry.workspaceId,'assistant.tool.requested',{jobId:job.id,pass,toolResults:toolResults.at(-1)},'ai',job.id+'-tool-request-'+pass);
      const reply=await chatJSON({task:'setup.edit',mode:job.deep?'deep':'fast',system:ASSISTANT_PROMPT,user,maxTokens:6500,temperature:0.1,timeoutMs:remaining,onResponse:async observation=>{await archiveEvent(entry.workspaceId,'assistant.provider.response',{jobId:job.id,pass,version:ASSISTANT_VERSION,...observation},'ai',job.id+'-provider-'+pass);}});
      await archiveEvent(entry.workspaceId,'assistant.provider.returned',{jobId:job.id,pass,reply},'ai',job.id+'-returned-'+pass);
      phase='query_validation';
      const reads=reply.data&&typeof reply.data==='object'&&!Array.isArray(reply.data)?(reply.data as {reads?:unknown}).reads:undefined;
      if(reads!==undefined){const queries=z.array(ReadQuerySchema).max(5).parse(reads);if(queries.length){
        if(pass===2)throw new Error('Please identify the activity or task more precisely; this question needs more records than one bounded request can read.');
        const actions=(reply.data as {actions?:unknown}).actions;if(Array.isArray(actions)&&actions.length)throw new Error('Read the requested records before proposing changes.');
        const results=await Promise.all(queries.map(query=>query.entity==='history'?historicalContext(entry.workspaceId,query.revision):Promise.resolve(readWorkspaceData(envelope,entry.draft,query))));toolResults.push({queries,results});
        await archiveEvent(entry.workspaceId,'assistant.read',{jobId:job.id,pass,queries,results},'ai',job.id+'-read-'+pass);continue;
      }}
      finalData=reply.data;break;
    }
    phase='semantic_validation';
    const answer=await validateAnswer(finalData,{envelope,draft:entry.draft,instruction:job.instruction,jobId:job.id,validateCommand:validateWorkspaceCommand,preview:command=>previewWorkspaceCommand(req,command)});
    if(groupCacheKey&&answer.actions.length===1&&answer.actions[0].kind==='command'&&answer.actions[0].command.type==='work.stages')await store().setJSON(groupCacheKey,answer.actions[0].command);
    await archiveEvent(entry.workspaceId,'assistant.proposed',{jobId:job.id,answer},'ai',job.id+'-proposed');
    phase='persistence';await store().setJSON(current.key,{...job,status:'done',answer});
  }catch(e){
    if(current){await archiveEvent(current.entry.workspaceId,'assistant.failed',{jobId:current.job.id,phase,message:(e as Error).message,code:(e as {code?:string}).code,diagnostics:(e as {diagnostics?:unknown}).diagnostics},'system',current.job.id+'-failed').catch(()=>{});await store().setJSON(current.key,{...current.job,status:'error',message:(e as Error).message}).catch(()=>{});}
  }finally{await release?.().catch(()=>{});}
}
type Outcome={revision:number;setupRevision:number};
type ApplyIntent={requestId:string;revision:number;setupRevision:number;draft?:ReturnType<typeof applyOrganizationProposal>};
async function markApplied(req:Request,jobId:string,index:number,outcome:Outcome){
  for(let attempt=0;attempt<5;attempt++){
    const fresh=await readJob(req,jobId);
    if(fresh.job.applied?.[index])return fresh.job.applied[index];
    const saved=await store().setJSON(fresh.key,{...fresh.job,lastRevision:Math.max(fresh.job.lastRevision??fresh.job.revision,outcome.revision),lastSetupRevision:Math.max(fresh.job.lastSetupRevision??fresh.job.setupRevision,outcome.setupRevision),applied:{...fresh.job.applied,[index]:outcome}},{onlyIfMatch:fresh.etag});
    if(saved.modified)return outcome;
  }
  throw new SetupError('The change was committed, but its acknowledgement is pending. Retry this same approval; do not create another AI request.',503);
}
async function appliedResponse(req:Request,jobId:string,index:number,outcome:Outcome){
  const {entry}=await readSession(req);
  await archiveEvent(entry.workspaceId,'assistant.applied',{jobId,actionIndex:index,...outcome},'system',jobId+'-applied-'+index);
  return json({status:'applied',...outcome});
}
async function applyJob(req:Request,raw:unknown){
  const body=z.object({action:z.literal('apply'),requestId:z.string().uuid(),jobId:z.string().uuid(),actionIndex:z.number().int().min(0).max(19)}).strict().parse(raw),current=await readJob(req,body.jobId),job=current.job;
  if(job.status!=='done'||!job.answer)throw new SetupError('Wait for a complete proposal before approving.',409);
  const action=job.answer.actions[body.actionIndex];if(!action||!['command','organization'].includes(action.kind))throw new SetupError('Open the suggested form or page instead.',400);
  if(job.applied?.[body.actionIndex])return appliedResponse(req,job.id,body.actionIndex,job.applied[body.actionIndex]);
  const hash=digest(`${job.id}:${body.actionIndex}`),requestId=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const intentKey=`workspace-assistant-intents/${current.entry.workspaceId}/${job.id}/${body.actionIndex}`,blobs=store();
  const prior=await blobs.getWithMetadata(intentKey,{type:'json'});let intent=prior?.data as ApplyIntent|undefined;
  // Receipts are read BEFORE stale-version checks: the previous attempt may have committed
  // successfully even if the network or the job acknowledgement failed afterwards.
  if(intent){
    const receipt=action.kind==='command'?await readWorkspaceReceipt(req,intent.requestId,action.command):await readSetupOperationReceipt(req,intent.requestId);
    if(receipt){const outcome={revision:action.kind==='command'?receipt.revision:intent.revision,setupRevision:action.kind==='organization'?receipt.revision:intent.setupRevision};await markApplied(req,job.id,body.actionIndex,outcome);return appliedResponse(req,job.id,body.actionIndex,outcome);}
  }
  const workspace=await loadWorkspace(req),revision=job.lastRevision??job.revision,setupRevision=job.lastSetupRevision??job.setupRevision;
  if(workspace.state.revision!==revision||current.entry.revision!==setupRevision)throw new SetupError('Your data changed after this proposal. Ask AI to review the latest version before applying.',409);
  const actor=workspace.state.members.find(m=>m.id===workspace.state.actorId);
  if(action.kind==='organization'&&actor&&actor.access!=='manager')throw new SetupError('Use a demo manager to change organization settings.',403);
  const leaseKey=`workspace-assistant-apply/${current.entry.workspaceId}/${job.id}`,lease=await blobs.getWithMetadata(leaseKey,{type:'json'});
  if(lease&&Date.now()-(lease.data as {at:number}).at<5*60000)throw new SetupError('Another change from this proposal is being applied. Check its result before retrying.',409);
  const claim=await blobs.setJSON(leaseKey,{at:Date.now(),token:body.requestId},lease?{onlyIfMatch:lease.etag}:{onlyIfNew:true});if(!claim.modified)throw new SetupError('Another approval started first.',409);
  try{
    if(!intent){
      intent={requestId,revision,setupRevision,...(action.kind==='organization'?{draft:applyOrganizationProposal(current.entry.draft,action.proposal)}:{})};
      const saved=await blobs.setJSON(intentKey,intent,{onlyIfNew:true});
      if(!saved.modified){const existing=await blobs.getWithMetadata(intentKey,{type:'json'});intent=existing?.data as ApplyIntent|undefined;if(!intent)throw new SetupError('The approval intent could not be recovered.',503);}
    }
    if(intent.revision!==revision||intent.setupRevision!==setupRevision)throw new SetupError('This approval was prepared for an earlier version. Compare the latest data before continuing.',409);
    await archiveEvent(current.entry.workspaceId,'assistant.approved',{jobId:job.id,actionIndex:body.actionIndex,action,operationId:intent.requestId},'user',job.id+'-approved-'+body.actionIndex);
    let resultingRevision=revision,resultingSetupRevision=setupRevision;
    if(action.kind==='command'){
      await mutateWorkspace(req,{requestId:intent.requestId,revision:intent.revision,command:action.command});
      const receipt=await readWorkspaceReceipt(req,intent.requestId,action.command);if(!receipt)throw new SetupError('The command receipt is unavailable. Retry this same approval.',503);resultingRevision=receipt.revision;
    }else if(action.kind==='organization'){
      await saveSession(req,intent.draft,intent.setupRevision,false,intent.requestId);
      const receipt=await readSetupOperationReceipt(req,intent.requestId);if(!receipt)throw new SetupError('The setup receipt is unavailable. Retry this same approval.',503);resultingSetupRevision=receipt.revision;
    }
    const outcome={revision:resultingRevision,setupRevision:resultingSetupRevision};
    await markApplied(req,job.id,body.actionIndex,outcome);
    return await appliedResponse(req,job.id,body.actionIndex,outcome);
  }finally{
    const latest=await blobs.getWithMetadata(leaseKey,{type:'json'}).catch(()=>null);
    if(latest&&(latest.data as {token?:string}).token===body.requestId)await blobs.setJSON(leaseKey,{at:0,token:''},{onlyIfMatch:latest.etag}).catch(()=>{});
  }
}
