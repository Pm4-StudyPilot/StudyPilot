import { useState, useMemo, useCallback } from 'react';
import { ZodType } from 'zod';

export function useForm<T>(schema: ZodType<T>, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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

  const errors = useMemo(
    () => (hasSubmitted ? computeErrors(values) : {}),
    [hasSubmitted, values, computeErrors]
  );

  function handleChange<K extends keyof T>(key: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    setHasSubmitted(true);
    return Object.keys(computeErrors(values)).length === 0;
  }

  return { values, errors, handleChange, validate };
}
