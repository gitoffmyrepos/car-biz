/**
 * Gradient-animated headline accent — a sweeping red shimmer over the text.
 * Server-component-safe (pure CSS, no hooks). Use for the accented hero word.
 * The sweep animation is disabled under prefers-reduced-motion (handled in
 * globals.css), leaving a static red gradient.
 */
export function ShimmerText({
  children,
  className = '',
  as: Tag = 'span',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'strong' | 'em';
}) {
  return <Tag className={`fx-shimmer-text ${className}`}>{children}</Tag>;
}
