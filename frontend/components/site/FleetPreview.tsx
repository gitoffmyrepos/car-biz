'use client';

/**
 * Landing-page fleet preview: fetches up to 6 real cars from the public API and
 * renders editorial cards. Degrades to a quiet "fleet updating" line on failure
 * or empty fleet — never a crash.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import {
  type FleetVehicleSummary,
  formatWeeklyRate,
  vehicleTitle,
  statusLabel,
  isAvailable,
} from '@/lib/fleet';
import { FleetImage } from './FleetImage';

export function FleetPreview() {
  const [cars, setCars] = useState<FleetVehicleSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/public/fleet?sort=year_desc'))
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (active) setCars(Array.isArray(data) ? (data as FleetVehicleSummary[]).slice(0, 6) : []);
      })
      .catch(() => {
        if (active) setCars([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (cars !== null && cars.length === 0) {
    return (
      <p className="ed-muted text-sm">
        Our fleet is updating. <Link href="/contact" className="text-gold-light underline">Get in touch</Link> and we&apos;ll match you to the next available car.
      </p>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px ed-hairline border ed-hairline">
      {(cars ?? Array.from({ length: 3 })).map((car, i) =>
        car ? (
          <Link
            key={(car as FleetVehicleSummary).id}
            href={`/fleet/${(car as FleetVehicleSummary).id}`}
            className="ed-card group block"
            style={{ border: 'none' }}
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-ink">
              <FleetImage
                src={(car as FleetVehicleSummary).primary_image_url}
                alt={vehicleTitle(car as FleetVehicleSummary)}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-display text-lg font-medium">{vehicleTitle(car as FleetVehicleSummary)}</h3>
                <span className="text-gold-light text-sm font-semibold whitespace-nowrap">
                  {formatWeeklyRate((car as FleetVehicleSummary).weekly_rate)}
                </span>
              </div>
              <span className="ed-eyebrow">
                {isAvailable((car as FleetVehicleSummary).status)
                  ? 'Available'
                  : statusLabel((car as FleetVehicleSummary).status)}
              </span>
            </div>
          </Link>
        ) : (
          <div key={i} className="aspect-[16/10] bg-ink-card animate-pulse" />
        ),
      )}
    </div>
  );
}
