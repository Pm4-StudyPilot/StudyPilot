import { InputHTMLAttributes, useState, useId } from "react"
import { FormFieldLayout, BaseProps } from "./FormFieldLayout"

type PasswordFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    showToggle?: boolean
  }

export default function PasswordField({
  showToggle = true,
  error,
  id,
  label,
  ...props
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <FormFieldLayout label={label} error={error} id={finalId} {...props}>
      <input
        {...props}
        id={finalId}
        type={showPassword ? "text" : "password"}
        className={`form-control${error ? " is-invalid" : ""}`}
        autoComplete={props.autoComplete ?? "current-password"}
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
