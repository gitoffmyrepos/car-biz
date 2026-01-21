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
  title: 'FX Weekly Lease | Premium Vehicle Leasing',
  description:
    'Experience luxury vehicles with flexible weekly payments. Professional fleet management for discerning customers.',
  keywords: ['vehicle leasing', 'weekly payments', 'luxury cars', 'fleet management'],
  authors: [{ name: 'FX Weekly Lease' }],
  openGraph: {
    title: 'FX Weekly Lease | Premium Vehicle Leasing',
    description:
      'Experience luxury vehicles with flexible weekly payments. Professional fleet management for discerning customers.',
    type: 'website',
    locale: 'en_US',
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
