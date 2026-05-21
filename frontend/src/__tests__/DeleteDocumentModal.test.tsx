import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeleteDocumentModal from '../components/courses/DeleteDocumentModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for document delete requests.
 */
vi.mock('../services/api', () => ({
  api: {
    delete: vi.fn(),
  },
}));

const mockDocument = {
  id: 'doc-1',
  filename: 'Lecture-Notes.pdf',
};

/**
 * DeleteDocumentModal component tests.
 *
 * Covered scenarios:
 * - filename is shown in the confirmation message
 * - successful delete notifies parent with the document id
 * - onClose is called when cancel is clicked
 * - server error is displayed when the request fails
 */
describe('DeleteDocumentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays the filename in the confirmation message', () => {
    render(
      <DeleteDocumentModal
        document={mockDocument}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    expect(screen.getByText(/Lecture-Notes\.pdf/)).toBeInTheDocument();
  });

  it('calls api.delete and onDeleted with the document id on success', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    render(
      <DeleteDocumentModal
        document={mockDocument}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/documents/doc-1');
      expect(mockOnDeleted).toHaveBeenCalledWith('doc-1');
    });
  });

  it('calls onClose when the cancel button is clicked', () => {
    render(
      <DeleteDocumentModal
        document={mockDocument}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Failed to delete document'));

    render(
      <DeleteDocumentModal
        document={mockDocument}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete document/i)).toBeInTheDocument();
    });

    expect(mockOnDeleted).not.toHaveBeenCalled();
  });
});
