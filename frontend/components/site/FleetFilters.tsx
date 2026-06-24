'use client';

/**
 * Fleet filter + sort bar. Pushes state into the URL query string so the RSC
 * grid re-fetches with the matching API params (body_type, min_rate, max_rate,
 * sort). No client-side data fetching — the server owns the data.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const BODY_TYPES = ['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'van'];
const SORTS: { value: string; label: string }[] = [
  { value: '', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'year_desc', label: 'Newest' },
];
const PRICE_BANDS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: '', label: 'Any price' },
  { value: '0-350', label: 'Under $350', max: 350 },
  { value: '350-450', label: '$350 – $450', min: 350, max: 450 },
  { value: '450-', label: '$450+', min: 450 },
];

export function FleetFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (next: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([k, v]) => {
        if (v) sp.set(k, v);
        else sp.delete(k);
      });
      router.push(`/fleet${sp.toString() ? `?${sp.toString()}` : ''}`, { scroll: false });
    },
    [params, router],
  );

  const currentBand = (() => {
    const min = params.get('min_rate');
    const max = params.get('max_rate');
    if (!min && !max) return '';
    return `${min || '0'}-${max || ''}`;
  })();

  const selectClass =
    'bg-ink-card border ed-hairline text-sm px-3 py-2 text-white focus:outline-none focus:border-gold appearance-none';

  return (
    <div className="flex flex-wrap items-center gap-3" style={{ color: 'var(--ed-text)' }}>
      <label className="sr-only" htmlFor="filter-body">Body type</label>
      <select
        id="filter-body"
        className={selectClass}
        value={params.get('body_type') || ''}
        onChange={(e) => update({ body_type: e.target.value })}
      >
        <option value="">All body types</option>
        {BODY_TYPES.map((b) => (
          <option key={b} value={b} className="capitalize">
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-price">Price</label>
      <select
        id="filter-price"
        className={selectClass}
        value={currentBand}
        onChange={(e) => {
          const band = PRICE_BANDS.find((p) => p.value === e.target.value);
          update({
            min_rate: band?.min !== undefined ? String(band.min) : '',
            max_rate: band?.max !== undefined ? String(band.max) : '',
          });
        }}
      >
        {PRICE_BANDS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-sort">Sort</label>
      <select
        id="filter-sort"
        className={selectClass}
        value={params.get('sort') || ''}
        onChange={(e) => update({ sort: e.target.value })}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
