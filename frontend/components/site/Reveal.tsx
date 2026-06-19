'use client';

/**
 * Scroll-reveal wrapper. Uses Framer Motion when motion is allowed, and
 * collapses to a static (already-visible) element under prefers-reduced-motion.
 */
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in seconds. */
  delay?: number;
  as?: 'div' | 'li' | 'section';
}

export function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
    >
      {children}
    </MotionTag>
  );
}
