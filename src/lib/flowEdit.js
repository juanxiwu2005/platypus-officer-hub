import { END_KEY, EVENT_KEY, START_KEY } from "../components/flow/metro";
import { ancestorsOf, createsLoop, reduceDeps } from "./stepOrder";
/**
 * Editing the event's flow chart directly (drag a step to a new place, add a step, delete a step, cut a link).
 * Pure functions: each one turns a gesture into changes to the steps' "waits for" links (and, for a new or deleted step, the step itself).
 * No date is read or written here; the rule engine dates everything afterwards, and the chart redraws from the result.
 * Same philosophy as lib/stepOrder.ts: a move changes the links of the few steps it names, never rebuilds the whole graph.
 */
const uniq = (a) => [...new Set(a)];
const ok = (edits, message, note) => ({ edits, message, ...(note ? { note } : {}) });
const fail = (error) => ({ edits: [], message: error, error });
const noop = (message) => ({ edits: [], message });
const q = (n) => `“${n?.title ?? "that step"}”`;
const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
/**
 * Take step `r` out of where it is and put it between `u` and `v` (either can be missing: the start, or the event day).
 * Whoever waited for `r` now waits for what `r` waited for; `r` then waits for `u`, and `v` waits for `r` instead of `u`.
 */
export function moveBetween(nodes, rId, uId, vId) {
    const by = new Map(nodes.map(n => [n.id, n]));
    const r = by.get(rId), u = uId ? by.get(uId) : null, v = vId ? by.get(vId) : null;
    if (!r || (uId && !u) || (vId && !v))
        return fail("Pick steps that are in this event.");
    if (uId === rId || vId === rId)
        return noop("No change.");
    if (uId && vId && uId === vId)
        return fail("Pick two different steps.");
    const deps = new Map(nodes.map(n => [n.id, [...n.dependsOn]]));
    const kids = nodes.filter(n => n.dependsOn.includes(rId));
    for (const k of kids)
        deps.set(k.id, uniq([...deps.get(k.id).filter(d => d !== rId), ...r.dependsOn]));
    deps.set(rId, uId ? [uId] : []);
    if (vId)
        deps.set(vId, uniq([...deps.get(vId).filter(d => d !== uId), rId]));
    const touched = uniq([rId, ...kids.map(k => k.id), ...(vId ? [vId] : [])]);
    const after = nodes.map(n => (touched.includes(n.id) ? { ...n, dependsOn: deps.get(n.id) } : n));
    const edits = [];
    for (const id of touched) {
        const reduced = reduceDeps(after, deps.get(id));
        if (!same(reduced, by.get(id).dependsOn))
            edits.push({ id, patch: { dependsOn: reduced } });
    }
    if (!edits.length)
        return noop(`${q(r)} is already there.`);
    const loop = createsLoop(nodes, edits);
    if (loop)
        return fail(`That would make ${q(by.get(loop))} wait for itself, so ${q(r)} was not moved.`);
    const where = u && v ? `between ${q(u)} and ${q(v)}` : u ? `after ${q(u)}` : v ? `before ${q(v)}` : "to the start";
    return ok(edits, `Moved ${q(r)} ${where}.`, r.ruleIds.length ? "It keeps its ASU deadline; only when it can start changes." : undefined);
}
/** Cut the direct link "waiter waits for waitee". The two steps then run side by side (unless another path still joins them). */
export function unlinkSteps(nodes, waiterId, waiteeId) {
    const waiter = nodes.find(n => n.id === waiterId), waitee = nodes.find(n => n.id === waiteeId);
    if (!waiter || !waitee)
        return fail("Pick steps that are in this event.");
    if (!waiter.dependsOn.includes(waiteeId)) {
        return ancestorsOf(nodes, waiterId).has(waiteeId)
            ? fail(`${q(waiter)} waits for ${q(waitee)} through other steps. Cut a link on that path instead.`)
            : noop(`${q(waiter)} does not wait for ${q(waitee)}. The line only shows their order.`);
    }
    const edits = [{ id: waiterId, patch: { dependsOn: waiter.dependsOn.filter(d => d !== waiteeId) } }];
    const still = ancestorsOf(nodes.map(n => (n.id === waiterId ? { ...n, dependsOn: edits[0].patch.dependsOn } : n)), waiterId).has(waiteeId);
    return ok(edits, `${q(waiter)} no longer waits for ${q(waitee)}.`, still ? "They are still joined through other steps, so their order does not change." : undefined);
}
/** Why a step cannot be deleted, or null. Steps ASU rules need, and steps already finished, stay. */
export function cannotDelete(n) {
    if (n.ruleIds.length)
        return `ASU rule ${n.ruleIds.join(", ")} needs this step.`;
    if (n.status === "done")
        return "It is already done and counts toward the contribution board.";
    return null;
}
/** Whoever waited for the step now waits for what it waited for. */
export function removalEdits(nodes, id) {
    const gone = nodes.find(n => n.id === id);
    if (!gone)
        return [];
    const after = nodes.filter(n => n.id !== id).map(n => (n.dependsOn.includes(id) ? { ...n, dependsOn: uniq([...n.dependsOn.filter(d => d !== id), ...gone.dependsOn]) } : n));
    return nodes.filter(n => n.dependsOn.includes(id)).map(k => ({ id: k.id, patch: { dependsOn: reduceDeps(after, after.find(a => a.id === k.id).dependsOn) } }));
}
/** A new step made in the chart: one working day, no owner yet (it shows up in the details panel to fill in), same phase and kind of work as its neighbour. */
export function newStepNode(ev, id, ref, today) {
    return {
        id, title: "New step", eventId: ev.id, stepKey: null, phase: ref?.phase ?? "prepare", fn: ref?.fn ?? "programs", ownerId: null, approverRoleId: ref?.approverRoleId ?? null,
        consultedRoleIds: [], informedRoleIds: [], dependsOn: [], tier: "light", estDays: 1, anchor: null, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null,
        ruleIds: [], status: "unclaimed", acceptedOn: null, waitingOn: null, draftLink: null, why: "Added in the flow chart.", source: "Added by you", lastUpdate: null, assignedOn: today, ownerVersion: 0,
    };
}
/** The main line and every branch as lists of neighbours, each branch starting and ending on a main-line station. */
export function flowTracks(L) {
    const main = { id: "main", items: L.stations.map(s => ({ key: s.key, node: s.node, col: s.col, row: 0 })) };
    const branches = L.branches.map(b => ({
        id: b.id,
        items: [
            { key: L.stations[b.from].key, node: L.stations[b.from].node, col: L.stations[b.from].col, row: 0 },
            ...b.nodes.map(x => ({ key: x.node.id, node: x.node, col: x.col, row: b.row })),
            { key: L.stations[b.to]?.key ?? END_KEY, node: L.stations[b.to]?.node ?? null, col: L.stations[b.to]?.col ?? (L.cols + 1), row: 0 },
        ],
    }));
    return [main, ...branches];
}
/** Every place a step can be dropped: between two neighbours on a track. Nothing is offered right after the event day (that is the "Close" group's own business). */
export function flowGaps(L) {
    const out = [];
    for (const t of flowTracks(L)) {
        t.items.slice(0, -1).forEach((u, i) => {
            const v = t.items[i + 1];
            if (u.key === EVENT_KEY)
                return;
            const branchRow = t.items.find(x => x.row !== 0)?.row ?? 0;
            out.push({ id: `${t.id}:${u.key}:${v.key}`, track: t.id, uId: u.node?.id ?? null, vId: v.node?.id ?? null, u, v, col: (u.col + v.col) / 2, row: t.id === "main" ? 0 : branchRow });
        });
    }
    return out;
}
export const isVirtual = (key) => key === START_KEY || key === EVENT_KEY || key === END_KEY;
/** The neighbours of a step on its own track (the main line first, since main-line steps also start and end branches). */
export function neighboursOf(L, nodeId) {
    for (const t of flowTracks(L)) {
        const i = t.items.findIndex(x => x.node?.id === nodeId && (t.id === "main" || (x.row !== 0)));
        if (i >= 0)
            return { prev: t.items[i - 1] ?? null, next: t.items[i + 1] ?? null };
    }
    return { prev: null, next: null };
}
