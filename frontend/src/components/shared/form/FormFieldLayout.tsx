import { ReactNode } from 'react';

type FormFieldLayoutProps = {
  label: string;
  error?: string;
  description?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  noMargin?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
};

export function FormFieldLayout({
  label,
  error,
  description,
  iconLeft,
  iconRight,
  children,
  noMargin,
  id,
  className = '',
}: FormFieldLayoutProps) {
  return (
    <div className={noMargin ? className : 'mb-3 ' + className}>
      {id && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div role="group" className="input-group">
        {iconLeft && <span className="input-group-text">{iconLeft}</span>}
        {children}
        {iconRight && <span className="input-group-text">{iconRight}</span>}
      </div>

      {description && <div className="form-text">{description}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}
