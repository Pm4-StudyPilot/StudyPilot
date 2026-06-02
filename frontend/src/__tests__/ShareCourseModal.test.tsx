import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareCourseModal from '../components/courses/ShareCourseModal';
import { api } from '../services/api';
import courses from '../locales/en/courses.json';

vi.mock('../services/api');

const course = {
  id: '1',
  name: 'Test Course',
  color: '#ff0000',
  ownerId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const shareText = courses.share;

describe('ShareCourseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal with title and description', () => {
    render(<ShareCourseModal course={course} onClose={() => {}} />);

    expect(screen.getByText(shareText.title)).toBeInTheDocument();
    expect(screen.getByText(shareText.description, { exact: false })).toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', () => {
    const handleClose = vi.fn();

    render(<ShareCourseModal course={course} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows a success message when sharing is successful', async () => {
    vi.mocked(api.post).mockResolvedValue({});

    render(<ShareCourseModal course={course} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(shareText.usernameOrEmailLabel), {
      target: { value: 'testuser' },
    });

    fireEvent.click(screen.getByRole('button', { name: shareText.submit }));

    await waitFor(() => {
      expect(screen.getByText(shareText.success)).toBeInTheDocument();
    });
  });

  it('shows an error message when sharing fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error(shareText.error.userNotFound));

    render(<ShareCourseModal course={course} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(shareText.usernameOrEmailLabel), {
      target: { value: 'testuser' },
    });

    fireEvent.click(screen.getByRole('button', { name: shareText.submit }));

    await waitFor(() => {
      expect(screen.getByText(shareText.error.userNotFound)).toBeInTheDocument();
    });
  });

  it('disables form elements while loading', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {})); // Never resolves

    render(<ShareCourseModal course={course} onClose={() => {}} />);

    const usernameInput = screen.getByLabelText(shareText.usernameOrEmailLabel);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const submitButton = screen.getByRole('button', { name: shareText.submit });

    fireEvent.change(usernameInput, {
      target: { value: 'testuser' },
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(usernameInput).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});
