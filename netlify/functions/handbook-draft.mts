import type { Config } from "@netlify/functions"
import { chatJSON, SYNC_AI_BUDGET_MS } from "../lib/ai.mts"
import { BadRequest,fail,json,readJSON,str } from "../lib/http.mts"
import { HANDBOOK_SYSTEM, handbookPicks, handbookRefs, salvageHandbookPicks, sanitizeHandbook } from "../../src/lib/handbook.ts"
import type { HandbookSource } from "../../src/data/types.ts"
/**
 * /api/handbook/draft — the model picks and orders source records by short ref; every word shown is a record's own text.
 * Production 2026-11-07: with {"entries":[{"sourceId":…}]} and 700 tokens the reply was cut off ("length", bad_json, 502
 * after 21 s). Now the answer is refs only (about 60 tokens for 12), a cut-off reply keeps its complete picks, and the call
 * stops inside SYNC_AI_BUDGET_MS. When it still fails the browser builds the handbook from the same sources (Handoff.tsx).
 */
export default async(req:Request)=>{try{
 const body=await readJSON(req,40_000)
 const sources:HandbookSource[]=(Array.isArray(body.sources)?body.sources:[]).slice(0,100).flatMap(s=>s&&typeof s==="object"&&["task","interview"].includes(s.kind)&&/^(task|interview):[\w:-]+$/.test(s.id)&&str(s.text,1500)?[{id:str(s.id,150),kind:s.kind,text:str(s.text,1500)}]:[])
 if(!sources.length||new Set(sources.map(s=>s.id)).size!==sources.length)throw new BadRequest("Supply unique fictional task/interview source records.")
 const {data,model,provider,truncated}=await chatJSON({ task: "handbook_draft",system:HANDBOOK_SYSTEM,user:JSON.stringify({records:handbookRefs(sources)}),maxTokens:400,timeoutMs:SYNC_AI_BUDGET_MS,salvageTruncated:reply=>salvageHandbookPicks(reply,sources)})
 const entries=sanitizeHandbook(handbookPicks(data,sources),sources)
 if(!entries.length)throw new BadRequest("The AI draft contained no valid source references. Please retry.")
 return json({entries,model,provider,source:"ai",...(truncated?{partial:true}:{})})
}catch(e){return fail(e)}}
export const config:Config={path:"/api/handbook/draft",method:"POST"}
