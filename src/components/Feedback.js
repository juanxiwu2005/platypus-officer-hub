import { jsx as _jsx } from "react/jsx-runtime";
import { useStore } from "../data/store";
export function Feedback({ id, text }) {
    const { state, dispatch } = useStore();
    const sent = state.feedback.some(f => f.outputId === id && f.reportedBy === state.viewerId);
    return _jsx("button", { className: "btn small", disabled: sent, onClick: () => dispatch({ type: "reportOutput", outputId: id, text }), children: sent ? "Reported for review" : "This is wrong" });
}
