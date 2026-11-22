import { afterEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { ConfirmDialog } from "./ConfirmDialog"

afterEach(cleanup)
function Harness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false)
  return <div>
    <button type="button" onClick={() => setOpen(true)}>More</button>
    {open && <ConfirmDialog title="Discard draft" message="Discard this draft? The editor goes back to Version 2." confirmLabel="Discard draft" onConfirm={() => { onConfirm(); setOpen(false) }} onCancel={() => setOpen(false)} />}
  </div>
}

describe("confirmation dialog", () => {
  it("is a labelled modal dialog that takes focus and returns it on Escape", () => {
    const confirm = vi.fn()
    render(<Harness onConfirm={confirm} />)
    const opener = screen.getByRole("button", { name: "More" })
    opener.focus(); fireEvent.click(opener)
    const dialog = screen.getByRole("dialog", { name: "Discard draft" })
    expect(dialog.getAttribute("aria-modal")).toBe("true")
    expect(dialog.textContent).toContain("goes back to Version 2")
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(confirm).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(opener)
  })

  it("confirms once and closes", () => {
    const confirm = vi.fn()
    render(<Harness onConfirm={confirm} />)
    const opener = screen.getByRole("button", { name: "More" })
    opener.focus(); fireEvent.click(opener)
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
