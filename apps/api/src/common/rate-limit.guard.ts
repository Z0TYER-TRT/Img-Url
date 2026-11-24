import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/**
 * In-process fixed-window limiter. One container runs this site, so a shared
 * store (Redis) would be a dependency with no user-visible benefit.
 * shortcut: counters reset on restart and are per-container, upgrade to a
 * shared store if this ever runs behind more than one API replica.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly ttlMs: number,
    private readonly scope: 'ip' | 'apiKey' = 'ip',
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const id: string = this.scope === 'apiKey' ? request.apiKeyId ?? request.ip : request.ip;
    const now = Date.now();
    const entry = this.hits.get(id);

    if (!entry || entry.resetAt <= now) {
      if (entry) this.hits.delete(id);
      this.hits.set(id, { count: 1, resetAt: now + this.ttlMs });
      if (this.hits.size > 5000) {
        for (const [key, value] of this.hits) if (value.resetAt <= now) this.hits.delete(key);
      }
      return true;
    }
    if (entry.count >= this.limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    entry.count += 1;
    return true;
  }
}

@Injectable()
export class LoginRateLimit extends RateLimitGuard {
  constructor() {
    super(5, 60_000, 'ip');
  }
}

@Injectable()
export class BotUploadRateLimit extends RateLimitGuard {
  constructor() {
    super(30, 60_000, 'apiKey');
  }
}
