import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test, expect } from '../fixtures/test';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureBuffer = readFileSync(join(here, '../fixtures-data/sample.txt'));

// These specs require MinIO. The backend creates the "documents" bucket on first
// upload (ensureBucket), so no separate bucket setup is needed.
test.describe('Documents', () => {
  test('upload a document, download its bytes, and delete it', async ({
    factory,
    courseDetail,
    api,
  }) => {
    const course = await factory.createCourse();
    await courseDetail.goto(course.id);

    await courseDetail.uploadDocument({
      name: 'sample.txt',
      mimeType: 'text/plain',
      buffer: fixtureBuffer,
    });
    await expect(courseDetail.documentItem('sample.txt')).toBeVisible();

    // The presigned download returns the original bytes (verified through the API).
    const [doc] = await factory.listDocuments(course.id);
    expect(doc.filename).toBe('sample.txt');
    const download = await api.get(`/api/documents/${doc.id}?disposition=attachment`);
    expect(download.ok()).toBeTruthy();
    expect((await download.body()).equals(fixtureBuffer)).toBeTruthy();

    await courseDetail.deleteDocument('sample.txt');
    await expect(courseDetail.documentItem('sample.txt')).toHaveCount(0);
  });

  test('documents can be sorted by name', async ({ factory, courseDetail, page }) => {
    const course = await factory.createCourse();
    // Upload via API for speed/determinism, then assert UI sorting.
    await factory.uploadDocument(course.id, {
      name: 'doc-zzz.txt',
      mimeType: 'text/plain',
      content: 'z',
    });
    await factory.uploadDocument(course.id, {
      name: 'doc-aaa.txt',
      mimeType: 'text/plain',
      content: 'a',
    });

    await courseDetail.goto(course.id);
    await expect(page.getByTestId('document-item')).toHaveCount(2);

    await courseDetail.sortDocumentsBy('Name');
    await expect(page.getByTestId('document-item').first()).toHaveAttribute(
      'data-document-name',
      'doc-aaa.txt'
    );
  });
});
