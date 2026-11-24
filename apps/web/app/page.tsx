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
      <header className="bar">
        <span className="wordmark">imgurl</span>
        <span className="spacer" />
        <ThemeToggle />
      </header>

      <main>
        <div className="panel">
          <h1>Sign in</h1>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
