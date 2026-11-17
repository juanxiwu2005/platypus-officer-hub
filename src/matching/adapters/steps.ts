import type { StepTemplate } from "../../data/types"
import { EVENT_STEPS } from "../../engine/playbooks"
import type { MatchingCommand, MatchingState } from "../contracts"

/** Boundaries are review prompts, never organization-wide job titles or proof of a member's qualifications. */
const boundaries: Record<string, { description: string; compound?: boolean }> = {
  plan: { description: "Own the documented event purpose, scope and operating plan; coordinate specialist inputs without assuming their execution duties." },
  backup: { description: "Produce the agreed fallback plan for event disruptions; obtaining each replacement service remains a separate execution task." },
  venuechoice: { description: "Compare suitable venues and record the selected candidate; booking and school registration are separate work." },
  registry: { description: "Prepare and submit the required event registrations and retain confirmation; split submissions if different access or approvers are required.", compound: true },
  venue: { description: "Submit the venue and layout reservation and retain confirmation; this does not grant access to a school reservation account." },
  moderator: { description: "Confirm who owns moderator selection versus staffing recruitment; separate execution if these require different responsibilities.", compound: true },
  materials: { description: "Separate slide production, signage, decorations and run-of-show materials, or explicitly name one coordinator before assigning.", compound: true },
  checkin: { description: "Separate check-in preparation, photo-release handling and liability paperwork when different responsibilities or approvals apply.", compound: true },
  headcount: { description: "Record the final attendance count from check-in evidence; submitting attendance to a funding system is separate." },
  thankyou: { description: "Prepare and send the approved thank-you communication; recipient approval and financial closeout remain separate." },
  feedback: { description: "Collect feedback and record the reusable retrospective; archive management is a separate responsibility." },
  postmarketing: { description: "Publish approved post-event communications; selecting and retaining source photographs belongs to photo management." },
  photoBackup: { description: "Collect and preserve event photographs in the agreed location; consent decisions and promotional publication are separate." },
  invoice: { description: "Collect and validate invoices for approved commitments; payment execution and purchase approval remain separate." },
  attendance: { description: "Submit documented attendance through the required reporting process; the attendance count itself is a separate input." },
  spending: { description: "Record approved payments or reimbursements using the applicable financial route; this responsibility does not grant spending authority." },
  financeRecord: { description: "Reconcile and retain the event's financial evidence; initiating purchases and approving reimbursement are separate." },
  documentation: { description: "Archive approved event records, final materials and reusable lessons; their production remains with the corresponding responsibilities." },
  partner: { description: "Coordinate the partner meeting and record agreed goals, audience and contributions; specialist delivery is assigned separately." },
  speakerPacket: { description: "Separate speaker agreement/SAP handling from headshot and publicity asset collection when permissions or execution differ.", compound: true },
  travel: { description: "Coordinate confirmed guest travel arrangements and record logistics; split bookings requiring different accounts or approval routes." },
  partnerReview: { description: "Obtain and record the partner's approval of their presentation and materials; creating the materials is separate." },
  parking: { description: "Confirm the appropriate parking or transport arrangements and access instructions; travel purchasing is separate." },
  budget: { description: "Prepare the event budget and funding-source proposal; budget approval and actual purchases remain distinct controlled work." },
  foodCompliance: { description: "Obtain the applicable food exception evidence or permit; sourcing quotes and approving spending remain separate." },
  quotes: { description: "Collect the quote evidence required for the selected purchasing route; do not treat this as purchasing approval." },
  budgetRequest: { description: "Submit the documented budget request and supporting evidence; approving the request is a separate controlled action." },
  budgetApproval: { description: "Obtain and record the funding decision; a responsibility tag cannot grant the authority to approve a budget." },
  purchaseRequest: { description: "Prepare and submit the approved purchase request using the applicable institutional process; approval and ordering are separate." },
  purchaseApproval: { description: "Obtain and record purchase authorization from the proper authority; this step does not place an order." },
  advisor: { description: "Coordinate the advisor participation or signature required by this event; it does not transfer the advisor's authority." },
  access: { description: "Coordinate and verify the required accessibility arrangements with the appropriate specialists; split their implementation where needed." },
  security: { description: "Identify security requirements and obtain the appropriate security arrangements; medical planning and permits remain separate." },
  eams: { description: "Prepare and route the required event and medical safety plan; approved specialist actions require their own execution responsibility." },
  permit: { description: "Separate permit applications from insurance or certificate acquisition when they use different authorities or providers.", compound: true },
  alcohol: { description: "Clarify the alcohol permit, venue and insurance responsibilities before assigning this combined approval route.", compound: true },
  drone: { description: "Obtain the applicable drone or aviation approval; actual operation requires separately confirmed pilot qualifications." },
  schoolApproval: { description: "Obtain and retain the school's administrative approval; the tag does not confer approval authority." },
  marketingNeeds: { description: "Specify the communications deliverables, channels and associated costs; content production and distribution are separate." },
  contentCreation: { description: "Separate copywriting, graphic design and other production specialties, or explicitly confirm one coordination responsibility.", compound: true },
  promotionItems: { description: "Prepare the agreed promotional items or print materials; design approval and purchase authorization remain separate." },
  rsvp: { description: "Configure and open the approved registration form or system; promotion and attendance reporting are separate." },
  content: { description: "Distribute approved campaign assets through the chosen channels; authoring and approving assets are separate." },
  reminder: { description: "Prepare and send the attendee-facing event reminder; this does not configure the platform's task reminder service." },
  orderPlaced: { description: "Place an already authorized order and record confirmation; budget and purchase authorization remain separate controls." },
  finalcheck: { description: "Review all active routes, coordinate readiness and notify changes; clarify the coordinator and split specialist corrective work.", compound: true },
}

export interface StandardMatchingStep { stepId: string; title: string; description: string; status: "draft" | "needs_split"; source: string }
export const STANDARD_MATCHING_STEPS: StandardMatchingStep[] = EVENT_STEPS.map(step => ({
  stepId: step.key, title: step.title, description: boundaries[step.key]?.description ?? step.why,
  status: boundaries[step.key]?.compound ? "needs_split" : "draft", source: step.source,
}))

/** Every missing step is explicitly unresolved; existing human mappings are never replaced by a template name guess. */
export function standardRequirementCommands(state: MatchingState, workflowId = "seo-event", steps: StepTemplate[] = EVENT_STEPS): MatchingCommand[] {
  const seen = new Set<string>()
  return steps.flatMap(step => {
    if (seen.has(step.key) || state.requirements.some(row => row.workflowId === workflowId && row.stepId === step.key)) return []
    seen.add(step.key)
    const standard = STANDARD_MATCHING_STEPS.find(row => row.stepId === step.key)
    return [{ type: "requirement.upsert" as const, value: { id: crypto.randomUUID(), workflowId, stepId: step.key, title: step.title,
      responsibilityId: null, status: standard?.status ?? "draft", origin: "template" as const } }]
  })
}
