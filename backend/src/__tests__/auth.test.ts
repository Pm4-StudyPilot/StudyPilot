import { describe, it, expect } from "bun:test";
import jwt from "jsonwebtoken";

/**
 * Secret used for testing JWT functionality.
 *
 * This is intentionally hardcoded because:
 * - We do not depend on environment variables in unit tests
 * - It ensures deterministic and isolated test behavior
 */
const JWT_SECRET = "test-secret";

/**
 * Auth utility tests
 *
 * These tests verify the correct behavior of JWT token handling
 * using the real jsonwebtoken library (no mocks).
 *
 * Covered scenarios:
 * - Token signing and verification
 * - Token rejection with invalid secret
 */
describe("Auth utilities", () => {
  /**
   * Test case: Sign and verify token
   *
   * Scenario:
   * A JWT token is created with a valid payload and secret.
   *
   * Expected behavior:
   * - Token is generated successfully
   * - Token can be verified using the same secret
   * - Decoded payload matches the original payload
   */
  it("should sign and verify a JWT token", () => {
    const payload = { userId: 1, email: "test@students.zhaw.ch" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.userId).toBe(1);
    expect(decoded.email).toBe("test@students.zhaw.ch");
  });

  /**
   * Test case: Invalid secret
   *
   * Scenario:
   * A token is verified using a different (wrong) secret.
   *
   * Expected behavior:
   * - Verification fails
   * - An error is thrown
   */
  it("should reject a token with wrong secret", () => {
    const token = jwt.sign({ userId: 1 }, JWT_SECRET);

    expect(() => {
      jwt.verify(token, "wrong-secret");
    }).toThrow();
  });
});
