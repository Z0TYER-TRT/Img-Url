import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BotUploadRateLimit } from '../common/rate-limit.guard';
import { ApiKeyGuard } from '../keys/api-key.guard';
import { FilesService, UploadedFileLike } from './files.service';

@Controller('api/v1/files')
@UseGuards(ApiKeyGuard, BotUploadRateLimit)
export class FilesV1Controller {
  constructor(private readonly files: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file?: UploadedFileLike) {
    return this.files.createFromUpload(file);
  }
}
