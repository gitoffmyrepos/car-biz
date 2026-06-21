import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'GigWheels Terms of Service. Read our terms and conditions for using our weekly car-rental service.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | GigWheels',
    description: 'Terms and conditions for using our weekly car-rental service.',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
