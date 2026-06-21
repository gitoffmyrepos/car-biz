/**
 * Editorial design-system primitives (black / white / red / sharp corners).
 * Server-component-safe (no hooks). Used across public-facing surfaces.
 */
import Link from 'next/link';

export function Eyebrow({ index, label }: { index?: string; label: string }) {
  return (
    <span className="ed-eyebrow">
      {index ? `${index} — ${label}` : label}
    </span>
  );
}

/** @deprecated Use {@link Eyebrow}. Kept as alias during the rebrand. */
export const GoldEyebrow = Eyebrow;

export function Section({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`ed-section ${className}`}>
      <div className="ed-container">{children}</div>
    </section>
  );
}

interface CtaProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function PrimaryCta({ href, children, className = '' }: CtaProps) {
  return (
    <Link href={href} className={`ed-cta ed-cta-primary ${className}`}>
      {children}
    </Link>
  );
}

export function GhostCta({ href, children, className = '' }: CtaProps) {
  return (
    <Link href={href} className={`ed-cta ed-cta-ghost ${className}`}>
      {children}
    </Link>
  );
}
