describe("Smoke test", () => {
  it("should load the login page", () => {
    cy.visit("/login");
    cy.url().should("include", "/login");
  });

  it("should navigate to register page", () => {
    cy.visit("/register");
    cy.url().should("include", "/register");
  });

  it("should redirect unauthenticated users to login", () => {
    cy.visit("/");
    cy.url().should("include", "/login");
  });
});
