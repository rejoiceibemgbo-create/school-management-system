import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HAPPY HOME EDUCATIONAL CENTRE - School Result Management System',
  description: 'Complete, professional School Result Management System with automated grading, conduct assessments, broadsheets, and A4 printable report cards.',
  icons: {
    icon: [
      { url: '/logo.jpeg?v=2', type: 'image/jpeg' },
      { url: '/favicon.ico?v=2' },
    ],
    shortcut: '/logo.jpeg?v=2',
    apple: '/logo.jpeg?v=2',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/logo.jpeg?v=2" type="image/jpeg" />
        <link rel="shortcut icon" href="/logo.jpeg?v=2" />
        <link rel="apple-touch-icon" href="/logo.jpeg?v=2" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
