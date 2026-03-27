/**
 * Evaluates a password against defined security rules.
 *
 * This function checks whether a password satisfies the required criteria
 * for a secure password during user registration.
 *
 * Rules:
 * - Minimum length of 12 characters
 * - At least one uppercase letter (A–Z)
 * - At least one lowercase letter (a–z)
 * - At least one number (0–9)
 * - At least one special character (e.g. ! @ # $ % ^ & *)
 *
 * The result is returned as an object where each rule is represented
 * as a boolean value.
 *
 * This is primarily used for:
 * - Displaying live validation feedback in the UI (e.g. green check / red cross)
 * - Supporting password strength calculation
 *
 * @param password The password string entered by the user
 *
 * @returns An object containing the validation result for each rule
 */
export function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  }
}

/**
 * Calculates a password strength score based on fulfilled validation rules.
 *
 * The strength score is derived from the number of satisfied rules
 * returned by getPasswordChecks().
 *
 * Score range:
 * - 0 → no rules satisfied (very weak password)
 * - 5 → all rules satisfied (strong password)
 *
 * This value can be used for:
 * - Visual indicators (e.g. progress bar)
 * - Providing feedback to the user about password quality
 *
 * @param password The password string entered by the user
 *
 * @returns A numeric strength score between 0 and 5
 */
export function getPasswordStrength(password: string) {
  const checks = getPasswordChecks(password)

  return Object.values(checks).filter(Boolean).length // 0–5
}