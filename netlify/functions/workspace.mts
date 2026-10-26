import type { Config } from "@netlify/functions";
import { ZodError } from "zod";
import { json, readJSON, BadRequest } from "../lib/http.mts";
import { checkOrigin, SetupError } from "../lib/organization/storage.mts";
import { loadWorkspace, mutateWorkspace } from "../lib/workspace/storage.mts";
import { WorkspaceError } from "../lib/workspace/runtime.mts";
export default async (req: Request) => {
  try {
    checkOrigin(req);
    return json(req.method === "GET" ? await loadWorkspace(req) : await mutateWorkspace(req, await readJSON(req, 300000)));
  } catch (error) {
    if (error instanceof WorkspaceError || error instanceof SetupError) return json({ message: error.message }, error.status);
    if (error instanceof ZodError) return json({ message: "The workspace command did not pass validation.", fields: error.issues.map((i) => i.path.join(".")) }, 400);
    if (error instanceof BadRequest) return json({ message: error.message }, 400);
    return json({ message: "The workspace could not be saved. Keep your input and retry the same request ID." }, 503);
  }
};
export const config: Config = { path: "/api/workspace", method: ["GET", "POST"] };
