import { useStore } from "../data/store"
export function Feedback({ id, text }: { id: string; text: string }) {
  const {state,dispatch}=useStore()
  const sent=state.feedback.some(f=>f.outputId===id && f.reportedBy===state.viewerId)
  return <button className="btn small" disabled={sent} onClick={()=>dispatch({type:"reportOutput",outputId:id,text})}>{sent?"Reported for review":"This is wrong"}</button>
}
