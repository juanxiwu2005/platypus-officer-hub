import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { orgChart } from "../../engine/orgChart";
const CARD_W = 148, CARD_H = 52, GAP_X = 16, GAP_Y = 36;
/**
 * A small organization chart worked out by the engine from each role's "reports to": the president at the top, a line from each
 * role up to the role it reports to. Titles only. It updates as the roles above are edited, so the president can check the setup.
 */
export function OrgChart({ roles }) {
    const chart = orgChart(roles);
    const x = (col) => col * (CARD_W + GAP_X);
    const y = (level) => level * (CARD_H + GAP_Y);
    const width = Math.max(CARD_W, chart.columns * (CARD_W + GAP_X) - GAP_X), height = chart.levels * (CARD_H + GAP_Y) - GAP_Y;
    const at = new Map(chart.nodes.map(n => [n.id, n]));
    const bossName = (id) => { const e = chart.edges.find(x => x.to === id && !x.kind); return e ? at.get(e.from)?.title : undefined; };
    return _jsxs("section", { className: "org-chart-wrap", "data-testid": "org-chart", "aria-label": "Organization chart", children: [_jsx("h3", { className: "org-h", children: "Organization chart" }), _jsx("div", { className: "org-scroll", tabIndex: 0, role: "group", "aria-label": "Organization chart, scrolls sideways", children: _jsxs("div", { className: "org-canvas", style: { width, height }, children: [_jsx("svg", { className: "org-lines", width: width, height: height, "aria-hidden": "true", children: chart.edges.map(e => {
                                const a = at.get(e.from), b = at.get(e.to);
                                if (e.kind === "advisory") {
                                    const [l, r] = a.col <= b.col ? [a, b] : [b, a], ym = y(a.level) + CARD_H / 2;
                                    return _jsx("path", { className: "advisory", d: `M${x(l.col) + CARD_W} ${ym} H${x(r.col)}` }, `${e.from}-${e.to}`);
                                }
                                const x1 = x(a.col) + CARD_W / 2, y1 = y(a.level) + CARD_H, x2 = x(b.col) + CARD_W / 2, y2 = y(b.level), mid = y1 + GAP_Y / 2;
                                return _jsx("path", { d: `M${x1} ${y1} V${mid} H${x2} V${y2}` }, `${e.from}-${e.to}`);
                            }) }), chart.nodes.map(n => _jsx("div", { className: `org-card${n.advisor ? " advisor" : ""}`, style: { left: x(n.col), top: y(n.level), width: CARD_W, height: CARD_H }, title: n.title, children: _jsx("span", { children: n.title }) }, n.id))] }) }), _jsx("ul", { className: "sr-only", children: chart.nodes.map(n => _jsxs("li", { children: [n.title, bossName(n.id) ? `, reports to ${bossName(n.id)}` : n.advisor ? ", advisor, shown beside the president with a dashed line" : ", top of the chart"] }, n.id)) })] });
}
