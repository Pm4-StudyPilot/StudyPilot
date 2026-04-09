import { Readable } from 'stream';
import { StorageStrategy } from '../strategies/storage.strategy';
import { ObjectMetadata, ObjectEntry, UploadOptions } from '../types';

/**
 * StorageService
 *
 * Abstract base class for object storage interactions.
 *
 * Responsibilities:
 * - Defines the contract all storage implementations must fulfill
 * - Provides shared convenience methods built on top of the abstract interface
 *
 * Subclasses must implement all abstract methods for their specific storage backend
 * (e.g. MinIO, AWS S3, Google Cloud Storage).
 */
export abstract class StorageService implements StorageStrategy {
  /**
   * Uploads an object to the given bucket under the given key.
   *
   * @param bucket Target bucket name
   * @param key Object key (path within the bucket)
   * @param data Object content as a Buffer or Readable stream
   * @param options Optional content type and metadata
   */
  abstract upload(
    bucket: string,
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<void>;

  /**
   * Downloads an object and returns it as a Readable stream.
   *
   * @param bucket Source bucket name
   * @param key Object key
   *
   * @returns Readable stream of the object content
   *
   * @throws Error if the object does not exist
   */
  abstract download(bucket: string, key: string): Promise<Readable>;

  /**
   * Deletes an object from the bucket.
   * Resolves silently if the object does not exist.
   *
   * @param bucket Target bucket name
   * @param key Object key
   */
  abstract delete(bucket: string, key: string): Promise<void>;

  /**
   * Checks whether an object exists in the bucket.
   *
   * @param bucket Target bucket name
   * @param key Object key
   *
   * @returns true if the object exists, false otherwise
   */
  abstract exists(bucket: string, key: string): Promise<boolean>;

  /**
   * Returns metadata for an object (size, content type, last modified, etc.).
   *
   * @param bucket Target bucket name
   * @param key Object key
   *
   * @returns Object metadata
   *
   * @throws Error if the object does not exist
   */
  abstract stat(bucket: string, key: string): Promise<ObjectMetadata>;

  /**
   * Lists all objects in a bucket, optionally filtered by a key prefix.
   *
   * @param bucket Target bucket name
   * @param prefix Optional key prefix to filter results
   *
   * @returns Array of object entries (key, size, lastModified)
   */
  abstract list(bucket: string, prefix?: string): Promise<ObjectEntry[]>;

  /**
   * Ensures the bucket exists, creating it if it does not.
   *
   * @param bucket Bucket name
   */
  abstract ensureBucket(bucket: string): Promise<void>;

  /**
   * Generates a pre-signed URL for temporary public read access to an object.
   *
   * @param bucket Target bucket name
   * @param key Object key
   * @param expirySeconds URL validity in seconds (default: 3600)
   *
   * @returns Pre-signed URL string
   */
  abstract presignedUrl(bucket: string, key: string, expirySeconds?: number): Promise<string>;

  /**
   * Downloads an object and returns its full content as a Buffer.
   *
   * Workflow:
   * 1. Download the object as a stream
   * 2. Collect all chunks
   * 3. Concatenate and return as a Buffer
   *
   * @param bucket Source bucket name
   * @param key Object key
   *
   * @returns Full object content as a Buffer
   */
  async downloadBuffer(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.download(bucket, key);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Ensures the bucket exists and then uploads the object.
   *
   * Workflow:
   * 1. Ensure the target bucket exists
   * 2. Convert string data to Buffer if necessary
   * 3. Upload the object
   *
   * @param bucket Target bucket name
   * @param key Object key
   * @param data Object content as a Buffer or string
   * @param options Optional content type and metadata
   */
  async uploadSafe(
    bucket: string,
    key: string,
    data: Buffer | string,
    options?: UploadOptions
  ): Promise<void> {
    await this.ensureBucket(bucket);

    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    await this.upload(bucket, key, buffer, options);
  }
}
