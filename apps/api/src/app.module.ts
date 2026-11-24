import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { APP_CONFIG, AppConfig } from './config';
import { ConfigModule } from './config.module';
import { FilesModule } from './files/files.module';
import { HealthController } from './health.controller';
import { KeysModule } from './keys/keys.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ uri: config.mongoUri }),
    }),
    StorageModule,
    AuthModule,
    KeysModule,
    FilesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
