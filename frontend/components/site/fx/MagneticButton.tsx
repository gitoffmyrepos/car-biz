'use client';

/**
 * Magnetic CTA — the element drifts toward the cursor within a small radius,
 * springing back on leave. Wraps a Next.js <Link>. Falls back to a plain link
 * under prefers-reduced-motion (no transform, full keyboard/click behavior).
 */
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

const MotionLink = motion(Link);

interface MagneticButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Pull strength 0..1 (fraction of cursor offset applied). */
  strength?: number;
}

export function MagneticButton({
  href,
  children,
  className = '',
  strength = 0.35,
}: MagneticButtonProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  if (reduce) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  function onMove(e: React.PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <MotionLink
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </MotionLink>
  );
}
