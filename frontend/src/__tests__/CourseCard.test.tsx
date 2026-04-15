import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import CourseCard from '../components/courses/CourseCard';
import { CourseDto } from '../types/dto';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockCourse: CourseDto = {
  id: 'c1',
  name: 'Machine Learning Fundamentals',
  ownerId: 'u1',
  createdAt: '2026-03-26T12:00:00.000Z',
  updatedAt: '2026-03-26T12:00:00.000Z',
};

const mockOnUpdated = vi.fn();
const mockOnDeleted = vi.fn();

/**
 * CourseCard component tests.
 *
 * Covered scenarios:
 * - course name is rendered
 * - formatted creation date is rendered
 * - content is collapsed by default
 * - clicking the toggle button expands the content
 * - clicking the toggle button again collapses the content
 */
describe('CourseCard', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Test case: Render course name
   *
   * Scenario:
   * A course card is rendered with a course object.
   *
   * Expected behavior:
   * - The course name is visible
   */
  it('renders the course name', () => {
    render(
      <MemoryRouter>
        <CourseCard course={mockCourse} onUpdated={mockOnUpdated} onDeleted={mockOnDeleted} />
      </MemoryRouter>
    );

    expect(screen.getByText('Machine Learning Fundamentals')).toBeInTheDocument();
  });

  /**
   * Test case: Render creation date
   *
   * Scenario:
   * A course card is rendered with a course object.
   *
   * Expected behavior:
   * - The formatted creation date is visible
   */
  it('renders the formatted creation date', () => {
    render(
      <MemoryRouter>
        <CourseCard course={mockCourse} onUpdated={mockOnUpdated} onDeleted={mockOnDeleted} />
      </MemoryRouter>
    );

    expect(screen.getByText(/added/i)).toBeInTheDocument();
  });

  /**
   * Test case: Collapsed by default
   *
   * Scenario:
   * A course card is rendered without interaction.
   *
   * Expected behavior:
   * - The "No items yet." text is not visible
   */
  it('is collapsed by default', () => {
    render(
      <MemoryRouter>
        <CourseCard course={mockCourse} onUpdated={mockOnUpdated} onDeleted={mockOnDeleted} />
      </MemoryRouter>
    );

    expect(screen.queryByText(/no tasks yet/i)).not.toBeInTheDocument();
  });

  /**
   * Test case: Expand on click — shows empty state when course has no tasks
   *
   * Scenario:
   * The toggle button is clicked and the API returns an empty task list.
   *
   * Expected behavior:
   * - The "No tasks yet." placeholder becomes visible
   */
  it('expands when the toggle button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <CourseCard course={mockCourse} onUpdated={mockOnUpdated} onDeleted={mockOnDeleted} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /toggle course/i }));

    await waitFor(() => {
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Collapse on second click
   *
   * Scenario:
   * The toggle button is clicked twice.
   *
   * Expected behavior:
   * - The task list is hidden again
   */
  it('collapses when the toggle button is clicked again', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <CourseCard course={mockCourse} onUpdated={mockOnUpdated} onDeleted={mockOnDeleted} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /toggle course/i }));
    await waitFor(() => expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /toggle course/i }));
    expect(screen.queryByText(/no tasks yet/i)).not.toBeInTheDocument();
  });
});
