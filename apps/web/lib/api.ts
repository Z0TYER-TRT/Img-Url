// Browser-side helpers. Every call is same-origin so the sid cookie rides along.

export type FileItem = {
  id: string;
  url: string;
  kind: 'image' | 'video';
  mime: string;
  size: number;
  name: string;
  views: number;
  createdAt: string;
};

export type KeyItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function errorText(body: unknown, fallback: string) {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' ? message : fallback;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorText(body, `Request failed (${res.status})`));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listFiles(cursor?: string) {
  const query = `limit=24${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  return request<{ items: FileItem[]; next?: string }>(`/api/files?${query}`);
}

export function deleteFile(id: string) {
  return request<void>(`/api/files/${id}`, { method: 'DELETE' });
}

export function listKeys() {
  return request<{ items: KeyItem[] }>('/api/keys');
}

export function createKey(name: string) {
  return request<{ id: string; name: string; key: string }>('/api/keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function deleteKey(id: string) {
  return request<void>(`/api/keys/${id}`, { method: 'DELETE' });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function absoluteUrl(url: string) {
  return new URL(url, window.location.origin).href;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
