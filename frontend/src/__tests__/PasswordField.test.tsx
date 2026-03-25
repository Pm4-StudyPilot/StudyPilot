import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import userEvent from "@testing-library/user-event"
import PasswordField from "../components/shared/PasswordField"

describe("PasswordField", () => {
  it("links the label and input using the same id", () => {
    render(<PasswordField label="Password" />)

    const input = screen.getByLabelText("Password")
    const label = screen.getByText("Password")

    expect(label).toHaveAttribute("for", input.id)
  })

  it("renders as password type by default", () => {
    render(<PasswordField label="Password" />)

    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")
  })

  it("applies is-invalid class when error is provided", () => {
    render(<PasswordField label="Password" error="Required" />)

    const input = screen.getByLabelText("Password")
    expect(input.className).toContain("is-invalid")
  })

  it("shows toggle button by default", () => {
    render(<PasswordField label="Password" />)

    expect(screen.getByRole("button")).toHaveTextContent("show")
  })

  it("hides toggle button when showToggle is false", () => {
    render(<PasswordField label="Password" showToggle={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("toggles password visibility when clicking the toggle button", async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Password" />)

    const input = screen.getByLabelText("Password")
    const toggle = screen.getByRole("button")

    expect(input).toHaveAttribute("type", "password")

    await user.click(toggle)
    expect(input).toHaveAttribute("type", "text")
    expect(toggle).toHaveTextContent("hide")

    await user.click(toggle)
    expect(input).toHaveAttribute("type", "password")
    expect(toggle).toHaveTextContent("show")
  })

  it("toggle button has type='button' to prevent form submission", () => {
    render(<PasswordField label="Password" />)

    expect(screen.getByRole("button")).toHaveAttribute("type", "button")
  })

  it("sets autocomplete to current-password by default", () => {
    render(<PasswordField label="Password" />)

    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("autocomplete", "current-password")
  })
})
