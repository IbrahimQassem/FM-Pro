import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_ORIGIN ?? 'https://hudhud-fm-admin.sites.openai.com',
  ),
  title: 'إدارة هدهد FM',
  description: 'لوحة إدارة محتوى وتشغيل تطبيق هدهد FM.',
  openGraph: {
    title: 'إدارة هدهد FM',
    description: 'لوحة إدارة محتوى وتشغيل تطبيق هدهد FM.',
    images: ['/og.png'],
    locale: 'ar_YE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'إدارة هدهد FM',
    description: 'لوحة إدارة محتوى وتشغيل تطبيق هدهد FM.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
