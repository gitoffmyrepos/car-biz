import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { CarBackgroundCarousel } from '@/components/ui/CarBackgroundCarousel';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fxweekly.com'),
  title: {
    default: 'FX Weekly Lease | Affordable Weekly Car Leasing',
    template: '%s | FX Weekly Lease',
  },
  description:
    'Get a car today, pay just $150/week. Perfect for DoorDash, Uber, and delivery drivers. No credit check needed. Quick approval in 24 hours.',
  keywords: ['car leasing', 'weekly payments', 'DoorDash car', 'Uber driver', 'delivery driver', 'affordable car rental', 'no credit check'],
  authors: [{ name: 'FX Weekly Lease' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FX Weekly Lease | Affordable Weekly Car Leasing',
    description:
      'Get a car today, pay just $150/week. Perfect for DoorDash, Uber, and delivery drivers. No credit check needed.',
    type: 'website',
    locale: 'en_US',
    siteName: 'FX Weekly Lease',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FX Weekly Lease | Affordable Weekly Car Leasing',
    description:
      'Get a car today, pay just $150/week. Perfect for gig workers and delivery drivers.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-glossy-black text-white min-h-screen relative" suppressHydrationWarning>
        <CarBackgroundCarousel />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
