import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about FX Weekly Lease. Learn about requirements, payments, insurance, and our vehicle policies.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'FAQ | FX Weekly Lease',
    description:
      'Frequently asked questions about our weekly vehicle leasing service.',
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
