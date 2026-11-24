'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { absoluteUrl, copyText, errorText, formatBytes } from '@/lib/api';
import { popIn, pulse } from '@/lib/motion';

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
  const list = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

  useEffect(() => {
    if (results.length > seen.current) popIn(list.current?.querySelector('.result'));
    seen.current = results.length;
  }, [results.length]);

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
        window.dispatchEvent(new Event('imgurl:changed'));
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

  async function copy(result: Result) {
    const copied = await copyText(absoluteUrl(result.url));
    setMessage(copied ? 'Link copied.' : '');
    setError('');
    if (copied) pulse(document.getElementById(`url-${result.id}`)?.closest('.result'));
  }

  return (
    <div>
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
          <strong>Drop files here</strong>
          <p>Images and video, one at a time or several.</p>
          <button className="btn btn-mark" type="button" onClick={() => picker.current?.click()}>
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
          <div className="link-row" style={{ marginTop: 12 }}>
            <div
              className="progress"
              style={{ flex: 1, marginTop: 0 }}
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div style={{ width: `${progress}%` }} />
            </div>
            <span className="muted" style={{ fontSize: 12.5 }}>{progress}%</span>
          </div>
        )}

        <p className="status" aria-live="polite">
          {error ? <span className="error">{error}</span> : message}
        </p>

        <div ref={list}>
          {results.map((result) => (
            <div className="result" key={result.id}>
            <div className="frame">
              {result.kind === 'image' ? (
                <img src={result.url} alt="" />
              ) : (
                <video src={result.url} controls preload="metadata" />
              )}
            </div>

            <div>
              <div className="link-row">
                <label className="sr-only" htmlFor={`url-${result.id}`}>
                  File URL
                </label>
                <input
                  id={`url-${result.id}`}
                  readOnly
                  value={absoluteUrl(result.url)}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button className="btn" type="button" onClick={() => void copy(result)}>
                  Copy
                </button>
              </div>
              <p className="link-meta">
                <span>{result.name}</span>
                <span>{formatBytes(result.size)}</span>
              </p>
            </div>
          </div>
          ))}
        </div>
      </div>
  );
}
