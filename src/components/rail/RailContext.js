import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
const RailCtx = createContext(null);
const OPEN_KEY = "platypus.v1.railOpen";
const wide = () => typeof window !== "undefined" && window.matchMedia?.("(min-width: 1200px)").matches;
function initialOpen() {
    if (!wide())
        return false;
    try {
        const v = window.localStorage.getItem(OPEN_KEY);
        if (v === "0")
            return false;
    }
    catch { /* storage unavailable */ }
    return true;
}
export function RailProvider({ children }) {
    const [open, setOpenState] = useState(initialOpen);
    const [tab, setTab] = useState("ask");
    const [detail, setDetail] = useState(null);
    const [workflowDetail, setWorkflowDetailState] = useState(null);
    const openedForDetail = useRef(false);
    const openRef = useRef(open);
    openRef.current = open;
    // What had focus when Details opened, so closing Details can give focus back (keyboard users).
    const returnFocus = useRef(null);
    const detailOpen = useRef(false);
    const [pending, setPending] = useState(null);
    const setOpen = useCallback((v) => {
        setOpenState(v);
        if (wide())
            try {
                window.localStorage.setItem(OPEN_KEY, v ? "1" : "0");
            }
            catch { /* storage unavailable */ }
    }, []);
    const show = useCallback((d) => {
        const a = document.activeElement;
        // A new page trigger replaces the previous one; nested editors inside the rail keep that page trigger.
        if (a instanceof HTMLElement && a !== document.body && !a.closest(".rail"))
            returnFocus.current = a;
        else if (!detailOpen.current)
            returnFocus.current = null;
        detailOpen.current = true;
        setDetail(d);
        setTab("details");
        if (!openRef.current)
            openedForDetail.current = true;
        setOpenState(true);
    }, []);
    const closeDetail = useCallback(() => {
        detailOpen.current = false;
        const back = returnFocus.current;
        returnFocus.current = null;
        if (back)
            setTimeout(() => { if (back.isConnected)
                back.focus(); }, 0);
        setDetail(null);
        setWorkflowDetailState(null);
        setTab("ask");
        if (openedForDetail.current)
            setOpenState(false);
        openedForDetail.current = false;
    }, []);
    const setWorkflowDetail = useCallback((content) => {
        setWorkflowDetailState(content);
        if (content)
            show({ kind: "workflow" });
    }, [show]);
    const ask = useCallback((text, send = false) => {
        setPending(p => ({ text, send, n: (p?.n ?? 0) + 1 }));
        setTab("ask");
        setOpenState(true);
    }, []);
    const takePending = useCallback(() => setPending(null), []);
    const [reviewEventId, setReviewEventId] = useState(null);
    const requestReview = useCallback((eventId) => { setReviewEventId(eventId); setTab("ask"); setOpenState(true); }, []);
    const takeReview = useCallback(() => setReviewEventId(null), []);
    // "/" focuses the Ask box from anywhere (unless typing in a field).
    useEffect(() => {
        const onKey = (e) => {
            const t = e.target;
            if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))))
                return;
            e.preventDefault();
            setTab("ask");
            setOpenState(true);
            setTimeout(() => document.getElementById("ask-input")?.focus(), 30);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
    const value = useMemo(() => ({ open, setOpen, tab, setTab, detail, show, closeDetail, setWorkflowDetail, workflowDetail, ask, pending, takePending, reviewEventId, requestReview, takeReview }), [open, setOpen, tab, detail, show, closeDetail, setWorkflowDetail, workflowDetail, ask, pending, takePending, reviewEventId, requestReview, takeReview]);
    return _jsx(RailCtx.Provider, { value: value, children: children });
}
export function useRail() {
    const v = useContext(RailCtx);
    if (!v)
        throw new Error("useRail must be used inside <RailProvider>");
    return v;
}
/** For components that may render outside the main layout (officer page, tests). */
export function useOptionalRail() {
    return useContext(RailCtx);
}
