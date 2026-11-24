import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model } from 'mongoose';
import { newId } from '../files/ids';
import { ApiKeyDoc } from './keys.schema';

export function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class KeysService {
  constructor(@InjectModel(ApiKeyDoc.name) private readonly model: Model<ApiKeyDoc>) {}

  async create(name: string) {
    const raw = `ik_${randomBytes(24).toString('base64url')}`;
    const id = newId();
    await this.model.create({
      id,
      name: name.trim().slice(0, 60) || 'unnamed',
      prefix: raw.slice(0, 8),
      hash: hashKey(raw),
    });
    // The raw key is returned once and never stored.
    return { id, name: name.trim().slice(0, 60) || 'unnamed', key: raw };
  }

  async list() {
    const docs = await this.model.find().sort({ createdAt: -1 }).lean();
    return docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      prefix: doc.prefix,
      createdAt: doc.createdAt,
      lastUsedAt: doc.lastUsedAt ?? null,
    }));
  }

  async revoke(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ id });
    return (result.deletedCount ?? 0) > 0;
  }

  findByRaw(raw: string): Promise<ApiKeyDoc | null> {
    return this.model.findOne({ hash: hashKey(raw) });
  }

  async touch(id: string): Promise<void> {
    await this.model.updateOne({ id }, { $set: { lastUsedAt: new Date() } });
  }
}
