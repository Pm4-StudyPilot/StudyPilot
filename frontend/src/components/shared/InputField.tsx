import {  InputHTMLAttributes, useState, useId, useCallback } from "react"
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
  label,
  ...props
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === "password" || passwordToggle

  const isCheck = type === 'checkbox' || type === 'radio'

  // this id set on the label and to the input element to link them together
  const finalId = id ?? useId()

  return (
    <FormFieldLayout label={label} {...props} id={isCheck ? undefined : finalId} error={error}>
        <div className={isCheck ? 'form-check' : ''}>
            <input
            id={finalId}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            className={`${error ? " is-invalid" : ""}${isCheck ? ' form-check-input' : 'form-control'}`}
            autoComplete={
                props.autoComplete ??
                (isPassword ? "current-password" : undefined)
            }
            {...props}
            />

            {isCheck && (
              <label onClick={(e: any) => e.target.previousElementSibling.click()} className="form-label" htmlFor={finalId}>{label}</label>
            )}

            {isPassword && passwordToggle && (
            <button
                type="button"
                className="input-group-text"
                onClick={() => setShowPassword((v) => !v)}
            >
                {showPassword ? "hide" : "show"}
            </button>
            )}
      </div>
    </FormFieldLayout>
  )
}