/**
 * Public fleet API client.
 *
 * Single source of truth for the public-facing fleet inventory contract.
 * Reuses the same backend base URL convention as the rest of the app
 * (NEXT_PUBLIC_API_BASE_URL -> ".../api"). On the server (RSC), an internal
 * base (API_BASE_URL) is preferred so fetches can hit the backend service
 * directly without going through the browser-facing host.
 *
 * Backend contract (backend/app/api/public.py):
 *   GET /api/public/fleet?body_type=&min_rate=&max_rate=&sort=
 *   GET /api/public/fleet/{id}
 */

import { serverApiBaseUrl } from '@/lib/api';

export interface FleetImage {
  id: number;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface FleetVehicleSummary {
  id: number;
  year: number;
  make: string;
  model: string;
  body_type: string | null;
  transmission: string | null;
  mileage: number | null;
  /** Decimal serialized by Pydantic — treat as string, parse where needed. */
  weekly_rate: string | number;
  security_deposit: string | number | null;
  status: string;
  primary_image_url: string | null;
}

export interface FleetVehicleDetail extends FleetVehicleSummary {
  color: string | null;
  engine: string | null;
  condition: string;
  images: FleetImage[];
}

export type FleetSort = 'price_asc' | 'price_desc' | 'year_desc';

export interface FleetFilters {
  body_type?: string;
  min_rate?: number;
  max_rate?: number;
  sort?: FleetSort;
}

/**
 * Resolve the API base. Trailing `/api` is expected on the env var to match
 * the rest of the codebase (see app/actions/*.ts). Server-side prefers the
 * non-public internal var when present.
 */
function apiBase(): string {
  return serverApiBaseUrl();
}

function buildFleetQuery(filters: FleetFilters): string {
  const params = new URLSearchParams();
  if (filters.body_type) params.set('body_type', filters.body_type);
  if (typeof filters.min_rate === 'number') params.set('min_rate', String(filters.min_rate));
  if (typeof filters.max_rate === 'number') params.set('max_rate', String(filters.max_rate));
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch the public fleet list. Never throws — returns [] on any failure so the
 * grid degrades to an empty state instead of crashing the route.
 */
export async function fetchFleet(
  filters: FleetFilters = {},
  init?: RequestInit,
): Promise<FleetVehicleSummary[]> {
  try {
    const res = await fetch(`${apiBase()}/public/fleet${buildFleetQuery(filters)}`, {
      next: { revalidate: 60 },
      ...init,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as FleetVehicleSummary[]) : [];
  } catch {
    return [];
  }
}

/**
 * Fetch one vehicle's public detail. Returns null on any failure / not-found.
 */
export async function fetchVehicle(
  id: number | string,
  init?: RequestInit,
): Promise<FleetVehicleDetail | null> {
  try {
    const res = await fetch(`${apiBase()}/public/fleet/${id}`, {
      next: { revalidate: 60 },
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json()) as FleetVehicleDetail;
  } catch {
    return null;
  }
}

/** Format a Decimal-ish rate as "$X/week" (no cents when whole). */
export function formatWeeklyRate(rate: string | number): string {
  const n = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (!isFinite(n)) return '—';
  const formatted = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2);
  return `$${formatted}/week`;
}

/** Format a Decimal-ish money value as "$X". */
export function formatMoney(value: string | number | null): string | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return null;
  const formatted = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2);
  return `$${formatted}`;
}

export function vehicleTitle(v: { year: number; make: string; model: string }): string {
  return `${v.year} ${v.make} ${v.model}`;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  leased: 'Currently Leased',
  maintenance: 'In Maintenance',
  unavailable: 'Unavailable',
  pending_inspection: 'Pending Inspection',
};

export function statusLabel(status: string): string {
  return (
    STATUS_LABELS[status] ||
    status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/** Is this vehicle bookable right now? */
export function isAvailable(status: string): boolean {
  return status === 'available';
}
