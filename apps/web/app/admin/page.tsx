import type { Metadata } from 'next';
import Uploader from './uploader';

export const metadata: Metadata = { title: 'Upload · imgurl' };

export default function UploadPage() {
  return (
    <>
      <header className="page-head">
        <h1>Upload</h1>
        <p>Drop a file, take the link. Images and video, up to 50 MB.</p>
      </header>

      <Uploader />
    </>
  );
}
