import { createElement, StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blankRecoveryInputs,
  clearLocalRecoveryDraft,
  loadLocalRecovery,
  recoveryStorageKey,
  saveLocalRecovery,
} from "./localDraftRecovery";
import { blankDraft } from "./presets";
import { fixtureDraft } from "./testing/fixtures";
import {
  installSetupNavigationProtection,
  useSetupNavigationGuard,
} from "./useSetupNavigationGuard";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("workspace local recovery", () => {
  it("retains the full draft and unfinished inputs independently for each workspace", () => {
    const draft = fixtureDraft();
    const inputs = {
      ...blankRecoveryInputs(),
      chat: "Please adjust this later",
      riskInstructions: { budget: "Finance makes the final budget choice" },
      roleTitle: "Mentoring Director",
      roleDept: "planning",
      newRole: true,
    };
    expect(
      saveLocalRecovery("workspace-a", { baseRevision: 4, draft, inputs }),
    ).toBe(true);
    expect(loadLocalRecovery("workspace-a")).toMatchObject({
      baseRevision: 4,
      draft,
      inputs,
    });
    expect(loadLocalRecovery("workspace-b")).toBeNull();
    expect(clearLocalRecoveryDraft("workspace-a", 5, inputs)).toBe(true);
    expect(loadLocalRecovery("workspace-a")).toMatchObject({
      baseRevision: 5,
      draft: null,
      inputs,
    });
  });

  it("keeps a temporarily empty edited role title for recovery without weakening server validation", () => {
    const draft = fixtureDraft();
    draft.roles[0].title = "";
    expect(
      saveLocalRecovery("editing", {
        baseRevision: 1,
        draft,
        inputs: blankRecoveryInputs(),
      }),
    ).toBe(true);
    expect(loadLocalRecovery("editing")?.draft?.roles[0].title).toBe("");
  });

  it("reports corruption and preserves the original bytes before any replacement", () => {
    const key = recoveryStorageKey("workspace-a"),
      report = vi.fn();
    localStorage.setItem(key, "unreadable original work");
    expect(loadLocalRecovery("workspace-a", report)).toBeNull();
    expect(localStorage.getItem(key)).toBe("unreadable original work");
    expect(report).toHaveBeenCalledOnce();
    expect(
      saveLocalRecovery(
        "workspace-a",
        {
          baseRevision: 2,
          draft: blankDraft(),
          inputs: blankRecoveryInputs(),
        },
        report,
      ),
    ).toBe(true);
    const backup = Object.keys(localStorage).find((k) =>
      k.startsWith(key + ".unreadable."),
    );
    expect(backup).toBeTruthy();
    expect(localStorage.getItem(backup!)).toBe("unreadable original work");
    expect(loadLocalRecovery("workspace-a")?.baseRevision).toBe(2);
  });

  it("does not overwrite corrupt work when preservation runs out of storage", () => {
    const report = vi.fn();
    const store = {
      getItem: () => "important invalid JSON",
      setItem: vi.fn((_key: string, _value: string) => {
        throw new Error("quota");
      }),
    };
    expect(
      saveLocalRecovery(
        "full",
        {
          baseRevision: 0,
          draft: blankDraft(),
          inputs: blankRecoveryInputs(),
        },
        report,
        store,
      ),
    ).toBe(false);
    expect(store.setItem).toHaveBeenCalledOnce();
    expect(store.setItem.mock.calls[0][0]).toContain(".unreadable.");
    expect(report).toHaveBeenCalledOnce();
  });
});

function setupGuard(beforeLeave: () => Promise<boolean | void>) {
  installSetupNavigationProtection();
  const failed = vi.fn();
  function Guarded() {
    const { pending } = useSetupNavigationGuard(beforeLeave, {
      onError: failed,
    });
    return createElement(
      "div",
      null,
      createElement("h1", null, "Setup"),
      pending && createElement("p", null, "Saving before leaving"),
      createElement(Link, { to: "/home" }, "Home"),
    );
  }
  const ui = render(
    createElement(
      StrictMode,
      null,
      createElement(
        HashRouter,
        { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: "/setup",
            element: createElement(Guarded),
          }),
          createElement(Route, {
            path: "/home",
            element: createElement("h1", null, "Home page"),
          }),
        ),
      ),
    ),
  );
  return { ...ui, failed };
}

describe("HashRouter setup navigation protection", () => {
  it("keeps setup mounted until a Link save completes and ignores a second leave click", async () => {
    window.history.replaceState({ idx: 20 }, "", "#/setup");
    let complete: (allow: boolean) => void = () => {};
    const beforeLeave = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          complete = resolve;
        }),
    );
    setupGuard(beforeLeave);
    fireEvent.click(screen.getByText("Home"));
    fireEvent.click(screen.getByText("Home"));
    expect(screen.getByRole("heading").textContent).toBe("Setup");
    expect(beforeLeave).toHaveBeenCalledOnce();
    await act(async () => {
      complete(true);
    });
    await screen.findByText("Home page");
  });

  it("leaves the page mounted and reports a rejected save", async () => {
    window.history.replaceState({ idx: 21 }, "", "#/setup");
    const { failed } = setupGuard(async () => {
      throw new Error("Stale revision");
    });
    fireEvent.click(screen.getByText("Home"));
    await waitFor(() => expect(failed).toHaveBeenCalledOnce());
    expect(window.location.hash).toBe("#/setup");
    expect(screen.getByRole("heading").textContent).toBe("Setup");
  });

  it("restores browser Back before saving and replays it only after a successful save", async () => {
    window.history.replaceState({ idx: 30 }, "", "#/home");
    window.history.pushState({ idx: 31 }, "", "#/setup");
    let complete: (allow: boolean) => void = () => {};
    const beforeLeave = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          complete = resolve;
        }),
    );
    setupGuard(beforeLeave);
    window.history.back();
    await waitFor(() => expect(beforeLeave).toHaveBeenCalledOnce());
    await waitFor(() => expect(window.location.hash).toBe("#/setup"));
    expect(screen.getByRole("heading").textContent).toBe("Setup");
    await act(async () => {
      complete(true);
    });
    await screen.findByText("Home page");
    expect(window.location.hash).toBe("#/home");
  });

  it("keeps setup and its history entry when browser Back cannot save", async () => {
    window.history.replaceState({ idx: 40 }, "", "#/home");
    window.history.pushState({ idx: 41 }, "", "#/setup");
    const beforeLeave = vi.fn(async () => false);
    setupGuard(beforeLeave);
    window.history.back();
    await waitFor(() => expect(beforeLeave).toHaveBeenCalledOnce());
    await waitFor(() => expect(window.location.hash).toBe("#/setup"));
    expect(screen.getByRole("heading").textContent).toBe("Setup");
    expect(window.history.state.idx).toBe(41);
  });

  it("guards a direct hash edit before HashRouter can unmount the page", async () => {
    window.history.replaceState({ idx: 50 }, "", "#/setup");
    let complete: (allow: boolean) => void = () => {};
    const beforeLeave = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          complete = resolve;
        }),
    );
    setupGuard(beforeLeave);
    window.location.hash = "/home";
    await waitFor(() => expect(beforeLeave).toHaveBeenCalledOnce());
    expect(window.location.hash).toBe("#/setup");
    expect(screen.getByRole("heading").textContent).toBe("Setup");
    await act(async () => {
      complete(true);
    });
    await screen.findByText("Home page");
  });

  it("does not intercept ordinary Back once setup has unmounted", async () => {
    window.history.replaceState({ idx: 60 }, "", "#/setup");
    const beforeLeave = vi.fn(async () => true);
    setupGuard(beforeLeave);
    fireEvent.click(screen.getByText("Home"));
    await screen.findByText("Home page");
    window.history.back();
    await screen.findByText("Setup");
    expect(beforeLeave).toHaveBeenCalledOnce();
  });
});
