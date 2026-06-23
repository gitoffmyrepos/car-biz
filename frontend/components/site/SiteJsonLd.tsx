/**
 * Site-wide CarRental JSON-LD (org / contact / areaServed / priceRange).
 * Rendered once in the root layout. Server component.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gigwheels.com';

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
      email: 'apply@gigwheels.strategybase.io',
      telephone: '+1-346-587-1177',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
