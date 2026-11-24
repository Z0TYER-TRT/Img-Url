export interface StoragePort {
  readonly count: number;
  put(storageId: number, buffer: Buffer, key: string, contentType: string): Promise<void>;
  presign(storageId: number, key: string): Promise<string>;
  remove(storageId: number, key: string): Promise<void>;
}

export const STORAGE = Symbol('STORAGE');

export const PRESIGN_SECONDS = 300;
