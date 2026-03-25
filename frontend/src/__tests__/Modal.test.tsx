import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { userEvent } from "@testing-library/user-event"

import Modal from "../components/shared/layout/Modal"

describe("FormLayout", () => {
  it("renders title and children", () => {
    render(
      <Modal title="Register">
        <div>Child content</div>
      </Modal>
    )

    expect(screen.getByText("Register")).toBeInTheDocument()
    expect(screen.getByText("Child content")).toBeInTheDocument()
  })

  it("closes when ESC key is pressed", async () => {
    const user = userEvent.setup()

    render(
      <Modal>
        <div>Content</div>
      </Modal>
    )

    expect(screen.getByText("Content")).toBeInTheDocument()

    await user.keyboard("{Escape}")

    expect(screen.queryByText("Content")).toBeNull()
  })

  it("closes when close button is clicked", async () => {
    const user = userEvent.setup()

    render(
      <Modal>
        <div>Content</div>
      </Modal>
    )

    const closeButton = screen.getByRole("button")
    await user.click(closeButton)

    expect(screen.queryByText("Content")).toBeNull()
  })

  it("renders null when closed", async () => {
    const user = userEvent.setup()

    render(
      <Modal>
        <div>Content</div>
      </Modal>
    )

    // Click backdrop to close
    const backdrop = screen.getByTestId("modal-backdrop")
    await user.click(backdrop)

    expect(screen.queryByText("Content")).toBeNull()
  })

  it("cannot be closed with ESC when disableClose is true", async () => {
    const user = userEvent.setup()

    render(
      <Modal disableClose={true}>
        <div>Content</div>
      </Modal>
    )

    // Ensure modal is visible
    expect(screen.getByText("Content")).toBeInTheDocument()

    // Press ESC
    await user.keyboard("{Escape}")

    // Modal should disappear
    expect(screen.queryByText("Content")).toBeInTheDocument()
  })

  it("calls onClose when ESC key is pressed", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    )

    await user.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    )

    await user.click(screen.getByTestId("modal-closebutton"))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    )

    await user.click(screen.getByTestId("modal-backdrop"))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("does not call onClose when disableClose is true", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal disableClose={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    )

    await user.keyboard("{Escape}")

    expect(onClose).not.toHaveBeenCalled()
  })

  it("has no close button when disableClose is true", async () => {
    render(
      <Modal disableClose={true}>
        <div>Content</div>
      </Modal>
    )

    expect(screen.queryByTestId("modal-closebutton")).not.toBeInTheDocument()
  })
})
