import { validateProfile, validateRoles } from "../../../data/settings";
import { MAX_DUTIES, MAX_ROLES, dropRole, fillEmails, newRole, orderRoles, presidentRole, rederiveFn, setHolder, withBelow } from "../../../data/structure";
import { structureFromRead } from "../../../lib/constitution";
import { onboardingCopy } from "../../copy";
/**
 * The Team screen edits the draft's roles and people as rows of two cells (Role, Person). Everything here is pure so it can be tested without a page.
 * No email, phone or ASU ID is asked: an email is made from the name when the screen is left (fillEmails), the rest are left blank for the officer.
 */
const c = onboardingCopy.founder.team;
/** Rename a role. The president stays the president whatever the title says; other roles follow their title (it decides which event steps they get). */
export function renameRole(roles, id, title) {
    return roles.map(r => r.id !== id ? r : r.fn === "president" ? { ...r, displayName: title } : rederiveFn(roles, { ...r, displayName: title }));
}
/**
 * Set the name of the person in a role. An empty name makes the role an open position (the person is removed). A new name drops the old demo
 * email so a fresh one is made from the new name when the screen is left.
 */
export function setPersonName(roles, people, roleId, name) {
    if (!name.trim())
        return setHolder(roles, people, roleId, { name: "", email: "", phone: "", asuId: "" });
    return setHolder(roles, people, roleId, { name, email: "" });
}
/** Change who a role reports to. Heads come first in the list, so the list is put in order again. */
export function setReportsTo(roles, id, bossId) {
    if (bossId && withBelow(roles, id).has(bossId))
        return roles;
    return orderRoles(roles.map(r => r.id === id ? { ...r, reportsToId: bossId } : r));
}
export const setDuties = (roles, id, duties) => roles.map(r => r.id === id ? { ...r, duties: duties.slice(0, MAX_DUTIES) } : r);
/** The roles a role may report to: not itself and not anything below it (no loops). */
export const bossChoices = (roles, id) => { const below = withBelow(roles, id); return roles.filter(r => !below.has(r.id)); };
/** Add a role that reports to the president. Titles must differ, so "New role", "New role 2", ... */
export function addRole(roles) {
    if (roles.length >= MAX_ROLES)
        return null;
    const taken = new Set(roles.map(r => r.displayName.trim().toLowerCase()));
    let title = c.newRole, n = 2;
    while (taken.has(title.toLowerCase()))
        title = `${c.newRole} ${n++}`;
    const role = newRole(title, presidentRole(roles)?.id ?? null);
    return { roles: orderRoles([...roles, role]), id: role.id };
}
/** The president cannot be removed: the rest of the app needs one. */
export function removeRole(roles, people, id) {
    if (roles.find(r => r.id === id)?.fn === "president")
        return { roles, people };
    return dropRole(roles, people, id);
}
/** What stops Continue, and the people with their demo emails filled in. The messages come from the same rules the rest of the app uses. */
export function validateTeam(club) {
    const people = fillEmails(club.people);
    const error = validateRoles(club.roles, people)
        ?? people.map(p => validateProfile({ ...p, asuId: p.asuId ?? "" })).find(Boolean)
        ?? (new Set(people.map(p => p.name.trim().toLowerCase())).size !== people.length ? c.sameName : null);
    return { error: error ?? null, people };
}
/** Use the AI's reading of the constitution: same result as the classic setup page's "Use these suggestions". */
export function applyReading(club, read, missionTouched) {
    const built = structureFromRead(read, { roles: club.roles, people: club.people });
    return { ...club, roles: built.roles, people: built.people, mission: read.source === "ai" && read.mission && !missionTouched ? read.mission : club.mission };
}
