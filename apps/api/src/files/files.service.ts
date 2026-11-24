import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { APP_CONFIG, AppConfig } from '../config';
import {
  STORAGE,
  StorageAccountGoneError,
  StoragePort,
} from '../storage/storage.port';
import { FileDoc } from './files.schema';
import { newId } from './ids';
import { extFor, kindOf, sniffMime } from './mime';

export interface UploadedFileLike {
  buffer: Buffer;
  originalname: string;
  size: number;
}

const MONTHS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
];

function monthFolder(date = new Date()): string {
  return `${date.getFullYear()}-${MONTHS[date.getMonth()]}`;
}

function missingObject(error: unknown): boolean {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate?.name === 'NoSuchKey' || candidate?.$metadata?.httpStatusCode === 404;
}

function encodeCursor(doc: FileDoc): string {
  return Buffer.from(JSON.stringify({ d: doc.createdAt.toISOString(), i: doc.id })).toString('base64url');
}

function decodeCursor(raw: string): { d: string; i: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed?.d !== 'string' || typeof parsed?.i !== 'string') return null;
    if (Number.isNaN(Date.parse(parsed.d))) return null;
    return parsed;
  } catch {
    return null;
  }
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(FileDoc.name) private readonly model: Model<FileDoc>,
    @Inject(STORAGE) private readonly storage: StoragePort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async createFromUpload(file?: UploadedFileLike) {
    if (!file?.buffer?.length) throw new BadRequestException('file field is required');
    if (file.buffer.length > this.config.maxUploadBytes) {
      throw new PayloadTooLargeException('File is larger than the configured limit');
    }

    const mime = sniffMime(file.buffer);
    const kind = kindOf(mime);
    if (!mime || !kind) throw new BadRequestException('Only images and videos are allowed');

    const id = newId();
    const key = `${monthFolder()}/${id}.${extFor(mime)}`;
    const order = await this.storageOrder();

    let lastError: unknown;
    for (const index of order) {
      try {
        await this.storage.put(index, file.buffer, key, mime);
      } catch (error) {
        lastError = error;
        continue;
      }
      try {
        const doc = await this.model.create({
          id,
          bucket: this.storage.bucketAt(index),
          key,
          originalName: file.originalname?.slice(0, 200) || id,
          mime,
          size: file.buffer.length,
          kind,
          views: 0,
        });
        return this.toDto(doc);
      } catch (error) {
        await this.storage.remove(this.storage.bucketAt(index), key).catch(() => undefined);
        throw error;
      }
    }

    throw new ServiceUnavailableException(
      `All ${this.storage.count} storage account(s) failed: ${(lastError as Error)?.message ?? 'unknown error'}`,
    );
  }

  async list(cursor?: string, limit = 24) {
    const take = Math.min(Math.max(Number(limit) || 24, 1), 100);
    const filter: Record<string, unknown> = {};
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        filter.$or = [
          { createdAt: { $lt: new Date(parsed.d) } },
          { createdAt: new Date(parsed.d), id: { $lt: parsed.i } },
        ];
      }
    }

    const docs = await this.model
      .find(filter)
      .sort({ createdAt: -1, id: -1 })
      .limit(take + 1);

    const page = docs.slice(0, take);
    return {
      items: page.map((doc) => this.toDto(doc)),
      next: docs.length > take ? encodeCursor(page[page.length - 1]) : undefined,
      // Only the first page needs the count; later pages would pay for an extra query.
      total: cursor ? undefined : await this.model.countDocuments(),
    };
  }

  async urlFor(id: string): Promise<string> {
    const doc = await this.model.findOne({ id });
    if (!doc) throw new NotFoundException();
    await this.model.updateOne({ id }, { $inc: { views: 1 } }).catch(() => undefined);
    try {
      return await this.storage.presign(doc.bucket, doc.key);
    } catch (error) {
      if (error instanceof StorageAccountGoneError) throw new NotFoundException();
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    // Row first: a storage failure then leaves an invisible orphan object,
    // never a link that redirects to something already deleted.
    const doc = await this.model.findOneAndDelete({ id });
    if (!doc) throw new NotFoundException();
    try {
      await this.storage.remove(doc.bucket, doc.key);
    } catch (error) {
      if (!missingObject(error) && !(error instanceof StorageAccountGoneError)) {
        this.logger.warn(`Object ${doc.bucket}/${doc.key} was not deleted: ${(error as Error)?.message}`);
      }
    }
  }

  private async storageOrder(): Promise<number[]> {
    const groups = await this.model.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$bucket', n: { $sum: 1 } } },
    ]);
    const counts = new Map(groups.map((group) => [group._id, group.n]));
    return Array.from({ length: this.storage.count }, (_, index) => index).sort(
      (a, b) =>
        (counts.get(this.storage.bucketAt(a)) ?? 0) - (counts.get(this.storage.bucketAt(b)) ?? 0),
    );
  }

  private toDto(doc: FileDoc) {
    return {
      id: doc.id,
      url: `${this.config.publicOrigin}/f/${doc.id}`,
      kind: doc.kind,
      mime: doc.mime,
      size: doc.size,
      name: doc.originalName,
      views: doc.views,
      createdAt: doc.createdAt,
    };
  }
}
