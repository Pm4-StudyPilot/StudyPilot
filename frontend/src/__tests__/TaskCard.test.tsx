import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TaskCard from '../components/tasks/TaskCard';

const mockTask = {
  id: 't1',
  title: 'Write lab report',
  description: 'Cover chapters 3 and 4',
  dueDate: '2026-04-20T00:00:00.000Z',
  priority: 'HIGH' as const,
  status: 'IN_PROGRESS' as const,
  position: 0,
  completed: false,
  courseId: 'c1',
  createdAt: '2026-04-15T12:00:00.000Z',
  updatedAt: '2026-04-15T12:00:00.000Z',
};

/**
 * TaskCard component tests.
 *
 * Covered scenarios:
 * - renders title, priority, and status
 * - description is hidden by default and visible after expand
 * - edit and delete buttons trigger the correct callbacks
 * - drag handle is rendered when dragHandleProps are provided
 */
describe('TaskCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the task title, priority badge, and status badge', () => {
    render(<TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Write lab report')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('hides the description by default', () => {
    render(<TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.queryByText('Cover chapters 3 and 4')).not.toBeInTheDocument();
  });

  it('shows the description after clicking the title', () => {
    render(<TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /write lab report/i }));

    expect(screen.getByText('Cover chapters 3 and 4')).toBeInTheDocument();
  });

  it('shows "No description." when description is null', () => {
    const taskWithoutDescription = { ...mockTask, description: null };
    render(<TaskCard task={taskWithoutDescription} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /write lab report/i }));

    expect(screen.getByText('No description.')).toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', () => {
    render(<TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByLabelText('edit task'));

    expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
  });

  it('calls onDelete when the delete button is clicked', () => {
    render(<TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByLabelText('delete task'));

    expect(mockOnDelete).toHaveBeenCalledWith(mockTask);
  });

  it('renders the drag handle when dragHandleProps are provided', () => {
    render(
      <TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} dragHandleProps={{}} />
    );

    expect(screen.getByLabelText('drag handle')).toBeInTheDocument();
  });

  it('does not render the drag handle when dragHandleProps are not provided', () => {
    render(<TaskCard task={mockTask} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.queryByLabelText('drag handle')).not.toBeInTheDocument();
  });
});
