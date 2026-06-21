import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Requirements',
  description:
    'Learn about the requirements to qualify for GigWheels. Driver age, license, insurance, and documentation requirements.',
  alternates: {
    canonical: '/requirements',
  },
  openGraph: {
    title: 'Requirements | GigWheels',
    description:
      'Learn about the requirements to qualify for our weekly car-rental service.',
  },
};

export default function RequirementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
