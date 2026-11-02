import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../data/store";
import { BUFFER_CHOICES, clubDraft } from "../data/settings";
import { orgSteps } from "../engine/playbooks";
import { withOwners } from "../engine/workflow";
import { deleteJson, loadJson, saveJson } from "../lib/localDocs";
const DRAFT_ID = "onboarding-draft"; // not the classic page's "setup-draft", so the two never overwrite each other
const WEEK = 7 * 86400000;
const DraftContext = createContext(null);
export function OnboardingDraftProvider({ children }) {
    const { state } = useStore();
    const [draft, setDraft] = useState(() => {
        const club = clubDraft(state);
        return {
            club, doc: null, reading: { status: "idle" }, applied: false, structureTouched: false, missionTouched: false,
            steps: withOwners(orgSteps(state), club.roles), workflowTouched: false,
            buffer: BUFFER_CHOICES.includes(state.org.settings.clubBufferBusinessDays) ? state.org.settings.clubBufferBusinessDays : 3,
            sentence: "Plan Spring Kickoff Dinner on Apr 16, 60 people, outside caterer, USG funding", event: null, date: "", source: "", confirmed: false,
            inviteCode: crypto.randomUUID(), skipped: [],
        };
    });
    const [restorable, setRestorable] = useState(null);
    const dirty = useRef(false);
    const pending = useRef(null); // the save that is waiting; clear() must cancel it or it would bring the deleted draft back
    useEffect(() => { let on = true; void loadJson(DRAFT_ID).then(r => { if (on && r?.value?.club && Date.now() - Date.parse(r.savedAt) < WEEK)
        setRestorable(r); }); return () => { on = false; }; }, []);
    useEffect(() => {
        if (!dirty.current || restorable)
            return;
        const { reading: _reading, ...saved } = draft;
        void _reading;
        const t = setTimeout(() => { pending.current = null; void saveJson(DRAFT_ID, saved); }, 700);
        pending.current = t;
        return () => clearTimeout(t);
    }, [draft, restorable]);
    const update = useCallback((fn) => { dirty.current = true; setDraft(fn); }, []);
    const patch = useCallback((next) => update(d => ({ ...d, ...next })), [update]);
    const restore = useCallback(() => { setRestorable(r => { if (r) {
        dirty.current = true;
        setDraft(d => ({ ...d, ...r.value, reading: { status: "idle" } }));
    } return null; }); }, []);
    const discard = useCallback(() => { void deleteJson(DRAFT_ID); setRestorable(null); }, []);
    const clear = useCallback(() => { dirty.current = false; if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
    } void deleteJson(DRAFT_ID); }, []);
    const value = useMemo(() => ({ draft, patch, update, restorable: restorable ? { savedAt: restorable.savedAt } : null, restore, discard, clear }), [draft, patch, update, restorable, restore, discard, clear]);
    return _jsx(DraftContext.Provider, { value: value, children: children });
}
export function useOnboardingDraft() { const value = useContext(DraftContext); if (!value)
    throw new Error("OnboardingDraftProvider is required"); return value; }
