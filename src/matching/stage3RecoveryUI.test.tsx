import { afterEach, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { StoreProvider } from "../data/store"
import type { OrganizationMatchingContext } from "./businessContracts"
import { TaskMatchingPanel } from "./TaskMatchingPanel"
import { stage3Club, stage3CreateEvent } from "./stage3Fixtures"

afterEach(() => { cleanup(); localStorage.clear() })

it.each([undefined, { opaqueFutureRecord: "preserve this" }])("shows recovery in a task detail when overrides are unreadable instead of crashing the application: %o", overrides => {
  const state = stage3CreateEvent(stage3Club(), "recovery-ui")
  const node = state.nodes.find(n => n.id === "recovery-ui:0:venue")!
  const damaged = { ...state, matchingContext: { ...state.matchingContext!, overrides } as unknown as OrganizationMatchingContext }
  expect(() => render(<StoreProvider initial={damaged}><TaskMatchingPanel node={node} /></StoreProvider>)).not.toThrow()
  expect(screen.getByTestId("task-matching").textContent).toContain("original data is retained")
  expect(damaged.matchingContext.overrides).toBe(overrides)
})
