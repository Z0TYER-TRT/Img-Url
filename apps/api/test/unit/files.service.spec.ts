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
  const puts: Array<{ storageId: number; key: string; contentType: string }> = [];
  const failOn = new Set<number>();
  const port: StoragePort = {
    count,
    async put(storageId, _buffer, key, contentType) {
      if (failOn.has(storageId)) throw new Error('bucket down');
      puts.push({ storageId, key, contentType });
    },
    async presign(storageId, key) {
      return `https://s3.test/${storageId}/${key}`;
    },
    async remove() {},
  };
  return { port, puts, failOn };
}

function fakeModel(groups: Array<{ _id: number; n: number }>) {
  return {
    aggregate: jest.fn().mockResolvedValue(groups),
    create: jest.fn(async (doc: Record<string, unknown>) => ({ ...doc, createdAt: new Date(), views: 0 })),
  } as never;
}

const upload = { buffer: PNG, originalname: 'x.png', size: PNG.length };

describe('FilesService', () => {
  it('uploads to the account holding the fewest files', async () => {
    const storage = fakeStorage();
    const service = new FilesService(fakeModel([{ _id: 0, n: 9 }, { _id: 1, n: 2 }]), storage.port, config);
    const result = await service.createFromUpload(upload);
    expect(storage.puts[0].storageId).toBe(1);
    expect(storage.puts[0].contentType).toBe('image/png');
    expect(result.url).toMatch(/^https:\/\/example\.duckdns\.org\/f\/[A-Za-z0-9]{10}$/);
  });

  it('falls through to the next account when one throws', async () => {
    const storage = fakeStorage();
    storage.failOn.add(1);
    const service = new FilesService(fakeModel([{ _id: 0, n: 0 }, { _id: 1, n: 0 }]), storage.port, config);
    await service.createFromUpload(upload);
    expect(storage.puts[0].storageId).toBe(0);
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
