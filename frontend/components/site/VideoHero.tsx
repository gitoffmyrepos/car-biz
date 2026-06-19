'use client';

/**
 * Ambient video background layer for the hero.
 *
 * ── SEEDANCE DROP-IN SLOT ──────────────────────────────────────────────
 * This is where a Seedance-generated cinematic clip lands. Ship the file to
 * `public/video/hero.webm` (and/or `public/video/hero.mp4`) plus a poster at
 * `public/video/hero-poster.jpg`. No code change is needed once the asset
 * exists — the component probes for it and fades it in.
 * ───────────────────────────────────────────────────────────────────────
 *
 * Behavior:
 *  - Renders nothing visible until the video can actually play (probed via a
 *    HEAD request + the <video> `canplay` event), so a missing file leaves the
 *    3D car / CSS poster fully visible underneath — never a black hole.
 *  - muted + loop + autoplay + playsInline ambient layer; poster shown while
 *    buffering and as the static frame under prefers-reduced-motion (the video
 *    is not mounted at all when motion is reduced).
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const WEBM = '/video/hero.webm';
const MP4 = '/video/hero.mp4';
const POSTER = '/video/hero-poster.jpg';

export function VideoHero() {
  const reduce = useReducedMotion();
  const [available, setAvailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [posterOk, setPosterOk] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Probe for the asset before mounting <video> so a 404 is silent.
  useEffect(() => {
    let active = true;
    async function probe(url: string): Promise<boolean> {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
      } catch {
        return false;
      }
    }
    (async () => {
      const [webm, mp4, poster] = await Promise.all([probe(WEBM), probe(MP4), probe(POSTER)]);
      if (!active) return;
      setPosterOk(poster);
      setAvailable(webm || mp4);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reduced motion: show only the static poster (if present), no video at all.
  if (reduce) {
    if (!posterOk) return null;
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${POSTER})` }}
      />
    );
  }

  if (!available) return null;

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-1000"
      style={{ opacity: ready ? 0.4 : 0 }}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={posterOk ? POSTER : undefined}
      onCanPlay={() => setReady(true)}
    >
      <source src={WEBM} type="video/webm" />
      <source src={MP4} type="video/mp4" />
    </video>
  );
}
