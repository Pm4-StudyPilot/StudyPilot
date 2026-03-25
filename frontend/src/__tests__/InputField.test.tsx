import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import InputField from "../components/shared/InputField"

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

  it("does not apply is-invalid class when no error", () => {
    render(<InputField label="test" />)

    const input = screen.getByRole("textbox")
    expect(input.className).not.toContain("is-invalid")
  })
})
