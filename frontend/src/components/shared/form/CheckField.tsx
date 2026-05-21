import { InputHTMLAttributes, useId } from 'react';

type CheckFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  type: 'checkbox' | 'radio';
  labelPosition: 'left' | 'right';
  error?: string;
};

export default function CheckField({
  label,
  type,
  error,
  id,
  labelPosition = 'left',
  ...props
}: CheckFieldProps) {
  const generatedId = useId();
  const finalId = id ?? generatedId;
  const labelElement = (
    <label className="form-check-label" htmlFor={finalId}>
      {label}
    </label>
  );

  return (
    <div className="form-check mb-3">
      <input
        {...props}
        id={finalId}
        type={type}
        className={`form-check-input${error ? ' is-invalid' : ''}`}
      />
      {labelPosition === 'left' && labelElement}
      {error && <div className="invalid-feedback d-block">{error}</div>}
      {labelPosition !== 'left' && labelElement}
    </div>
  );
}
