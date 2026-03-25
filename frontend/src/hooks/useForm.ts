import { useState, useRef } from "react"
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

  function handleChange<K extends keyof T>(key: K, value: T[K]) {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      if (submitted.current) {
        runValidation(next)
      }
      return next
    })
  }

  function validate() {
    submitted.current = true
    return runValidation(values)
  }

  return { values, errors, handleChange, validate }
}
