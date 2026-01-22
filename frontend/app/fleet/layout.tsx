import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Fleet',
  description:
    'Browse our diverse collection of premium vehicles available for weekly lease. Luxury sedans, SUVs, sports cars, and more.',
  alternates: {
    canonical: '/fleet',
  },
  openGraph: {
    title: 'Our Fleet | FX Weekly Lease',
    description:
      'Browse our diverse collection of premium vehicles available for weekly lease.',
  },
};

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
