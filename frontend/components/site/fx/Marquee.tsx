'use client';

/**
 * Infinite horizontal marquee. Duplicates the children track and translates it
 * with a CSS keyframe so the loop is seamless and GPU-cheap (no JS rAF). Pauses
 * on hover; freezes entirely under prefers-reduced-motion.
 */
import { useReducedMotion } from 'framer-motion';

interface MarqueeProps {
  items: string[];
  /** Seconds for one full loop. Lower = faster. */
  speed?: number;
  className?: string;
}

export function Marquee({ items, speed = 28, className = '' }: MarqueeProps) {
  const reduce = useReducedMotion();
  const track = [...items, ...items];

  if (reduce) {
    return (
      <div className={`overflow-hidden ${className}`} aria-hidden="true">
        <div className="flex gap-10 whitespace-nowrap py-1">
          {items.map((it, i) => (
            <MarqueeItem key={i} label={it} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`fx-marquee group overflow-hidden ${className}`} aria-hidden="true">
      <div
        className="fx-marquee-track flex w-max gap-10 whitespace-nowrap py-1"
        style={{ animationDuration: `${speed}s` }}
      >
        {track.map((it, i) => (
          <MarqueeItem key={i} label={it} />
        ))}
      </div>
    </div>
  );
}

function MarqueeItem({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-10 text-sm uppercase tracking-eyebrow text-faint">
      {label}
      <span className="text-gold" aria-hidden="true">
        &bull;
      </span>
    </span>
  );
}
