import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import SelectField from "../components/shared/form/SelectField"

vi.mock("./FormFieldLayout", () => ({
  FormFieldLayout: ({ id, label, children }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
    </div>
  ),
  BaseProps: {},
}))

describe("SelectField", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ]

  it("links the label and select using the same id", () => {
    render(<SelectField label="Choose" options={options} />)

    const select = screen.getByRole("combobox")
    const label = screen.getByText("Choose")

    expect(label).toHaveAttribute("for", select.id)
  })

  it("renders all provided options", () => {
    render(<SelectField label="test" options={options} />)

    expect(screen.getByText("Option A")).toBeInTheDocument()
    expect(screen.getByText("Option B")).toBeInTheDocument()
  })

  it("applies is-invalid class when error is provided", () => {
    render(<SelectField label="test" options={options} error="Required" />)

    const select = screen.getByRole("combobox")
    expect(select.className).toContain("is-invalid")
  })

  it("forwards props to the select element (e.g., onChange)", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <SelectField
        label="test"
        options={options}
        onChange={handleChange}
      />
    )

    const select = screen.getByRole("combobox")

    await user.selectOptions(select, "b")

    expect(handleChange).toHaveBeenCalled()
    expect((select as HTMLSelectElement).value).toBe("b")
  })
})