import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Inter } from 'next/font/google';
import Header from '@/components/common/Header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FactGuard',
  description: 'Track, verify, and debunk false claims in real-time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${inter.variable} antialiased`}
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
