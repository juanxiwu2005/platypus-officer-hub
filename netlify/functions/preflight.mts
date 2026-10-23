import type { Config } from "@netlify/functions"
import { checkPreflight } from "../../src/lib/preflight.ts"
import { fail,json,readJSON } from "../lib/http.mts"
export default async(req:Request)=>{try{const body=await readJSON(req);return json({...checkPreflight(body),source:"checked rules",model:null})}catch(e){return fail(e)}}
export const config:Config={path:"/api/preflight",method:"POST"}
