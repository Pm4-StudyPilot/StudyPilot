import { describe, it, expect } from "bun:test";

const BASE_URL = "http://localhost:3000/api";

/**
 * Integration tests for POST api/auth/register
 *
 * Purpose:
 * These tests verify the behavior of the registration endpoint against the running backend.
 * 
 * Covered scenarios:
 * - Validation of required fields (400 Bad Request)
 * - Successful user registration (201 Created)
 * - Handling of duplicate email (409 Conflict)
 * - Handling of duplicate username (409 Conflict)
 * 
 * Notes:
 * - Tests use unique values (Date.now()) to avoid conflicts between test runs
 * - Backend server must be running before executing these tests
 */
describe("Auth Register Endpoint", () => {
  /**
   * Test case: Successful registration
   * 
   * Scenario: 
   * A new user is registered with valid and unique email, username and password.
   * 
   * Expected behavior:
   * - User is successfully created in the database
   * - Status code: 201 (Created)
   * - Response contains:
   *    - JWT token (for authentication)
   *    - User object with email and username
   */
  it("should register a new user successfully", async () => {
    const uniqueId = Date.now();

    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `test${uniqueId}@students.zhaw.ch`,
        username: `user${uniqueId}`,
        password: "Password123!",
      }),
    });

    expect(res.status).toBe(201);

    const data = await res.json();

    expect(data).toHaveProperty("token");
    expect(data).toHaveProperty("user");
    expect(data.user).toHaveProperty("email");
    expect(data.user).toHaveProperty("username");
  });

  /**
   * Test case: Missing required fields
   * 
   * Scenario: 
   * Only the email is provided, while username and password are missing.
   * 
   * Expected behavior:
   * - The request is rejected
   * - Status code: 400 (Bad Request)
   * - Response contains an error message explaining the validation failure
   */
  it("should return 400 if fields are missing", async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@students.zhaw.ch",
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty("message");
  });

  /**
   * Test case: Duplicate email
   * 
   * Scenario:
   * - First request creates a new user
   * - Second request attempts to register with the same email
   * 
   * Expected behavior:
   * - First request succeeds (201 Created)
   * - Second request is rejected
   * - Status code: 409 (Conflict)
   * - Response contains an error message indicating duplicate email
   */
  it("should return 409 if email already exists", async () => {
    const uniqueId = Date.now();
    const email = `duplicate${uniqueId}@students.zhaw.ch`;

    const firstRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username: `userA${uniqueId}`,
        password: "Password123!",
      }),
    });

    expect(firstRes.status).toBe(201);

    const secondRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username: `userB${uniqueId}`,
        password: "Password123!",
      }),
    });

    expect(secondRes.status).toBe(409);

    const data = await secondRes.json();
    expect(data).toHaveProperty("message");
  });

  /**
   * Test case: Duplicate username
   * 
   * Scenario:
   * - First request creates a new user
   * - Second request attempts to register with the same username
   * 
   * Expected behavior:
   * - First request succeds (201 Created)
   * - Second request is rejected
   * - Status code: 409 (Conflict)
   * - Response contains an error message indicating duplicate username
   */
  it("should return 409 if username already exists", async () => {
    const uniqueId = Date.now();
    const username = `duplicateUser${uniqueId}`;

    const firstRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `first${uniqueId}@students.zhaw.ch`,
        username,
        password: "Password123!",
      }),
    });

    expect(firstRes.status).toBe(201);

    const secondRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `second${uniqueId}@students.zhaw.ch`,
        username,
        password: "Password123!",
      }),
    });

    expect(secondRes.status).toBe(409);

    const data = await secondRes.json();
    expect(data).toHaveProperty("message");
  });
});