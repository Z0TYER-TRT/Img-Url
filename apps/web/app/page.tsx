import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';
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
      <div className="login-frame">
        <div className="login-top">
          <span className="wordmark">imgurl</span>
          <ThemeToggle />
        </div>

        <h1>Sign in</h1>
        <p className="login-sub">Your files, your bucket.</p>

        <LoginForm />
      </div>

      <p className="login-caption">self-hosted · b2 + mongodb</p>
    </div>
  );
}
