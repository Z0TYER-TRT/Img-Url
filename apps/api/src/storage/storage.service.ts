import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_CONFIG, AppConfig } from '../config';
import { PRESIGN_SECONDS, StoragePort } from './storage.port';

@Injectable()
export class StorageService implements StoragePort {
  private readonly clients: S3Client[];
  private readonly buckets: string[];

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.clients = config.accounts.map(
      (account) =>
        new S3Client({
          region: account.region,
          endpoint: `https://s3.${account.region}.backblazeb2.com`,
          forcePathStyle: true,
          credentials: {
            accessKeyId: account.keyId,
            secretAccessKey: account.appKey,
          },
        }),
    );
    this.buckets = config.accounts.map((account) => account.bucket);
  }

  get count(): number {
    return this.clients.length;
  }

  async put(storageId: number, buffer: Buffer, key: string, contentType: string): Promise<void> {
    await this.clients[storageId].send(
      new PutObjectCommand({
        Bucket: this.buckets[storageId],
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
      }),
    );
  }

  async presign(storageId: number, key: string): Promise<string> {
    return getSignedUrl(
      this.clients[storageId],
      new GetObjectCommand({ Bucket: this.buckets[storageId], Key: key }),
      { expiresIn: PRESIGN_SECONDS },
    );
  }

  async remove(storageId: number, key: string): Promise<void> {
    await this.clients[storageId].send(
      new DeleteObjectCommand({ Bucket: this.buckets[storageId], Key: key }),
    );
  }
}
