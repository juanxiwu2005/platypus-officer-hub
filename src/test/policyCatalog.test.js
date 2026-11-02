import { describe, expect, it } from "vitest";
import { POLICY_CATALOG, POLICY_SOURCE_COUNT, policySourceById, validatePolicyCatalog } from "../data/policyCatalog";
describe("policy source catalog", () => {
    it("imports every indexed source with a stable record ID and source-file code", () => {
        expect(POLICY_CATALOG).toHaveLength(POLICY_SOURCE_COUNT);
        expect(validatePolicyCatalog()).toEqual([]);
        expect(policySourceById("ASU-R-010")).toMatchObject({
            officialName: "ASU Event Registry",
            sourceFileCode: "PLAN_E01_ASU_Event_Registry_2026-10-29.txt",
            category: "venue",
        });
    });
    it("keeps records with no canonical link auditable rather than inventing a URL", () => {
        expect(policySourceById("ASU-R-021")).toMatchObject({ sourceUrl: null, sourceUrlNote: "Not provided in pasted material" });
    });
});
