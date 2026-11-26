import { useStore } from "../../data/store"
import { thankPromptFor } from "../../data/cheers"
import { firstName, fullName, openGiveCheer } from "./shared"
import "../../styles/ch-01-cheers.css"

/** F4 (R1): on a finished task, "Priya finished this. Say thanks?" for anyone who may send but is not the owner. */
export function ThankPrompt({ nodeId }: { nodeId: string }) {
  const { state } = useStore()
  const prompt = thankPromptFor(state, state.viewerId, nodeId)
  if (!prompt) return null
  return <div className="ch-banner" data-testid="thank-prompt">
    <span className="ch-banner-icon" aria-hidden="true">🙌</span>
    <div className="ch-banner-text"><b>{firstName(fullName(state, prompt.ownerId))} finished this.</b><span className="small muted">Say thanks? You write one line about why.</span></div>
    <button type="button" className="btn btn-primary small" data-testid="thank-prompt-give" onClick={() => openGiveCheer({ toIds: [prompt.ownerId], nodeId })}>Give points</button>
  </div>
}
