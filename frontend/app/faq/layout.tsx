import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about GigWheels. Learn about requirements, payments, insurance, and our vehicle policies.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'FAQ | GigWheels',
    description:
      'Frequently asked questions about our weekly car-rental service.',
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
