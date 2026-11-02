import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { hasSeenWelcome, isRearmed } from "../../lib/onboardingRecord";
import { STORAGE_KEY } from "../../data/store";
import { walkthroughEnabled } from "./enabled";
/** Wraps Today. A first visit (no saved demo data, or Reset demo was used; welcome not seen yet) goes to the welcome page when the walkthrough is switched on. */
export function WelcomeGate({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        const buildFlag = import.meta.env?.VITE_ONBOARDING_WALKTHROUGH;
        if (!walkthroughEnabled({ buildFlag, windowSearch: window.location.search, routerSearch: location.search }) || location.pathname !== "/" || hasSeenWelcome())
            return;
        try {
            if (window.localStorage.getItem(STORAGE_KEY) && !isRearmed())
                return;
        }
        catch { /* storage blocked: the in-memory "seen" flag stops a loop */ }
        navigate("/welcome", { replace: true });
    }, [location.pathname, location.search, navigate]);
    return _jsx(_Fragment, { children: children });
}
