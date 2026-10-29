import { CAPABILITIES, type Draft } from "./model";
/** Demo policy checks are testable; localStorage is not a production security boundary. */
export interface Principal {
  accountId: string;
  organizationId: string;
  mayManage: boolean;
}
export interface PreviewRepository {
  read(principal: Principal): Draft | null;
  readApproved(principal: Principal): Draft | null;
  write(principal: Principal, draft: Draft): void;
  approve(principal: Principal, draft: Draft): void;
  clear(principal: Principal): void;
}
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const key = (p: Principal, kind = "draft") =>
  `platypus.phase1.${kind}:${p.organizationId}:${p.accountId}`;
function permitted(p: Principal) {
  if (!p.mayManage)
    throw new Error("You do not have access to this organization context.");
}
function valid(d: Draft, p: Principal) {
  return (
    d &&
    d.organizationId === p.organizationId &&
    d.accountId === p.accountId &&
    typeof d.name === "string" &&
    typeof d.mission === "string" &&
    Array.isArray(d.roles) &&
    d.roles.every(
      (r) => typeof r.id === "string" && typeof r.title === "string",
    ) &&
    Array.isArray(d.assignments) &&
    d.assignments.every(
      (a) =>
        d.roles.some((r) => r.id === a.roleId) &&
        CAPABILITIES.some((c) => c.id === a.capabilityId) &&
        ["owner", "approver", "support", "informed"].includes(
          a.responsibility,
        ) &&
        ["all", "campus", "companies"].includes(a.scope) &&
        typeof a.confirmedByUser === "boolean",
    ) &&
    Array.isArray(d.suggestions) &&
    Number.isInteger(d.step) &&
    d.step >= 0 &&
    d.step <= 4
  );
}
export function localPreviewRepository(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  now = () => Date.now(),
): PreviewRepository {
  function read(p: Principal, kind: string): Draft | null {
    permitted(p);
    const raw = storage.getItem(key(p, kind));
    if (!raw) return null;
    try {
      const envelope = JSON.parse(raw);
      if (
        !Number.isFinite(envelope.savedAt) ||
        now() - envelope.savedAt > MAX_AGE
      ) {
        storage.removeItem(key(p, kind));
        return null;
      }
      return valid(envelope.draft, p) ? envelope.draft : null;
    } catch {
      return null;
    }
  }
  function write(p: Principal, d: Draft, kind: string) {
    permitted(p);
    if (!valid(d, p))
      throw new Error("Organization or account mismatch, or invalid context.");
    storage.setItem(key(p, kind), JSON.stringify({ savedAt: now(), draft: d }));
  }
  return {
    read: (p) => read(p, "draft"),
    readApproved: (p) => read(p, "approved"),
    write: (p, d) => write(p, d, "draft"),
    approve(p, d) {
      if (!d.confirmed)
        throw new Error("Confirm this context before approval.");
      write(p, d, "approved");
    },
    clear(p) {
      permitted(p);
      storage.removeItem(key(p));
      storage.removeItem(key(p, "approved"));
    },
  };
}
