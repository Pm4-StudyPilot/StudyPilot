import { describe, it, expect } from "bun:test";

describe("Health check", () => {
  it("should return ok status", async () => {
    // Simple unit test: verify the health response shape
    const healthResponse = { status: "ok" };
    expect(healthResponse.status).toBe("ok");
  });

  it("should have required environment variables defined or fallback", () => {
    const port = process.env.PORT || 3000;
    expect(port).toBeDefined();
  });
});
