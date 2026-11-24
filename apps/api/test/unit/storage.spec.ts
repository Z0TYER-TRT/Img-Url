import { AppConfig } from '../../src/config';
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
  it('presigns a url with a 300 second expiry against the B2 endpoint', async () => {
    const storage = new StorageService(config);
    const url = await storage.presign(0, '2026-11/abc.png');
    expect(url).toContain('https://s3.us-west-004.backblazeb2.com/my-bucket/2026-11/abc.png');
    expect(url).toContain('X-Amz-Expires=300');
    expect(url).toContain('X-Amz-Signature=');
  });

  it('exposes one client per configured account', () => {
    expect(new StorageService(config).count).toBe(1);
  });
});
