import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'imgurl',
  description: 'Self-hosted image and video host',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The theme is decided on the server from the cookie the toggle sets, so the
  // first paint is already correct. No inline script, nothing to flash.
  const choice = (await cookies()).get('theme')?.value;
  const theme = choice === 'dark' || choice === 'light' ? choice : undefined;

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
