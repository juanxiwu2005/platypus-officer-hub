export function handbookSources(s, roleId) {
    const role = s.roles.find(r => r.id === roleId), record = s.handoffRoles.find(r => r.roleId === roleId);
    if (!role)
        return [];
    const tasks = s.nodes.filter(n => n.ownerId === (record?.outgoingId ?? role.holderId) || (!n.ownerId && n.fn === role.fn));
    return [...tasks.map(n => ({ id: `task:${n.id}`, kind: "task", nodeId: n.id, text: `Task: ${n.title}. Purpose: ${n.why || "No purpose recorded"}. Recorded status: ${n.status}.` })), ...(record?.interview ?? []).map((text, i) => ({ id: `interview:${roleId}:${i + 1}`, kind: "interview", text }))];
}
export const sourceFingerprint = (sources) => JSON.stringify(sources);
/** Extractive drafting: the model selects/order sources; every displayed word is from a cited record.
 * Free text, dates, unknown source IDs and all other output fields are discarded. */
export function sanitizeHandbook(raw, sources) {
    const data = raw && typeof raw === "object" ? raw : {};
    const seen = new Set();
    return (Array.isArray(data.entries) ? data.entries : []).slice(0, 12).flatMap(x => {
        const id = x && typeof x === "object" ? x.sourceId : null;
        const source = sources.find(s => s.id === id);
        if (!source || seen.has(source.id))
            return [];
        seen.add(source.id);
        return [{ sourceId: source.id, text: source.text }];
    });
}
export const WEEK_ONE = [
    { id: "confirm", text: "By day 3: acknowledge the role, join the team channel, confirm a buddy and where contact details belong.", source: "SEO New Officer Onboarding §0" },
    { id: "mission", text: "By day 7: align on mission, personal interests, 1–3 outcomes, available resources, expectations and the reporting rhythm; confirm the one-page trust agreement.", source: "SEO Onboarding §1" },
    { id: "systems", text: "By day 7: set up organization email, calendar and systems; find room booking, event registration, funding guidance and the file archive.", source: "SEO Onboarding §3" },
    { id: "r16", text: "Contact the advisor; complete training; read the handbook and constitution; update Sun Devil Central and bank access; calendar spring re-registration.", source: "ASU R16" },
    { id: "leadership", text: "Schedule all six leadership modules within the first month.", source: "SEO Onboarding §2" },
    { id: "followup", text: "Schedule the week-two check and day-30 one-to-one review.", source: "SEO Onboarding §4" },
];
