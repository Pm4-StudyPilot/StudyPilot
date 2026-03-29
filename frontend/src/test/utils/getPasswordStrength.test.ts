import { describe, it, expect } from "vitest"
import { getPasswordStrength } from "../../utils/passwordStrength"

describe("getPasswordStrength", () => {
  it("returns 0 for an empty password", () => {
    expect(getPasswordStrength("")).toBe(0)
  })

  it("adds 1 point for length >= 8", () => {
    expect(getPasswordStrength("aaaaaaaa")).toBe(1)
  })

  it("adds 1 point for uppercase letters", () => {
    expect(getPasswordStrength("A")).toBe(1)
  })

  it("adds 1 point for numbers", () => {
    expect(getPasswordStrength("1")).toBe(1)
  })

  it("adds 1 point for special characters", () => {
    expect(getPasswordStrength("!")).toBe(1)
  })

  it("returns 4 for a strong password meeting all criteria", () => {
    expect(getPasswordStrength("Abcdef1!")).toBe(4)
  })

  it("handles passwords that meet some but not all criteria", () => {
    expect(getPasswordStrength("abcdefgH")).toBe(2)
    expect(getPasswordStrength("abcdefg1")).toBe(2)
    expect(getPasswordStrength("abcdefg!")).toBe(2)
  })

  it("does not give extra points for multiple occurrences", () => {
    expect(getPasswordStrength("AAAA1!")).toBe(3)
    expect(getPasswordStrength("AAAAAAAA1!")).toBe(4)
  })
})