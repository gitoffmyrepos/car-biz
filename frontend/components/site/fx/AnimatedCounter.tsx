'use client';

/**
 * Count-up stat that animates from 0 → target when scrolled into view.
 * Parses leading numeric portion of a label (e.g. "2,500+", "$150", "24h",
 * "100%") and preserves the prefix/suffix decoration. Honors reduced-motion
 * by jumping straight to the final value.
 */
import { useEffect, useRef, useState } from 'react';
import {
  animate,
  useInView,
  useReducedMotion,
} from 'framer-motion';

interface ParsedStat {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
}

function parseStat(raw: string): ParsedStat {
  const match = raw.match(/^([^\d-]*)([\d,.]+)(.*)$/);
  if (!match) return { prefix: '', value: 0, suffix: raw, decimals: 0 };
  const numeric = match[2].replace(/,/g, '');
  const decimals = numeric.includes('.') ? numeric.split('.')[1].length : 0;
  return {
    prefix: match[1],
    value: parseFloat(numeric) || 0,
    suffix: match[3],
    decimals,
  };
}

function format(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function AnimatedCounter({ value: raw, duration = 1.6 }: { value: string; duration?: number }) {
  const parsed = parseStat(raw);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? raw : `${parsed.prefix}${format(0, parsed.decimals)}${parsed.suffix}`);

  useEffect(() => {
    if (reduce) {
      setDisplay(raw);
      return;
    }
    if (!inView) return;
    const controls = animate(0, parsed.value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplay(`${parsed.prefix}${format(latest, parsed.decimals)}${parsed.suffix}`);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, raw]);

  return (
    <span ref={ref} aria-label={raw}>
      {display}
    </span>
  );
}
