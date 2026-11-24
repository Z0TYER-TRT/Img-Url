import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginRateLimit } from '../common/rate-limit.guard';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LoginRateLimit)
  async login(
    @Body() body: { email?: unknown; password?: unknown },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.auth.verify(body?.email, body?.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    res.cookie('sid', await this.auth.sign(), this.auth.cookieOptions());
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('sid', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me() {
    return { email: this.auth.email };
  }
}
