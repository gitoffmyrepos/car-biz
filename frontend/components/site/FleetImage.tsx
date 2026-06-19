'use client';

/**
 * Fleet image with next/image, blur placeholder, and graceful fallback to a
 * gold car-silhouette panel when the URL is missing or fails to load.
 */
import Image from 'next/image';
import { useState } from 'react';

// Inline 1x1 near-black blur placeholder (no Buffer — safe in client bundle).
const BLUR =
  'data:image/gif;base64,R0lGODlhAQABAIAAABERAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

function Silhouette() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink-card">
      <svg className="w-20 h-20" viewBox="0 0 24 24" fill="rgba(184,150,62,0.35)" aria-hidden="true">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
      </svg>
    </div>
  );
}

interface FleetImageProps {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
}

export function FleetImage({ src, alt, sizes, priority }: FleetImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <Silhouette />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes || '100vw'}
      priority={priority}
      placeholder="blur"
      blurDataURL={BLUR}
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setFailed(true)}
    />
  );
}
