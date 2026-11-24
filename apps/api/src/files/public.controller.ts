import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from './files.service';

@Controller('f')
export class PublicController {
  constructor(private readonly files: FilesService) {}

  @Get(':id')
  async view(@Param('id') id: string, @Res() res: Response) {
    const url = await this.files.urlFor(id);
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, url);
  }
}
