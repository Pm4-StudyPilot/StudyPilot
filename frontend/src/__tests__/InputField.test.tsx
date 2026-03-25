import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import InputField from "../components/shared/InputField"

vi.mock("./FormFieldLayout", () => ({
  FormFieldLayout: ({ id, children, label }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
    </div>
  ),
  BaseProps: {}
}))

describe("InputField", () => {
  it("links the label and input using the same id", () => {
    render(<InputField label="Username" />)

    const input = screen.getByRole("textbox")
    const label = screen.getByText("Username")

    expect(label).toHaveAttribute("for", input.id)
  })

  it("renders an input element", () => {
    render(<InputField label="test" />)

    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("applies is-invalid class when error is provided", () => {
    render(<InputField label="test" error="Required" />)

    const input = screen.getByRole("textbox")
    expect(input.className).toContain("is-invalid")
  })

  it("renders password toggle button when passwordToggle is true", () => {
    render(<InputField label="test" type="password" passwordToggle />)

    expect(screen.getByRole("button")).toBeInTheDocument()
    expect(screen.getByRole("button")).toHaveTextContent("show")
  })

  it("toggles password visibility when clicking the toggle button", async () => {
    const user = userEvent.setup()

    render(<InputField label="test" type="password" passwordToggle />)

    const input = screen.getByLabelText(/./)
    const toggle = screen.getByRole("button")

    expect(input).toHaveAttribute("type", "password")

    await user.click(toggle)

    expect(input).toHaveAttribute("type", "text")
    expect(toggle).toHaveTextContent("hide")

    await user.click(toggle)

    expect(input).toHaveAttribute("type", "password")
    expect(toggle).toHaveTextContent("show")
  })

  it("sets autocomplete to current-password for password fields", () => {
    render(<InputField label="test" type="password" />)

    const input = screen.getByLabelText(/./)
    expect(input).toHaveAttribute("autocomplete", "current-password")
  })
})
