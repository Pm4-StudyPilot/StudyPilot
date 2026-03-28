import { describe, it, expect } from "vitest";
import { getPasswordChecks } from "../../utils/passwordStrength";

/**
 * getPasswordChecks
 *
 * This test suite verifies that the password validation helper correctly
 * evaluates all required password rules.
 *
 * The function should return an object with boolean flags:
 * - minLength (>= 12 characters)
 * - uppercase (at least one uppercase letter)
 * - lowercase (at least one lowercase letter)
 * - number (at least one digit)
 * - specialChar (at least one special character)
 */

describe("getPasswordChecks", () => {
  /**
   * Test case: Empty password
   *
   * Scenario:
   * No input is provided.
   *
   * Expected behavior:
   * - All validation checks return false
   */
  it("returns all checks as false for an empty password", () => {
    expect(getPasswordChecks("")).toEqual({
      minLength: false,
      uppercase: false,
      lowercase: false,
      number: false,
      specialChar: false,
    });
  });

  /**
   * Test case: Minimum length requirement
   *
   * Scenario:
   * Password has at least 12 characters.
   *
   * Expected behavior:
   * - minLength is true
   * - Other checks depend on content
   */
  it("detects minimum length >= 12 characters", () => {
    const result = getPasswordChecks("aaaaaaaaaaaa");

    expect(result.minLength).toBe(true);
  });

  /**
   * Test case: Uppercase detection
   *
   * Scenario:
   * Password contains uppercase letters.
   *
   * Expected behavior:
   * - uppercase is true
   */
  it("detects uppercase letters", () => {
    const result = getPasswordChecks("ABC");

    expect(result.uppercase).toBe(true);
  });

  /**
   * Test case: Lowercase detection
   *
   * Scenario:
   * Password contains lowercase letters.
   *
   * Expected behavior:
   * - lowercase is true
   */
  it("detects lowercase letters", () => {
    const result = getPasswordChecks("abc");

    expect(result.lowercase).toBe(true);
  });

  /**
   * Test case: Number detection
   *
   * Scenario:
   * Password contains digits.
   *
   * Expected behavior:
   * - number is true
   */
  it("detects numbers", () => {
    const result = getPasswordChecks("123");

    expect(result.number).toBe(true);
  });

  /**
   * Test case: Special character detection
   *
   * Scenario:
   * Password contains special characters.
   *
   * Expected behavior:
   * - specialChar is true
   */
  it("detects special characters", () => {
    const result = getPasswordChecks("!@#");

    expect(result.specialChar).toBe(true);
  });

  /**
   * Test case: All criteria satisfied
   *
   * Scenario:
   * Password meets all security requirements.
   *
   * Expected behavior:
   * - All checks return true
   */
  it("returns true for all checks when password meets all criteria", () => {
    expect(getPasswordChecks("Password123!@#")).toEqual({
      minLength: true,
      uppercase: true,
      lowercase: true,
      number: true,
      specialChar: true,
    });
  });

  /**
   * Test case: Partial validation
   *
   * Scenario:
   * Password meets only some criteria.
   *
   * Expected behavior:
   * - Only the corresponding checks are true
   */
  it("correctly identifies partially valid passwords", () => {
    expect(getPasswordChecks("password")).toEqual({
      minLength: false,
      uppercase: false,
      lowercase: true,
      number: false,
      specialChar: false,
    });
  });

  /**
   * Test case: No duplicate scoring effect
   *
   * Scenario:
   * Password contains multiple occurrences of the same character type.
   *
   * Expected behavior:
   * - Checks remain boolean (true/false)
   * - No "extra credit" for multiple matches
   */
  it("does not give extra credit for multiple occurrences", () => {
    const result = getPasswordChecks("AAAAAAA111!!!");

    expect(result.uppercase).toBe(true);
    expect(result.number).toBe(true);
    expect(result.specialChar).toBe(true);
  });
});