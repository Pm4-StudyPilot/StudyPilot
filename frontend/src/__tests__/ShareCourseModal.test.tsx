import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ShareCourseModal from '../../components/courses/ShareCourseModal';
import { api } from '../../services/api';

vi.mock('../../services/api');

const course = {
  id: '1',
  name: 'Test Course',
  color: '#ff0000',
  ownerId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('ShareCourseModal', () => {
  it('renders the modal with title and description', () => {
    render(<ShareCourseModal course={course} onClose={() => {}} />);
    expect(screen.getByText('courses.share.title')).toBeInTheDocument();
    expect(screen.getByText('courses.share.description', { exact: false })).toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(<ShareCourseModal course={course} onClose={handleClose} />);
    fireEvent.click(screen.getByText('common.actions.cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows a success message when sharing is successful', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    render(<ShareCourseModal course={course} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('courses.share.usernameOrEmailLabel'), {
      target: { value: 'testuser' },
    });
    fireEvent.click(screen.getByText('courses.share.submit'));

    await waitFor(() => {
      expect(screen.getByText('courses.share.success')).toBeInTheDocument();
    });
  });

  it('shows an error message when sharing fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('User not found'));
    render(<ShareCourseModal course={course} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('courses.share.usernameOrEmailLabel'), {
      target: { value: 'testuser' },
    });
    fireEvent.click(screen.getByText('courses.share.submit'));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('disables form elements while loading', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ShareCourseModal course={course} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('courses.share.usernameOrEmailLabel'), {
      target: { value: 'testuser' },
    });
    fireEvent.click(screen.getByText('courses.share.submit'));

    await waitFor(() => {
      expect(screen.getByLabelText('courses.share.usernameOrEmailLabel')).toBeDisabled();
      expect(screen.getByText('common.actions.cancel')).toBeDisabled();
      expect(screen.getByText('courses.share.submit')).toBeDisabled();
    });
  });
});
