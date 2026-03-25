import { useState } from "react"
import { ZodType } from "zod"

export function useForm<T>(schema: ZodType<T>, initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  function handleChange<K extends keyof T>(key: K, value: T[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validate() {
  const result = schema.safeParse(values)

  if (!result.success) {
    const fieldErrors: any = {}

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

  return { values, errors, handleChange, validate }
}
