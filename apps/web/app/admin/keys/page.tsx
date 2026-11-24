import type { Metadata } from 'next';
import Keys from '../keys';

export const metadata: Metadata = { title: 'API · imgurl' };

export default function KeysPage() {
  return (
    <>
      <header className="page-head">
        <h1>API</h1>
        <p>Keys your bots use to upload. Each key is shown once.</p>
      </header>

      <Keys />
    </>
  );
}
