import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { CarBackgroundCarousel } from '@/components/ui/CarBackgroundCarousel';
import { SiteJsonLd } from '@/components/site/SiteJsonLd';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// Single self-served (Google subset) display family for editorial H1/H2.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fxweekly.com'),
  title: {
    default: 'GigWheels | Weekly Car Rentals for Gig Drivers',
    template: '%s | GigWheels',
  },
  description:
    'Get a car today, pay just $150/week. Perfect for DoorDash, Uber, and delivery drivers. No credit check needed. Quick approval in 24 hours.',
  keywords: ['car leasing', 'weekly payments', 'DoorDash car', 'Uber driver', 'delivery driver', 'affordable car rental', 'no credit check'],
  authors: [{ name: 'GigWheels' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'GigWheels | Weekly Car Rentals for Gig Drivers',
    description:
      'Get a car today, pay just $150/week. Perfect for DoorDash, Uber, and delivery drivers. No credit check needed.',
    type: 'website',
    locale: 'en_US',
    siteName: 'GigWheels',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GigWheels | Weekly Car Rentals for Gig Drivers',
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
    <html lang="en" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-glossy-black text-white min-h-screen relative" suppressHydrationWarning>
        <SiteJsonLd />
        <CarBackgroundCarousel />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
