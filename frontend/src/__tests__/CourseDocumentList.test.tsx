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
 * - fallback error message is shown for non-error rejections
 * - documents can be filtered by filename
 * - no-search-results message is shown when no documents match the search term
 * - small file sizes are formatted in KB
 * - unknown file types are displayed correctly
 * - sorting by file size is supported
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

    expect(screen.getAllByText('Loading documents...')).toHaveLength(2);
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
   * Test case: Sort by size
   *
   * Scenario:
   * The user clicks the Size sort button.
   *
   * Expected behavior:
   * - The backend is called with sort=fileSize:desc
   */
  it('sorts documents by file size when Size is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents/course/course-1?sort=createdAt:desc');
    });

    fireEvent.click(screen.getByRole('button', { name: /Size/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents/course/course-1?sort=fileSize:desc');
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

  /**
   * Test case: Non-error rejection
   *
   * Scenario:
   * The API request rejects with a non-Error value.
   *
   * Expected behavior:
   * - The fallback error message is displayed
   */
  it('shows fallback error message when the fetch rejects with a non-error value', async () => {
    vi.mocked(api.get).mockRejectedValueOnce('Unexpected failure');

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load documents.')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Small and unknown document metadata
   *
   * Scenario:
   * The API returns a document with a small file size and unknown file type.
   *
   * Expected behavior:
   * - The file size is displayed in KB
   * - The unknown file type is displayed as provided
   */
  it('renders small file sizes and unknown file types', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'doc-1',
        filename: 'notes.unknown',
        fileType: 'application/custom',
        fileSize: 512,
        createdAt: '2026-04-20T10:00:00.000Z',
      },
    ]);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('notes.unknown')).toBeInTheDocument();
    });

    expect(screen.getByText('Type: application/custom')).toBeInTheDocument();
    expect(screen.getByText('Size: 0.5 KB')).toBeInTheDocument();
  });

  /**
   * Test case: Document search
   *
   * Scenario:
   * A search term is passed to the component.
   *
   * Expected behavior:
   * - Only matching documents are rendered
   * - Non-matching documents are not rendered
   * - The shown count reflects the filtered result count
   */
  it('filters documents by filename through the searchTerm prop', async () => {
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

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} searchTerm="devops" />);

    await waitFor(() => {
      expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();
    });

    expect(screen.queryByText('03 - Agile Estimating and Planning.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 files shown')).toBeInTheDocument();
  });

  /**
   * Test case: No document search results
   *
   * Scenario:
   * A search term is passed that does not match any document filename.
   *
   * Expected behavior:
   * - No document rows are rendered
   * - A no-search-results message is displayed
   */
  it('shows no-search-results message when no documents match the search term', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'doc-1',
        filename: '03 - Agile Estimating and Planning.pdf',
        fileType: 'application/pdf',
        fileSize: 5570000,
        createdAt: '2026-04-20T10:00:00.000Z',
      },
    ]);

    render(<CourseDocumentsList courseId="course-1" refreshKey={0} searchTerm="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText('No documents match your search.')).toBeInTheDocument();
    });

    expect(screen.queryByText('03 - Agile Estimating and Planning.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 1 file shown')).toBeInTheDocument();
  });
});
