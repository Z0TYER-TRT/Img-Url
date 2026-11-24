import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_CONFIG, AppConfig } from '../config';
import { KeysModule } from '../keys/keys.module';
import { StorageModule } from '../storage/storage.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilesV1Controller } from './files-v1.controller';
import { FileDoc, FileSchema } from './files.schema';
import { PublicController } from './public.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FileDoc.name, schema: FileSchema }]),
    StorageModule,
    KeysModule,
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ limits: { fileSize: config.maxUploadBytes, files: 1 } }),
    }),
  ],
  controllers: [FilesController, FilesV1Controller, PublicController],
  providers: [FilesService],
})
export class FilesModule {}
