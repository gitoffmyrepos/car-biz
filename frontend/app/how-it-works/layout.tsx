import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Learn how our weekly vehicle leasing process works. Simple 4-step process from application to driving away in your premium vehicle.',
  alternates: {
    canonical: '/how-it-works',
  },
  openGraph: {
    title: 'How It Works | FX Weekly Lease',
    description:
      'Learn how our weekly vehicle leasing process works. Simple 4-step process from application to driving away.',
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
