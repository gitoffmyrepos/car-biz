import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Requirements',
  description:
    'Learn about the requirements to qualify for FX Weekly Lease. Driver age, license, insurance, and documentation requirements.',
  alternates: {
    canonical: '/requirements',
  },
  openGraph: {
    title: 'Requirements | FX Weekly Lease',
    description:
      'Learn about the requirements to qualify for our weekly vehicle leasing service.',
  },
};

export default function RequirementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
