import { useState } from "react"
import { useStore } from "../data/store"
import { callApi } from "../lib/api"
import { groundedAnswer, type RuleAnswer } from "../lib/ruleAnswers"
import { Feedback } from "./Feedback"
export function RuleQuestion({ initial = "" }: { initial?: string }) {
  const {state}=useStore()
  const [question,setQuestion]=useState(initial),[answer,setAnswer]=useState<RuleAnswer|null>(null),[busy,setBusy]=useState(false),[label,setLabel]=useState("")
  async function ask() {
    setBusy(true);setAnswer(null)
    try {
      if(!state.aiEnabled) throw new Error("AI off")
      const r=await callApi<RuleAnswer>("/ask",{question})
      // Rebuild claims from the local checked book, ignoring AI prose/dates.
      setAnswer(groundedAnswer({...r,confidence:1},r.model,r.provider));setLabel(`AI rule selection · ${r.provider??"configured provider"} · ${r.model??"unknown model"}`)
    } catch {setAnswer(groundedAnswer({},null));setLabel("Live AI unavailable or off · no AI answer was generated")}
    finally{setBusy(false)}
  }
  return <section className="card form-stack" aria-label="Ask about a rule"><h2>Ask about a rule</h2><label>Rule question<input maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)}/></label><button className="btn btn-primary" disabled={busy||!question.trim()} onClick={ask}>{busy?"Checking sources…":"Ask rule question"}</button>{answer&&<article data-testid="rule-answer"><p className="small muted">{label}</p><p style={{whiteSpace:"pre-line"}}>{answer.answer}</p><Feedback id={`ask:${question}:${answer.answer}`} text={answer.answer}/><details><summary>Sources checked</summary><p className="small muted">The server supplied R01–R16 to the model. Source texts were last checked on the dates below; they were not re-fetched during this answer. Full policy recheck is scheduled for WP6.</p>{answer.sourcesChecked.map(r=><div key={r.id} className="small"><b>{r.id}{answer.citations.includes(r.id)?" · cited":""}</b> · checked {r.checkedOn}{r.sources.map(s=><p key={s.url}><a target="_blank" rel="noreferrer" href={s.url}>{s.label}</a></p>)}</div>)}</details></article>}</section>
}
