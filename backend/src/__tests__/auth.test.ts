import { describe, it, expect } from "bun:test";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret";

describe("Auth utilities", () => {
  it("should sign and verify a JWT token", () => {
    const payload = { userId: 1, email: "test@example.com" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.userId).toBe(1);
    expect(decoded.email).toBe("test@example.com");
  });

  it("should reject a token with wrong secret", () => {
    const token = jwt.sign({ userId: 1 }, JWT_SECRET);

    expect(() => {
      jwt.verify(token, "wrong-secret");
    }).toThrow();
  });
});
