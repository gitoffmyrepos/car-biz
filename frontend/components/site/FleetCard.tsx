/**
 * Fleet grid card. Server-component-safe (FleetImage + TiltSpotlightCard handle
 * their own client behavior). Sharp corners, hairline border, red hover, a
 * cursor-tracking red spotlight + subtle 3D tilt, and image zoom-on-hover.
 */
import Link from 'next/link';
import {
  type FleetVehicleSummary,
  formatWeeklyRate,
  vehicleTitle,
  statusLabel,
  isAvailable,
} from '@/lib/fleet';
import { FleetImage } from './FleetImage';
import { TiltSpotlightCard } from './fx/TiltSpotlightCard';

export function FleetCard({ car }: { car: FleetVehicleSummary }) {
  const chips = [car.body_type, car.transmission, car.mileage ? `${car.mileage.toLocaleString()} mi` : null].filter(
    Boolean,
  ) as string[];

  return (
    <TiltSpotlightCard className="ed-card group flex flex-col h-full">
      <Link href={`/fleet/${car.id}`} className="flex flex-col flex-1">
        <div className="relative aspect-[16/10] overflow-hidden bg-ink">
          <div className="fx-zoom-img absolute inset-0">
            <FleetImage
              src={car.primary_image_url}
              alt={vehicleTitle(car)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
          <span
            className="absolute top-3 left-3 z-[3] ed-eyebrow px-2 py-1"
            style={{
              background: 'rgba(13,13,13,0.85)',
              color: isAvailable(car.status) ? 'var(--ed-gold-light)' : 'var(--ed-muted)',
            }}
          >
            {isAvailable(car.status) ? 'Available' : statusLabel(car.status)}
          </span>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-display text-lg font-medium leading-snug">{vehicleTitle(car)}</h3>
            <span className="text-gold-light text-sm font-semibold whitespace-nowrap">
              {formatWeeklyRate(car.weekly_rate)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {chips.map((c) => (
              <span key={c} className="ed-chip capitalize">{c}</span>
            ))}
          </div>

          <span className="mt-auto inline-flex items-center gap-2 text-sm text-gold-light group-hover:text-white transition-colors">
            View details &rarr;
          </span>
        </div>
      </Link>
    </TiltSpotlightCard>
  );
}
