import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with GigWheels. Submit an inquiry, ask questions, or start your weekly vehicle lease application today.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Us | GigWheels',
    description:
      'Get in touch with us. Submit an inquiry or start your weekly vehicle lease application.',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
