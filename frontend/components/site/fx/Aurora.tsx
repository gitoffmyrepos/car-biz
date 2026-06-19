'use client';

/**
 * Ambient animated gold-on-black gradient mesh. Pure CSS (no canvas/WebGL):
 * three blurred radial blobs drifting on long keyframes behind hero/CTA bands.
 * Decorative only (aria-hidden). Animation is frozen under prefers-reduced-
 * motion via the CSS media query in globals.css, so this stays a static glow.
 */
export function Aurora({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`fx-aurora ${className}`}>
      <span className="fx-aurora-blob fx-aurora-1" />
      <span className="fx-aurora-blob fx-aurora-2" />
      <span className="fx-aurora-blob fx-aurora-3" />
    </div>
  );
}

/** Alias — same component, exported under the GradientMesh name for clarity. */
export const GradientMesh = Aurora;
