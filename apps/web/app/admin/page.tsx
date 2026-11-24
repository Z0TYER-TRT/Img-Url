import { cookies } from 'next/headers';
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

  const { email } = (await me.json()) as { email: string };
  return <Panel email={email} />;
}
