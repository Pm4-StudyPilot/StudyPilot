import {  InputHTMLAttributes, useState, useId } from "react"
import { FormFieldLayout, BaseProps } from "./FormFieldLayout"

type InputFieldProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    passwordToggle?: boolean
  }

export default function InputField({
  passwordToggle,
  type,
  error,
  id,
  ...props
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === "password" || passwordToggle

  // this id set on the label and to the input element to link them together
  const finalId = id ?? useId()

  return (
    <FormFieldLayout {...props} id={finalId} error={error}>
        <>
            <input
            id={finalId}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            className={`form-control${error ? " is-invalid" : ""}`}
            autoComplete={
                props.autoComplete ??
                (isPassword ? "current-password" : undefined)
            }
            {...props}
            />

            {isPassword && passwordToggle && (
            <button
                type="button"
                className="input-group-text"
                onClick={() => setShowPassword((v) => !v)}
            >
                {showPassword ? "hide" : "show"}
            </button>
            )}
      </>
    </FormFieldLayout>
  )
}