import { hiddenUnlessEnabled } from "../lib/serverStorage.mts";
import { ZodError } from "zod";
import { archiveEvent, checkOrigin, readSession, saveSession, SetupError, startSession, } from "../lib/organization/storage.mts";
import { BadRequest, json, readJSON } from "../lib/http.mts";
export default hiddenUnlessEnabled(async (req) => {
    let workspaceId = "";
    try {
        checkOrigin(req);
        if (req.method === "GET")
            return json({
                ...(await readSession(req)).entry,
                storage: "netlify-blobs",
            });
        const body = await readJSON(req, 500000);
        if (body.action === "start") {
            const { entry, cookie } = await startSession(req);
            const response = json({ ...entry, storage: "netlify-blobs" });
            if (cookie)
                response.headers.set("set-cookie", cookie);
            return response;
        }
        if (body.action !== "save" && body.action !== "confirm")
            throw new SetupError("Unknown setup action.");
        if (!Number.isInteger(body.revision))
            throw new SetupError("A saved revision is required.");
        const { entry } = await readSession(req);
        workspaceId = entry.workspaceId;
        await archiveEvent(workspaceId, "configuration.submitted", { action: body.action, revision: body.revision, draft: body.draft }, "user");
        return json({
            ...(await saveSession(req, body.draft, Number(body.revision), body.action === "confirm")),
            storage: "netlify-blobs",
        });
    }
    catch (e) {
        if (workspaceId)
            await archiveEvent(workspaceId, "configuration.failed", { message: e.message }, "system").catch(() => { });
        if (e instanceof BadRequest)
            return json({ message: e.message }, 400);
        if (e instanceof SetupError)
            return json({ message: e.message }, e.status);
        if (e instanceof ZodError)
            return json({ message: "The organization settings did not pass validation." }, 400);
        return json({
            message: "Online saving is unavailable. Your changes have not been confirmed as saved.",
        }, 503);
    }
});
export const config = {
    path: "/api/org/setup",
    method: ["GET", "POST"],
};
