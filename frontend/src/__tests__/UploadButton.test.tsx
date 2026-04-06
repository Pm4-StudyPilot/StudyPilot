import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userEvent } from '@testing-library/user-event';
import UploadButton from '../components/shared/UploadButton';

const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UploadButton', () => {
  it('renders with default text', () => {
    render(<UploadButton bucket="test" />);
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  });

  it('renders with custom children', () => {
    render(<UploadButton bucket="test">Upload Avatar</UploadButton>);
    expect(screen.getByRole('button', { name: 'Upload Avatar' })).toBeInTheDocument();
  });

  it('button is disabled when disabled prop is true', () => {
    render(<UploadButton bucket="test" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('button is disabled while uploading', async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<UploadButton bucket="test" />);

    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    await user.upload(screen.getByTestId('file-input'), file);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('calls onSuccess with result after successful upload', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ url: 'http://minio:9000/test/123-file.txt', key: 'test/123-file.txt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(<UploadButton bucket="test" onSuccess={onSuccess} />);

    const file = new File(['hello'], 'file.txt', { type: 'text/plain' });
    await user.upload(screen.getByTestId('file-input'), file);

    expect(onSuccess).toHaveBeenCalledWith({
      url: 'http://minio:9000/test/123-file.txt',
      key: 'test/123-file.txt',
    });
  });

  it('shows success message after upload', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ url: 'http://minio:9000/test/123-file.txt', key: 'test/123-file.txt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(<UploadButton bucket="test" />);

    const file = new File(['hello'], 'file.txt', { type: 'text/plain' });
    await user.upload(screen.getByTestId('file-input'), file);

    expect(screen.getByText(/Uploaded: test\/123-file\.txt/)).toBeInTheDocument();
  });

  it('shows error message and calls onError on failure', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UploadButton bucket="test" onError={onError} />);

    const file = new File(['hello'], 'file.txt', { type: 'text/plain' });
    await user.upload(screen.getByTestId('file-input'), file);

    expect(screen.getByText(/Network error/)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('shows error message and calls onError when MinIO PUT fails', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ url: 'http://minio:9000/test/123-file.txt', key: 'test/123-file.txt' }),
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    render(<UploadButton bucket="test" onError={onError} />);

    const file = new File(['hello'], 'file.txt', { type: 'text/plain' });
    await user.upload(screen.getByTestId('file-input'), file);

    expect(screen.getByText(/Upload to MinIO failed/)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Upload to MinIO failed');
  });

  it('resets input after upload completes', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ url: 'http://minio:9000/test/123-file.txt', key: 'test/123-file.txt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(<UploadButton bucket="test" />);

    const file = new File(['hello'], 'file.txt', { type: 'text/plain' });
    await user.upload(screen.getByTestId('file-input'), file);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
