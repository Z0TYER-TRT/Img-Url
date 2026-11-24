import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { STORAGE, StoragePort } from '../src/storage/storage.port';

export class FakeStorage implements StoragePort {
  readonly count = 2;
  readonly buckets = ['b0', 'b1'];
  readonly objects = new Map<string, Buffer>();
  readonly removed: string[] = [];
  readonly failOn = new Set<number>();
  failRemove = false;

  bucketAt(index: number): string {
    return this.buckets[index];
  }

  async put(index: number, buffer: Buffer, key: string): Promise<void> {
    if (this.failOn.has(index)) throw new Error('storage down');
    this.objects.set(`${this.buckets[index]}/${key}`, buffer);
  }

  async presign(bucket: string, key: string): Promise<string> {
    return `https://s3.test/${bucket}/${key}?X-Amz-Signature=deadbeef&X-Amz-Expires=43200`;
  }

  async remove(bucket: string, key: string): Promise<void> {
    if (this.failRemove) throw Object.assign(new Error('AccessDenied'), { name: 'AccessDenied' });
    this.removed.push(key);
    this.objects.delete(`${bucket}/${key}`);
  }
}

export const ADMIN = { email: 'admin@test.local', password: 'secret123' };

export async function createTestApp() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('imgurl_test');
  process.env.ADMIN_EMAIL = ADMIN.email;
  process.env.ADMIN_PASSWORD = ADMIN.password;
  process.env.SESSION_SECRET = 'x'.repeat(40);
  process.env.PUBLIC_HOST = 'localhost';
  process.env.PUBLIC_ORIGIN = 'http://localhost';
  process.env.MAX_UPLOAD_MB = '50';
  process.env.B2_ACCOUNTS = JSON.stringify([
    { keyId: 'k0', appKey: 'a0', bucket: 'b0', region: 'us-west-004' },
    { keyId: 'k1', appKey: 'a1', bucket: 'b1', region: 'us-west-004' },
  ]);

  const storage = new FakeStorage();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(STORAGE)
    .useValue(storage)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication({ logger: ['error'] });
  app.use(cookieParser());
  await app.init();

  const http = () => request(app.getHttpServer());
  return { app, http, storage, mongo };
}
