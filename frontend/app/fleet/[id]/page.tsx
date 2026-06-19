/**
 * Car detail page — server component. Fetches one vehicle from the public API,
 * renders the gallery + full specs + price/deposit, links the "Apply to Rent"
 * CTA to the existing /vehicle-request flow, and emits dynamic SEO metadata
 * plus Product/Vehicle + Offer JSON-LD.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Gallery } from '@/components/site/Gallery';
import { GoldEyebrow, PrimaryCta, GhostCta } from '@/components/site/primitives';
import {
  fetchVehicle,
  formatWeeklyRate,
  formatMoney,
  vehicleTitle,
  statusLabel,
  isAvailable,
} from '@/lib/fleet';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fxweekly.com';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const car = await fetchVehicle(params.id);
  if (!car) {
    return { title: 'Vehicle not found' };
  }
  const title = vehicleTitle(car);
  const desc = `Lease the ${title} for ${formatWeeklyRate(car.weekly_rate)}. ${[
    car.body_type,
    car.transmission,
    car.mileage ? `${car.mileage.toLocaleString()} miles` : null,
  ]
    .filter(Boolean)
    .join(' · ')}. Apply online, fast approval, no credit check.`;
  const image = car.primary_image_url || undefined;

  return {
    title,
    description: desc,
    alternates: { canonical: `/fleet/${car.id}` },
    openGraph: {
      title: `${title} | FX Weekly Lease`,
      description: desc,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | FX Weekly Lease`,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const car = await fetchVehicle(params.id);
  if (!car) notFound();

  const title = vehicleTitle(car);
  const weekly = formatWeeklyRate(car.weekly_rate);
  const deposit = formatMoney(car.security_deposit);

  const specs: { label: string; value: string | null }[] = [
    { label: 'Year', value: String(car.year) },
    { label: 'Make', value: car.make },
    { label: 'Model', value: car.model },
    { label: 'Body type', value: car.body_type },
    { label: 'Transmission', value: car.transmission },
    { label: 'Mileage', value: car.mileage ? `${car.mileage.toLocaleString()} mi` : null },
    { label: 'Color', value: car.color },
    { label: 'Engine', value: car.engine },
    { label: 'Condition', value: car.condition?.replace(/_/g, ' ') ?? null },
  ];

  const rateNumber =
    typeof car.weekly_rate === 'string' ? parseFloat(car.weekly_rate) : car.weekly_rate;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: `${title} available for weekly lease at FX Weekly Lease.`,
    image: car.primary_image_url ? [car.primary_image_url] : undefined,
    brand: { '@type': 'Brand', name: car.make },
    category: car.body_type || 'Vehicle',
    additionalType: 'https://schema.org/Vehicle',
    vehicleConfiguration: car.body_type || undefined,
    vehicleTransmission: car.transmission || undefined,
    mileageFromOdometer: car.mileage
      ? { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'SMI' }
      : undefined,
    color: car.color || undefined,
    modelDate: String(car.year),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/fleet/${car.id}`,
      priceCurrency: 'USD',
      price: Number.isFinite(rateNumber) ? rateNumber : undefined,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: Number.isFinite(rateNumber) ? rateNumber : undefined,
        priceCurrency: 'USD',
        unitText: 'WEEK',
      },
      availability: isAvailable(car.status)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main id="main" className="pt-16">
        <div className="ed-container py-10">
          <Link href="/fleet" className="ed-navlink text-gold-light hover:text-white text-sm">
            &larr; Back to fleet
          </Link>
        </div>

        <div className="ed-container pb-24 grid lg:grid-cols-[0.62fr_0.38fr] gap-10">
          {/* Gallery */}
          <div>
            <Gallery images={car.images || []} alt={title} />
          </div>

          {/* Details */}
          <div>
            <GoldEyebrow
              label={isAvailable(car.status) ? 'Available now' : statusLabel(car.status)}
            />
            <h1 className="ed-h2 mt-4 mb-6">{title}</h1>

            <div className="border-y ed-hairline py-5 mb-6">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold text-gold-light">{weekly}</span>
              </div>
              {deposit && (
                <p className="ed-muted text-sm mt-2">{deposit} refundable security deposit</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <PrimaryCta href="/vehicle-request">Apply to Rent</PrimaryCta>
              <GhostCta href="/requirements">Requirements</GhostCta>
            </div>

            <p className="ed-muted text-xs leading-relaxed mb-8">
              Gig-eligible — approved for DoorDash, Uber, Lyft and delivery work. Apply online with no credit check; most drivers are approved within 24 hours.
            </p>

            {/* Specs */}
            <h2 className="ed-eyebrow mb-3">Specifications</h2>
            <dl className="border-t ed-hairline">
              {specs
                .filter((s) => s.value)
                .map((s) => (
                  <div key={s.label} className="flex justify-between py-3 border-b ed-hairline text-sm">
                    <dt className="ed-muted">{s.label}</dt>
                    <dd className="capitalize">{s.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
