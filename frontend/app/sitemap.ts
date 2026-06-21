import type { MetadataRoute } from 'next';
import { fetchFleet } from '@/lib/fleet';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gigwheels.com';

const STATIC_PATHS = ['', '/fleet', '/how-it-works', '/requirements', '/faq', '/contact', '/terms', '/privacy', '/gps-disclosure'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/fleet' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/fleet' ? 0.9 : 0.6,
  }));

  // Every public fleet car. fetchFleet never throws — empty on failure.
  const cars = await fetchFleet({}, { next: { revalidate: 3600 } });
  const carEntries: MetadataRoute.Sitemap = cars.map((car) => ({
    url: `${SITE_URL}/fleet/${car.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...carEntries];
}
