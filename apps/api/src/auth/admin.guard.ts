import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../config';
import { sessionVersion } from './session-version';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.sid;
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string; v?: string }>(token);
      if (payload?.v !== sessionVersion(this.config.adminPassword)) {
        throw new UnauthorizedException();
      }
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
