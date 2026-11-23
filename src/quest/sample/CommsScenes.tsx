/** Typed stage adapter: returns the matching comms scene with the shell's props. No logic, state or styles here. */
import HandOff from "./HandOff"
import Promotion from "./Promotion"
import type { SampleDraft } from "./model"

export interface CommsScenesProps { stage: "handoff" | "promotion"; draft: SampleDraft; onEdit: (values: Partial<SampleDraft>) => void; onCheck: () => void }

export default function CommsScenes({ stage, draft, onEdit, onCheck }: CommsScenesProps) {
  return stage === "handoff" ? <HandOff draft={draft} onEdit={onEdit} onCheck={onCheck} /> : <Promotion draft={draft} onEdit={onEdit} onCheck={onCheck} />
}
