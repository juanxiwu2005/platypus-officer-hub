import type { Config } from "@netlify/functions";
import { ZodError } from "zod";
import {
  checkOrigin,
  readSession,
  saveSession,
  SetupError,
  startSession,
} from "../lib/organization/storage.mts";
import { json, readJSON } from "../lib/http.mts";
export default async (req: Request) => {
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
      if (cookie) response.headers.set("set-cookie", cookie);
      return response;
    }
    if (body.action !== "save" && body.action !== "confirm")
      throw new SetupError("Unknown setup action.");
    if (!Number.isInteger(body.revision))
      throw new SetupError("A saved revision is required.");
    return json({
      ...(await saveSession(
        req,
        body.draft,
        Number(body.revision),
        body.action === "confirm",
      )),
      storage: "netlify-blobs",
    });
  } catch (e) {
    if (e instanceof SetupError) return json({ message: e.message }, e.status);
    if (e instanceof ZodError)
      return json(
        { message: "The organization settings did not pass validation." },
        400,
      );
    return json(
      {
        message:
          "Online saving is unavailable. Your changes have not been confirmed as saved.",
      },
      503,
    );
  }
};
export const config: Config = {
  path: "/api/org/setup",
  method: ["GET", "POST"],
};
