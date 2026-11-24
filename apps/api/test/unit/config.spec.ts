import { loadConfig } from '../../src/config';

const validEnv = {
  ADMIN_EMAIL: 'a@b.c',
  ADMIN_PASSWORD: 'secret123',
  SESSION_SECRET: 'x'.repeat(40),
  MONGODB_URI: 'mongodb://localhost/test',
  PUBLIC_HOST: 'example.duckdns.org',
  PUBLIC_ORIGIN: 'https://example.duckdns.org',
  B2_ACCOUNTS: JSON.stringify([{ keyId: 'k', appKey: 'a', bucket: 'b', region: 'us-west-004' }]),
} as NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('parses a complete environment', () => {
    const config = loadConfig(validEnv);
    expect(config.maxUploadBytes).toBe(50 * 1024 * 1024);
    expect(config.accounts).toHaveLength(1);
    expect(config.publicOrigin).toBe('https://example.duckdns.org');
  });

  it('rejects a password longer than 15 characters', () => {
    expect(() => loadConfig({ ...validEnv, ADMIN_PASSWORD: 'x'.repeat(16) })).toThrow(/15/);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() => loadConfig({ ...validEnv, ADMIN_PASSWORD: 'short' })).toThrow(/8/);
  });

  it('rejects more than 10 B2 accounts', () => {
    const many = JSON.stringify(
      Array.from({ length: 11 }, () => ({ keyId: 'k', appKey: 'a', bucket: 'b', region: 'us-west-004' })),
    );
    expect(() => loadConfig({ ...validEnv, B2_ACCOUNTS: many })).toThrow(/10/);
  });

  it('rejects a short session secret', () => {
    expect(() => loadConfig({ ...validEnv, SESSION_SECRET: 'short' })).toThrow(/32/);
  });

  it('names the missing variable', () => {
    const { ADMIN_EMAIL: _ignored, ...rest } = validEnv;
    expect(() => loadConfig(rest as NodeJS.ProcessEnv)).toThrow(/ADMIN_EMAIL/);
  });

  it('refuses the example admin password shipped in the repo', () => {
    expect(() => loadConfig({ ...validEnv, ADMIN_PASSWORD: 'changeme123' })).toThrow(/example/);
  });

  it('refuses the example session secret shipped in the repo', () => {
    expect(() =>
      loadConfig({ ...validEnv, SESSION_SECRET: 'replace-with-32-plus-random-characters' }),
    ).toThrow(/example/);
  });
});
