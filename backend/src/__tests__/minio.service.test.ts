import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { MinioService } from '../services/minio.service';

type MockMinioClient = {
  putObject: ReturnType<typeof mock>;
  getObject: ReturnType<typeof mock>;
  removeObject: ReturnType<typeof mock>;
  statObject: ReturnType<typeof mock>;
  listObjects: ReturnType<typeof mock>;
  bucketExists: ReturnType<typeof mock>;
  makeBucket: ReturnType<typeof mock>;
  presignedGetObject: ReturnType<typeof mock>;
};

function createMockClient(): MockMinioClient {
  return {
    putObject: mock(async () => {}),
    getObject: mock(async () => Readable.from([])),
    removeObject: mock(async () => {}),
    statObject: mock(async () => ({
      size: 100,
      lastModified: new Date('2026-01-01'),
      metaData: { 'content-type': 'text/plain' },
    })),
    listObjects: mock(() => new EventEmitter()),
    bucketExists: mock(async () => false),
    makeBucket: mock(async () => {}),
    presignedGetObject: mock(async () => 'https://minio/bucket/key?signature=abc'),
  };
}

describe('MinioService', () => {
  let client: MockMinioClient;
  let service: MinioService;

  beforeEach(() => {
    client = createMockClient();
    service = new MinioService(client as never);
  });

  /**
   * Test cases for upload()
   */
  describe('upload', () => {
    /**
     * Test case: Upload with content type
     *
     * Scenario:
     * A Buffer is uploaded with a content type option.
     *
     * Expected behavior:
     * - putObject is called with the bucket, key, data, and Content-Type metadata
     */
    it('should call putObject with Content-Type metadata when contentType is provided', async () => {
      const data = Buffer.from('file content');

      await service.upload('bucket', 'file.txt', data, { contentType: 'text/plain' });

      expect(client.putObject).toHaveBeenCalledWith('bucket', 'file.txt', data, undefined, {
        'Content-Type': 'text/plain',
      });
    });

    /**
     * Test case: Upload without options
     *
     * Scenario:
     * A Buffer is uploaded without any options.
     *
     * Expected behavior:
     * - putObject is called with an empty metadata object
     */
    it('should call putObject with empty metadata when no options are provided', async () => {
      const data = Buffer.from('file content');

      await service.upload('bucket', 'file.txt', data);

      expect(client.putObject).toHaveBeenCalledWith('bucket', 'file.txt', data, undefined, {});
    });
  });

  /**
   * Test cases for download()
   */
  describe('download', () => {
    /**
     * Test case: Successful download
     *
     * Scenario:
     * An existing object is requested from MinIO.
     *
     * Expected behavior:
     * - getObject is called with the correct bucket and key
     * - A Readable stream is returned
     */
    it('should call getObject and return a stream', async () => {
      const stream = Readable.from(['data']);
      client.getObject.mockResolvedValue(stream);

      const result = await service.download('bucket', 'file.txt');

      expect(client.getObject).toHaveBeenCalledWith('bucket', 'file.txt');
      expect(result).toBe(stream);
    });
  });

  /**
   * Test cases for delete()
   */
  describe('delete', () => {
    /**
     * Test case: Delete an object
     *
     * Scenario:
     * An existing object is deleted from MinIO.
     *
     * Expected behavior:
     * - removeObject is called with the correct bucket and key
     */
    it('should call removeObject with the correct bucket and key', async () => {
      await service.delete('bucket', 'file.txt');

      expect(client.removeObject).toHaveBeenCalledWith('bucket', 'file.txt');
    });
  });

  /**
   * Test cases for exists()
   */
  describe('exists', () => {
    /**
     * Test case: Object exists
     *
     * Scenario:
     * statObject succeeds, meaning the object is present.
     *
     * Expected behavior:
     * - exists returns true
     */
    it('should return true when statObject succeeds', async () => {
      const result = await service.exists('bucket', 'file.txt');

      expect(result).toBe(true);
    });

    /**
     * Test case: Object does not exist
     *
     * Scenario:
     * statObject throws an error (e.g. NoSuchKey).
     *
     * Expected behavior:
     * - exists returns false without throwing
     */
    it('should return false when statObject throws', async () => {
      client.statObject.mockRejectedValue(new Error('NoSuchKey'));

      const result = await service.exists('bucket', 'missing.txt');

      expect(result).toBe(false);
    });
  });

  /**
   * Test cases for stat()
   */
  describe('stat', () => {
    /**
     * Test case: Returns mapped metadata
     *
     * Scenario:
     * statObject returns raw MinIO metadata.
     *
     * Expected behavior:
     * - size, lastModified, and contentType are correctly mapped
     */
    it('should return mapped object metadata', async () => {
      const lastModified = new Date('2026-01-01');
      client.statObject.mockResolvedValue({
        size: 512,
        lastModified,
        metaData: { 'content-type': 'application/pdf' },
      });

      const result = await service.stat('bucket', 'file.pdf');

      expect(result).toEqual({
        size: 512,
        lastModified,
        contentType: 'application/pdf',
      });
    });
  });

  /**
   * Test cases for list()
   */
  describe('list', () => {
    /**
     * Test case: Lists objects in a bucket
     *
     * Scenario:
     * listObjects emits two object entries then ends.
     *
     * Expected behavior:
     * - Both entries are collected and returned
     */
    it('should collect and return all object entries from the stream', async () => {
      const emitter = new EventEmitter();
      client.listObjects.mockReturnValue(emitter);

      const promise = service.list('bucket', 'prefix/');

      emitter.emit('data', {
        name: 'prefix/a.txt',
        size: 10,
        lastModified: new Date('2026-01-01'),
      });
      emitter.emit('data', {
        name: 'prefix/b.txt',
        size: 20,
        lastModified: new Date('2026-01-02'),
      });
      emitter.emit('end');

      const result = await promise;

      expect(result).toEqual([
        { key: 'prefix/a.txt', size: 10, lastModified: new Date('2026-01-01') },
        { key: 'prefix/b.txt', size: 20, lastModified: new Date('2026-01-02') },
      ]);
    });

    /**
     * Test case: Stream error during listing
     *
     * Scenario:
     * listObjects emits an error event.
     *
     * Expected behavior:
     * - The returned promise rejects with the error
     */
    it('should reject if the list stream emits an error', async () => {
      const emitter = new EventEmitter();
      client.listObjects.mockReturnValue(emitter);

      const promise = service.list('bucket');

      emitter.emit('error', new Error('list failed'));

      await expect(promise).rejects.toThrow('list failed');
    });
  });

  /**
   * Test cases for ensureBucket()
   */
  describe('ensureBucket', () => {
    /**
     * Test case: Bucket does not exist
     *
     * Scenario:
     * bucketExists returns false.
     *
     * Expected behavior:
     * - makeBucket is called to create the bucket
     */
    it('should create the bucket if it does not exist', async () => {
      client.bucketExists.mockResolvedValue(false);

      await service.ensureBucket('new-bucket');

      expect(client.makeBucket).toHaveBeenCalledWith('new-bucket');
    });

    /**
     * Test case: Bucket already exists
     *
     * Scenario:
     * bucketExists returns true.
     *
     * Expected behavior:
     * - makeBucket is not called
     */
    it('should not create the bucket if it already exists', async () => {
      client.bucketExists.mockResolvedValue(true);

      await service.ensureBucket('existing-bucket');

      expect(client.makeBucket).not.toHaveBeenCalled();
    });
  });

  /**
   * Test cases for presignedUrl()
   */
  describe('presignedUrl', () => {
    /**
     * Test case: Returns a pre-signed URL with default expiry
     *
     * Scenario:
     * presignedUrl is called without an explicit expiry.
     *
     * Expected behavior:
     * - presignedGetObject is called with the default expiry of 3600 seconds
     * - The returned URL is passed through unchanged
     */
    it('should call presignedGetObject with default expiry and return the URL', async () => {
      client.presignedGetObject.mockResolvedValue('https://minio/bucket/file.txt?sig=xyz');

      const result = await service.presignedUrl('bucket', 'file.txt');

      expect(client.presignedGetObject).toHaveBeenCalledWith('bucket', 'file.txt', 3600);
      expect(result).toBe('https://minio/bucket/file.txt?sig=xyz');
    });

    /**
     * Test case: Returns a pre-signed URL with custom expiry
     *
     * Scenario:
     * presignedUrl is called with a custom expiry of 600 seconds.
     *
     * Expected behavior:
     * - presignedGetObject is called with the provided expiry
     */
    it('should call presignedGetObject with the provided expiry', async () => {
      await service.presignedUrl('bucket', 'file.txt', 600);

      expect(client.presignedGetObject).toHaveBeenCalledWith('bucket', 'file.txt', 600);
    });
  });
});
