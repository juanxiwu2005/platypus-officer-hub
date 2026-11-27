import type { Cheer, DemoState } from "../../data/types"
import { cheerMail } from "../../lib/cheerMail"
import { fullName, joinNames } from "./shared"

/**
 * The email a cheer's recipients got (R1.1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §8.8). Every cheer is emailed by Platypus;
 * the demo sends nothing, records `email: true`, and lets the sender and the recipients read the text here. People the sender
 * let know do not see it: it was addressed to the recipients. Cheers saved before R1.1 without an email show no link.
 */
export const canSeeEmail = (c: Cheer, viewerId: string): boolean => c.email === true && (c.fromId === viewerId || c.toIds.includes(viewerId))

/** The small "Email" control: shows or hides the email text. Its log name is fixed, like every Cheers control. */
export function EmailToggle({ open, onToggle, controls }: { open: boolean; onToggle: () => void; controls: string }) {
  return <button type="button" className="ch-link" aria-expanded={open} aria-controls={controls} data-testid="cheer-email-toggle" data-log-name="cheer-email" onClick={onToggle}>Email</button>
}

/** The text itself: the viewer's own email when they received it, else the first recipient's (each got it with their own name). */
export function EmailText({ s, c, viewerId, id }: { s: DemoState; c: Cheer; viewerId: string; id: string }) {
  const to = c.toIds.includes(viewerId) ? viewerId : c.toIds[0]
  const mail = cheerMail(s, c, to, window.location.href)
  const others = c.toIds.includes(viewerId) ? [] : c.toIds
  return <div className="ch-email" id={id} data-testid="cheer-email-text">
    <p className="ch-email-meta">From Platypus to {c.toIds.includes(viewerId) ? "you" : joinNames(others.map(x => fullName(s, x)))}</p>
    <p className="ch-email-subj">{mail.subject}</p>
    <p className="ch-email-body">{mail.body}</p>
    {others.length > 1 && <p className="ch-email-meta">Each got it with their own name.</p>}
  </div>
}
