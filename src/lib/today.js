import { topoOrder } from "../engine/schedule";
import { addDays, fromISO } from "./dates";
export function eventStrip(nodes) {
    // Pick the next available step by scheduled start, preserving dependencies. Closing steps
    // have no upstream edges in the playbook, so raw topological order would put them first.
    const remaining = topoOrder(nodes).order.filter(n => n.status !== "done").sort((a, b) => (a.latestStart ?? a.clubDeadline ?? "9999").localeCompare(b.latestStart ?? b.clubDeadline ?? "9999"));
    const known = new Set(nodes.map(n => n.id));
    const finished = new Set(nodes.filter(n => n.status === "done").map(n => n.id));
    const strip = [];
    while (remaining.length && strip.length < 3) {
        const index = remaining.findIndex(n => n.dependsOn.every(id => finished.has(id) || !known.has(id)));
        const [next] = remaining.splice(index < 0 ? 0 : index, 1);
        strip.push(next);
        finished.add(next.id);
    }
    return strip;
}
export function weeklyStars(state) {
    const weekday = fromISO(state.today).getDay();
    const monday = addDays(state.today, -(weekday === 0 ? 6 : weekday - 1));
    const scores = state.people.map(person => {
        const contributions = state.contributions.filter((c, i, all) => c.personId === person.id && all.findIndex(x => x.nodeId === c.nodeId && x.personId === c.personId) === i);
        const valid = contributions.map(c => ({ c, n: state.nodes.find(n => n.id === c.nodeId) })).filter(x => {
            const when = x.c.completedOn ?? x.n?.completedOn ?? x.n?.lastUpdate;
            return x.n?.status === "done" && when && when >= monday && when <= state.today;
        });
        return { person, points: valid.reduce((sum, x) => sum + x.c.points, 0), nodes: valid.map(x => x.n) };
    });
    const top = Math.max(0, ...scores.map(s => s.points));
    return scores.filter(s => s.points > 0 && s.points === top);
}
