import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import ProgressBar from "../components/shared/ProgressBar"

describe("ProgressBar", () => {
  it("renders with correct width for a valid value", () => {
    render(<ProgressBar value={2} />)

    const bar = screen.getByRole("progressbar")

    expect(bar).toHaveStyle({ width: "50%" })
  })

  it("uses the correct bootstrap color class for valid values", () => {
    render(<ProgressBar value={1} />)

    const bar = screen.getByRole("progressbar")

    expect(bar.className).toContain("bg-warning")
  })

  it("treats negative values as 0", () => {
    render(<ProgressBar value={-1} />)

    const bar = screen.getByRole("progressbar")

    expect(bar).toHaveStyle({ width: "0%" })
    expect(bar.className).toContain("bg-danger")
  })

  it("treats values above the expected range as the highest possible value", () => {
    render(<ProgressBar value={10} />)

    const bar = screen.getByRole("progressbar")

    expect(bar).toHaveStyle({ width: "75%" })
    expect(bar.className).toContain("bg-success")
  })

  it("handles non-integer values", () => {
    render(<ProgressBar value={1.5} />)

    const bar = screen.getByRole("progressbar")

    expect(bar).toHaveStyle({ width: "37.5%" })
    expect(bar.className).toContain("bg-info")
  })
})
