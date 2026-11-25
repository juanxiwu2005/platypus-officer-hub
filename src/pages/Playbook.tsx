import { PageHead } from "../components/Page"
import { useStore } from "../data/store"
import { questionsFor } from "../data/playbook"

/** Stage A placeholder (Playbook phase 1). The interface agent (P1-U) replaces this page to docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md. */
export default function Playbook() {
  const { state } = useStore()
  return <>
    <PageHead path="/playbook" />
    <ul>{questionsFor(state).map(q => <li key={q.id}>{q.text}</li>)}</ul>
  </>
}
