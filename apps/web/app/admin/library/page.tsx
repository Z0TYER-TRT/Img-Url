import type { Metadata } from 'next';
import FileList from '../file-list';

export const metadata: Metadata = { title: 'Library · imgurl' };

export default function LibraryPage() {
  return (
    <>
      <header className="page-head">
        <h1>Library</h1>
        <p>Everything you have uploaded, newest first.</p>
      </header>

      <FileList />
    </>
  );
}
