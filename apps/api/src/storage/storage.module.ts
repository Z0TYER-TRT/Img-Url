import { Module } from '@nestjs/common';
import { STORAGE } from './storage.port';
import { StorageService } from './storage.service';

@Module({
  providers: [{ provide: STORAGE, useClass: StorageService }],
  exports: [STORAGE],
})
export class StorageModule {}
