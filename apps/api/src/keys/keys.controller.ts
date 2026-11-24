import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { KeysService } from './keys.service';

@Controller('api/keys')
@UseGuards(AdminGuard)
export class KeysController {
  constructor(private readonly keys: KeysService) {}

  @Post()
  create(@Body() body: { name?: unknown }) {
    return this.keys.create(typeof body?.name === 'string' ? body.name : '');
  }

  @Get()
  async list() {
    return { items: await this.keys.list() };
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@Param('id') id: string) {
    if (!(await this.keys.revoke(id))) throw new NotFoundException();
  }
}
