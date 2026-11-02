/** Keep keyboard navigation inside an overlay, including when its container has initial focus. */
export function trapTabKey(event, root) {
    if (event.key !== "Tab" || event.defaultPrevented)
        return;
    const controls = [...root.querySelectorAll('button, input, textarea, select, a[href], details > summary:first-of-type, [tabindex]:not([tabindex="-1"])')]
        // :disabled includes controls disabled by an ancestor fieldset, with the native legend exception.
        .filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert], [hidden]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility === "visible");
    const first = controls[0], last = controls.at(-1);
    const active = document.activeElement;
    if (!first || !root.contains(active) || active === root || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
    }
}
/** Switch off every sibling along the dialog's ancestor path, preserving existing inert state. */
export function isolateDialog(dialog) {
    const covered = [];
    let branch = dialog;
    while (branch.parentElement && branch !== document.body) {
        for (const sibling of branch.parentElement.children) {
            if (sibling instanceof HTMLElement && sibling !== branch && !sibling.inert) {
                sibling.inert = true;
                covered.push(sibling);
            }
        }
        branch = branch.parentElement;
    }
    return () => covered.forEach(el => { el.inert = false; });
}
