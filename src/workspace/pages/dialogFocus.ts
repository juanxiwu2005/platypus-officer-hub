import { useEffect, useRef, type RefObject } from 'react';

/** Keep keyboard focus inside a modal and return it to the invoking control. */
export function useDialogFocus(dialog: RefObject<HTMLElement>, close: () => void, disabled = false, active = true) {
  const latest = useRef({ close, disabled });
  latest.current = { close, disabled };
  useEffect(() => {
    const element = dialog.current;
    if (!element || !active) return;
    const previous = document.activeElement as HTMLElement|null;
    const available = () => [...element.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(control => {
      if (control.closest('[hidden],[aria-hidden="true"]')) return false;
      const collapsed = control.closest('details:not([open])');
      return !collapsed || control.tagName === 'SUMMARY';
    });
    (available()[0] ?? element).focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!latest.current.disabled) latest.current.close(); return; }
      if (event.key !== 'Tab') return;
      const controls = available(), first = controls[0], last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); element.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', key);
    return () => { element.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [dialog, active]);
}
