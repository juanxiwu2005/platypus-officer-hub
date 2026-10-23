import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
export function scoreRuleAnswer(test, answer) {
  if(test.shouldRefuse) return answer?.inScope===false && Array.isArray(answer.citations) && answer.citations.length===0
  const got=answer?.citations
  return answer?.inScope===true && Array.isArray(got) && test.expectedRuleIds.every(id=>got.includes(id)) && got.every(id=>test.expectedRuleIds.includes(id)) && test.expectedRuleIds.every(id=>answer.answer?.includes(`[${id}]`)) && Array.isArray(answer.sourcesChecked) && test.expectedRuleIds.every(id=>answer.sourcesChecked.some(r=>r.id===id&&r.sources?.length&&r.checkedOn))
}
export function summarize(fixtures,receipts) {
 const results=fixtures.map(test=>{const receipt=receipts.find(r=>r.id===test.id);return {id:test.id,pass:!!receipt&&!receipt.error&&scoreRuleAnswer(test,receipt.answer),shouldRefuse:test.shouldRefuse,model:receipt?.answer?.model??null,provider:receipt?.answer?.provider??null}})
 const correct=results.filter(r=>r.pass).length,refusals=results.filter(r=>r.shouldRefuse)
 const models=[...new Set(results.map(r=>r.model).filter(Boolean))]
 return {correct,total:results.length,accuracy:correct/results.length,refusalsCorrect:refusals.filter(r=>r.pass).length,refusalsTotal:refusals.length,passed:correct/results.length>=.9&&refusals.every(r=>r.pass)&&models.length>0,models,results}
}
async function main(){
 const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined
 const fixtures=JSON.parse(await readFile(new URL('../evals/rules.json',import.meta.url),'utf8'))
 let receipts=[]
 if(args.includes('--input'))receipts=JSON.parse(await readFile(get('--input'),'utf8'))
 else {
  const base=get('--base-url')||process.env.EVAL_BASE_URL
  if(!base||!/^https?:\/\//.test(base))throw Error('Supply --base-url for the deployed Netlify app, or --input for browser-collected live receipts. No API keys belong in this script.')
  for(const test of fixtures){try{const r=await fetch(base.replace(/\/$/,'')+'/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:test.question}),signal:AbortSignal.timeout(35000)});if(!r.ok)throw Error('HTTP '+r.status);receipts.push({id:test.id,answer:await r.json()})}catch(e){receipts.push({id:test.id,error:String(e)})}process.stdout.write(test.id+' '+(scoreRuleAnswer(test,receipts.at(-1)?.answer)?'PASS':'FAIL')+'\n')}
 }
 const report={date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),...summarize(fixtures,receipts),receipts}
 if(args.includes('--output'))await writeFile(get('--output'),JSON.stringify(report,null,2)+'\n')
 process.stdout.write(JSON.stringify({...report,results:undefined,receipts:undefined})+'\n')
 if(!report.passed)process.exitCode=1
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
