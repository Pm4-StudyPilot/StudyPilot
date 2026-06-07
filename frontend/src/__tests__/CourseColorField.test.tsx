import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CourseColorField from '../components/courses/CourseColorField';

describe('CourseColorField', () => {
  it('renders the selected color and lets users choose a palette color', () => {
    const handleChange = vi.fn();

    render(<CourseColorField value="#6c63ff" onChange={handleChange} />);

    expect(screen.getByLabelText(/course color/i)).toHaveValue('#6c63ff');
    expect(screen.getByText('#6C63FF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select #6c63ff/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: /select #00c2a8/i }));

    expect(handleChange).toHaveBeenCalledWith('#00C2A8');
  });

  it('normalizes custom color input and shows validation errors', () => {
    const handleChange = vi.fn();

    render(
      <CourseColorField value="4da3ff" error="Use a valid hex color" onChange={handleChange} />
    );

    fireEvent.change(screen.getByLabelText(/course color/i), {
      target: { value: '#ff8a5b' },
    });

    expect(handleChange).toHaveBeenCalledWith('#FF8A5B');
    expect(screen.getByText('Use a valid hex color')).toBeInTheDocument();
    expect(screen.getByLabelText(/course color/i)).toHaveClass('is-invalid');
  });
});
