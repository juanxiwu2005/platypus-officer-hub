import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ContextType,
} from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";

type Options = { enabled?: boolean; onError?: (error: Error) => void };
type Position = { index: number | null; url: string; state: unknown };
type RouterNavigator = ContextType<
  typeof UNSAFE_NavigationContext
>["navigator"];
type Guard = {
  beforeLeave: () => Promise<boolean | void>;
  onError: (error: Error) => void;
  pending: (value: boolean) => void;
};
const installed = new WeakSet<Window>();
const coordinators = new WeakMap<RouterNavigator, NavigationCoordinator>();
const windowCoordinators = new WeakMap<Window, Set<NavigationCoordinator>>();

/** Must be installed before HashRouter's pop listener, including its AT_TARGET order. */
export function installSetupNavigationProtection(target: Window = window) {
  if (installed.has(target)) return;
  target.addEventListener(
    "popstate",
    (event: PopStateEvent) => {
      // A navigator has one coordinator regardless of the number of page/shell guards.
      // The most recently active router owns its window's native navigation.
      [...(windowCoordinators.get(target) ?? [])].at(-1)?.pop(event);
    },
    true,
  );
  installed.add(target);
}
function position(target: Window): Position {
  const state = target.history.state as { idx?: unknown } | null;
  return {
    index: typeof state?.idx === "number" ? state.idx : null,
    url: target.location.href,
    state,
  };
}
const samePosition = (a: Position, b: Position) =>
  a.index === b.index && a.url === b.url;

/** One wrapper and one history state machine per navigator; individual hooks only register checks. */
class NavigationCoordinator {
  readonly guards = new Map<symbol, Guard>();
  private checking = false;
  private disposed = false;
  private committed: Position;
  private restoring: ((restored: boolean) => void) | null = null;
  private restoreTimer: ReturnType<typeof setTimeout> | undefined;
  private replay: { target: Position; done: () => void } | null = null;
  private replayTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly originalPush: RouterNavigator["push"];
  private readonly originalReplace: RouterNavigator["replace"];
  constructor(
    private readonly navigator: RouterNavigator,
    private readonly target: Window,
  ) {
    this.committed = position(target);
    this.originalPush = navigator.push;
    this.originalReplace = navigator.replace;
    navigator.push = this.push;
    navigator.replace = this.replace;
    installSetupNavigationProtection(target);
    const routers =
      windowCoordinators.get(target) ?? new Set<NavigationCoordinator>();
    routers.add(this);
    windowCoordinators.set(target, routers);
  }
  private notify(pending: boolean) {
    for (const guard of this.guards.values()) guard.pending(pending);
  }
  private readonly push: RouterNavigator["push"] = (...args) => {
    if (this.disposed || !this.guards.size)
      return this.originalPush.apply(this.navigator, args);
    void this.approve(() => this.originalPush.apply(this.navigator, args));
  };
  private readonly replace: RouterNavigator["replace"] = (...args) => {
    if (this.disposed || !this.guards.size)
      return this.originalReplace.apply(this.navigator, args);
    void this.approve(() => this.originalReplace.apply(this.navigator, args));
  };
  add(id: symbol, guard: Guard) {
    this.guards.set(id, guard);
    guard.pending(this.checking);
  }
  remove(id: symbol) {
    this.guards.delete(id);
    if (this.guards.size) return;
    this.disposed = true;
    if (this.navigator.push === this.push)
      this.navigator.push = this.originalPush;
    if (this.navigator.replace === this.replace)
      this.navigator.replace = this.originalReplace;
    windowCoordinators.get(this.target)?.delete(this);
    if (coordinators.get(this.navigator) === this)
      coordinators.delete(this.navigator);
    clearTimeout(this.restoreTimer);
    clearTimeout(this.replayTimer);
    const restoring = this.restoring;
    this.restoring = null;
    restoring?.(false);
    const replay = this.replay;
    this.replay = null;
    replay?.done();
  }
  private async approve(
    commit: () => void | Promise<void>,
    returned?: Promise<boolean>,
  ) {
    if (this.checking || this.disposed) return;
    this.checking = true;
    this.notify(true);
    try {
      if (returned && !(await returned)) return;
      const checked = new Set<symbol>();
      // A new guard mounted while another check awaits must also approve this transition.
      while (!this.disposed) {
        const next = [...this.guards].find(([id]) => !checked.has(id));
        if (!next) break;
        const [id, guard] = next;
        checked.add(id);
        try {
          if ((await guard.beforeLeave()) === false) return;
        } catch (error) {
          if (this.guards.has(id))
            guard.onError(
              error instanceof Error ? error : new Error(String(error)),
            );
          return;
        }
      }
      if (this.disposed || !this.guards.size) return;
      await commit();
      if (!this.disposed) this.committed = position(this.target);
    } finally {
      this.checking = false;
      if (!this.disposed) this.notify(false);
    }
  }
  private replayPop(destination: Position, action: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.replay = { target: destination, done: resolve };
      this.replayTimer = setTimeout(() => {
        const replay = this.replay;
        this.replay = null;
        replay?.done();
      }, 1500);
      action();
    });
  }
  readonly pop = (event: PopStateEvent) => {
    if (this.disposed || !this.guards.size) return;
    const destination = position(this.target);
    if (this.replay && samePosition(destination, this.replay.target)) {
      const replay = this.replay;
      this.replay = null;
      clearTimeout(this.replayTimer);
      this.committed = destination;
      replay.done();
      return;
    }
    if (!this.restoring && samePosition(destination, this.committed)) return;
    event.stopImmediatePropagation();
    if (this.restoring) {
      if (samePosition(destination, this.committed)) {
        const finish = this.restoring;
        this.restoring = null;
        clearTimeout(this.restoreTimer);
        finish(true);
      } else if (
        destination.index !== null &&
        this.committed.index !== null &&
        destination.index !== this.committed.index
      ) {
        this.target.history.go(this.committed.index - destination.index);
      } else {
        this.target.history.replaceState(
          this.committed.state,
          "",
          this.committed.url,
        );
        const finish = this.restoring;
        this.restoring = null;
        clearTimeout(this.restoreTimer);
        finish(false);
      }
      return;
    }
    if (this.checking) {
      // Extra Back/Forward gestures do not start additional checks or skip the committed screen.
      if (
        destination.index !== null &&
        this.committed.index !== null &&
        destination.index !== this.committed.index
      )
        this.target.history.go(this.committed.index - destination.index);
      else
        this.target.history.replaceState(
          this.committed.state,
          "",
          this.committed.url,
        );
      return;
    }
    const delta =
      this.committed.index !== null && destination.index !== null
        ? destination.index - this.committed.index
        : null;
    if (delta !== null && delta !== 0) {
      const returned = new Promise<boolean>((resolve) => {
        this.restoring = resolve;
        this.target.history.go(-delta);
        this.restoreTimer = setTimeout(() => {
          if (!this.restoring) return;
          this.target.history.replaceState(
            this.committed.state,
            "",
            this.committed.url,
          );
          const finish = this.restoring;
          this.restoring = null;
          // An unverified rollback must keep the page, not replay an unknown history entry.
          finish(false);
        }, 1500);
      });
      void this.approve(
        () => this.replayPop(destination, () => this.target.history.go(delta)),
        returned,
      );
      return;
    }
    // Direct hash edits can have no distinct router index; preserve the current route until all checks pass.
    this.target.history.replaceState(
      this.committed.state,
      "",
      this.committed.url,
    );
    void this.approve(() =>
      this.replayPop(destination, () => {
        this.target.history.replaceState(
          destination.state,
          "",
          destination.url,
        );
        this.target.dispatchEvent(
          new PopStateEvent("popstate", { state: destination.state }),
        );
      }),
    );
  };
}

export function useSetupNavigationGuard(
  beforeLeave: () => Promise<boolean | void>,
  { enabled = true, onError }: Options = {},
) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const callbacks = useRef({ beforeLeave, onError });
  callbacks.current = { beforeLeave, onError };
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setPending(false);
      return;
    }
    let coordinator = coordinators.get(navigator);
    if (!coordinator) {
      coordinator = new NavigationCoordinator(navigator, window);
      coordinators.set(navigator, coordinator);
    }
    const id = Symbol("navigation guard");
    coordinator.add(id, {
      beforeLeave: () => callbacks.current.beforeLeave(),
      onError: (error) => callbacks.current.onError?.(error),
      pending: setPending,
    });
    return () => coordinator.remove(id);
  }, [navigator, enabled]);
  return { pending };
}
