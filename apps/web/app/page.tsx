import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';
import LoginPaths from './login-paths';
import ThemeToggle from './theme-toggle';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export default async function Home() {
  const cookie = (await cookies()).toString();
  const me = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  }).catch(() => null);

  if (me?.ok) redirect('/admin');

  return (
    <div className="login">
      <aside className="login-aside">
        <LoginPaths position={1} />
        <LoginPaths position={-1} />

        <span className="wordmark">imgurl</span>

        <figure className="login-say">
          <blockquote>
            Drop a file.
            <br />
            Take the link.
          </blockquote>
          <figcaption>one admin · your own bucket</figcaption>
        </figure>
      </aside>

      <div className="login-main">
        <div className="login-top">
          <span className="wordmark login-brand">imgurl</span>
          <ThemeToggle />
        </div>

        <div className="login-panel">
          <div className="login-head">
            <h1>Sign in</h1>
            <p className="login-sub">Your files, your bucket.</p>
          </div>

          <LoginForm />

          <p className="login-caption">self-hosted · b2 + mongodb</p>
        </div>
      </div>
    </div>
  );
}
