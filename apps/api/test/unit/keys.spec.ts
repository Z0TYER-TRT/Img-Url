import { hashKey, KeysService } from '../../src/keys/keys.service';

describe('keys', () => {
  it('hashes deterministically and never in plain text', () => {
    expect(hashKey('ik_abc')).toBe(hashKey('ik_abc'));
    expect(hashKey('ik_abc')).not.toContain('ik_abc');
  });

  it('returns the raw key once and stores only the hash', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const model = { create: jest.fn(async (doc) => stored.push(doc)) } as never;
    const service = new KeysService(model);

    const created = await service.create('my bot');
    expect(created.key).toMatch(/^ik_[A-Za-z0-9_-]{20,}$/);
    expect(stored[0].hash).toBe(hashKey(created.key));
    expect(JSON.stringify(stored[0])).not.toContain(created.key);
    expect(stored[0].prefix).toBe(created.key.slice(0, 8));
  });
});
