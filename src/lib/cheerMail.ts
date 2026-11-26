import type { Cheer, DemoState } from "../data/types"

/**
 * Cheer email draft (R1). STAGE A PLACEHOLDER: agent R1-M replaces the bodies (docs/feedback-fix/CHEERS_R1_CONTRACT.md §4).
 * Signatures are frozen. Nothing here sends mail: the interface opens a draft the sender sends themselves.
 */
export const cheerLink = (baseUrl: string, cheerId: string): string => `${baseUrl.replace(/#.*$/, "")}#/?cheer=${encodeURIComponent(cheerId)}`
export function cheerMail(s: DemoState, cheer: Cheer, recipientId: string, baseUrl: string): { subject: string; body: string; url: string } {
  void s; void recipientId
  const url = cheerLink(baseUrl, cheer.id)
  return { subject: `⭐ ${cheer.points} points`, body: `${cheer.note}\n\n${url}`, url }
}
