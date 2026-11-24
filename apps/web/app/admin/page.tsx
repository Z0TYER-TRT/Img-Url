import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Panel from './panel';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export default async function AdminPage() {
  const cookie = (await cookies()).toString();
  const me = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  }).catch(() => null);

  if (!me?.ok) redirect('/');

  // The origin the person is actually on, so the snippet is copy-paste ready.
  const incoming = await headers();
  const host = incoming.get('x-forwarded-host') ?? incoming.get('host') ?? '';
  const proto = incoming.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : (process.env.PUBLIC_ORIGIN ?? '');

  const { email } = (await me.json()) as { email: string };
  return <Panel email={email} apiOrigin={origin} />;
}
