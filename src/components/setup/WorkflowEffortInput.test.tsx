import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { WorkflowEffortInput } from "./WorkflowEffortInput"

afterEach(cleanup)

describe("workflow effort input", () => {
  it("keeps a temporary empty number on screen without saving a zero", () => {
    const commit = vi.fn()
    render(<WorkflowEffortInput value={5} onCommit={commit} />)
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "" } })
    expect(commit).not.toHaveBeenCalled()
    expect((screen.getByLabelText("Days of work") as HTMLInputElement).value).toBe("")
    fireEvent.blur(screen.getByLabelText("Days of work"))
    expect(screen.getByRole("alert").textContent).toContain("whole number")
  })

  it("saves an intentional zero and an integer as human effort edits", () => {
    const commit = vi.fn()
    render(<WorkflowEffortInput value={5} onCommit={commit} />)
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "0" } })
    expect(commit).toHaveBeenLastCalledWith({ estDays: 0, startPolicy: "effort" })
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "10" } })
    expect(commit).toHaveBeenLastCalledWith({ estDays: 10, startPolicy: "effort" })
  })

  it.each(["-1", "1.5", "100"])("does not round or clamp invalid input %s into persisted data", raw => {
    const commit = vi.fn()
    render(<WorkflowEffortInput value={5} onCommit={commit} />)
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: raw } })
    expect(commit).not.toHaveBeenCalled()
    expect((screen.getByLabelText("Days of work") as HTMLInputElement).value).toBe(raw)
    expect(screen.getByRole("alert")).toBeTruthy()
  })

  it("reads restored business values rather than keeping a stale invalid draft", () => {
    function Input() {
      const [value, setValue] = useState(5)
      return <><WorkflowEffortInput value={value} onCommit={patch => setValue(patch.estDays)} /><button onClick={() => setValue(3)}>Restore previous value</button></>
    }
    render(<Input />)
    fireEvent.change(screen.getByLabelText("Days of work"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "Restore previous value" }))
    expect((screen.getByLabelText("Days of work") as HTMLInputElement).value).toBe("3")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
