import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AppConfig } from '../../src/config';
import { FilesService } from '../../src/files/files.service';
import { StoragePort } from '../../src/storage/storage.port';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const config: AppConfig = {
  adminEmail: 'a@b.c',
  adminPassword: 'secret123',
  sessionSecret: 'x'.repeat(40),
  mongoUri: 'mongodb://localhost/test',
  publicHost: 'example.duckdns.org',
  publicOrigin: 'https://example.duckdns.org',
  maxUploadBytes: 50 * 1024 * 1024,
  accounts: [],
  isProduction: false,
};

function fakeStorage(count = 2) {
  const buckets = Array.from({ length: count }, (_, index) => `b${index}`);
  const puts: Array<{ index: number; key: string; contentType: string }> = [];
  const failOn = new Set<number>();
  const port: StoragePort = {
    count,
    bucketAt: (index) => buckets[index],
    async put(index, _buffer, key, contentType) {
      if (failOn.has(index)) throw new Error('bucket down');
      puts.push({ index, key, contentType });
    },
    async presign(bucket, key) {
      return `https://s3.test/${bucket}/${key}`;
    },
    async remove() {},
  };
  return { port, puts, failOn };
}

function fakeModel(groups: Array<{ _id: string; n: number }>) {
  return {
    aggregate: jest.fn().mockResolvedValue(groups),
    create: jest.fn(async (doc: Record<string, unknown>) => ({ ...doc, createdAt: new Date(), views: 0 })),
  } as never;
}

const upload = { buffer: PNG, originalname: 'x.png', size: PNG.length };

describe('FilesService', () => {
  it('uploads to the account holding the fewest files', async () => {
    const storage = fakeStorage();
    const service = new FilesService(
      fakeModel([{ _id: 'b0', n: 9 }, { _id: 'b1', n: 2 }]),
      storage.port,
      config,
    );
    const result = await service.createFromUpload(upload);
    expect(storage.puts[0].index).toBe(1);
    expect(storage.puts[0].contentType).toBe('image/png');
    expect(result.url).toMatch(/^https:\/\/example\.duckdns\.org\/f\/[A-Za-z0-9]{10}$/);
  });

  it('records the bucket name, not the array index, so config reordering is safe', async () => {
    const storage = fakeStorage();
    const model = {
      aggregate: jest.fn().mockResolvedValue([]),
      create: jest.fn(async (doc: Record<string, unknown>) => ({ ...doc, createdAt: new Date(), views: 0 })),
    } as never;
    const service = new FilesService(model, storage.port, config);
    await service.createFromUpload(upload);
    const created = (model as unknown as { create: jest.Mock }).create.mock.calls[0][0];
    expect(created.bucket).toBe('b0');
    expect(created).not.toHaveProperty('storageId');
  });

  it('falls through to the next account when one throws', async () => {
    const storage = fakeStorage();
    storage.failOn.add(0);
    const service = new FilesService(fakeModel([]), storage.port, config);
    await service.createFromUpload(upload);
    expect(storage.puts[0].index).toBe(1);
  });

  it('fails loudly when every account fails', async () => {
    const storage = fakeStorage();
    storage.failOn.add(0);
    storage.failOn.add(1);
    const service = new FilesService(fakeModel([]), storage.port, config);
    await expect(service.createFromUpload(upload)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects bytes that are not an image or a video', async () => {
    const storage = fakeStorage();
    const service = new FilesService(fakeModel([]), storage.port, config);
    await expect(
      service.createFromUpload({ buffer: Buffer.from('%PDF-1.4'), originalname: 'a.pdf', size: 8 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignores the client mime and stores the sniffed one', async () => {
    const storage = fakeStorage();
    const service = new FilesService(fakeModel([]), storage.port, config);
    const result = await service.createFromUpload({ ...upload, originalname: 'evil.html' });
    expect(result.mime).toBe('image/png');
    expect(storage.puts[0].contentType).toBe('image/png');
  });
});
