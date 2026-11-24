import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KeysService } from './keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly keys: KeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string = request.headers.authorization ?? '';
    const [scheme, raw] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !raw?.startsWith('ik_')) {
      throw new UnauthorizedException();
    }

    const key = await this.keys.findByRaw(raw);
    if (!key) throw new UnauthorizedException();

    request.apiKeyId = key.id;
    void this.keys.touch(key.id).catch(() => undefined);
    return true;
  }
}
