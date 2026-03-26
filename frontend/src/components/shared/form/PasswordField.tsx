import { InputHTMLAttributes, useState, useId } from "react"
import { FormFieldLayout } from "./FormFieldLayout"

type PasswordFieldProps = {
  label: string
  error?: string
  showToggle?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">

export default function PasswordField({
  showToggle = true,
  error,
  id,
  label,
  ...inputProps
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <FormFieldLayout label={label} error={error} id={finalId}>
      <input
        {...inputProps}
        id={finalId}
        type={showPassword ? "text" : "password"}
        className={`form-control${error ? " is-invalid" : ""}`}
        autoComplete={inputProps.autoComplete ?? "current-password"}
      />
      {showToggle && (
        <button
          type="button"
          className="input-group-text"
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? "hide" : "show"}
        </button>
      )}
    </FormFieldLayout>
  )
}
