import { describe, expect, it } from "vitest";
import { policyArchive, searchPolicyArchive } from "../../netlify/lib/policy-archive.mts";
describe("server policy archive", () => {
    it("connects all 64 detailed records to the immutable catalog keys", () => {
        const records = policyArchive();
        expect(records).toHaveLength(64);
        expect(records.find(record => record.recordId === "ASU-R-010")).toMatchObject({ sourceFileCode: "PLAN_E01_ASU_Event_Registry_2026-10-29.txt" });
    });
    it("retrieves the drone source without sending the entire archive", () => {
        const hits = searchPolicyArchive("Can we use a drone at our event?");
        expect(hits.map(hit => hit.recordId)).toContain("ASU-R-061");
        expect(hits.length).toBeLessThanOrEqual(3);
    });
});
