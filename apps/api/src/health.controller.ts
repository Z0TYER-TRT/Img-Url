import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  health() {
    const up = this.connection.readyState === 1;
    if (!up) throw new ServiceUnavailableException({ ok: false, mongo: 'down' });
    return { ok: true, mongo: 'up' };
  }
}
