import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SearchBar from '../components/shared/SearchBar';

/**
 * SearchBar component tests.
 *
 * Covered scenarios:
 * - search input is rendered with placeholder text
 * - controlled value is displayed
 * - onChange is called with the updated input value
 * - custom id is used for the input
 * - additional CSS classes are applied
 */
describe('SearchBar', () => {
  /**
   * Test case: Render input
   *
   * Scenario:
   * The SearchBar component is rendered with a placeholder.
   *
   * Expected behavior:
   * - The search input is visible
   * - The placeholder text is applied
   */
  it('renders the search input with placeholder text', () => {
    render(<SearchBar value="" onChange={vi.fn()} placeholder="Search courses..." />);

    expect(screen.getByPlaceholderText('Search courses...')).toBeInTheDocument();
  });

  /**
   * Test case: Controlled value
   *
   * Scenario:
   * The SearchBar receives a value prop.
   *
   * Expected behavior:
   * - The input displays the provided value
   */
  it('displays the provided value', () => {
    render(<SearchBar value="machine" onChange={vi.fn()} placeholder="Search courses..." />);

    expect(screen.getByDisplayValue('machine')).toBeInTheDocument();
  });

  /**
   * Test case: Change handler
   *
   * Scenario:
   * The user types into the search input.
   *
   * Expected behavior:
   * - onChange is called with the updated input value
   */
  it('calls onChange with the updated input value', () => {
    const handleChange = vi.fn();

    render(<SearchBar value="" onChange={handleChange} placeholder="Search courses..." />);

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: 'pm4' },
    });

    expect(handleChange).toHaveBeenCalledWith('pm4');
  });

  /**
   * Test case: Custom id
   *
   * Scenario:
   * The SearchBar receives a custom id.
   *
   * Expected behavior:
   * - The input uses the provided id
   */
  it('uses the provided input id', () => {
    render(
      <SearchBar id="course-search" value="" onChange={vi.fn()} placeholder="Search courses..." />
    );

    expect(screen.getByPlaceholderText('Search courses...')).toHaveAttribute('id', 'course-search');
  });

  /**
   * Test case: Additional CSS classes
   *
   * Scenario:
   * The SearchBar receives an additional className.
   *
   * Expected behavior:
   * - The wrapper contains the provided class name
   */
  it('applies additional className to the wrapper', () => {
    const { container } = render(
      <SearchBar value="" onChange={vi.fn()} placeholder="Search courses..." className="mb-3" />
    );

    expect(container.firstChild).toHaveClass('mb-3');
  });
});
