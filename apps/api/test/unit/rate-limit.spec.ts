import { HttpException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from '../../src/common/rate-limit.guard';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows up to the limit and then throws 429', () => {
    const guard = new RateLimitGuard(2, 60_000, 'ip');
    const context = contextFor({ ip: '1.1.1.1' });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('counts each ip separately', () => {
    const guard = new RateLimitGuard(1, 60_000, 'ip');
    expect(guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: '2.2.2.2' }))).toBe(true);
  });

  it('keys api requests by key id, not ip', () => {
    const guard = new RateLimitGuard(1, 60_000, 'apiKey');
    expect(guard.canActivate(contextFor({ ip: 'same', apiKeyId: 'k1' }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: 'same', apiKeyId: 'k2' }))).toBe(true);
  });
});
