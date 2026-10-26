import { z } from "zod";
import {
  DepartmentSchema,
  RoleSchema,
  RiskResultSchema,
  EditSchema,
  type SetupDraft,
  type Stage,
} from "./schema";
export const ExtractionSchema = z.object({
  name: z.string().max(100),
  mission: z.string().max(1000),
  departments: z.array(DepartmentSchema).min(1).max(20),
  roles: z.array(RoleSchema).min(1).max(30),
  uncertainties: z.array(z.string().max(300)).max(3),
});
export const CompactFlowSchema = z.object({
  title: z.string().min(1).max(120),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100),
        roleIds: z.array(z.string()).max(10),
        dependsOn: z.array(z.string()).max(12),
        dependencyMode: z.enum(["all", "any"]),
        accountableRoleId: z.string().nullable(),
      }),
    )
    .min(1)
    .max(20),
});
const str = (maxLength = 240) => ({ type: "string", maxLength });
const id = {
  type: "string",
  minLength: 1,
  maxLength: 80,
  pattern: "^[a-zA-Z0-9_-]+$",
};
const arr = (items: unknown, maxItems = 30) => ({
  type: "array",
  items,
  maxItems,
});
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const change = obj({
  entity: { type: "string", enum: ["role", "department", "node"] },
  id,
  operation: { type: "string", enum: ["set", "add", "remove"] },
  field: {
    type: "string",
    enum: [
      "title",
      "description",
      "departmentId",
      "parentRoleId",
      "responsibilities",
      "name",
      "color",
      "roleIds",
      "dependsOn",
      "dependencyMode",
    ],
  },
  value: { anyOf: [str(600), arr(str(240), 30), { type: "null" }] },
});
export function responseSchema(
  d: SetupDraft,
  stage: Stage,
): Record<string, unknown> | undefined {
  const roleId = {
    type: "string",
    enum: d.roles.length ? d.roles.map((r) => r.id) : ["unassigned"],
  };
  if (stage === "constitution")
    return obj({
      name: str(100),
      mission: str(600),
      departments: {
        ...arr(
          obj({
            id,
            name: str(100),
            source: { type: "string", enum: ["constitution", "inferred"] },
            quote: str(140),
          }),
          20,
        ),
        minItems: 1,
      },
      roles: {
        ...arr(
          obj({
            id,
            title: str(100),
            departmentId: id,
            parentRoleId: { anyOf: [id, { type: "null" }] },
            description: str(200),
            responsibilities: arr(str(140), 6),
            source: { type: "string", enum: ["constitution", "suggested"] },
            quote: str(140),
          }),
          30,
        ),
        minItems: 1,
      },
      uncertainties: arr(str(200), 3),
    });
  if (stage === "member_workflow")
    return obj({
      title: str(120),
      nodes: {
        ...arr(
          obj({
            id,
            title: str(100),
            roleIds: arr(roleId, 10),
            dependsOn: arr(id, 12),
            dependencyMode: { type: "string", enum: ["all", "any"] },
            accountableRoleId: { anyOf: [roleId, { type: "null" }] },
          }),
          20,
        ),
        minItems: 1,
      },
    });
  if (stage === "risk_check")
    return obj({
      risks: arr(
        obj({
          id,
          title: str(180),
          explanation: str(300),
          roleIds: arr(roleId, 10),
          options: {
            ...arr(obj({ id, label: str(140), changes: arr(change, 10) }), 3),
            minItems: 2,
          },
        }),
        4,
      ),
    });
  if (stage === "edit")
    return obj({
      message: str(600),
      question: { anyOf: [str(400), { type: "null" }] },
      changes: arr(change, 40),
    });
  return undefined;
}
export { RiskResultSchema, EditSchema };
