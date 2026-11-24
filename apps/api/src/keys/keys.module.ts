import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeyGuard } from './api-key.guard';
import { KeysController } from './keys.controller';
import { ApiKeyDoc, ApiKeySchema } from './keys.schema';
import { KeysService } from './keys.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ApiKeyDoc.name, schema: ApiKeySchema }])],
  controllers: [KeysController],
  providers: [KeysService, ApiKeyGuard],
  exports: [KeysService, ApiKeyGuard],
})
export class KeysModule {}
