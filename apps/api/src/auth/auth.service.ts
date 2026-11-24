import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';
import { APP_CONFIG, AppConfig } from '../config';

function sameSecret(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right) && a.length === b.length;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly jwt: JwtService,
  ) {}

  get email(): string {
    return this.config.adminEmail;
  }

  verify(email: unknown, password: unknown): boolean {
    if (typeof email !== 'string' || typeof password !== 'string') return false;
    const emailOk = sameSecret(email.trim().toLowerCase(), this.config.adminEmail.toLowerCase());
    const passwordOk = sameSecret(password, this.config.adminPassword);
    return emailOk && passwordOk;
  }

  sign(): Promise<string> {
    return this.jwt.signAsync({ sub: 'admin' });
  }

  cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.isProduction,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
