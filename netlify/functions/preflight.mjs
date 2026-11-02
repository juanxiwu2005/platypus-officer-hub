import { checkPreflight } from "../../src/lib/preflight.ts";
import { fail, json, readJSON } from "../lib/http.mts";
export default async (req) => { try {
    const body = await readJSON(req);
    return json({ ...checkPreflight(body), source: "checked rules", model: null });
}
catch (e) {
    return fail(e);
} };
export const config = { path: "/api/preflight", method: "POST" };
