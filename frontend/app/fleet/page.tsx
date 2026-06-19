/**
 * Public fleet grid — server component. Fetches the live fleet from the public
 * API with filters/sort taken from the URL query string, renders editorial
 * cards, and degrades to a graceful empty state on failure or empty fleet.
 */
import { Suspense } from 'react';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { FleetFilters } from '@/components/site/FleetFilters';
import { FleetCard } from '@/components/site/FleetCard';
import { GoldEyebrow, GhostCta } from '@/components/site/primitives';
import { fetchFleet, type FleetFilters as Filters, type FleetSort } from '@/lib/fleet';

export const dynamic = 'force-dynamic';

interface SearchParams {
  body_type?: string;
  min_rate?: string;
  max_rate?: string;
  sort?: string;
}

function parseFilters(sp: SearchParams): Filters {
  const validSorts: FleetSort[] = ['price_asc', 'price_desc', 'year_desc'];
  const min = sp.min_rate ? Number(sp.min_rate) : undefined;
  const max = sp.max_rate ? Number(sp.max_rate) : undefined;
  return {
    body_type: sp.body_type || undefined,
    min_rate: Number.isFinite(min) ? min : undefined,
    max_rate: Number.isFinite(max) ? max : undefined,
    sort: validSorts.includes(sp.sort as FleetSort) ? (sp.sort as FleetSort) : undefined,
  };
}

export default async function FleetPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(searchParams);
  const cars = await fetchFleet(filters);
  const hasFilters = Boolean(filters.body_type || filters.min_rate || filters.max_rate || filters.sort);

  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main" className="pt-16">
        {/* Header */}
        <section className="ed-section pb-10">
          <div className="ed-container">
            <GoldEyebrow index="03" label="The fleet" />
            <h1 className="ed-h1 mt-5 mb-4">Browse the fleet.</h1>
            <p className="ed-muted max-w-xl">
              Every car shows its real weekly rate and specs. Filter by body type and price, then apply to the one you want.
            </p>
          </div>
        </section>

        {/* Filter bar */}
        <section className="border-y ed-hairline sticky top-16 z-30" style={{ background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="ed-container py-4 flex items-center justify-between gap-4 flex-wrap">
            <Suspense fallback={<div className="ed-muted text-sm">Loading filters…</div>}>
              <FleetFilters />
            </Suspense>
            <span className="ed-muted text-sm">{cars.length} {cars.length === 1 ? 'car' : 'cars'}</span>
          </div>
        </section>

        {/* Grid */}
        <section className="ed-section">
          <div className="ed-container">
            {cars.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cars.map((car) => (
                  <FleetCard key={car.id} car={car} />
                ))}
              </div>
            ) : (
              <div className="border ed-hairline p-12 text-center">
                <GoldEyebrow label="Fleet updating" />
                <h2 className="font-display text-2xl font-medium mt-4 mb-3">
                  {hasFilters ? 'No cars match those filters' : 'Our fleet is updating'}
                </h2>
                <p className="ed-muted max-w-md mx-auto mb-6 text-sm">
                  {hasFilters
                    ? 'Try widening your price range or clearing a filter.'
                    : 'New vehicles are being added. Get in touch and we will match you to the next available car.'}
                </p>
                <div className="flex justify-center gap-4">
                  {hasFilters ? (
                    <GhostCta href="/fleet">Clear filters</GhostCta>
                  ) : (
                    <GhostCta href="/contact">Contact us</GhostCta>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
