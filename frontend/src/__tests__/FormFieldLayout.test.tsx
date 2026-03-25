import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { FormFieldLayout } from "../components/shared/FormFieldLayout"

describe("FormFieldLayout", () => {
  it("renders the label and links it to the provided id", () => {
    render(
      <FormFieldLayout label="Username" id="user-id">
        <input id="user-id" />
      </FormFieldLayout>
    )

    const label = screen.getByText("Username")
    const input = screen.getByRole("textbox")

    expect(label).toHaveAttribute("for", "user-id")
    expect(input).toHaveAttribute("id", "user-id")
  })

  it("renders children inside the input-group", () => {
    render(
      <FormFieldLayout label="Test" id="x">
        <input id="x" />
      </FormFieldLayout>
    )

    const group = screen.getByRole("group", { hidden: true }) // fallback
    const input = screen.getByRole("textbox")

    expect(group).toBeInTheDocument()
    expect(group).toContainElement(input)
  })

  it("renders left icon when provided", () => {
    render(
      <FormFieldLayout label="Email" id="email" iconLeft={<span>LEFT</span>}>
        <input id="email" />
      </FormFieldLayout>
    )

    expect(screen.getByText("LEFT")).toBeInTheDocument()
  })

  it("renders right icon when provided", () => {
    render(
      <FormFieldLayout label="Email" id="email" iconRight={<span>RIGHT</span>}>
        <input id="email" />
      </FormFieldLayout>
    )

    expect(screen.getByText("RIGHT")).toBeInTheDocument()
  })

  it("renders description text when provided", () => {
    render(
      <FormFieldLayout
        label="Password"
        id="pwd"
        description="Must be at least 8 characters"
      >
        <input id="pwd" />
      </FormFieldLayout>
    )

    expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument()
  })

  it("renders error text when provided", () => {
    render(
      <FormFieldLayout label="Password" id="pwd" error="Required field">
        <input id="pwd" />
      </FormFieldLayout>
    )

    const error = screen.getByText("Required field")
    expect(error).toBeInTheDocument()
    expect(error).toHaveClass("invalid-feedback")
    expect(error).toHaveClass("d-block")
  })
})