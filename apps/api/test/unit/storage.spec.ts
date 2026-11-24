import { AppConfig } from '../../src/config';
import { StorageAccountGoneError } from '../../src/storage/storage.port';
import { StorageService } from '../../src/storage/storage.service';

const config: AppConfig = {
  adminEmail: 'a@b.c',
  adminPassword: 'secret123',
  sessionSecret: 'x'.repeat(40),
  mongoUri: 'mongodb://localhost/test',
  publicHost: 'example.duckdns.org',
  publicOrigin: 'https://example.duckdns.org',
  maxUploadBytes: 1024,
  accounts: [{ keyId: 'key', appKey: 'secret', bucket: 'my-bucket', region: 'us-west-004' }],
  isProduction: false,
};

describe('StorageService', () => {
  it('presigns a url with a 12 hour expiry against the B2 endpoint', async () => {
    const storage = new StorageService(config);
    const url = await storage.presign('my-bucket', '2026-11/abc.png');
    expect(url).toContain('https://s3.us-west-004.backblazeb2.com/my-bucket/2026-11/abc.png');
    expect(url).toContain('X-Amz-Expires=43200');
    expect(url).toContain('X-Amz-Signature=');
  });

  it('exposes one client per configured account', () => {
    expect(new StorageService(config).count).toBe(1);
    expect(new StorageService(config).bucketAt(0)).toBe('my-bucket');
  });

  it('refuses a bucket that is no longer configured instead of hitting the wrong one', async () => {
    const storage = new StorageService(config);
    await expect(storage.presign('removed-bucket', 'k')).rejects.toBeInstanceOf(StorageAccountGoneError);
    await expect(storage.remove('removed-bucket', 'k')).rejects.toBeInstanceOf(StorageAccountGoneError);
  });
});
