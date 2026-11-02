/** Native structured output for graph tasks; content is still checked against source and DAG rules. */
export function flowResponseSchema(d) {
    const text = (maxLength) => ({ type: "string", maxLength });
    const list = (items, maxItems = 30) => ({
        type: "array",
        items,
        maxItems,
    });
    const object = (properties) => ({
        type: "object",
        properties,
        required: Object.keys(properties),
        additionalProperties: false,
    });
    const role = { type: "string", enum: d.roles.map((r) => r.id) }, action = { type: "string", enum: d.actions.map((a) => a.id) }, id = { type: "string", minLength: 1, maxLength: 80 };
    return object({
        title: text(180),
        explanation: text(600),
        nodes: {
            ...list(object({
                id,
                title: text(180),
                description: text(500),
                actionIds: list(action, 10),
                roleIds: list(role),
                dependsOn: list(id, 20),
                dependencyMode: { type: "string", enum: ["all", "any"] },
                position: object({ x: { type: "number" }, y: { type: "number" } }),
                basis: text(500),
            }), 40),
            minItems: 1,
        },
        raci: list(object({
            actionId: action,
            responsible: list(role),
            accountable: {
                type: ["string", "null"],
                enum: [...d.roles.map((r) => r.id), null],
            },
            consulted: list(role),
            informed: list(role),
            reason: text(400),
        }), 60),
    });
}
