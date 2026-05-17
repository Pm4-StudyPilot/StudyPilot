import { useId } from 'react';
import {
  COURSE_COLOR_PALETTE,
  normalizeCourseColor,
  withOpacity,
} from '../../utils/courseColors';

interface CourseColorFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export default function CourseColorField({ value, error, onChange }: CourseColorFieldProps) {
  const inputId = useId();
  const normalizedValue = normalizeCourseColor(value);

  return (
    <div className="course-color-field mb-3">
      <label className="form-label" htmlFor={inputId}>
        Course Color
      </label>

      <div
        className="course-color-field__swatches"
        role="radiogroup"
        aria-label="Preset palette"
      >
        {COURSE_COLOR_PALETTE.map((color) => {
          const isSelected = color === normalizedValue;

          return (
            <button
              key={color}
              type="button"
              className={`course-color-field__swatch${
                isSelected ? ' course-color-field__swatch--selected' : ''
              }`}
              aria-label={`Select ${color}`}
              aria-pressed={isSelected}
              onClick={() => onChange(color)}
              style={{
                backgroundColor: color,
                boxShadow: isSelected ? `0 0 0 3px ${withOpacity(color, 0.24)}` : undefined,
              }}
            />
          );
        })}
      </div>

      <div className="course-color-field__custom mt-3">
        <input
          id={inputId}
          type="color"
          className={`form-control form-control-color${error ? ' is-invalid' : ''}`}
          value={normalizedValue}
          onChange={(event) => onChange(normalizeCourseColor(event.target.value))}
        />
        <span className="course-color-field__value">{normalizedValue}</span>
      </div>

      <div className="course-color-field__hint form-text">
        Used in the course list and deadline calendar.
      </div>

      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}
