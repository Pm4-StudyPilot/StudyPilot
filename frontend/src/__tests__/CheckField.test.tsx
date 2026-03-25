import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import CheckField from "../components/shared/form/CheckField"

describe("CheckField", () => {
  it("renders a checkbox input", () => {
    render(<CheckField label="Accept terms" type="checkbox" />)

    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("renders a radio input", () => {
    render(<CheckField label="Option A" type="radio" />)

    expect(screen.getByRole("radio")).toBeInTheDocument()
  })

  it("links the label to the input", () => {
    render(<CheckField label="Accept terms" type="checkbox" />)

    const input = screen.getByRole("checkbox")
    const label = screen.getByText("Accept terms")

    expect(label).toHaveAttribute("for", input.id)
  })

  it("applies form-check-input class", () => {
    render(<CheckField label="Accept terms" type="checkbox" />)

    const input = screen.getByRole("checkbox")
    expect(input.className).toContain("form-check-input")
  })

  it("applies is-invalid class when error is provided", () => {
    render(<CheckField label="Accept terms" type="checkbox" error="Required" />)

    const input = screen.getByRole("checkbox")
    expect(input.className).toContain("is-invalid")
  })

  it("shows error message when error is provided", () => {
    render(<CheckField label="Accept terms" type="checkbox" error="Required" />)

    expect(screen.getByText("Required")).toBeInTheDocument()
  })

  it("calls onChange when clicked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<CheckField label="Accept terms" type="checkbox" onChange={onChange} />)

    await user.click(screen.getByRole("checkbox"))
    expect(onChange).toHaveBeenCalled()
  })
})
