import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { userEvent } from '@testing-library/user-event';

import Modal from '../components/shared/layout/Modal';

describe('FormLayout', () => {
  it('renders title and children', () => {
    render(
      <Modal title="Register">
        <div>Child content</div>
      </Modal>
    );

    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders nothing when open is false', () => {
    render(
      <Modal open={false}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.queryByText('Content')).toBeNull();
  });

  it('renders content when open is true', () => {
    render(
      <Modal open={true}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not register ESC listener when closed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal open={false} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when ESC key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    await user.click(screen.getByTestId('modal-closebutton'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    await user.click(screen.getByTestId('modal-backdrop'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has no close button when there is no close handler', async () => {
    render(
      <Modal>
        <div>Content</div>
      </Modal>
    );

    expect(screen.queryByTestId('modal-closebutton')).not.toBeInTheDocument();
  });
});
