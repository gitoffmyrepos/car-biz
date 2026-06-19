'use client';

/**
 * 3D-tilt card with a radial gold spotlight that tracks the cursor. Pointer
 * position drives CSS custom properties (--mx/--my for the spotlight) and a
 * Framer Motion spring (rotateX/rotateY for the tilt). Collapses to a static
 * container under prefers-reduced-motion or on touch (no hover). Renders a
 * plain element when motion is disabled so server output stays clean.
 */
import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

interface TiltSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  intensity?: number;
}

export function TiltSpotlightCard({
  children,
  className = '',
  intensity = 6,
}: TiltSpotlightCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), {
    stiffness: 180,
    damping: 18,
  });
  const ry = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), {
    stiffness: 180,
    damping: 18,
  });

  if (reduce) {
    return <div className={`fx-tilt-static ${className}`}>{children}</div>;
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    px.set(x);
    py.set(y);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  }

  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`fx-tilt-card ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
    >
      <span aria-hidden="true" className="fx-tilt-spotlight" />
      <div className="fx-tilt-content">{children}</div>
    </motion.div>
  );
}
