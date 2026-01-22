import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fxweekly.com'),
  title: {
    default: 'FX Weekly Lease | Premium Vehicle Leasing',
    template: '%s | FX Weekly Lease',
  },
  description:
    'Experience luxury vehicles with flexible weekly payments. Professional fleet management for discerning customers.',
  keywords: ['vehicle leasing', 'weekly payments', 'luxury cars', 'fleet management'],
  authors: [{ name: 'FX Weekly Lease' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FX Weekly Lease | Premium Vehicle Leasing',
    description:
      'Experience luxury vehicles with flexible weekly payments. Professional fleet management for discerning customers.',
    type: 'website',
    locale: 'en_US',
    siteName: 'FX Weekly Lease',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FX Weekly Lease | Premium Vehicle Leasing',
    description:
      'Experience luxury vehicles with flexible weekly payments. Professional fleet management for discerning customers.',
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased bg-luxury-pearl text-luxury-charcoal min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
