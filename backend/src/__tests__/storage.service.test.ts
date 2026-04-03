import { describe, it, expect, mock } from 'bun:test';
import { Readable } from 'stream';
import { StorageService } from '../services/storage.service';
import { ObjectMetadata, ObjectEntry, UploadOptions } from '../types';

/**
 * Minimal concrete subclass used to test the shared logic
 * of the abstract StorageService without a real storage backend.
 */
class TestStorageService extends StorageService {
  upload = mock(
    async (
      _bucket: string,
      _key: string,
      _data: Buffer | Readable,
      _options?: UploadOptions
    ): Promise<void> => {}
  );
  download = mock(async (_bucket: string, _key: string): Promise<Readable> => Readable.from([]));
  delete = mock(async (_bucket: string, _key: string): Promise<void> => {});
  exists = mock(async (_bucket: string, _key: string): Promise<boolean> => false);
  stat = mock(async (_bucket: string, _key: string): Promise<ObjectMetadata> => ({}));
  list = mock(async (_bucket: string, _prefix?: string): Promise<ObjectEntry[]> => []);
  ensureBucket = mock(async (_bucket: string): Promise<void> => {});
  presignedUrl = mock(
    async (_bucket: string, _key: string, _expirySeconds?: number): Promise<string> => ''
  );
}

describe('StorageService', () => {
  /**
   * Test cases for downloadBuffer()
   */
  describe('downloadBuffer', () => {
    /**
     * Test case: Stream with multiple chunks
     *
     * Scenario:
     * The storage backend returns a stream that emits multiple chunks.
     *
     * Expected behavior:
     * - All chunks are collected and concatenated
     * - The result is a single Buffer with all data
     */
    it('should collect stream chunks and return them as a Buffer', async () => {
      const service = new TestStorageService();
      const chunks = [Buffer.from('hello '), Buffer.from('world')];
      service.download.mockImplementation(async () => Readable.from(chunks));

      const result = await service.downloadBuffer('bucket', 'key');

      expect(result).toEqual(Buffer.concat(chunks));
    });

    /**
     * Test case: Stream error
     *
     * Scenario:
     * The storage backend returns a stream that emits an error.
     *
     * Expected behavior:
     * - The returned promise rejects with the stream error
     */
    it('should reject if the stream emits an error', async () => {
      const service = new TestStorageService();
      const streamError = new Error('stream failure');

      service.download.mockImplementation(async () => {
        return new Readable({
          read() {
            this.destroy(streamError);
          },
        });
      });

      await expect(service.downloadBuffer('bucket', 'key')).rejects.toThrow('stream failure');
    });
  });

  /**
   * Test cases for uploadSafe()
   */
  describe('uploadSafe', () => {
    /**
     * Test case: Ensures bucket before uploading
     *
     * Scenario:
     * uploadSafe is called with a Buffer.
     *
     * Expected behavior:
     * - ensureBucket is called before upload
     * - upload is called with the original Buffer
     */
    it('should call ensureBucket then upload with a Buffer', async () => {
      const service = new TestStorageService();
      const data = Buffer.from('content');

      await service.uploadSafe('bucket', 'key', data, { contentType: 'text/plain' });

      expect(service.ensureBucket).toHaveBeenCalledWith('bucket');
      expect(service.upload).toHaveBeenCalledWith('bucket', 'key', data, {
        contentType: 'text/plain',
      });
    });

    /**
     * Test case: Converts string to Buffer before uploading
     *
     * Scenario:
     * uploadSafe is called with a plain string.
     *
     * Expected behavior:
     * - The string is converted to a UTF-8 Buffer
     * - upload is called with the converted Buffer
     */
    it('should convert a string to a Buffer before uploading', async () => {
      const service = new TestStorageService();

      await service.uploadSafe('bucket', 'key', 'hello');

      const [, , uploadedData] = service.upload.mock.calls[0];
      expect(uploadedData).toEqual(Buffer.from('hello', 'utf-8'));
    });
  });
});
