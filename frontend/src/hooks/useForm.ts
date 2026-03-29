import { useState, useRef, useEffect } from "react"
import { ZodType } from "zod"

export function useForm<T>(schema: ZodType<T>, initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const submitted = useRef(false)

  function runValidation(vals: T) {
    const result = schema.safeParse(vals)

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof T, string>> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof T
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return false
    }

    setErrors({})
    return true
  }

  useEffect(() => {
    if (submitted.current) {
      runValidation(values)
    }
  }, [values])

  function handleChange<K extends keyof T>(key: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function validate() {
    submitted.current = true
    return runValidation(values)
  }

  return { values, errors, handleChange, validate }
}
