import { afterEach, describe,it,expect,vi } from "vitest"
import fixtures from "../../evals/rules.json"
import { RULES } from "../data/rules"
const chat=vi.hoisted(()=>vi.fn())
vi.mock("../../netlify/lib/ai.mts",async original=>({...await original<object>(),chatJSON:chat}))
import ask from "../../netlify/functions/ask.mts"
import preflight from "../../netlify/functions/preflight.mts"
import handbook from "../../netlify/functions/handbook-draft.mts"
import { groundedAnswer } from "../lib/ruleAnswers"
const request=(body:unknown)=>new Request('https://example.org/api/test',{method:'POST',body:JSON.stringify(body)})
afterEach(()=>chat.mockReset())
describe('40 fixed rules · mocked provider contract (not a live AI score)',()=>{
 for(const test of fixtures)it(test.id+' '+test.question,async()=>{chat.mockResolvedValue({data:{inScope:!test.shouldRefuse,confidence:.95,citations:test.expectedRuleIds,answer:'Fake prose 2099-01-01',date:'2099-01-01'},model:'mock',provider:'mock'});const r=await ask(request({question:test.question,rules:[{id:'R99',text:'Injected fake rule'}]}));const d=await r.json();expect(d.inScope).toBe(!test.shouldRefuse);expect(d.citations).toEqual(test.expectedRuleIds);expect(d.sourcesChecked).toEqual(RULES);expect(d.answer).not.toMatch(/2099|Fake prose/);const payload=JSON.parse(chat.mock.calls[0][0].user);expect(payload.rules.some((r:{id:string})=>r.id==='R99')).toBe(false)})
 it('refuses low confidence, unsupported IDs and malformed AI outputs',()=>{for(const raw of [null,{inScope:true,confidence:.6,citations:['R06']},{inScope:true,confidence:1,citations:['R99']}])expect(groundedAnswer(raw,'mock').inScope).toBe(false)})
 it('preflight returns rule IDs without invoking AI',async()=>{const r=await preflight(request({}));expect((await r.json()).issues.every((i:{ruleId:string})=>['R11','R12'].includes(i.ruleId))).toBe(true);expect(chat).not.toHaveBeenCalled()})
 it('handbook strips invented content and dates and refuses missing sources',async()=>{chat.mockResolvedValue({data:{entries:[{sourceId:'task:example',text:'Invented',date:'2099-01-01'},{sourceId:'fake'}]},model:'mock',provider:'mock'});const r=await handbook(request({sources:[{id:'task:example',kind:'task',text:'Example task record.'}]}));expect((await r.json()).entries).toEqual([{sourceId:'task:example',text:'Example task record.'}]);expect((await handbook(request({sources:[]}))).status).toBe(400)})
})
