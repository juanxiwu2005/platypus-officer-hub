import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PAGES } from "../routes";
/** Page header (v1.1): the page name only, plus optional actions on the right. The page's question is the nav tooltip. */
export function PageHead({ path, title, actions }) {
    const page = PAGES.find(p => p.path === path);
    return (_jsxs("div", { className: "page-head", children: [_jsx("h1", { children: title ?? page?.label }), actions && _jsx("div", { className: "page-actions", children: actions })] }));
}
