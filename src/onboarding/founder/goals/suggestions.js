import { validateGoals } from "../../../data/settings";
import { onboardingCopy } from "../../copy";
const items = onboardingCopy.founder.goals.items;
export const SUGGESTIONS = [
    { id: "goal-weekly-events", label: items.events.label, unit: items.events.unit, target: 1, step: 1 },
    { id: "goal-active-members", label: items.members.label, unit: items.members.unit, target: 40, step: 5 },
    { id: "goal-external-income", label: items.income.label, unit: items.income.unit, target: 500, step: 100 },
];
export const MIN_TARGET = 1;
export const MAX_TARGET = 1000000;
/** How many goals start switched on when the president has not chosen yet. */
export const DEFAULT_ON = 2;
export const clampTarget = (n) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(n)));
/** The rows to show: from goals already in the draft when they are ours, otherwise the first two suggestions switched on. */
export function rowsFrom(goals) {
    const mine = goals.filter(g => SUGGESTIONS.some(s => s.id === g.id));
    if (!mine.length)
        return SUGGESTIONS.map((s, i) => ({ id: s.id, on: i < DEFAULT_ON, target: s.target }));
    return SUGGESTIONS.map(s => { const g = mine.find(x => x.id === s.id); return { id: s.id, on: !!g, target: g?.target ?? s.target }; });
}
/** The goals that go into the draft: only the rows switched on, progress at zero (the club has not done anything yet). */
export function goalsFrom(rows) {
    return rows.flatMap(r => {
        const s = SUGGESTIONS.find(x => x.id === r.id);
        return r.on && s ? [{ id: s.id, label: s.label, unit: s.unit, target: r.target, current: 0 }] : [];
    });
}
/** What stops Continue: the rule the rest of the app uses (two or three goals, positive targets), plus the mission length. */
export function goalsError(rows, mission) {
    if (mission.length > 300)
        return onboardingCopy.founder.goals.missionLong;
    const goals = goalsFrom(rows);
    if (goals.length < 2 || goals.length > 3)
        return onboardingCopy.founder.goals.needTwo;
    return validateGoals(goals);
}
