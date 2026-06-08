import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResourcesPage from '../pages/ResourcesPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    getBlob: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('../context/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

vi.mock('../components/shared/layout/NotificationBell', () => ({
  default: () => null,
}));

vi.mock('../components/courses/DeleteDocumentModal', () => ({
  default: ({
    document,
    onClose,
    onDeleted,
  }: {
    document: { id: string; filename: string };
    onClose: () => void;
    onDeleted: (deletedId: string) => void;
  }) => (
    <div role="dialog" aria-label="Delete document">
      <h2>Delete document</h2>
      <p>Are you sure you want to delete {document.filename}?</p>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" onClick={() => onDeleted(document.id)}>
        Confirm delete
      </button>
    </div>
  ),
}));

/**
 * Mock resource documents returned by the backend.
 *
 * Used throughout the test suite to simulate uploaded
 * documents belonging to StudyPilot courses.
 */
const documentFixtures = [
  {
    id: 'doc-1',
    filename: '07 - Advanced Scrum.pdf',
    fileType: 'application/pdf',
    fileSize: 2380000,
    createdAt: '2026-04-24T10:00:00.000Z',
    courseId: 'course-1',
    course: {
      id: 'course-1',
      name: 'PM4',
      color: '#ff6b3d',
    },
  },
  {
    id: 'doc-2',
    filename: '04 - DevOps.pdf',
    fileType: 'application/pdf',
    fileSize: 2480000,
    createdAt: '2026-04-24T11:00:00.000Z',
    courseId: 'course-1',
    course: {
      id: 'course-1',
      name: 'PM4',
      color: '#ff6b3d',
    },
  },
];

/**
 * Extended mock resource documents.
 *
 * Adds different file types, file sizes and courses so the
 * sorting, icon and fallback branches can be tested.
 */
const extendedDocumentFixtures = [
  ...documentFixtures,
  {
    id: 'doc-3',
    filename: '01 - Linux Notes.txt',
    fileType: 'text/plain',
    fileSize: 512,
    createdAt: '2026-04-23T09:00:00.000Z',
    courseId: 'course-2',
    course: {
      id: 'course-2',
      name: 'BSY',
      color: '#3d7bff',
    },
  },
  {
    id: 'doc-4',
    filename: 'Unknown Upload',
    fileType: null,
    fileSize: null,
    createdAt: '2026-04-25T09:00:00.000Z',
    courseId: 'course-3',
    course: {
      id: 'course-3',
      name: 'CCP2',
      color: '#38b000',
    },
  },
];

/**
 * Renders ResourcesPage with routing support.
 *
 * Includes a mock course route because uploaded resources
 * contain links to their corresponding course pages.
 */
function renderResourcesPage() {
  return render(
    <MemoryRouter initialEntries={['/resources']}>
      <Routes>
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/courses/:id" element={<div>Mock course page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Returns the rendered order of resource document names.
 *
 * The component stores the filename in a data attribute, which
 * makes the sort order easy to assert without relying on layout.
 */
function getRenderedDocumentNames(testId = 'resource-document-item') {
  return screen.getAllByTestId(testId).map((item) => item.dataset.documentName);
}

/**
 * ResourcesPage component tests.
 *
 * Covered scenarios:
 * - recent uploaded documents are loaded and rendered
 * - resources can be filtered through the library search input
 * - View All loads the extended document list
 * - documents can be opened and downloaded
 * - document action errors are displayed
 * - sorting can be changed
 * - delete modal actions update the visible list
 * - empty and error states are rendered
 */
describe('ResourcesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Recent uploads
   *
   * Scenario:
   * The resources page is opened and the backend returns recent documents.
   *
   * Expected behavior:
   * - The backend is called with limit=3
   * - The page heading and upload section are displayed
   * - Recent uploaded documents are rendered
   * - The AI Creations placeholder section is visible
   */
  it('loads and renders recent uploaded documents', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents?sort=createdAt:desc&limit=3');
    });

    expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
    expect(screen.getByText('My Uploads')).toBeInTheDocument();
    expect(screen.getByText('07 - Advanced Scrum.pdf')).toBeInTheDocument();
    expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();
    expect(screen.getByText('AI Creations')).toBeInTheDocument();
  });

  /**
   * Test case: Resource search
   *
   * Scenario:
   * The user enters a search term into the library search field.
   *
   * Expected behavior:
   * - Matching resources remain visible
   * - Non-matching resources are filtered out
   */
  it('filters resources through the search input', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.change(screen.getByPlaceholderText('Search your library...'), {
      target: { value: 'devops' },
    });

    expect(screen.queryByText('07 - Advanced Scrum.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();
  });

  /**
   * Test case: View All uploads
   *
   * Scenario:
   * The user clicks the View All button.
   *
   * Expected behavior:
   * - The backend is called with limit=50
   * - Additional resource controls become visible
   * - The toggle button changes to Show Recent
   */
  it('loads all uploads when View all is clicked', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents?sort=createdAt:desc&limit=50');
    });

    expect(screen.getByRole('button', { name: /show recent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /course/i })).toBeInTheDocument();
    expect(screen.getByText('Unknown Upload')).toBeInTheDocument();
  });

  /**
   * Test case: Show recent toggle
   *
   * Scenario:
   * The user opens View All and then switches back to recent uploads.
   *
   * Expected behavior:
   * - The backend is called again with limit=3
   * - The Show Recent button changes back to View All
   */
  it('switches back to recent uploads when Show recent is clicked', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures)
      .mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents?sort=createdAt:desc&limit=50');
    });

    fireEvent.click(screen.getByRole('button', { name: /show recent/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/documents?sort=createdAt:desc&limit=3');
    });

    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  /**
   * Test case: Open resource document
   *
   * Scenario:
   * The user clicks the Open action of a resource document.
   *
   * Expected behavior:
   * - The document is requested with disposition=inline
   * - A blob URL is generated
   * - The document is opened in a new browser tab
   */
  it('opens a document inline when the open button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    const fakeBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    vi.mocked(api.getBlob).mockResolvedValueOnce({ blob: fakeBlob });

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    try {
      renderResourcesPage();

      const openButton = await screen.findByRole('button', {
        name: /open 07 - advanced scrum\.pdf/i,
      });

      fireEvent.click(openButton);

      await waitFor(() => {
        expect(api.getBlob).toHaveBeenCalledWith('/documents/doc-1?disposition=inline');
      });

      expect(window.open).toHaveBeenCalledWith('blob:fake-url', '_blank', 'noopener,noreferrer');
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      openSpy.mockRestore();
    }
  });

  /**
   * Test case: Open resource error
   *
   * Scenario:
   * The user clicks the Open action, but the document request fails.
   *
   * Expected behavior:
   * - The inline document endpoint is requested
   * - The returned error message is shown as action error
   */
  it('shows an action error when opening a document fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);
    vi.mocked(api.getBlob).mockRejectedValueOnce(new Error('Could not open document'));

    renderResourcesPage();

    const openButton = await screen.findByRole('button', {
      name: /open 07 - advanced scrum\.pdf/i,
    });

    fireEvent.click(openButton);

    await waitFor(() => {
      expect(api.getBlob).toHaveBeenCalledWith('/documents/doc-1?disposition=inline');
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not open document');
  });

  /**
   * Test case: Download resource document
   *
   * Scenario:
   * The user clicks the Download action of a resource document.
   *
   * Expected behavior:
   * - The document is requested with disposition=attachment
   * - A temporary download link is created and clicked
   * - The blob URL is revoked after the download starts
   */
  it('downloads a document when the download button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    const fakeBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    vi.mocked(api.getBlob).mockResolvedValueOnce({
      blob: fakeBlob,
      filename: 'advanced-scrum.pdf',
    });

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    URL.createObjectURL = vi.fn(() => 'blob:download-url');
    URL.revokeObjectURL = vi.fn();

    try {
      renderResourcesPage();

      const downloadButton = await screen.findByRole('button', {
        name: /download 07 - advanced scrum\.pdf/i,
      });

      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.getBlob).toHaveBeenCalledWith('/documents/doc-1?disposition=attachment');
      });

      expect(clickSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download-url');
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      clickSpy.mockRestore();
    }
  });

  /**
   * Test case: Download fallback filename
   *
   * Scenario:
   * The backend returns no explicit download filename.
   *
   * Expected behavior:
   * - The original document filename is used for the download link
   */
  it('uses the document filename when the download response has no filename', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    const fakeBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    vi.mocked(api.getBlob).mockResolvedValueOnce({ blob: fakeBlob });

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdLinks: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    URL.createObjectURL = vi.fn(() => 'blob:fallback-download-url');
    URL.revokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);

      if (tagName === 'a') {
        createdLinks.push(element as HTMLAnchorElement);
      }

      return element;
    });

    try {
      renderResourcesPage();

      const downloadButton = await screen.findByRole('button', {
        name: /download 07 - advanced scrum\.pdf/i,
      });

      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(api.getBlob).toHaveBeenCalledWith('/documents/doc-1?disposition=attachment');
      });

      const downloadLink = createdLinks.find((link) => link.download === '07 - Advanced Scrum.pdf');

      expect(downloadLink).toBeDefined();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      clickSpy.mockRestore();
      vi.mocked(document.createElement).mockRestore();
    }
  });

  /**
   * Test case: Download resource error
   *
   * Scenario:
   * The user clicks the Download action, but the document request fails.
   *
   * Expected behavior:
   * - The attachment document endpoint is requested
   * - The returned error message is shown as action error
   */
  it('shows an action error when downloading a document fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);
    vi.mocked(api.getBlob).mockRejectedValueOnce(new Error('Could not download document'));

    renderResourcesPage();

    const downloadButton = await screen.findByRole('button', {
      name: /download 07 - advanced scrum\.pdf/i,
    });

    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(api.getBlob).toHaveBeenCalledWith('/documents/doc-1?disposition=attachment');
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not download document');
  });

  /**
   * Test case: Delete confirmation
   *
   * Scenario:
   * The user clicks the Delete action of a resource document.
   *
   * Expected behavior:
   * - The delete confirmation modal is displayed
   * - The selected document name is shown in the modal text
   */
  it('opens the delete confirmation modal when delete is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    const deleteButton = await screen.findByRole('button', {
      name: /delete 07 - advanced scrum\.pdf/i,
    });

    fireEvent.click(deleteButton);

    expect(screen.getByRole('dialog', { name: /delete document/i })).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
  });

  /**
   * Test case: Delete modal cancel
   *
   * Scenario:
   * The user opens the delete confirmation modal and cancels the action.
   *
   * Expected behavior:
   * - The modal closes
   * - The selected document remains visible
   */
  it('closes the delete confirmation modal when cancel is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    const deleteButton = await screen.findByRole('button', {
      name: /delete 07 - advanced scrum\.pdf/i,
    });

    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog', { name: /delete document/i })).not.toBeInTheDocument();
    expect(screen.getByText('07 - Advanced Scrum.pdf')).toBeInTheDocument();
  });

  /**
   * Test case: Delete modal success callback
   *
   * Scenario:
   * The delete modal reports that the selected document was deleted.
   *
   * Expected behavior:
   * - The deleted document is removed from the resources list
   * - Other documents remain visible
   * - The modal closes after the callback
   */
  it('removes a document from the list when the delete modal reports success', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    const deleteButton = await screen.findByRole('button', {
      name: /delete 07 - advanced scrum\.pdf/i,
    });

    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    expect(screen.queryByText('07 - Advanced Scrum.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /delete document/i })).not.toBeInTheDocument();
  });

  /**
   * Test case: Empty uploads state
   *
   * Scenario:
   * The backend returns no uploaded documents.
   *
   * Expected behavior:
   * - The empty state message is displayed
   */
  it('shows empty state when no resources exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Resource loading error
   *
   * Scenario:
   * The resources endpoint fails.
   *
   * Expected behavior:
   * - The error message is displayed
   */
  it('shows an error message when loading resources fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to load resources'));

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load resources')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Empty search result
   *
   * Scenario:
   * The user searches for a resource that does not exist.
   *
   * Expected behavior:
   * - No resource cards are shown
   * - The empty search message is displayed
   */
  it('shows empty search state when no resources match', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.change(screen.getByPlaceholderText('Search your library...'), {
      target: { value: 'nonexistent' },
    });

    expect(screen.getByText('No resources match your search.')).toBeInTheDocument();
  });

  /**
   * Test case: Course search
   *
   * Scenario:
   * The user searches for a course name instead of a filename.
   *
   * Expected behavior:
   * - Documents belonging to the matching course remain visible
   * - Documents from other courses are filtered out
   */
  it('filters resources by course name', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('01 - Linux Notes.txt');

    fireEvent.change(screen.getByPlaceholderText('Search your library...'), {
      target: { value: 'bsy' },
    });

    expect(screen.getByText('01 - Linux Notes.txt')).toBeInTheDocument();
    expect(screen.queryByText('07 - Advanced Scrum.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown Upload')).not.toBeInTheDocument();
  });

  /**
   * Test case: File type search
   *
   * Scenario:
   * The user searches for a file MIME type.
   *
   * Expected behavior:
   * - Documents with a matching file type remain visible
   * - Documents with non-matching or missing file types are filtered out
   */
  it('filters resources by file type', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('01 - Linux Notes.txt');

    fireEvent.change(screen.getByPlaceholderText('Search your library...'), {
      target: { value: 'text/plain' },
    });

    expect(screen.getByText('01 - Linux Notes.txt')).toBeInTheDocument();
    expect(screen.queryByText('07 - Advanced Scrum.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown Upload')).not.toBeInTheDocument();
  });

  /**
   * Test case: Sort by filename
   *
   * Scenario:
   * The user opens View All and clicks the Name sorting button.
   *
   * Expected behavior:
   * - The sort field changes to filename
   * - Documents are rendered in alphabetical order
   */
  it('sorts all uploads by filename', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    await screen.findByText('Unknown Upload');

    fireEvent.click(screen.getByRole('button', { name: /file name/i }));

    expect(getRenderedDocumentNames()).toEqual([
      '01 - Linux Notes.txt',
      '04 - DevOps.pdf',
      '07 - Advanced Scrum.pdf',
      'Unknown Upload',
    ]);
  });

  /**
   * Test case: Toggle current sort direction
   *
   * Scenario:
   * The user clicks the active Newest sort button again.
   *
   * Expected behavior:
   * - The current sort direction toggles from descending to ascending
   * - The oldest document is shown first
   */
  it('toggles the active sort direction when the same sort button is clicked', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    await screen.findByText('Unknown Upload');

    fireEvent.click(screen.getByRole('button', { name: /^newest/i }));

    expect(getRenderedDocumentNames()).toEqual([
      '01 - Linux Notes.txt',
      '07 - Advanced Scrum.pdf',
      '04 - DevOps.pdf',
      'Unknown Upload',
    ]);
  });

  /**
   * Test case: Sort by course
   *
   * Scenario:
   * The user opens View All and clicks the Course sorting button.
   *
   * Expected behavior:
   * - The sort field changes to course
   * - Documents are grouped alphabetically by course name
   */
  it('sorts all uploads by course name', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    await screen.findByText('Unknown Upload');

    fireEvent.click(screen.getByRole('button', { name: /^course/i }));

    expect(getRenderedDocumentNames()).toEqual([
      '01 - Linux Notes.txt',
      'Unknown Upload',
      '07 - Advanced Scrum.pdf',
      '04 - DevOps.pdf',
    ]);
  });

  /**
   * Test case: Sort by file size
   *
   * Scenario:
   * The user opens View All and clicks the Size sorting button.
   *
   * Expected behavior:
   * - The sort field changes to file size
   * - Documents are sorted by size using the default descending direction
   */
  it('sorts all uploads by file size', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    await screen.findByText('Unknown Upload');

    fireEvent.click(screen.getByRole('button', { name: /^size/i }));

    expect(getRenderedDocumentNames()).toEqual([
      '04 - DevOps.pdf',
      '07 - Advanced Scrum.pdf',
      '01 - Linux Notes.txt',
      'Unknown Upload',
    ]);
  });

  /**
   * Test case: Sort by file type
   *
   * Scenario:
   * The user opens View All and clicks the Type sorting button.
   *
   * Expected behavior:
   * - The sort field changes to file type
   * - Documents are sorted alphabetically by their MIME type
   */
  it('sorts all uploads by file type', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    await screen.findByText('Unknown Upload');

    fireEvent.click(screen.getByRole('button', { name: /^type/i }));

    expect(getRenderedDocumentNames()).toEqual([
      'Unknown Upload',
      '07 - Advanced Scrum.pdf',
      '04 - DevOps.pdf',
      '01 - Linux Notes.txt',
    ]);
  });

  /**
   * Test case: Resource card metadata formatting
   *
   * Scenario:
   * Uploaded documents contain a small text file and a document with unknown metadata.
   *
   * Expected behavior:
   * - Small files are displayed in KB
   * - Missing file sizes use the unknown size fallback text
   */
  it('renders file size metadata for small and unknown files', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('01 - Linux Notes.txt');

    expect(screen.getByText('0.5 KB')).toBeInTheDocument();
    expect(screen.getByText('Unknown size')).toBeInTheDocument();
  });

  /**
   * Test case: Course navigation link
   *
   * Scenario:
   * The user clicks the course link on a resource card.
   *
   * Expected behavior:
   * - React Router navigates to the matching course route
   */
  it('navigates to the related course when the course link is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    const courseLinks = await screen.findAllByRole('link', { name: 'PM4' });

    fireEvent.click(courseLinks[0]);

    expect(screen.getByText('Mock course page')).toBeInTheDocument();
  });

  /**
   * Test case: Search reset
   *
   * Scenario:
   * The user searches for a specific document and then
   * clears the search input again.
   *
   * Expected behavior:
   * - The filtered result is shown while searching
   * - All resources become visible again when the search is cleared
   */
  it('shows all resources again when the search input is cleared', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(documentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    const searchInput = screen.getByPlaceholderText('Search your library...');

    fireEvent.change(searchInput, {
      target: { value: 'devops' },
    });

    expect(screen.queryByText('07 - Advanced Scrum.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();

    fireEvent.change(searchInput, {
      target: { value: '' },
    });

    expect(screen.getByText('07 - Advanced Scrum.pdf')).toBeInTheDocument();
    expect(screen.getByText('04 - DevOps.pdf')).toBeInTheDocument();
  });

  /**
   * Test case: Filename sort direction toggle
   *
   * Scenario:
   * The user opens the complete resource library and clicks
   * the File Name sorting button twice.
   *
   * Expected behavior:
   * - The first click sorts alphabetically ascending
   * - The second click reverses the sort direction
   * - Documents are rendered in reverse alphabetical order
   */
  it('toggles filename sort direction when the file name button is clicked twice', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(documentFixtures)
      .mockResolvedValueOnce(extendedDocumentFixtures);

    renderResourcesPage();

    await screen.findByText('07 - Advanced Scrum.pdf');

    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    await screen.findByText('Unknown Upload');

    const fileNameButton = screen.getByRole('button', { name: /file name/i });

    fireEvent.click(fileNameButton);
    fireEvent.click(fileNameButton);

    expect(getRenderedDocumentNames()).toEqual([
      'Unknown Upload',
      '07 - Advanced Scrum.pdf',
      '04 - DevOps.pdf',
      '01 - Linux Notes.txt',
    ]);
  });
});
