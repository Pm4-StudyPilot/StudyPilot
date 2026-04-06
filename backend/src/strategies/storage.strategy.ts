import { Readable } from 'stream';
import { ObjectMetadata, ObjectEntry, UploadOptions } from '../types';

export interface StorageStrategy {
  upload(
    bucket: string,
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<void>;
  download(bucket: string, key: string): Promise<Readable>;
  delete(bucket: string, key: string): Promise<void>;
  exists(bucket: string, key: string): Promise<boolean>;
  stat(bucket: string, key: string): Promise<ObjectMetadata>;
  list(bucket: string, prefix?: string): Promise<ObjectEntry[]>;
  ensureBucket(bucket: string): Promise<void>;
  presignedUrl(bucket: string, key: string, expirySeconds?: number): Promise<string>;
}
