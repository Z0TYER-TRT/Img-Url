import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false, collection: 'api_keys' })
export class ApiKeyDoc {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  prefix: string;

  @Prop({ required: true, unique: true })
  hash: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop()
  lastUsedAt?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKeyDoc);
