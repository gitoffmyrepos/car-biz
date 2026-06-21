/**
 * GigWheels brand logo. Inline SVG so it scales crisply and inherits the
 * black / white / red editorial palette. Server-component-safe (no hooks).
 *
 *   variant="full" → wheel/speed mark + "GigWheels" wordmark (white, red "G").
 *   variant="mark" → just the red wheel/speed mark (square, for tight spaces).
 */

const ACCENT = '#E11D2A';

interface LogoProps {
  /** Rendered height in px. Width scales with the chosen variant. */
  size?: number;
  variant?: 'full' | 'mark';
  className?: string;
}

/** Stylized wheel with a forward speed-motion arc — the GigWheels mark. */
function Mark({ size }: { size: number }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      {/* Tire */}
      <circle cx="16" cy="16" r="13" stroke={ACCENT} strokeWidth="3" />
      {/* Hub */}
      <circle cx="16" cy="16" r="3.4" fill={ACCENT} />
      {/* Spokes */}
      <path
        d="M16 6.5V11M16 21v4.5M6.5 16H11M21 16h4.5"
        stroke={ACCENT}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Speed-motion arcs trailing the wheel */}
      <path
        d="M2 12h6M0 16h5M2 20h6"
        stroke={ACCENT}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function Logo({ size = 28, variant = 'full', className = '' }: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={`inline-flex items-center ${className}`} aria-label="GigWheels">
        <Mark size={size} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="GigWheels"
    >
      <Mark size={size} />
      <span
        className="font-display font-semibold tracking-tight leading-none text-white"
        style={{ fontSize: size * 0.82 }}
      >
        <span style={{ color: ACCENT }}>Gig</span>Wheels
      </span>
    </span>
  );
}
