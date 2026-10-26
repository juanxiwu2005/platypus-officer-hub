import { AIR_MODELS, MODEL_POLICY_VERSION } from "../../src/organization/modelPolicy.ts";
import type { Config } from "@netlify/functions";
import { getConfig, isConfigured } from "../lib/ai.mts";
import { json } from "../lib/http.mts";
import { readSession, archiveEvent } from "../lib/organization/storage.mts";
/** Optional catalog check validates credentials/models without generating tokens. */
export default async (req:Request) => {
  const c=getConfig(), base={ok:true,configured:isConfigured(c),provider:c.label,model:c.model||null,...(c.label==="ASU AIR" ? {routing:{version:MODEL_POLICY_VERSION,models:AIR_MODELS}} : {})};
  if(new URL(req.url).searchParams.get("check")!=="1") return json(base);
  let workspaceId="";
  try {
    const {entry}=await readSession(req);workspaceId=entry.workspaceId;
    if(!isConfigured(c)||c.label!=="ASU AIR"||new URL(c.baseUrl).hostname!=="openai.rc.asu.edu") return json({...base,connection:{ok:false,message:"Set AI_PRESET=asu_air and the AIR model/key before checking."}});
    const response=await fetch(c.baseUrl+"/models",{headers:{authorization:`Bearer ${c.key}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok){const result={ok:false,status:response.status,message:response.status===401 ? "ASU AIR rejected the current server key." : "The AIR model catalog could not be read."};await archiveEvent(workspaceId,"ai.connection.checked",result);return json({...base,connection:result});}
    const catalog=await response.json() as {data?:{id:string}[]};
    const ids=(catalog.data||[]).map(m=>m.id);
    const result={ok:true,status:response.status,fastModelAvailable:ids.includes(AIR_MODELS.fast),deepModelAvailable:ids.includes(AIR_MODELS.reasoning),generationPerformed:false};
    await archiveEvent(workspaceId,"ai.connection.checked",result);
    return json({...base,connection:result});
  }catch(e){return json({...base,connection:{ok:false,message:workspaceId ? "The AIR catalog check timed out or failed." : "Open Organization Setup before checking the connection."}});}
};
export const config:Config={path:"/api/health",method:"GET"};
