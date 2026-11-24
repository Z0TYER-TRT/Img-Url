export interface StoragePort {
  readonly count: number;
  /** Stable id for an account, recorded with each file so reordering config is safe. */
  bucketAt(index: number): string;
  put(index: number, buffer: Buffer, key: string, contentType: string): Promise<void>;
  presign(bucket: string, key: string): Promise<string>;
  remove(bucket: string, key: string): Promise<void>;
}

export const STORAGE = Symbol('STORAGE');

/** 12 hours: a browser follows the 302 once and keeps using that URL for range requests. */
export const PRESIGN_SECONDS = 12 * 60 * 60;

export class StorageAccountGoneError extends Error {
  constructor(bucket: string) {
    super(`Storage account for bucket "${bucket}" is no longer configured`);
    this.name = 'StorageAccountGoneError';
  }
}
