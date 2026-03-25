import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import Form from "../components/shared/form/Form"

describe("Form", () => {
  it("renders children", () => {
    render(
      <Form>
        <div>Child content</div>
      </Form>
    )

    expect(screen.getByText("Child content")).toBeInTheDocument()
  })

  it("renders an error message when error prop is provided", () => {
    render(
      <Form error="Something went wrong">
        <div>Child content</div>
      </Form>
    )

    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("does not render an error message when error is undefined", () => {
    render(
      <Form>
        <div>Child content</div>
      </Form>
    )

    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByText("Something went wrong")).toBeNull()
  })

  it("forwards props to the form element (e.g., onSubmit)", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((e) => e.preventDefault())

    render(
      <Form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </Form>
    )

    await user.click(screen.getByText("Submit"))

    expect(handleSubmit).toHaveBeenCalled()
  })
})
