'use client';

/**
 * Keyboard + click image gallery for the car detail page. Falls back to a
 * single silhouette when no images exist.
 */
import { useCallback, useEffect, useState } from 'react';
import { type FleetImage as FleetImageType } from '@/lib/fleet';
import { FleetImage } from './FleetImage';

export function Gallery({ images, alt }: { images: FleetImageType[]; alt: string }) {
  const ordered = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const [active, setActive] = useState(0);

  const go = useCallback(
    (dir: number) => {
      setActive((i) => {
        const n = ordered.length;
        if (n === 0) return 0;
        return (i + dir + n) % n;
      });
    },
    [ordered.length],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    },
    [go],
  );

  useEffect(() => {
    if (active >= ordered.length) setActive(0);
  }, [active, ordered.length]);

  const current = ordered[active];

  return (
    <div className="group" tabIndex={0} onKeyDown={onKey} aria-label={`${alt} image gallery`}>
      <div className="relative aspect-[16/10] bg-ink border ed-hairline overflow-hidden">
        <FleetImage src={current?.url} alt={`${alt} — photo ${active + 1}`} sizes="(max-width: 1024px) 100vw, 60vw" priority />
        {ordered.length > 1 && (
          <>
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 text-white w-10 h-10 flex items-center justify-center hover:bg-black"
              aria-label="Previous image"
              onClick={() => go(-1)}
            >
              &larr;
            </button>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 text-white w-10 h-10 flex items-center justify-center hover:bg-black"
              aria-label="Next image"
              onClick={() => go(1)}
            >
              &rarr;
            </button>
            <span className="absolute bottom-3 right-3 ed-eyebrow px-2 py-1" style={{ background: 'rgba(13,13,13,0.85)' }}>
              {active + 1} / {ordered.length}
            </span>
          </>
        )}
      </div>

      {ordered.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-2">
          {ordered.map((img, i) => (
            <button
              key={img.id}
              className="relative aspect-[16/10] overflow-hidden border ed-hairline"
              style={{ borderColor: i === active ? 'var(--ed-gold)' : undefined }}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            >
              <FleetImage src={img.url} alt={`${alt} thumbnail ${i + 1}`} sizes="20vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
