import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'FX Weekly Lease Privacy Policy. Learn how we collect, use, and protect your personal information.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | FX Weekly Lease',
    description: 'Learn how we collect, use, and protect your personal information.',
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
