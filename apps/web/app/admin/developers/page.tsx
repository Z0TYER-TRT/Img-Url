import { headers } from 'next/headers';
import type { Metadata } from 'next';
import ApiDocs from '../api-docs';

export const metadata: Metadata = { title: 'Developers · imgurl' };

export default async function DevelopersPage() {
  // The origin the person is actually on, so the snippets are copy-paste ready.
  const incoming = await headers();
  const host = incoming.get('x-forwarded-host') ?? incoming.get('host') ?? '';
  const proto =
    incoming.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : (process.env.PUBLIC_ORIGIN ?? '');

  return (
    <>
      <header className="page-head">
        <h1>Developers</h1>
        <p>One endpoint. Send the file, get the link back.</p>
      </header>

      <ApiDocs origin={origin} />
    </>
  );
}
