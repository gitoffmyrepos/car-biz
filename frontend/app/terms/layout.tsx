import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'FX Weekly Lease Terms of Service. Read our terms and conditions for using our weekly vehicle leasing service.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | FX Weekly Lease',
    description: 'Terms and conditions for using our weekly vehicle leasing service.',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
