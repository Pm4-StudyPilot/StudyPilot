import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import TextareaField from "../components/shared/TextareaField"

vi.mock("./FormFieldLayout", () => ({
  FormFieldLayout: ({ id, label, children }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
    </div>
  ),
  BaseProps: {},
}))

describe("TextareaField", () => {
  it("links the label and textarea using the same id", () => {
    render(<TextareaField label="Message" />)

    const textarea = screen.getByRole("textbox")
    const label = screen.getByText("Message")

    expect(label).toHaveAttribute("for", textarea.id)
  })

  it("renders a textarea element", () => {
    render(<TextareaField label="test"/>)

    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("applies is-invalid class when error is provided", () => {
    render(<TextareaField label="test" error="Required" />)

    const textarea = screen.getByRole("textbox")
    expect(textarea.className).toContain("is-invalid")
  })

  it("forwards props to the textarea element (e.g., onChange)", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <TextareaField label="test" onChange={handleChange} />
    )

    const textarea = screen.getByRole("textbox")

    await user.type(textarea, "Hello")

    expect(handleChange).toHaveBeenCalled()
  })
})
