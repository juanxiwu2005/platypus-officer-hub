import { useContext, useEffect, useRef, useState, } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";
const NATIVE_NAVIGATION_SETTLE_MS = 50;
const installed = new WeakSet();
const coordinators = new WeakMap();
const windowCoordinators = new WeakMap();
/** Must be installed before HashRouter's pop listener, including its AT_TARGET order. */
export function installSetupNavigationProtection(target = window) {
    if (installed.has(target))
        return;
    const nativeNavigation = (event) => {
        // A navigator has one coordinator regardless of the number of page/shell guards.
        // The most recently active router owns its window's native navigation.
        [...(windowCoordinators.get(target) ?? [])].at(-1)?.pop(event);
    };
    target.addEventListener("popstate", nativeNavigation, true);
    // HashRouter also handles hashchange when a blocked popstate did not update its location.
    // Both notifications must pass the same coordinator before the router sees either one.
    target.addEventListener("hashchange", nativeNavigation, true);
    installed.add(target);
}
function position(target) {
    const state = target.history.state;
    return {
        index: typeof state?.idx === "number" ? state.idx : null,
        url: target.location.href,
        state,
    };
}
const samePosition = (a, b) => a.index === b.index && a.url === b.url;
/** One wrapper and one history state machine per navigator; individual hooks only register checks. */
class NavigationCoordinator {
    constructor(navigator, target) {
        this.navigator = navigator;
        this.target = target;
        this.guards = new Map();
        this.checking = false;
        this.nativeVersion = 0;
        this.disposed = false;
        this.restoring = null;
        this.replay = null;
        this.push = (...args) => {
            if (this.disposed || !this.guards.size)
                return this.originalPush.apply(this.navigator, args);
            void this.approve(() => this.originalPush.apply(this.navigator, args));
        };
        this.replace = (...args) => {
            if (this.disposed || !this.guards.size)
                return this.originalReplace.apply(this.navigator, args);
            void this.approve(() => this.originalReplace.apply(this.navigator, args));
        };
        this.pop = (event) => {
            if (this.disposed || !this.guards.size)
                return;
            this.nativeVersion += 1;
            const destination = position(this.target);
            if (this.replay && samePosition(destination, this.replay.target)) {
                const replay = this.replay;
                this.replay = null;
                clearTimeout(this.replayTimer);
                this.committed = destination;
                replay.done();
                return;
            }
            if (!this.restoring && samePosition(destination, this.committed))
                return;
            event.stopImmediatePropagation();
            if (this.restoring) {
                if (samePosition(destination, this.committed)) {
                    const restoring = this.restoring;
                    this.restoring = null;
                    clearTimeout(this.restoreTimer);
                    restoring.finish(true);
                }
                else if (!samePosition(destination, this.restoring.requestedFrom)) {
                    // popstate/hashchange describe the same traversal. Compensate only once,
                    // but recover again if an additional gesture has moved to a different entry.
                    this.restoring.requestedFrom = destination;
                    if (destination.index !== null &&
                        this.committed.index !== null &&
                        destination.index !== this.committed.index) {
                        this.target.history.go(this.committed.index - destination.index);
                    }
                    else {
                        const restoring = this.restoring;
                        this.restoring = null;
                        clearTimeout(this.restoreTimer);
                        this.target.history.replaceState(this.committed.state, "", this.committed.url);
                        restoring.finish(false);
                    }
                }
                return;
            }
            if (this.checking) {
                // Extra gestures do not start checks. Their rollback is awaited before replay.
                void this.restoreCommitted();
                return;
            }
            const delta = this.committed.index !== null && destination.index !== null
                ? destination.index - this.committed.index
                : null;
            if (delta !== null && delta !== 0) {
                const returned = this.restoreCommitted();
                void this.approve(() => this.replayPop(destination, () => this.target.history.go(delta)), returned);
                return;
            }
            // Direct hash edits can have no distinct router index; preserve the current route until all checks pass.
            this.target.history.replaceState(this.committed.state, "", this.committed.url);
            void this.approve(() => this.replayPop(destination, () => {
                this.target.history.replaceState(destination.state, "", destination.url);
                this.target.dispatchEvent(new PopStateEvent("popstate", { state: destination.state }));
            }), Promise.resolve(true));
        };
        this.committed = position(target);
        this.originalPush = navigator.push;
        this.originalReplace = navigator.replace;
        navigator.push = this.push;
        navigator.replace = this.replace;
        installSetupNavigationProtection(target);
        const routers = windowCoordinators.get(target) ?? new Set();
        routers.add(this);
        windowCoordinators.set(target, routers);
    }
    notify(pending) {
        for (const guard of this.guards.values())
            guard.pending(pending);
    }
    add(id, guard) {
        this.guards.set(id, guard);
        guard.pending(this.checking);
    }
    remove(id) {
        this.guards.delete(id);
        if (this.guards.size)
            return;
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
        restoring?.finish(false);
        const replay = this.replay;
        this.replay = null;
        replay?.done();
    }
    async approve(commit, returned) {
        if (this.checking || this.disposed)
            return;
        this.checking = true;
        this.notify(true);
        try {
            if (returned && (!(await returned) || !(await this.waitForNativeIdle())))
                return;
            const checked = new Set();
            // A new guard mounted while another check awaits must also approve this transition.
            while (!this.disposed) {
                const next = [...this.guards].find(([id]) => !checked.has(id));
                if (!next)
                    break;
                const [id, guard] = next;
                checked.add(id);
                try {
                    if ((await guard.beforeLeave()) === false) {
                        if (this.restoring)
                            await this.restoring.promise;
                        return;
                    }
                }
                catch (error) {
                    if (this.guards.has(id))
                        guard.onError(error instanceof Error ? error : new Error(String(error)));
                    if (this.restoring)
                        await this.restoring.promise;
                    return;
                }
            }
            // Another native gesture may have begun a rollback while a save/check awaited.
            // Replaying before that traversal lands can cancel it or land back on Setup.
            if (this.restoring && !(await this.restoring.promise))
                return;
            if (this.disposed || !this.guards.size)
                return;
            await commit();
            if (!this.disposed)
                this.committed = position(this.target);
        }
        finally {
            this.checking = false;
            if (!this.disposed)
                this.notify(false);
        }
    }
    replayPop(destination, action) {
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
    async waitForNativeIdle() {
        // Chromium can abort requests started during a history traversal when a second
        // gesture arrives. Coalesce the burst before starting any save/network check.
        while (!this.disposed) {
            if (this.restoring && !(await this.restoring.promise))
                return false;
            const version = this.nativeVersion;
            await new Promise((resolve) => setTimeout(resolve, NATIVE_NAVIGATION_SETTLE_MS));
            if (version === this.nativeVersion && !this.restoring)
                return true;
        }
        return false;
    }
    restoreCommitted() {
        if (this.restoring)
            return this.restoring.promise;
        const from = position(this.target);
        if (samePosition(from, this.committed))
            return Promise.resolve(true);
        if (from.index === null ||
            this.committed.index === null ||
            from.index === this.committed.index) {
            this.target.history.replaceState(this.committed.state, "", this.committed.url);
            return Promise.resolve(false);
        }
        let finish;
        const promise = new Promise((resolve) => {
            finish = resolve;
        });
        this.restoring = { promise, finish, requestedFrom: from };
        this.restoreTimer = setTimeout(() => {
            const restoring = this.restoring;
            if (!restoring)
                return;
            this.restoring = null;
            this.target.history.replaceState(this.committed.state, "", this.committed.url);
            // An unverified rollback must keep the page, not replay an unknown history entry.
            restoring.finish(false);
        }, 1500);
        this.target.history.go(this.committed.index - from.index);
        return promise;
    }
}
export function useSetupNavigationGuard(beforeLeave, { enabled = true, onError } = {}) {
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
