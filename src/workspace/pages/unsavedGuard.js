import { useEffect, useRef } from 'react';
/** The outer shell owns navigation; forms own the decision about their unsaved input. */
export function useUnsavedGuard(dirty, saving = false, message = 'Discard these unsaved changes?') {
    const latest = useRef({ dirty, saving, message });
    latest.current = { dirty, saving, message };
    const confirmDiscard = () => {
        if (latest.current.saving)
            return false;
        if (latest.current.dirty && !window.confirm(latest.current.message))
            return false;
        latest.current.dirty = false;
        return true;
    };
    useEffect(() => {
        const leave = (event) => {
            if (event.defaultPrevented)
                return;
            if (!confirmDiscard())
                event.preventDefault();
        };
        const unload = (event) => {
            if (!latest.current.dirty && !latest.current.saving)
                return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('platypus:before-workspace-leave', leave);
        window.addEventListener('beforeunload', unload);
        return () => { window.removeEventListener('platypus:before-workspace-leave', leave); window.removeEventListener('beforeunload', unload); };
    }, []);
    return { confirmDiscard, markSaved: () => { latest.current.dirty = false; latest.current.saving = false; } };
}
