import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { FilesService, UploadedFileLike } from './files.service';

@Controller('api/files')
@UseGuards(AdminGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file?: UploadedFileLike) {
    return this.files.createFromUpload(file);
  }

  @Get()
  list(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.files.list(cursor, limit ? Number(limit) : undefined);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.files.remove(id);
  }
}
