/**
 * Site-wide CarRental JSON-LD (org / contact / areaServed / priceRange).
 * Rendered once in the root layout. Server component.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fxweekly.com';

export function SiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CarRental',
    name: 'GigWheels',
    url: SITE_URL,
    description:
      'Affordable weekly car leasing for gig and delivery drivers. Published weekly prices, real fleet inventory, fast approval, no credit check.',
    priceRange: '$$',
    areaServed: { '@type': 'Country', name: 'United States' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@fxweekly.com',
      telephone: '+1-555-123-4567',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
