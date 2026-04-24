import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CourseDocumentsList from '../components/courses/CourseDocumentsList';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for document list requests.
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

type DocumentDto = {
  id: string;
  filename: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

/**
 * Creates a deferred promise so tests can control when the request resolves.
 */
function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * CourseDocumentsList component tests.
 *
 * Covered scenarios:
 * - loading state is shown while fetching
 * - empty state is shown when no documents exist
 * - documents are rendered after successful fetch
 * - default sort=dateDesc is sent to the backend
 * - clicking Name toggles sorting from asc to desc
 * - refreshKey triggers a refetch
 * - error message is shown when the request fails
 */
describe('CourseDocumentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Loading state
   *
   * Scenario:
   * The API call is pending.
   *
   * Expected behavior:
   * - A loading message is visible
   */
  it('shows loading state while fetching documents', () => {
    const deferred = createDeferred<DocumentDto[]>();
    vi.mocked(api.get).mockReturnValue(deferred.promise);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  /**
   * Test case: Empty state
   *
   * Scenario:
   * The API returns an empty array.
   *
   * Expected behavior:
   * - The empty state message is displayed
   */
  it('shows empty state when no documents exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Successful fetch
   *
   * Scenario:
   * The API returns multiple documents.
   *
   * Expected behavior:
   * - Filenames are rendered
   * - Basic metadata is shown
   */
  it('renders returned documents with metadata', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'doc-1',
        filename: '03 - Agile Estimating and Planning.pdf',
        fileType: 'application/pdf',
        fileSize: 5570000,
        createdAt: '2026-04-20T10:00:00.000Z',
      },
      {
        id: 'doc-2',
        filename: '04 - DevOps.pdf',
        fileType: 'application/pdf',
        fileSize: 2480000,
        createdAt: '2026-04-20T11:00:00.000Z',
      },
    ]);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('03 - Agile Estimating and Planning.pdf')).toBeInTheDocument();
      expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Type: PDF/i).length).toBe(2);
  });

  /**
   * Test case: Default sorting
   *
   * Scenario:
   * The component is rendered initially.
   *
   * Expected behavior:
   * - The backend is called with sort=createdAt:desc
   */
  it('calls backend with default sort=createdAt:desc', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents/course/course-1?sort=createdAt:desc');
    });
  });

  /**
   * Test case: Toggle sorting on repeated Name clicks
   *
   * Scenario:
   * The user clicks the Name button twice.
   *
   * Expected behavior:
   * - First click sends filename:asc
   * - Second click sends filename:desc
   */
  it('toggles name sorting from asc to desc on repeated clicks', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([]) // initial render
      .mockResolvedValueOnce([]) // first click
      .mockResolvedValueOnce([]); // second click

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents/course/course-1?sort=createdAt:desc');
    });

    const nameButton = screen.getByRole('button', { name: /Name/i });

    fireEvent.click(nameButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents/course/course-1?sort=filename:asc');
    });

    fireEvent.click(nameButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents/course/course-1?sort=filename:desc');
    });
  });

  /**
   * Test case: refreshKey change
   *
   * Scenario:
   * The parent component increments refreshKey after an upload.
   *
   * Expected behavior:
   * - The component refetches documents
   */
  it('refetches documents when refreshKey changes', async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    const { rerender } = render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    rerender(<CourseDocumentsList courseId="course-1" refreshKey={1} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * Test case: Error state
   *
   * Scenario:
   * The API request fails.
   *
   * Expected behavior:
   * - An error message is displayed
   */
  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to load documents.'));

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load documents/i)).toBeInTheDocument();
    });
  });
});
