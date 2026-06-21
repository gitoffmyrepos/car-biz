'use client';

/**
 * SiteBackground — persistent, app-wide car backdrop.
 *
 * A single `position: fixed; inset: 0` layer that paints `/images/hero-car.jpg`
 * (cover, centre-right) behind ALL content. Because it is fixed it stays put
 * while the page scrolls, so the car reads as a constant premium backdrop on
 * every public page rather than cutting to solid black past the hero.
 *
 * A strong dark + red scrim is layered on top so foreground white/red copy
 * stays readable (WCAG-ish contrast). The image gets a very slow Ken-Burns
 * drift for a subtle cinematic feel; this is frozen under prefers-reduced-motion
 * via the `.hero-kenburns` rule in globals.css.
 *
 * The public-facing `.editorial` surface is transparent (see globals.css) so
 * this layer shows through; admin/dashboard surfaces keep their own opaque
 * backgrounds, so the car is harmlessly hidden there.
 */
export function SiteBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* The car photo (cover, centre-right) with a slow Ken-Burns drift. */}
      <div
        className="absolute inset-0 hero-kenburns"
        style={{
          backgroundImage: "url('/images/hero-car.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      />
      {/* Red glow pooled toward the car (centre-right). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 78% 42%, rgba(225,29,42,0.18) 0%, rgba(13,13,13,0) 60%)',
        }}
      />
      {/* Horizontal scrim — darkest on the left (where copy sits), lighter right. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(13,13,13,0.94) 0%, rgba(13,13,13,0.82) 42%, rgba(13,13,13,0.55) 100%)',
        }}
      />
      {/* Vertical scrim — keeps the photo a quiet, premium backdrop overall and
          darkens the far edges so scrolling content never fights the image. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.35) 30%, rgba(13,13,13,0.78) 100%)',
        }}
      />
    </div>
  );
}
