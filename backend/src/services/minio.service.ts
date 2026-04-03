import { Readable } from 'stream';
import { Client } from 'minio';
import { StorageService } from './storage.service';
import { ObjectMetadata, ObjectEntry, UploadOptions } from '../types';

/**
 * MinioService
 *
 * MinIO implementation of StorageService.
 *
 * Responsibilities:
 * - Translates the generic storage interface to MinIO SDK calls
 * - Manages bucket lifecycle (creation, existence checks)
 * - Provides pre-signed URLs for temporary object access
 *
 * This service is used wherever object storage interactions are required
 * and can be replaced with any other StorageService implementation.
 */
export class MinioService extends StorageService {
  constructor(private readonly client: Client) {
    super();
  }

  /**
   * Uploads an object to a MinIO bucket.
   *
   * Workflow:
   * 1. Build metadata headers from options
   * 2. Call MinIO putObject with the provided data
   *
   * @param bucket Target bucket name
   * @param key Object key (path within the bucket)
   * @param data Object content as a Buffer or Readable stream
   * @param options Optional content type and metadata
   *
   * @throws Error if the upload fails
   */
  async upload(
    bucket: string,
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<void> {
    const metadata = {
      ...(options?.contentType && { 'Content-Type': options.contentType }),
      ...options?.metadata,
    };

    await this.client.putObject(bucket, key, data, undefined, metadata);
  }

  /**
   * Downloads an object from a MinIO bucket as a Readable stream.
   *
   * @param bucket Source bucket name
   * @param key Object key
   *
   * @returns Readable stream of the object content
   *
   * @throws Error if the object does not exist
   */
  async download(bucket: string, key: string): Promise<Readable> {
    return this.client.getObject(bucket, key);
  }

  /**
   * Deletes an object from a MinIO bucket.
   * Resolves silently if the object does not exist.
   *
   * @param bucket Target bucket name
   * @param key Object key
   */
  async delete(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }

  /**
   * Checks whether an object exists in a MinIO bucket.
   *
   * Workflow:
   * 1. Call statObject to retrieve metadata
   * 2. Return true if successful, false if a NoSuchKey error is returned
   *
   * @param bucket Target bucket name
   * @param key Object key
   *
   * @returns true if the object exists, false otherwise
   */
  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns metadata for an object stored in MinIO.
   *
   * @param bucket Target bucket name
   * @param key Object key
   *
   * @returns Object metadata (size, contentType, lastModified)
   *
   * @throws Error if the object does not exist
   */
  async stat(bucket: string, key: string): Promise<ObjectMetadata> {
    const info = await this.client.statObject(bucket, key);

    return {
      size: info.size,
      lastModified: info.lastModified,
      contentType: info.metaData?.['content-type'],
    };
  }

  /**
   * Lists all objects in a MinIO bucket, optionally filtered by prefix.
   *
   * Workflow:
   * 1. Start a recursive listing stream from MinIO
   * 2. Collect all object entries
   * 3. Resolve once the stream ends
   *
   * @param bucket Target bucket name
   * @param prefix Optional key prefix to filter results
   *
   * @returns Array of object entries (key, size, lastModified)
   */
  async list(bucket: string, prefix?: string): Promise<ObjectEntry[]> {
    return new Promise<ObjectEntry[]>((resolve, reject) => {
      const entries: ObjectEntry[] = [];
      const stream = this.client.listObjects(bucket, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name) {
          entries.push({
            key: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      });

      stream.on('end', () => resolve(entries));
      stream.on('error', reject);
    });
  }

  /**
   * Ensures a MinIO bucket exists, creating it if it does not.
   *
   * Workflow:
   * 1. Check if the bucket already exists
   * 2. Create it if not
   *
   * @param bucket Bucket name
   */
  async ensureBucket(bucket: string): Promise<void> {
    const alreadyExists = await this.client.bucketExists(bucket);

    if (!alreadyExists) {
      await this.client.makeBucket(bucket);
    }
  }

  /**
   * Generates a pre-signed URL for temporary public read access to a MinIO object.
   *
   * @param bucket Target bucket name
   * @param key Object key
   * @param expirySeconds URL validity in seconds (default: 3600)
   *
   * @returns Pre-signed URL string
   *
   * @throws Error if the object does not exist or signing fails
   */
  async presignedUrl(bucket: string, key: string, expirySeconds: number = 3600): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expirySeconds);
  }
}
