import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false, collection: 'files' })
export class FileDoc {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mime: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, enum: ['image', 'video'] })
  kind: 'image' | 'video';

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(FileDoc);
FileSchema.index({ createdAt: -1, id: -1 });
