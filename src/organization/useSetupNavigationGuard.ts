import { useContext, useEffect, useRef, useState } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";

type Options = { enabled?: boolean; onError?: (error: Error) => void };
type Position = { index: number | null; url: string; state: unknown };

let activePopHandler: ((event: PopStateEvent) => void) | null = null;
const installed = new WeakSet<Window>();

/**
 * Run once before rendering HashRouter. On Window, capture and bubble listeners
 * both run at AT_TARGET, in registration order. A listener installed only when
 * the lazy setup page mounts is too late to prevent the router from scheduling
 * an unmount. An inactive dispatcher never changes ordinary navigation.
 */
export function installSetupNavigationProtection(target: Window = window) {
  if (installed.has(target)) return;
  target.addEventListener(
    "popstate",
    (event: PopStateEvent) => {
      activePopHandler?.(event);
    },
    true,
  );
  installed.add(target);
}

function position(): Position {
  const state = window.history.state as { idx?: unknown } | null;
  return {
    index: typeof state?.idx === "number" ? state.idx : null,
    url: window.location.href,
    state,
  };
}

/**
 * HashRouter 6 has no data-router blocker. Keep its navigator intact and wrap
 * its two imperative transitions for this page's lifetime. Capture native POP
 * before HashRouter sees it, restore the current entry, then replay only after
 * persistence succeeds. Rejected saves leave the component mounted.
 */
export function useSetupNavigationGuard(
  beforeLeave: () => Promise<boolean | void>,
  { enabled = true, onError }: Options = {},
) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const callbacks = useRef({ beforeLeave, onError });
  callbacks.current = { beforeLeave, onError };
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let checking = false;
    let replay = false;
    let committed = position();
    let restoring: (() => void) | null = null;
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    const approve = async (commit: () => void | Promise<void>) => {
      if (checking) return;
      checking = true;
      setPending(true);
      try {
        if ((await callbacks.current.beforeLeave()) !== false && active) {
          await commit();
          committed = position();
        }
      } catch (error) {
        if (active)
          callbacks.current.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
      } finally {
        checking = false;
        if (active) setPending(false);
      }
    };
    const push: typeof navigator.push = (...args) => {
      void approve(() => originalPush(...args));
    };
    const replace: typeof navigator.replace = (...args) => {
      void approve(() => originalReplace(...args));
    };
    navigator.push = push;
    navigator.replace = replace;

    const pop = (event: PopStateEvent) => {
      const target = position();
      if (replay) {
        replay = false;
        committed = target;
        return;
      }
      if (
        !restoring &&
        target.index === committed.index &&
        target.url === committed.url
      )
        return;
      event.stopImmediatePropagation();

      if (restoring) {
        if (target.index === committed.index && target.url === committed.url) {
          const restored = restoring;
          restoring = null;
          if (restoreTimer) clearTimeout(restoreTimer);
          restored();
        } else if (
          target.index !== null &&
          committed.index !== null &&
          target.index !== committed.index
        ) {
          window.history.go(committed.index - target.index);
        }
        return;
      }

      if (checking) {
        // Ignore extra Back/Forward gestures while the first save is pending.
        // The router has not left the committed screen.
        if (
          target.index !== null &&
          committed.index !== null &&
          target.index !== committed.index
        )
          window.history.go(committed.index - target.index);
        else window.history.replaceState(committed.state, "", committed.url);
        return;
      }

      const delta =
        committed.index !== null && target.index !== null
          ? target.index - committed.index
          : null;
      if (delta !== null && delta !== 0) {
        let restored = false;
        const returnToPage = new Promise<void>((resolve) => {
          restoring = () => {
            restored = true;
            resolve();
          };
          window.history.go(-delta);
          // An unusual browser/history implementation must never unmount the
          // page just because rollback did not emit another POP.
          restoreTimer = setTimeout(() => {
            if (!restoring) return;
            window.history.replaceState(committed.state, "", committed.url);
            const done = restoring;
            restoring = null;
            done();
          }, 1500);
        });
        void approve(async () => {
          await returnToPage;
          if (!active || !restored) return;
          replay = true;
          window.history.go(delta);
        });
        return;
      }

      // Direct hash changes have no router index. Keep the route mounted while
      // saving, then notify HashRouter once using the already-created entry.
      window.history.replaceState(committed.state, "", committed.url);
      void approve(() => {
        replay = true;
        window.history.replaceState(target.state, "", target.url);
        window.dispatchEvent(
          new PopStateEvent("popstate", { state: target.state }),
        );
      });
    };
    installSetupNavigationProtection();
    activePopHandler = pop;

    return () => {
      active = false;
      if (navigator.push === push) navigator.push = originalPush;
      if (navigator.replace === replace) navigator.replace = originalReplace;
      if (activePopHandler === pop) activePopHandler = null;
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, [navigator, enabled]);
  return { pending };
}
