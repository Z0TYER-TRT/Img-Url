import { filetypeinfo } from 'magic-bytes.js';

export type Kind = 'image' | 'video';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/mpeg': 'mpeg',
};

/** Returns the mime implied by the bytes, ignoring whatever the client claimed. */
export function sniffMime(buffer: Buffer): string | null {
  const [detected] = filetypeinfo(buffer);
  return detected?.mime ?? null;
}

export function kindOf(mime: string | null): Kind | null {
  // Only types we can name, serve with the right Content-Type and render.
  // That also drops image/svg+xml, which can carry script.
  if (!mime || !EXTENSIONS[mime]) return null;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

export function extFor(mime: string): string {
  return EXTENSIONS[mime] ?? 'bin';
}
