'use client';

/**
 * Lazy, fault-tolerant 3D hero.
 *
 * Renders a static poster fallback until the WebGL scene loads, AND permanently
 * for: prefers-reduced-motion, no-WebGL environments, and any canvas/runtime
 * failure (caught by the error boundary). Canvas failure must never produce a
 * blank/white screen — the poster stays.
 */
import dynamic from 'next/dynamic';
import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';

const HeroScene = dynamic(() => import('./HeroScene'), {
  ssr: false,
  loading: () => <HeroPoster />,
});

/** Static poster — pure CSS, no image asset required. */
function HeroPoster() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(60% 60% at 70% 40%, rgba(212,175,106,0.22) 0%, rgba(184,150,62,0.06) 40%, rgba(13,13,13,0) 70%), #0d0d0d',
      }}
    >
      <div
        className="absolute right-[8%] top-1/2 -translate-y-1/2 h-56 w-56 md:h-80 md:w-80 rounded-full opacity-70"
        style={{
          background:
            'conic-gradient(from 140deg, rgba(212,175,106,0.0), rgba(212,175,106,0.55), rgba(184,150,62,0.1), rgba(212,175,106,0.0))',
          filter: 'blur(2px)',
        }}
      />
    </div>
  );
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <HeroPoster />;
    return this.props.children;
  }
}

function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function Hero3D() {
  const [enable3D, setEnable3D] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && webglSupported()) setEnable3D(true);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {enable3D ? (
        <CanvasErrorBoundary>
          <Suspense fallback={<HeroPoster />}>
            <HeroScene />
          </Suspense>
        </CanvasErrorBoundary>
      ) : (
        <HeroPoster />
      )}
    </div>
  );
}
