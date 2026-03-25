import { InputHTMLAttributes, useId } from "react"

type CheckFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string
  type: "checkbox" | "radio"
  error?: string
}

export default function CheckField({
  label,
  type,
  error,
  id,
  ...props
}: CheckFieldProps) {
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <div className="form-check mb-3">
      <input
        {...props}
        id={finalId}
        type={type}
        className={`form-check-input${error ? " is-invalid" : ""}`}
      />
      <label className="form-check-label" htmlFor={finalId}>
        {label}
      </label>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  )
}
