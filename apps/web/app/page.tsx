import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export default async function Home() {
  const cookie = (await cookies()).toString();
  const me = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  }).catch(() => null);

  if (me?.ok) redirect('/admin');

  return (
    <main className="center">
      <div className="card">
        <div>
          <h1>imgurl</h1>
          <p className="muted">Sign in to manage your uploads.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
