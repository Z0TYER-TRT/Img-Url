'use client';

import { useRef, useState, type DragEvent } from 'react';
import { absoluteUrl, copyText, errorText, formatBytes } from '@/lib/api';

type Result = {
  id: string;
  url: string;
  kind: 'image' | 'video';
  mime: string;
  size: number;
  name: string;
};

export default function Uploader() {
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // The API decides what is acceptable; pre-checking here would duplicate
  // MAX_UPLOAD_MB and reject valid files the OS reports without a mime type.
  async function run(files: File[]) {
    for (const file of files) {
      setError('');
      setProgress(0);
      try {
        const result = await send(file);
        setResults((prev) => [result, ...prev].slice(0, 5));
        setMessage(`Uploaded ${result.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setProgress(null);
      }
    }
  }

  function send(file: File) {
    return new Promise<Result>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files');
      xhr.responseType = 'json';
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 201) resolve(xhr.response as Result);
        else reject(new Error(errorText(xhr.response, `Upload failed (${xhr.status}).`)));
      };
      xhr.onerror = () => reject(new Error('Network error during upload.'));
      const body = new FormData();
      body.append('file', file);
      xhr.send(body);
    });
  }

  function take(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (list.length) void run(list);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files);
  }

  async function copy(url: string) {
    setMessage((await copyText(absoluteUrl(url))) ? 'Link copied.' : '');
    setError('');
  }

  return (
    <section className="card">
      <h2>Upload</h2>

      <div
        className={over ? 'drop over' : 'drop'}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={onDrop}
      >
        <p className="muted">Drop images or videos here, or</p>
        <button className="btn" type="button" onClick={() => picker.current?.click()}>
          Choose files
        </button>
        <label className="sr-only" htmlFor="upload-input">
          Upload images or videos
        </label>
        <input
          id="upload-input"
          ref={picker}
          className="sr-only"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(event) => {
            take(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {progress !== null && (
        <div className="row">
          <div
            className="progress grow"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div style={{ width: `${progress}%` }} />
          </div>
          <span className="muted">{progress}%</span>
        </div>
      )}

      <p className="status" aria-live="polite">
        {error ? <span className="error">{error}</span> : message}
      </p>

      {results.length > 0 && (
        <div className="list">
          {results.map((result) => (
            <div className="row" key={result.id}>
              {result.kind === 'image' ? (
                <img className="thumb" src={result.url} alt="" />
              ) : (
                <video className="thumb" src={result.url} controls preload="metadata" />
              )}
              <div className="grow">
                <div className="url-row">
                  <label className="sr-only" htmlFor={`url-${result.id}`}>
                    File URL
                  </label>
                  <input
                    id={`url-${result.id}`}
                    readOnly
                    value={absoluteUrl(result.url)}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button className="btn" type="button" onClick={() => void copy(result.url)}>
                    Copy
                  </button>
                </div>
                <div className="meta">
                  <span className="name">{result.name}</span>
                  <span>{formatBytes(result.size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
