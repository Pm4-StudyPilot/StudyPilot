import { useState, useMemo, useCallback } from 'react';
import { ZodSchema } from 'zod';

/**
 * useForm Hook
 * 
 * A generic form management hook wiht validation using Zod.
 * 
 * Responsibilites:
 * - Manage form state (values)
 * - Validate form data using a Zod schema
 * - Track validation errors
 * - Provide helper functions for input handling and validation
 * 
 * @template T - Shape of the form data (inferred from Zod schema)
 * 
 * @param schema Zod schema used to validate the form data
 * @param initial Initial form values
 * @returns Object containing:
 * - values: current form values
 * - errors: valdiation errors per field
 * - handleChange: function to update a field value
 * - validate: function to trigger validation (returns boolean)
 */
export function useForm<T>(schema: ZodSchema<T>, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  /**
   * Computes validation errors using the provided Zod schema.
   * 
   * @param vals Current form values
   * @returns Object mapping field names to error messages
   */
  const computeErrors = useCallback(
    (vals: T): Partial<Record<keyof T, string>> => {
      const result = schema.safeParse(vals);

      if (!result.success) {
        const fieldErrors: Partial<Record<keyof T, string>> = {};
        
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof T;
          fieldErrors[field] = issue.message;
        });

        return fieldErrors;
      }
      return {};
    },
    [schema]
  );

  /**
   * Memoized validation errors.
   * 
   * Errors are only shown after the form has been submitted at least once.
   */
  const errors: Partial<Record<keyof T, string>> = useMemo(
    () => 
      hasSubmitted 
      ? computeErrors(values) 
      : ({} as Partial<Record<keyof T, string>>), 
    [hasSubmitted, values, computeErrors]
  );

  /**
   * Updates a single field in the form state.
   * 
   * @param key Field name
   * @param value New value for the field
   */
  function handleChange<K extends keyof T>(key: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /**
   * Triggers validation for the current form value.
   * 
   * @returns true if the form is valid, false otherwise
   */
  function validate() {
    setHasSubmitted(true);
    return Object.keys(computeErrors(values)).length === 0;
  }

  return { values, errors, handleChange, validate };
}
