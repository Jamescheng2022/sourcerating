import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SourceRating — Project Room (Bangkok Prefab Office)',
  description: 'AI-native infrastructure for complex external collaboration and canonical project state.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}